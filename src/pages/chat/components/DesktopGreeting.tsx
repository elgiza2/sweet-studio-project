import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { t as uiT, useUserLang } from "@/lib/authI18n";

interface DesktopGreetingProps {
  userName: string | null | undefined;
  isFirstVisit: boolean;
  returningGreetingIdx: number;
}

// Keys resolved through the shared UI dictionary so the hero line follows the
// user's language instead of always rendering English.
const entryTaglineKeys = ["greeting1", "greeting2", "greeting3", "greeting4", "greeting5"];

/**
 * Desktop-only chat empty state. The line changes once per page entry and then
 * stays fixed, sitting over the wavy canvas background.
 *
 * NOTE: Desktop-only (hidden md:flex). Do not repurpose for mobile.
 */
export const DesktopGreeting = (_: DesktopGreetingProps) => {
  const lang = useUserLang();
  const [taglineIdx, setTaglineIdx] = useState(0);

  useEffect(() => {
    const key = "megsy:desktop-greeting-index";
    const previous = Number(window.localStorage.getItem(key) || "-1");
    const next = Number.isFinite(previous) ? (previous + 1) % entryTaglineKeys.length : 0;
    window.localStorage.setItem(key, String(next));
    setTaglineIdx(next);
  }, []);

  const tagline = uiT(entryTaglineKeys[taglineIdx], lang);


  return (
    <>
      {/* Flat unified surface — decorative wave removed. */}

      <div className="relative z-[7] hidden md:flex items-center justify-center px-6 pb-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p
              data-greeting
              dir="ltr"
              className="max-w-4xl text-center text-[42px] font-semibold leading-[1.06] text-foreground drop-shadow-[0_0_28px_rgba(96,165,250,0.28)] lg:text-[58px]"
              style={{ fontFamily: "'Instrument Serif', 'Fraunces', ui-serif, Georgia, serif" }}
            >
              {tagline}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default DesktopGreeting;
