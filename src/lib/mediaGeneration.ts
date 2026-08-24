// Parallel runner for the chat-driven media generation flow.
// Calls existing edge functions `media-image` / `media-video` (+ poll) for all scenes
// together and reports progress via callbacks so the UI updates as each result lands.

import { supabase } from "@/integrations/supabase/client";
import type { MediaPlan, MediaPlanScene } from "@/components/chat/media/MediaPlanCard";
import type { MediaSceneResult } from "@/components/chat/media/MediaResultCard";

// Video job pacing depends on the provider. Alibaba Wan runs ~5–6 min end
// to end, so we show a visible countdown before polling. deAPI usually
// finishes within seconds, so we skip the wait and poll aggressively.
const ALIBABA_INITIAL_WAIT_MS = 5 * 60_000;
const ALIBABA_POLL_INTERVAL_MS = 15_000;
const ALIBABA_POLL_MAX_MS = 15 * 60_000;
const DEAPI_POLL_INTERVAL_MS = 3_000;
const DEAPI_POLL_MAX_MS = 5 * 60_000;


// Models that support ChatGPT-style progressive partial_images streaming via
// the Lovable AI Gateway (`/v1/images/generations` with `stream:true`).
const STREAMABLE_MODELS = new Set([
  "gpt-image-2",
  "gpt-image-1",
  "ws-gpt-image-2",
  "openai/gpt-image-2",
]);

interface ScenePartialCb {
  (index: number, previewDataUrl: string, progress: number): void;
}

async function streamImageScene(
  scene: MediaPlanScene,
  modelSlug: string,
  onPartial: ScenePartialCb | undefined,
): Promise<string> {
  // Get auth so the edge function can attribute the call.
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const supaUrl = (supabase as any).supabaseUrl || (import.meta as any).env?.VITE_SUPABASE_URL;
  const anonKey = (supabase as any).supabaseKey || (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  const resp = await fetch(`${supaUrl}/functions/v1/media-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token || anonKey}`,
    },
    body: JSON.stringify({
      stream: true,
      prompt: scene.prompt,
      partial_images: 3,
      quality: "low",
      ...(scene.reference_image_url
        ? { reference_image_url: scene.reference_image_url, image_url: scene.reference_image_url }
        : {}),
    }),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`stream failed (${resp.status})`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let finalB64: string | null = null;
  let partialCount = 0;
  // Total expected frames: N partials + 1 final
  const totalFrames = 4;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let evt: any;
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      // OpenAI images streaming event shapes:
      // - { type: "image_generation.partial_image", b64_json, partial_image_index }
      // - { type: "image_generation.completed", b64_json }
      const type = evt?.type || "";
      const b64 = evt?.b64_json || evt?.data?.[0]?.b64_json || evt?.image?.b64_json;
      if (!b64) continue;
      if (type.includes("partial")) {
        partialCount += 1;
        const progress = Math.min(0.9, partialCount / totalFrames);
        onPartial?.(scene.index, `data:image/png;base64,${b64}`, progress);
      } else {
        finalB64 = b64;
        onPartial?.(scene.index, `data:image/png;base64,${b64}`, 1);
      }
    }
  }

  if (!finalB64) throw new Error("no final image");
  // Upload to Supabase storage so the URL is persistable.
  try {
    const bin = Uint8Array.from(atob(finalB64), (c) => c.charCodeAt(0));
    const path = `chat-images/${session?.user?.id ?? "anon"}/${Date.now()}-${scene.index}.png`;
    const { data: up, error: upErr } = await supabase.storage
      .from("uploads")
      .upload(path, bin, { contentType: "image/png", upsert: false });
    if (!upErr && up?.path) {
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(up.path);
      if (pub?.publicUrl) return pub.publicUrl;
    }
  } catch {
    // fall through to data URL
  }
  return `data:image/png;base64,${finalB64}`;
}

/**
 * Drives a synthetic progress ticker for non-streaming generations so the UI
 * shows ChatGPT-style live progress for every model (not just gpt-image-2).
 * Approaches but never reaches 0.95 until the real result arrives.
 */
function startProgressTicker(
  sceneIndex: number,
  estimatedMs: number,
  onPartial: ScenePartialCb | undefined,
): () => void {
  if (!onPartial) return () => {};
  const started = Date.now();
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const elapsed = Date.now() - started;
    // Easing: fast at first, asymptotic to 0.95
    const p = Math.min(0.95, 1 - Math.exp(-elapsed / estimatedMs));
    onPartial(sceneIndex, "", p);
  };
  tick();
  const id = window.setInterval(tick, 600);
  return () => {
    stopped = true;
    window.clearInterval(id);
  };
}

async function generateImageScene(
  scene: MediaPlanScene,
  modelSlug: string,
  onPartial?: ScenePartialCb,
  aspectRatio?: string,
): Promise<string> {
  if (STREAMABLE_MODELS.has(modelSlug)) {
    try {
      return await streamImageScene(scene, modelSlug, onPartial);
    } catch (e) {
      console.warn("[mediaGeneration] streaming failed, falling back:", e);
    }
  }
  // Non-streamable models: show synthetic progress so the UI feels like ChatGPT.
  const stopTicker = startProgressTicker(scene.index, 18_000, onPartial);
  try {
    const { data, error } = await supabase.functions.invoke("media-image", {
      body: {
        prompt: scene.prompt,
        model_slug: modelSlug,
        num_images: 1,
        aspect_ratio: aspectRatio,
        ...(scene.reference_image_url
          ? {
              reference_image_url: scene.reference_image_url,
              image_url: scene.reference_image_url,
            }
          : {}),
      },
    });
    if (error) throw new Error(error.message || "image gen failed");
    if (data?.paywall) throw new Error(data.message || "Upgrade required");
    if (data?.error) throw new Error(data.message || data.error);
    const url = data?.image_url || (Array.isArray(data?.image_urls) ? data.image_urls[0] : null);
    if (!url) throw new Error("no image returned");
    onPartial?.(scene.index, url, 1);
    return url;
  } finally {
    stopTicker();
  }
}

async function generateVideoScene(
  scene: MediaPlanScene,
  modelSlug: string,
  onPartial?: ScenePartialCb,
  aspectRatio?: string,
  onCountdown?: (index: number, endsAt: number | null) => void,
): Promise<string> {
  const body: Record<string, unknown> = {
    prompt: scene.prompt,
    model_slug: modelSlug,
    duration: scene.duration_seconds || 5,
    aspect_ratio: scene.aspect_ratio || aspectRatio,
  };
  if (scene.first_frame_url) body.start_frame = scene.first_frame_url;
  if (scene.last_frame_url) body.end_frame = scene.last_frame_url;

  // Videos are treated as async tasks: no fake percent bar while the provider
  // is rendering. We surface a 5-minute countdown instead (see onCountdown).
  onPartial?.(scene.index, "", NaN);
  try {
    const { data, error } = await supabase.functions.invoke("media-video", { body });
    if (error) throw new Error(error.message || "video gen failed");
    if (data?.paywall) throw new Error(data.message || "Upgrade required");
    if (data?.error) throw new Error(data.message || data.error);

    const directUrl = data?.video_url || data?.url;
    if (directUrl) {
      onPartial?.(scene.index, "", 1);
      return String(directUrl);
    }

    const jobId = data?.job_id || data?.id;
    if (!jobId) throw new Error("no video job id");

    // deAPI job ids are prefixed `deapi:` by our edge function. They resolve
    // in seconds, so poll immediately without a countdown. Alibaba Wan jobs
    // take ~5 min, so we show a countdown before polling begins.
    const isDeapi = String(jobId).startsWith("deapi:");
    const pollInterval = isDeapi ? DEAPI_POLL_INTERVAL_MS : ALIBABA_POLL_INTERVAL_MS;
    const pollMax = isDeapi ? DEAPI_POLL_MAX_MS : ALIBABA_POLL_MAX_MS;
    if (!isDeapi) {
      const countdownEndsAt = Date.now() + ALIBABA_INITIAL_WAIT_MS;
      onCountdown?.(scene.index, countdownEndsAt);
      await new Promise((r) => setTimeout(r, ALIBABA_INITIAL_WAIT_MS));
      onCountdown?.(scene.index, null);
    }

    const started = Date.now();
    while (Date.now() - started < pollMax) {
      const { data: poll, error: pollErr } = await supabase.functions.invoke("media-video-poll", {
        body: { job_id: jobId },
      });
      if (!pollErr) {
        const status = poll?.status;
        const reported = Number(poll?.progress ?? poll?.percent ?? NaN);
        if (Number.isFinite(reported) && reported > 0) {
          const norm = reported > 1 ? Math.min(0.95, reported / 100) : Math.min(0.95, reported);
          onPartial?.(scene.index, "", norm);
        }
        if (
          status === "complete" ||
          status === "completed" ||
          status === "succeeded" ||
          status === "success"
        ) {
          const u = poll?.video_url || poll?.url || poll?.output_url;
          if (u) {
            onPartial?.(scene.index, "", 1);
            return String(u);
          }
          throw new Error("completed but no URL");
        }
        if (status === "failed" || status === "error" || status === "cancelled") {
          throw new Error(poll?.error || "video job failed");
        }
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    throw new Error("timeout");
  } finally {
    onCountdown?.(scene.index, null);
  }
}

/**
 * Music generation via the deAPI branch of the `media-video` edge function.
 * Submits a job, then polls `media-video-poll` (which recognises the
 * `deapi-audio:*` job-id prefix) until the audio URL is ready.
 */
async function generateMusicScene(
  scene: MediaPlanScene,
  lyrics: string | undefined,
  onPartial?: ScenePartialCb,
  onCountdown?: (index: number, endsAt: number | null) => void,
): Promise<string> {
  const duration = Math.max(20, Math.min(240, scene.duration_seconds || 90));
  onPartial?.(scene.index, "", NaN);
  try {
    const { data, error } = await supabase.functions.invoke("media-video", {
      body: {
        kind: "music",
        prompt: scene.prompt,
        lyrics: lyrics || undefined,
        duration,
      },
    });
    if (error) throw new Error(error.message || "music gen failed");
    if (data?.error) throw new Error(data.message || data.error);

    const directUrl = data?.audio_url || data?.url;
    if (directUrl) {
      onPartial?.(scene.index, "", 1);
      return String(directUrl);
    }
    const jobId = data?.job_id || data?.id;
    if (!jobId) throw new Error("no music job id");

    // Music jobs typically finish in ~30–90s. Poll every 4s.
    const pollInterval = 4_000;
    const pollMax = 6 * 60_000;
    const started = Date.now();
    while (Date.now() - started < pollMax) {
      const { data: poll, error: pollErr } = await supabase.functions.invoke("media-video-poll", {
        body: { job_id: jobId },
      });
      if (!pollErr) {
        const status = poll?.status;
        if (
          status === "complete" ||
          status === "completed" ||
          status === "succeeded" ||
          status === "success"
        ) {
          const u = poll?.audio_url || poll?.url;
          if (u) {
            onPartial?.(scene.index, "", 1);
            return String(u);
          }
          throw new Error("completed but no audio URL");
        }
        if (status === "failed" || status === "error" || status === "cancelled") {
          throw new Error(poll?.error || "music job failed");
        }
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    throw new Error("timeout");
  } finally {
    onCountdown?.(scene.index, null);
  }
}


export interface RunMediaPlanOptions {
  plan: MediaPlan;
  onSceneStart: (index: number) => void;
  onSceneDone: (result: MediaSceneResult) => void;
  /** Fires with progressive previews (ChatGPT-style) while an image is rendering. */
  onScenePartial?: (index: number, previewUrl: string, progress: number) => void;
  /** For video tasks: timestamp (ms) when the initial ~5 min wait ends, or null to clear. */
  onSceneCountdown?: (index: number, endsAt: number | null) => void;
  shouldCancel?: () => boolean;
}

export async function runMediaPlan(opts: RunMediaPlanOptions): Promise<void> {
  const { plan, onSceneStart, onSceneDone, onScenePartial, onSceneCountdown, shouldCancel } = opts;
  await Promise.allSettled(
    plan.scenes.map(async (scene) => {
      if (shouldCancel?.()) return;
      onSceneStart(scene.index);
      try {
        const url =
          plan.mode === "music"
            ? await generateMusicScene(scene, plan.lyrics, onScenePartial, onSceneCountdown)
            : plan.mode === "video"
            ? await generateVideoScene(scene, plan.modelSlug, onScenePartial, plan.aspectRatio, onSceneCountdown)
            : await generateImageScene(scene, plan.modelSlug, onScenePartial, plan.aspectRatio);
        if (plan.mode === "images" && url) {
          try {
            const { rememberCharacter } = await import("./media/characterMemory");
            rememberCharacter({
              name: plan.originalPrompt || plan.summary,
              descriptor: scene.identity || scene.prompt,
              refUrl: url,
            });
          } catch {
            /* memory is best-effort */
          }
        }
        onSceneDone({
          index: scene.index,
          title: scene.title,
          status: "done",
          url,
          type: plan.mode === "video" ? "video" : plan.mode === "music" ? "music" : "image",
        });
      } catch (e) {
        onSceneDone({
          index: scene.index,
          title: scene.title,
          status: "error",
          error: e instanceof Error ? e.message : "failed",
          type: plan.mode === "video" ? "video" : plan.mode === "music" ? "music" : "image",
        });
      }
    }),
  );
}

export async function regenerateScene(
  plan: MediaPlan,
  sceneIndex: number,
  onPartial?: (index: number, previewUrl: string, progress: number) => void,
  onCountdown?: (index: number, endsAt: number | null) => void,
): Promise<MediaSceneResult> {
  const scene = plan.scenes.find((s) => s.index === sceneIndex);
  if (!scene) throw new Error("scene not found");
  try {
    const url =
      plan.mode === "music"
        ? await generateMusicScene(scene, plan.lyrics, onPartial, onCountdown)
        : plan.mode === "video"
        ? await generateVideoScene(scene, plan.modelSlug, onPartial, plan.aspectRatio, onCountdown)
        : await generateImageScene(scene, plan.modelSlug, onPartial, plan.aspectRatio);
    return {
      index: scene.index,
      title: scene.title,
      status: "done",
      url,
      type: plan.mode === "video" ? "video" : plan.mode === "music" ? "music" : "image",
    };
  } catch (e) {
    return {
      index: scene.index,
      title: scene.title,
      status: "error",
      error: e instanceof Error ? e.message : "failed",
      type: plan.mode === "video" ? "video" : plan.mode === "music" ? "music" : "image",
    };
  }
}

