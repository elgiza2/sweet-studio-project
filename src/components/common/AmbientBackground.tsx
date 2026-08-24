/**
 * AmbientBackground
 * Site-wide animated aurora layer. Mounted once at the app root.
 * - Fixed, pointer-events: none, behind all content (z-index: -1)
 * - GPU transforms only (cheap on mobile)
 * - Respects prefers-reduced-motion (CSS-handled)
 */
const AmbientBackground = () => {
  return (
    <div className="ambient-bg" aria-hidden>
      <div className="ambient-bg__blob ambient-bg__blob--a" />
      <div className="ambient-bg__blob ambient-bg__blob--b" />
      <div className="ambient-bg__blob ambient-bg__blob--c" />
    </div>
  );
};

export default AmbientBackground;
