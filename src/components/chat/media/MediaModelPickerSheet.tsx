import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useDynamicModels } from "@/hooks/useModels";
import { Check, Image as ImageIcon, Video as VideoIcon, Lock } from "lucide-react";
import { glassModelMenu, glassModelMenuStyle } from "@/components/model-picker/glassModelMenuStyles";
import { BrandIcon, hasBrandIcon } from "@/components/chat/media/BrandIcon";
import megsyIcon from "@/assets/megsy-model-icon.png";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isFreeModel, isPaidUser } from "@/lib/subscriptionGating";
import { filterImageModels, filterVideoModels } from "@/lib/mediaModelPolicy";



export interface MediaModelChoice {
  slug: string;
  name: string;
  provider: string;
  credits: number;
  thumbnail?: string;
  type: "image" | "video";
  isPremium?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "images" | "video";
  selectedSlug?: string;
  onSelect: (model: MediaModelChoice) => void;
}

export default function MediaModelPickerSheet({
  open,
  onOpenChange,
  mode,
  selectedSlug,
  onSelect,
}: Props) {
  const { models, loading } = useDynamicModels();
  const { plan } = useUserPlan();
  const paid = isPaidUser(plan);
  const navigate = useNavigate();


  const filtered = useMemo(() => {
    const target = mode === "video" ? ["video", "video-i2v"] : ["image"];
    const scoped = models.filter((m) => target.includes(m.type as string));
    return (mode === "video" ? filterVideoModels(scoped) : filterImageModels(scoped))
      .sort((a, b) => {
        const fa = a.isFeatured ? 1 : 0;
        const fb = b.isFeatured ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return (a.credits || 0) - (b.credits || 0);
      });
  }, [models, mode]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={`h-[78dvh] ${glassModelMenu.bottomSheet}`}
        style={glassModelMenuStyle}
      >
        <SheetHeader className="px-5 pt-4 pb-3 border-b border-foreground/10">
          <SheetTitle className="flex items-center gap-2 text-base font-black text-foreground">
            {mode === "video" ? (
              <VideoIcon className="w-4 h-4" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            {mode === "video" ? "Choose video model" : "Choose image model"}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(78dvh-60px)]">
          <div className="p-3 grid grid-cols-1 min-[380px]:grid-cols-2 gap-2.5">
            {loading && (
              <div className="col-span-2 text-center py-10 text-sm text-muted-foreground">
                Loading models…
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="col-span-2 text-center py-10 text-sm text-muted-foreground">
                No models available right now
              </div>
            )}
            {filtered.map((m) => {
              const active = m.slug === selectedSlug;
              const modelIsFree = isFreeModel(m.slug || m.id);
              const locked = !modelIsFree && !paid;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      toast.error("Upgrade to Starter or higher to use this model.");
                      onOpenChange(false);
                      navigate("/pricing");
                      return;
                    }
                    onSelect({
                      slug: m.slug || m.id,
                      name: m.name,
                      provider: m.provider,
                      credits: m.credits,
                      thumbnail: m.thumbnailUrl || m.iconUrl,
                      type: mode === "video" ? "video" : "image",
                      isPremium: !!m.isPremium,
                    });
                    toast.success(`Selected: ${m.name}`);
                  }}
                  className={glassModelMenu.card(active, "text-start rounded-[20px] active:scale-[0.98] relative")}
                >
                  {locked && (
                    <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-400/25 text-amber-500 border border-amber-400/30">
                      <Lock className="w-2.5 h-2.5" /> Pro
                    </span>
                  )}

                  <div className="aspect-[4/3] w-full rounded-xl overflow-hidden mb-2 flex items-center justify-center">
                    {hasBrandIcon(m.name, m.provider) ? (
                      <BrandIcon name={m.name} provider={m.provider} size={64} variant="color" />
                    ) : m.thumbnailUrl ? (
                      <img decoding="async"
                        src={m.thumbnailUrl}
                        alt={m.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img loading="lazy" decoding="async"
                        src={megsyIcon}
                        alt="Megsy"
                        className="w-14 h-14 object-contain"
                      />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 flex items-center gap-1.5">
                      {hasBrandIcon(m.name, m.provider) ? (
                        <BrandIcon name={m.name} provider={m.provider} size={16} variant="color" className="shrink-0" />
                      ) : (
                        <img loading="lazy" decoding="async" src={megsyIcon} alt="" className="w-4 h-4 shrink-0 object-contain" />
                      )}
                      <div className="font-black text-sm truncate text-foreground">
                        {m.name}
                      </div>
                    </div>
                    {active && <Check className="w-4 h-4 text-brand-action shrink-0 mt-0.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
