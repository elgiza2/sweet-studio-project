import { useEffect } from "react";
import { useComposerRuntime } from "@assistant-ui/react";
import type { AttachedFile } from "../../hooks/useAttachments";

/**
 * جسر أحادي الاتجاه: يعكس قائمة `attachedFiles` (المصدر الأصلي في
 * ChatPage → useAttachments) إلى runtime composer الخاص بـ assistant-ui.
 * يسمح للـ primitives (ComposerPrimitive.Attachments / Attachment.*)
 * بقراءة نفس المرفقات المرئية بدون تكرار الحالة.
 *
 * لا يضيف أي DOM، ولا يغير سلوك الإرسال — الإرسال ما زال يمر عبر
 * handleSend الأصلي في ChatPage.
 */
export function AttachmentsSync({
  attachedFiles,
}: {
  attachedFiles: AttachedFile[];
}) {
  const composer = useComposerRuntime();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await composer.clearAttachments();
      } catch {
        /* ignore */
      }
      for (const f of attachedFiles) {
        if (cancelled) return;
        try {
          const blob = await dataUrlToBlob(f.data);
          const file = new File([blob], f.name, { type: blob.type });
          await composer.addAttachment(file);
        } catch {
          /* ignore individual failures */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attachedFiles, composer]);

  return null;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

