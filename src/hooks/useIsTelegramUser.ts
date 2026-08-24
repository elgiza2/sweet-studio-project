import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedUser } from "@/lib/cachedUser";

/**
 * Returns true only if the currently authenticated user is linked to a
 * telegram_users row (i.e. registered via the Telegram bot).
 */
export function useIsTelegramUser(): boolean {
  const [isTg, setIsTg] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getCachedUser();
      if (!user) return;
      const { data } = await supabase
        .from("telegram_users")
        .select("telegram_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setIsTg(Boolean(data));
    })().catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  return isTg;
}

export default useIsTelegramUser;