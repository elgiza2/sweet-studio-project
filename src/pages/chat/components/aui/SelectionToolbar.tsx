import { SelectionToolbarPrimitive } from "@assistant-ui/react";
import { Quote } from "lucide-react";

/**
 * شريط اقتباس عائم فوق التحديد داخل الرسائل. يستخدم primitives assistant-ui
 * (`SelectionToolbarPrimitive.Root` + `.Quote`) لتموضع تلقائي فوق التحديد،
 * وتمرير النص المحدد إلى composer الـ thread عبر آلية quotes المدمجة —
 * بدون تعديل أي شيء في شكل الرسائل الحالية.
 *
 * التصميم يستخدم tokens المشروع (bg-popover / border-foreground/10) لضمان
 * توافق كامل مع الثيم الحالي.
 */
export function SelectionToolbar() {
  return (
    <SelectionToolbarPrimitive.Root className="z-50 flex items-center gap-1 rounded-lg border border-foreground/10 bg-popover px-1.5 py-1 shadow-lg backdrop-blur">
      <SelectionToolbarPrimitive.Quote className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-foreground hover:bg-foreground/5">
        <Quote className="h-3 w-3" />
        <span>Quote</span>
      </SelectionToolbarPrimitive.Quote>
    </SelectionToolbarPrimitive.Root>
  );
}
