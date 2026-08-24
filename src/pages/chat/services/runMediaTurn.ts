import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadMediaSettings } from "@/components/chat/mobile/MediaSettingsMenu";
import type { Message, ChatMode } from "../chatConstants";


export type MediaPlan = any;

const CHAT_EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-alibaba`;

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

function sanitizeLyrics(raw: string, prompt: string, isArabic: boolean): string {
  let lyrics = raw
    .replace(/```(?:lyrics|text|markdown)?/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*(?:كلمات الأغنية|الأغنية|lyrics|song lyrics)\s*:?\s*/i, "")
    .trim();

  if (!/\[(verse|chorus|bridge)\]/i.test(lyrics)) {
    const lines = lyrics
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length >= 4) {
      const mid = Math.max(2, Math.floor(lines.length / 2));
      lyrics = `[verse]\n${lines.slice(0, mid).join("\n")}\n\n[chorus]\n${lines.slice(mid).join("\n")}`;
    } else if (isArabic) {
      lyrics = `[verse]\nعن ${prompt}\nهنغني ونعيش الإحساس\n\n[chorus]\nهبدأ أولد دلوقتي\nوالحلم هيعلى مع الناس`;
    } else {
      lyrics = `[verse]\nA song about ${prompt}\nWe carry the feeling through the night\n\n[chorus]\nI am starting the generation now\nLet the dream rise into light`;
    }
  }

  return lyrics.slice(0, 3_500).trim();
}

function musicIntro(_lyrics: string, _isArabic: boolean): string {
  return "";
}

function musicDraftIntro(_rawLyrics: string, _isArabic: boolean): string {
  return "";
}

async function streamLyricsFromChatEdge({
  prompt,
  isArabic,
  onDraft,
}: {
  prompt: string;
  isArabic: boolean;
  onDraft: (content: string) => void;
}): Promise<string> {
  const token = await getAccessToken();
  const customSystem = "Write full song lyrics only, in the same language and dialect as the user. Use [verse], [chorus], and optional [bridge] tags, each on its own line. No intro, no explanation, no links, no model names, and no text outside the lyrics. Make the chorus strong, repeatable, and singable.";

  const resp = await fetch(CHAT_EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model: "qwen-plus",
      chatMode: "music",
      customSystem,
    }),
  });

  if (!resp.ok || !resp.body) {
    const details = await resp.text().catch(() => "");
    throw new Error(details || "Could not write lyrics");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lyrics = "";

  const handleLine = (line: string) => {
    if (!line.startsWith("data: ")) return;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const parsed = JSON.parse(payload);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) {
        lyrics += delta;
        onDraft(musicDraftIntro(lyrics, isArabic));
      }
    } catch {
      // Ignore non-chat frames/status packets.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const raw = buffer.slice(0, idx).replace(/\r$/, "");
      buffer = buffer.slice(idx + 1);
      handleLine(raw);
    }
  }
  if (buffer.trim()) handleLine(buffer.trim());

  const finalLyrics = sanitizeLyrics(lyrics, prompt, isArabic);
  if (!finalLyrics) throw new Error("Could not write lyrics");
  return finalLyrics;
}

export interface RunMediaTurnArgs {
  text: string;
  /** آخر صورة مولّدة في نفس المحادثة — تُستخدم تلقائيًا عند طلب تعديل. */
  lastImageUrl?: string | null;
  /** برومبت آخر صورة مولّدة، لدعم التعديل مع الحفاظ على السياق. */
  lastImagePrompt?: string | null;
  userMsg: Message;
  localTurnId: string;
  chatMode: ChatMode;
  mediaModel: any;
  videoStartEndMode: boolean;
  startFrameUrl: string | null;
  endFrameUrl: string | null;
  videoDurationSec: number;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setInput: (v: string) => void;
  setAttachedFiles: (v: any[]) => void;
  setPendingQuestions: (v: any[]) => void;
  setIsLoading: (v: boolean) => void;
  setIsThinking: (v: boolean) => void;
  createOrUpdateConversation: (title: string) => Promise<string | null>;
  saveMessage: (
    cid: string,
    role: string,
    content: string,
    modelId?: any,
    meta?: any,
  ) => Promise<string | undefined>;
  ownInsertedIdsRef: React.MutableRefObject<Set<string>>;
}

/**
 * Returns `true` if it handled the turn (caller should `return`),
 * or `false` if validation prevented work (caller still returns but
 * already cleared `isSubmittingRef`).
 */
export async function runMediaTurn(args: RunMediaTurnArgs): Promise<void> {
  const {
    text,
    lastImageUrl,
    lastImagePrompt,
    userMsg,
    localTurnId,
    chatMode,
    mediaModel,
    videoStartEndMode,
    startFrameUrl,
    endFrameUrl,
    videoDurationSec,
    setMessages,
    setInput,
    setAttachedFiles,
    setPendingQuestions,
    setIsLoading,
    setIsThinking,
    createOrUpdateConversation,
    saveMessage,
    ownInsertedIdsRef,
  } = args;

  const isStartEnd = chatMode === "video" && videoStartEndMode;
  const isMusic = chatMode === "music";
  const assistantClientId = `assistant-${localTurnId}`;
  const modeLocal = chatMode;
  const modelLocal = mediaModel;

  const isArabic = /[\u0600-\u06FF]/.test(text || "");
  let introContent = "";

  setMessages((prev) => [
    ...prev,
    userMsg,
    {
      role: "assistant",
      content: introContent,
      clientId: assistantClientId,
      mode: modeLocal,
    },
  ]);
  setInput("");
  setAttachedFiles([]);
  setPendingQuestions([]);
  setIsLoading(true);
  setIsThinking(true);

  try {
    const cid = await createOrUpdateConversation(text || "Media");
    if (cid) {
      const userMessageId = await saveMessage(cid, "user", userMsg.content, undefined, {
        mode: modeLocal,
      });
      if (userMessageId) ownInsertedIdsRef.current.add(userMessageId);
    }
    let plan: MediaPlan;
    const settings = isMusic
      ? { aspectRatio: "16:9", count: 1, duration: 90 }
      : loadMediaSettings(modeLocal === "video" ? "video" : "images");
    const aspectRatio = settings.aspectRatio;
    if (isMusic) {
      const lyrics = await streamLyricsFromChatEdge({
        prompt: text || "AI song",
        isArabic,
        onDraft: () => {},
      });
      introContent = musicIntro(lyrics, isArabic);
      setIsThinking(false);
      plan = {
        mode: "music",
        modelSlug: "AceStep_1_5_Turbo",
        modelName: "AceStep 1.5 Turbo",
        summary: text || "AI song",
        aspectRatio,
        lyrics,
        scenes: [
          {
            index: 1,
            title: text?.slice(0, 60) || "Your song",
            prompt: text,
            duration_seconds: settings.duration ?? 90,
          },
        ],
      } as any;
    } else if (isStartEnd) {
      plan = {
        mode: "video",
        modelSlug: modelLocal.slug,
        modelName: modelLocal.name,
        summary: text || "First → last frame interpolation",
        aspectRatio,
        scenes: [
          {
            index: 1,
            title: "First → Last frame",
            prompt: text || "Smooth motion interpolation between the two frames.",
            duration_seconds: videoDurationSec,
            first_frame_url: startFrameUrl!,
            last_frame_url: endFrameUrl!,
          },
        ],
      };
    } else {
      // وضع Images: يمر كل طلب على "الروبوت الداخلي" الذي يحسّن البرومبت،
      // ويستحضر هوية أي شخصية محفوظة، ويكتشف نية التعديل على آخر صورة
      // مولّدة فيرفقها داخليًا بدون أن يعيد المستخدم إرفاق Imagesة.
      let scenePrompt = text;
      let referenceImage: string | undefined;
      let identityDescriptor: string | undefined;
      if (modeLocal === "images" && text?.trim()) {
        try {
          const [{ enhanceImagePrompt, composeImagePrompt, detectImageEditIntent }, { findMentionedCharacter }] =
            await Promise.all([
              import("@/lib/media/imageBrain"),
              import("@/lib/media/characterMemory"),
            ]);
          const character = findMentionedCharacter(text);
          identityDescriptor = character?.descriptor;
          const isEdit = detectImageEditIntent(text) && !!lastImageUrl;
          if (isEdit) referenceImage = lastImageUrl || undefined;
          if (!referenceImage && character?.refUrl) referenceImage = character.refUrl;
          const enhanced = await enhanceImagePrompt({
            text,
            identity: identityDescriptor,
            editOf: isEdit ? lastImagePrompt || undefined : undefined,
          });
          scenePrompt = composeImagePrompt({
            enhanced,
            identity: identityDescriptor,
            editInstruction: isEdit ? text : undefined,
          });
        } catch {
          scenePrompt = text;
        }
      }
      // Image turns intentionally produce one output. This prevents stale
      // multi-image preferences from launching several paid requests at once;
      // the user can ask for another variation explicitly.
      const count = modeLocal === "images" ? 1 : (settings.count ?? 1);
      let planned = false;

      // وضع الفيديو: خطة مسبقة تفهم الشخصية/المنتج والمشاهد والسيناريو الممتد،
      // مع نمط UGC اختياري وMore aspect ratios لنفس الفيديو.
      if (modeLocal === "video" && text?.trim()) {
        try {
          const [{ planVideoStory }, { loadVideoTools, UGC_STYLE_PROMPT }] = await Promise.all([
            import("@/lib/media/videoPlanner"),
            import("@/lib/media/videoTools"),
          ]);
          const tools = loadVideoTools();
          const perShot = settings.duration ?? videoDurationSec;
          const story = await planVideoStory({
            text,
            sceneCount: count,
            durationSec: perShot,
            ugc: tools.ugc,
          });
          if (story) {
            const aspects = [aspectRatio, ...tools.extraAspects.filter((a) => a !== aspectRatio)];
            const storyScenes: any[] = [];
            let idx = 0;
            for (const aspect of aspects) {
              for (const sc of story.scenes) {
                idx += 1;
                storyScenes.push({
                  index: idx,
                  title: aspects.length > 1 ? `${sc.title} · ${aspect}` : sc.title,
                  prompt: [
                    story.identity ? `Consistent subject (must look identical in every shot): ${story.identity}` : "",
                    sc.prompt,
                    tools.ugc ? UGC_STYLE_PROMPT : "",
                  ]
                    .filter(Boolean)
                    .join(" "),
                  duration_seconds: sc.duration_seconds || perShot,
                  aspect_ratio: aspect,
                  identity: story.identity,
                });
              }
            }
            setIsThinking(false);
            plan = {
              mode: "video",
              modelSlug: modelLocal.slug,
              modelName: modelLocal.name,
              summary: story.storyline || text,
              originalPrompt: text,
              storyline: story.storyline,
              identity: story.identity,
              ugc: tools.ugc,
              aspectRatio,
              aspectRatios: aspects,
              scenes: storyScenes,
              estimatedTotalSeconds: storyScenes.reduce(
                (acc, s) => acc + (s.duration_seconds || perShot),
                0,
              ),
            };
            planned = true;
          }
        } catch {
          // فشل التخطيط: نكمل بالمسار المباشر.
        }
      }

      if (planned) {
        // الخطة المعتمدة جاهزة، لا نعيد بناءها.
      } else {
      // Direct generation — no LLM planner.
      const scenes = Array.from({ length: count }, (_, i) => ({
        index: i + 1,
        title:
          count > 1
            ? modeLocal === "video"
              ? `Clip ${i + 1}`
              : `Image ${i + 1}`
            : "Your prompt",
        prompt: scenePrompt,
        ...(referenceImage ? { reference_image_url: referenceImage, image_url: referenceImage } : {}),
        ...(identityDescriptor ? { identity: identityDescriptor } : {}),
        ...(modeLocal === "video"
          ? { duration_seconds: settings.duration ?? videoDurationSec }
          : {}),
      }));
      plan = {
        mode: modeLocal,
        modelSlug: modelLocal.slug,
        modelName: modelLocal.name,
        summary: text,
        originalPrompt: text,
        aspectRatio,
        scenes,
        ...(modeLocal === "video"
          ? {
              estimatedTotalSeconds:
                (settings.duration ?? videoDurationSec) * count,
            }
          : {}),
      };
      }
    }


    plan.generationKey = localTurnId;
    const initialResults = plan.scenes.map((s: any) => ({
      index: s.index,
      title: s.title,
      status: "pending" as const,
      type:
        modeLocal === "video"
          ? ("video" as const)
          : modeLocal === "music"
            ? ("music" as const)
            : ("image" as const),
    }));
    // Persist the assistant media message so it survives reloads.
    let assistantId: string | undefined;
    if (cid) {
      assistantId = await saveMessage(cid, "assistant", introContent, undefined, {
        kind: "mediaPlan",
        mediaPlan: plan,
        mediaStatus: "awaiting",
        mediaResults: initialResults,
        mode: modeLocal,
      });
      if (assistantId) ownInsertedIdsRef.current.add(assistantId);
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.clientId === assistantClientId
          ? {
              ...m,
              id: assistantId ?? m.id,
              content: introContent,
              mediaPlan: plan,
              mediaStatus: "awaiting",
              mediaResults: initialResults,
            }
          : m,
      ),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Planning failed";
    setMessages((prev) =>
      prev.map((m) => (m.clientId === assistantClientId ? { ...m, content: `Error: ${msg}` } : m)),
    );
    toast.error(msg);
    setIsLoading(false);
    setIsThinking(false);
  }
}
