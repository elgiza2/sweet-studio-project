import { defineConfig } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { createHmac } from "crypto";
import { visualizer } from "rollup-plugin-visualizer";
import { compression, defineAlgorithm } from "vite-plugin-compression2";
import { constants as zlibConstants } from "zlib";
import { VitePWA } from "vite-plugin-pwa";

function createIntegrationAppToken() {
  const workspaceKey = process.env.INTEGRATION_APP_WORKSPACE_KEY ?? process.env.MEMBRANE_WORKSPACE_KEY;
  const workspaceSecret = process.env.INTEGRATION_APP_WORKSPACE_SECRET ?? process.env.MEMBRANE_WORKSPACE_SECRET;

  if (!workspaceKey || !workspaceSecret) {
    throw new Error("Integration.app workspace credentials missing");
  }

  const base64Url = (input: string | Buffer) =>
    Buffer.from(input)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      id: "demo-user",
      name: "Demo User",
      fields: {},
      iss: workspaceKey,
      iat: now,
      exp: now + 60 * 60,
    }),
  );
  const body = `${header}.${payload}`;
  const signature = createHmac("sha256", workspaceSecret).update(body).digest();
  return `${body}.${base64Url(signature)}`;
}

function integrationAppTokenDevPlugin(): Plugin {
  return {
    name: "integration-app-token-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/integration-app-token", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "method_not_allowed" }));
          return;
        }

        try {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ token: createIntegrationAppToken() }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "token_generation_failed" }));
        }
      });
    },
  };
}

function anythingApiDevPlugin(): Plugin {
  return {
    name: "anything-api-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/anything", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", async () => {
          let payload: unknown = null;
          try {
            payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
          } catch {
            payload = null;
          }
          try {
            const { proxyAnythingRequest } = await import("./src/lib/anything/proxy-core");
            const result = await proxyAnythingRequest(
              payload as Record<string, unknown>,
              process.env.ANYTHING_API_KEY,
            );
            res.statusCode = result.status;
            res.end(JSON.stringify(result.body));
          } catch (error) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({ error: error instanceof Error ? error.message : "proxy_failed" }),
            );
          }
        });
      });
    },
  };
}

/** Dev-server equivalent of api/manus-admin.ts so the /m page works in preview. */
function manusAdminDevPlugin(): Plugin {
  return {
    name: "manus-admin-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/manus-admin", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", async () => {
          let payload: unknown = null;
          try {
            payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
          } catch {
            payload = null;
          }
          try {
            const { handleManusAdmin } = await import("./src/lib/manus/adminCore");
            const result = await handleManusAdmin(payload as never, process.env.M_ADMIN_PASSWORD);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.body));
          } catch (error) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({ error: error instanceof Error ? error.message : "manus_admin_failed" }),
            );
          }
        });
      });
    },
  };
}

/** Dev-server equivalent of api/computer-agent.ts (in-chat Computer Agent). */
function computerAgentDevPlugin(): Plugin {
  return {
    name: "computer-agent-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/computer-agent", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", async () => {
          let payload: unknown = null;
          try {
            payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
          } catch {
            payload = null;
          }
          try {
            const { handleComputerAgent } = await import("./src/lib/manus/agentCore");
            const result = await handleComputerAgent(payload as never);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.body));
          } catch (error) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({ error: error instanceof Error ? error.message : "computer_agent_failed" }),
            );
          }
        });
      });
    },
  };
}

/** Dev-server equivalent of api/web-search.ts (Deep Research live sources). */
function webSearchDevPlugin(): Plugin {
  return {
    name: "web-search-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/web-search", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", async () => {
          let payload: { query?: string; count?: number; offset?: number } | null = null;
          try {
            payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
          } catch {
            payload = null;
          }
          try {
            const { webSearch } = await import("./src/lib/search/webSearchCore");
            const data = await webSearch(
              String(payload?.query ?? ""),
              Number(payload?.count ?? 8),
              Number(payload?.offset ?? 0),
            );
            res.statusCode = 200;
            res.end(JSON.stringify(data));
          } catch (error) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                results: [],
                error: error instanceof Error ? error.message : "search_failed",
              }),
            );
          }
        });
      });
    },
  };
}

/** Dev-server equivalent of api/read-url.ts (Deep Research page reader). */
function readUrlDevPlugin(): Plugin {
  return {
    name: "read-url-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/read-url", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", async () => {
          let payload: { urls?: string[]; maxChars?: number } | null = null;
          try {
            payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
          } catch {
            payload = null;
          }
          try {
            const { readUrls } = await import("./src/lib/search/readUrlCore");
            const pages = await readUrls(
              Array.isArray(payload?.urls) ? payload!.urls!.map(String) : [],
              Number(payload?.maxChars ?? 9000),
            );
            res.statusCode = 200;
            res.end(JSON.stringify({ pages }));
          } catch (error) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                pages: [],
                error: error instanceof Error ? error.message : "read_failed",
              }),
            );
          }
        });
      });
    },
  };
}

/** Dev-server equivalent of api/deep-research.ts (Linkup research provider). */
function deepResearchDevPlugin(): Plugin {
  return {
    name: "deep-research-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/deep-research", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", async () => {
          let payload: Record<string, any> | null = null;
          try {
            payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
          } catch {
            payload = null;
          }
          try {
            const mod = await import("./src/lib/research/linkupCore");
            const data =
              payload?.action === "poll"
                ? await mod.getLinkupResearch(String(payload?.id ?? ""))
                : await mod.createLinkupResearch({
                    query: String(payload?.query ?? ""),
                    depth: payload?.depth,
                    mode: payload?.mode,
                  });
            res.statusCode = 200;
            res.end(JSON.stringify(data));
          } catch (error) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : "deep_research_failed",
              }),
            );
          }
        });
      });
    },
  };
}

/** Dev-server streaming proxy for the independent research report writer. */
function researchWriterDevPlugin(): Plugin {
  return {
    name: "research-writer-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/research-write", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        req.on("end", async () => {
          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
            const { proxyResearchWriter } = await import("./src/lib/research/researchWriterCore");
            const response = await proxyResearchWriter(payload);
            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            if (!response.body) {
              res.end();
              return;
            }
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
            res.end();
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : "writer_failed" }));
          }
        });
      });
    },
  };
}


/** Dev-server equivalent of api/transcribe.ts (composer mic dictation). */
function transcribeDevPlugin(): Plugin {
  return {
    name: "transcribe-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/transcribe", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", async () => {
          try {
            const buf = Buffer.concat(chunks);
            const request = new Request("http://localhost/api/transcribe", {
              method: "POST",
              headers: { "content-type": String(req.headers["content-type"] || "") },
              body: buf,
            });
            const form = await request.formData();
            const file = form.get("file");
            const language = String(form.get("language") || "") || undefined;
            if (!(file instanceof Blob)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ text: "", error: "No audio uploaded" }));
              return;
            }
            const { transcribeAudio } = await import("./src/lib/audio/transcribeCore");
            const filename = (file as File).name || undefined;
            const { status, body } = await transcribeAudio(file, { language, filename });
            res.statusCode = status;
            res.end(JSON.stringify(body));
          } catch (error) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                text: "",
                error: error instanceof Error ? error.message : "transcription_failed",
              }),
            );
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    researchWriterDevPlugin(),
    react({
      babel: {
        plugins: [
          // React Compiler — auto-memoizes every component and hook across
          // the site. Eliminates unnecessary re-renders without hand-written
          // React.memo / useMemo / useCallback everywhere. Runs at build time.
          ["babel-plugin-react-compiler", { target: "19" }],
        ],
      },
    }),
    integrationAppTokenDevPlugin(),
    anythingApiDevPlugin(),
    manusAdminDevPlugin(),
    computerAgentDevPlugin(),
    webSearchDevPlugin(),
    readUrlDevPlugin(),
    deepResearchDevPlugin(),


    transcribeDevPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      strategies: "generateSW",
      filename: "sw.js",
      devOptions: { enabled: false },
      includeAssets: [
        "offline.html",
        "robots.txt",
      ],
      manifestFilename: "site.webmanifest",
      manifest: false,
      workbox: {
        // Precache ONLY the app shell (entry JS + CSS + HTML + tiny icons/fonts).
        // Everything else — code-split route chunks, syntax highlighting
        // grammars, mermaid diagram types, images — is cached at runtime via
        // CacheFirst on first request. This keeps first-install download
        // under ~1MB instead of ~44MB and dramatically speeds up SW install.
        globPatterns: [
          "index.html",
          "offline.html",
          "manifest.webmanifest",
          "site.webmanifest",
          "assets/index-*.{js,css}",
          "assets/react-vendor-*.js",
          "*.{ico,webmanifest}",
        ],
        globIgnores: [
          "**/megsy-push-sw.js",
          "**/service-worker.js",
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/api\//,
          /^\/auth\//,
          /^https:\/\/[^/]+\.supabase\.co\//,
          /^https:\/\/[^/]+\.supabase\.in\//,
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-nav",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 40, maxAgeSeconds: 24 * 60 * 60 },
              // If both the network and the precache miss (e.g. index.html
              // hasn't been cached yet on a brand-new offline install), fall
              // back to the static offline page instead of a broken request.
              plugins: [
                {
                  handlerDidError: async () => caches.match("/offline.html"),
                },
              ],
            },
          },
          {
            // Hashed, immutable build output — safe to cache aggressively.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "build-assets",
              expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            // Images: first request downloads, every later one is served from
            // the local cache without touching the network.
            urlPattern: ({ url }) =>
              /\.(?:png|jpe?g|webp|avif|svg|gif|ico)$/i.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "img-assets",
              expiration: { maxEntries: 400, maxAgeSeconds: 90 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Static JSON data (i18n dictionaries, template registries, etc.).
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.json$/i.test(url.pathname) && !url.pathname.includes("manifest"),
            handler: "CacheFirst",
            options: {
              cacheName: "static-json",
              expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // Cross-origin fonts + stylesheets (Google Fonts) and CDN assets.
            urlPattern: ({ url, sameOrigin }) =>
              !sameOrigin &&
              (/fonts\.(?:googleapis|gstatic)\.com$/.test(url.hostname) ||
                url.pathname.startsWith("/__l5e/assets-v1/")),
            handler: "CacheFirst",
            options: {
              cacheName: "external-assets",
              expiration: { maxEntries: 120, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(?:woff2?|ttf|otf)$/i.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
    // Pre-compress build assets with Brotli and Gzip so hosting (Cloudflare /
    // Vercel / static edge) can serve the smallest possible payload without
    // recompressing per request. Skips small and already-compressed assets.
    compression({
      algorithms: [
        defineAlgorithm("brotliCompress", {
          params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
        }),
        defineAlgorithm("gzip", { level: 9 }),
      ],
      exclude: [/\.(br|gz|png|jpe?g|webp|avif|woff2?|mp4|webm)$/i],
      threshold: 1024,
    }),
    // Enable with `ANALYZE=1 bun run build` — writes dist/stats.html.
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: "dist/stats.html",
            gzipSize: true,
            brotliSize: true,
            template: "treemap",
          }) as Plugin,
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Side-effect-only Node stream imports coming from @tanstack/react-start
      // must never reach the browser as bare `node:` specifiers.
      "node:stream/web": path.resolve(__dirname, "./src/lib/node-stream-browser-stub.ts"),
      "node:stream": path.resolve(__dirname, "./src/lib/node-stream-browser-stub.ts"),
      "#tanstack-router-entry": path.resolve(__dirname, "./src/lib/tanstack-router-entry-stub.ts"),
      "#tanstack-start-entry": path.resolve(__dirname, "./src/lib/tanstack-router-entry-stub.ts"),
      "tanstack-start-manifest:v": path.resolve(__dirname, "./src/lib/tanstack-start-manifest-stub.ts"),

    },
  },
  optimizeDeps: {
    // Static HTML templates under public/templates/* import 3D libs from CDNs
    // (three/addons, stats-gl, etc.) directly in the browser. Vite's dep
    // scanner tries to resolve them from node_modules and warns on every boot.
    // They are not part of the app bundle — exclude them from scanning.
    entries: ["index.html", "src/**/*.{ts,tsx}"],
    // Pre-bundle icon + date + class helper libs once. They ship hundreds of
    // tiny ESM files; without pre-bundling the dev server issues a separate
    // request per icon / helper (thousands of round-trips) — the single biggest
    // source of dev-time lag. Prod already tree-shakes them via package exports.
    include: [
      "use-sync-external-store/shim/with-selector",
      "lucide-react",
      "date-fns",
      "date-fns/locale",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      // Brand icons are dynamically imported per-brand (BrandIcon.tsx). Without
      // pre-bundling, the first render of a new brand triggers a mid-session
      // dep re-optimize, which invalidates already-loaded chunk URLs and makes
      // the page hang with "Failed to fetch dynamically imported module".
      ...[
        "Flux","Bfl","OpenAI","Gemini","NanoBanana","Ideogram","Recraft","ByteDance","Doubao",
        "Alibaba","Kling","Minimax","Runway","Stability","Grok","XAI","Fal","Sora","Luma","Pika",
        "PixVerse","Hailuo","Hedra","Hunyuan","CogVideo","Kolors","Krea","Midjourney","Dalle",
        "TopazLabs","Claude","Anthropic","Perplexity","Zhipu","Kimi",
      ].map((n) => `@lobehub/icons/es/${n}`),
    ],


    exclude: ["msw", "@mswjs/interceptors", "@tanstack/react-start", "@tanstack/start-server-core"],
  },

  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    allowedHosts: true,
  },
  // Drop console.* and debugger from production JS via esbuild — no terser install needed.
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    legalComments: "none",
  },
  // Workers must be single-file bundles — disable manualChunks/external for
  // the worker build so `new Worker(new URL(...))` compiles cleanly.
  worker: {
    format: "es",
    rollupOptions: {
      output: { manualChunks: undefined, inlineDynamicImports: true },
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 1200,
    minify: "esbuild",
    // Fully disable modulepreload. Vite's default behavior preloads the
    // transitive graph of every async chunk from the entry, which meant the
    // landing page eagerly fetched ~1MB of markdown/syntax/icons/chat code
    // even though those chunks are only used inside authenticated routes.
    // Each lazy route now fetches its own chunks strictly on demand.
    modulePreload: false,
    rollupOptions: {
      external: [/^npm:/, /^https?:\/\//, /^jsr:/, /^node:/],
      output: {
        // Keep only the truly universal runtime packages in a shared vendor
        // chunk. Everything else is left to Rollup's default splitter so that
        // route-specific dependencies (markdown, syntax highlighting, lobehub
        // brand icons, radix widgets, framer-motion, etc.) travel with the
        // async chunk that actually uses them instead of being force-hoisted
        // into the entry graph. This is the fix for the "landing page loads
        // 3.9 MB of JS" regression.
        manualChunks(id) {
          // Vite's dynamic-import preload helper is a virtual module. Left to
          // Rollup it got parked inside a random async chunk (assistant-ui),
          // which then had to be downloaded before first paint. Pin it next to
          // the React runtime so the shell never drags a route chunk with it.
          if (id.includes("vite/preload-helper")) return "react-vendor";
          if (!id.includes("node_modules")) return;
          // Tiny runtime helpers shared by many packages. Left unpinned they
          // land in whichever async chunk Rollup picks first, which forces the
          // shell to download an unrelated route chunk at boot.
          if (
            id.includes("@babel/runtime") ||
            /[\\/]node_modules[\\/]tslib[\\/]/.test(id)
          ) {
            return "react-vendor";
          }

          // MUST come before the react-vendor rule below: the substring
          // "react-router" also matches `@tanstack/react-router`, which is a
          // transitive dependency of `@tanstack/react-start` and ships SSR
          // helpers that `import "node:stream"`. Grouping it into the entry
          // chunk left bare `node:stream` imports in the browser bundle, so
          // the production app died with a CORS/scheme error and rendered a
          // blank page. Keep the whole Start/Router SSR family in one chunk
          // that only the PDF path ever loads.
          if (
            id.includes("@tanstack/react-start") ||
            id.includes("@tanstack/start-") ||
            id.includes("@tanstack/react-router") ||
            id.includes("@tanstack/router-core") ||
            id.includes("@tanstack/devtools")
          ) {
            return "tanstack-start";
          }



          // Truly universal — only the React runtime + router live in the
          // entry chunk. Everything else must travel with the route/component
          // that first imports it, Facebook-style.
          if (
            /[\\/]node_modules[\\/]react-dom[\\/]/.test(id) ||
            /[\\/]node_modules[\\/]react[\\/]/.test(id) ||
            id.includes("scheduler") ||
            id.includes("react-router") ||
            // Radix depends heavily on React and has internal circular deps.
            // Splitting it into its own chunk caused a production race where
            // `radix` executed before `react-vendor` finished initializing,
            // throwing "Cannot read properties of undefined (reading
            // 'forwardRef')" and leaving the app on a black splash. Keep
            // Radix bundled with React so imports resolve in-file, top-down.
            id.includes("@radix-ui")
          ) {
            return "react-vendor";
          }
          // Keep Integration.app out of react-vendor. Its package path is
          // accidentally bundled the SDK into the React runtime chunk. The SDK
          // imports SWR/client helpers that also live in other async chunks,
          // creating a production circular import and crashing before mount
          // with "Cannot access '<var>' before initialization".
          // @assistant-ui is a core chat dependency and MUST NOT share a chunk
          // with the 1 MB Integration.app SDK — otherwise opening /chat pulls
          // the whole integrations SDK down before first paint.
          if (id.includes("@assistant-ui")) return "assistant-ui";
          if (id.includes("@supabase")) return "supabase";


          // Motion must stay in one chunk. Splitting Framer Motion internals
          // across `motion-core` / `motion-features` can break its circular
          // initialization order in production builds and crash before React
          // mounts, leaving the app on a blank black screen.
          if (id.includes("framer-motion")) {
            return "motion";
          }

          // @lobehub icons: split per provider so a page that only shows OpenAI
          // doesn't fetch Anthropic + Google + Grok + 50 more SVG chunks.
          if (id.includes("@lobehub")) {
            // Real path shape is `@lobehub/icons/es/<IconName>/index.js` and
            // shared internals live under `@lobehub/icons/es/features|utils|...`.
            const m = id.match(/@lobehub\/icons\/(?:es|dist|lib)\/([^/]+)/i);
            if (m) {
              const seg = m[1].toLowerCase();
              // Keep shared runtime in a single small chunk; each brand icon
              // gets its own chunk so pages only pay for what they render.
              if (["features", "utils", "type", "types", "style", "hooks"].includes(seg)) {
                return "lobehub-runtime";
              }
              return `lobehub-${seg}`;
            }
            return "lobehub-core";
          }

          // lucide-react: one shared "icons" chunk containing ONLY the icons
          // the app actually imports (the `import * as Lucide` barrel that
          // used to defeat tree-shaking is gone). Left to Rollup, every icon
          // became its own ~1 kB chunk and the first load fired 60+ extra HTTP
          // requests — pure latency with no payload benefit.
          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
            return "icons";
          }

          if (
            id.includes("react-markdown") ||
            id.includes("remark-") ||
            id.includes("rehype-") ||
            id.includes("micromark") ||
            id.includes("mdast-") ||
            id.includes("hast-") ||
            id.includes("unified") ||
            id.includes("unist-")
          ) {
            return "markdown";
          }
          // Bundle only the highlighter runtime here — leave per-language
          // grammars (prism/{lang} + refractor/lang/{lang}) as separate
          // dynamic chunks so `CodeBlockHighlighter` can fetch them per
          // fenced block instead of shipping every language up-front.
          if (
            (id.includes("react-syntax-highlighter") ||
              id.includes("refractor") ||
              id.includes("prismjs") ||
              id.includes("highlight.js")) &&
            !/[\\/](languages|lang)[\\/]prism[\\/]/.test(id) &&
            !/react-syntax-highlighter[\\/]dist[\\/](esm|cjs)[\\/]languages[\\/]/.test(id) &&
            !/refractor[\\/]lang[\\/]/.test(id) &&
            !/prismjs[\\/]components[\\/]/.test(id)
          ) {
            return "syntax";
          }
          // Keep @tanstack/react-start + start-server-core out of the entry
          // chunk. They pull in `node:async_hooks` (Node-only) and are only
          // reachable through dynamic imports (renderPdf.functions,
          // fxRate.functions). Grouping them with react-query put node:
          // imports in the entry bundle and blocked the app from booting
          // in the browser.
          if (id.includes("@tanstack/react-start") || id.includes("@tanstack/start-")) {
            return "tanstack-start";
          }
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("date-fns") || id.includes("dayjs")) return "date";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("hls.js")) return "hls";
          if (id.includes("lenis")) return "lenis";
          // Heavy editor / doc / media libs — isolate so they never get
          // hoisted into the entry graph and only load on the routes that
          // actually use them.
          // NOTE: for libs that ship many small dynamically-imported modules
          // (shiki language grammars, mermaid diagram types, monaco language
          // workers, tiptap extensions), we intentionally DO NOT group them
          // into a single chunk. Grouping forces Rollup to hoist every
          // dynamic import into one giant file (14–19MB), destroying the
          // lazy loading these libs were designed for. Let Rollup split.
          if (id.includes("monaco-editor/esm/vs/editor/editor.main")) return "monaco-core";
          if (id.includes("gsap")) return "gsap";
          if (id.includes("xlsx")) return "xlsx";
          if (id.includes("mammoth")) return "mammoth";
          if (id.includes("pdfjs-dist")) return "pdfjs";
          if (id.includes("@react-pdf")) return "react-pdf";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("html-to-image")) return "pdf-export";
          if (id.includes("pptxgenjs") || id.includes("pptx-preview") || id.includes("docx") || id.includes("jszip") || id.includes("file-saver")) return "office";
          if (id.includes("@ffmpeg")) return "ffmpeg";
          if (id.includes("@imgly")) return "imgly";
          if (id.includes("@paper-design") || id.includes("simplex-noise")) return "shaders";
          if (id.includes("@sentry")) return "sentry";
          if (id.includes("@telegram-apps") || id.includes("@twa-dev")) return "telegram";
        },
      },
    },

  },
});
