// Stub for the "#tanstack-router-entry" specifier that
// @tanstack/start-server-core expects the TanStack Start Vite plugin to
// provide. This app is a plain Vite SPA and never runs that server entry,
// but the module graph still resolves the specifier at build time.
export const createRouter = () => {
  throw new Error("TanStack Start server entry is not available in this app.");
};

export default { createRouter };
