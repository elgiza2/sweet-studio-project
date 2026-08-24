import { findSlidesTemplate } from "@/lib/slidesTemplates";

interface SlidesTemplateButtonProps {
  slidesTemplate: string;
  onOpenPicker: () => void;
}

/**
 * Pill-shaped button shown inside the composer when the active chat mode is one
 * of the slides modes. Displays the currently selected template's cover image
 * (preferred) and its name.
 */
export default function SlidesTemplateButton({
  slidesTemplate,
  onOpenPicker,
}: SlidesTemplateButtonProps) {
  const template = findSlidesTemplate(slidesTemplate);
  return (
    <button
      type="button"
      onClick={onOpenPicker}
      className="inline-flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-full border-2 border-surface-4 bg-surface-2 text-foreground hover:border-[#3A3A3A] transition-colors text-[12px] font-black"
      aria-label="Choose template"
    >
      <span className="w-6 h-6 rounded-full overflow-hidden border border-brand-ink bg-brand-ink shrink-0">
        {template.cover ? (
          <img decoding="async" src={template.cover} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : null}
      </span>
      <span className="truncate max-w-[140px]">{template.name}</span>
    </button>
  );
}
