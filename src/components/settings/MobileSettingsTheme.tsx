import { useEffect } from "react";
import { useLocation } from "react-router-dom";


/**
 * Toggles the `ms-theme` class on <body> whenever the user is on a mobile
 * settings route. This applies the purple/pink neon theme scoped in
 * `src/styles/mobile-settings-theme.css` without touching every page.
 */
export function MobileSettingsTheme() {
  const { pathname } = useLocation();
  const appPath = pathname;

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onSettings = appPath === "/settings" || appPath.startsWith("/settings/");
    const sync = () => {
      document.body.classList.toggle("ms-theme", onSettings && mql.matches);
    };
    sync();
    mql.addEventListener("change", sync);
    return () => {
      mql.removeEventListener("change", sync);
      document.body.classList.remove("ms-theme");
    };
  }, [appPath]);

  return null;
}

export default MobileSettingsTheme;
