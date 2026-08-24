import type {
  AttachmentAdapter,
  PendingAttachment,
  CompleteAttachment,
  Attachment,
} from "@assistant-ui/react";

/**
 * AttachmentAdapter يربط assistant-ui بمنظومة الرفع الحالية في Megsy
 * (useAttachments + useMediaUpload) بدون تغيير سلوك الواجهة الحالية.
 *
 * الأدابتر لا يرفع الملف فوراً — بل يحوّله إلى data-url ويسلّمه لـ
 * assistant-ui كـ complete attachment عند الإرسال. الرفع الفعلي إلى
 * Supabase يبقى مسؤولية `handleSend` الأصلي في ChatPage (لضمان صفر
 * تغيير في الباك اند). وظيفة هذا الأدابتر هي فقط إتاحة استخدام
 * `ComposerPrimitive.Attachments` / `AttachmentPrimitive.*` لاحقاً
 * فوق نفس الحالة.
 */

const ACCEPT_TYPES = "image/*,video/*,audio/*,application/pdf,.txt,.md,.json,.csv";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function inferKind(file: File): PendingAttachment["type"] {
  const t = file.type.toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  return "document";
}

export function createMegsyAttachmentAdapter(): AttachmentAdapter {
  return {
    accept: ACCEPT_TYPES,

    async add({ file }: { file: File }): Promise<PendingAttachment> {
      return {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: inferKind(file),
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      };
    },

    async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
      const kind = attachment.type;
      const dataUrl = await readAsDataURL(attachment.file);
      if (kind === "image") {
        return {
          ...attachment,
          status: { type: "complete" },
          content: [{ type: "image", image: dataUrl }],
        };
      }
      // For non-image files we surface as a text placeholder referencing the file.
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "text",
            text: `<attachment name="${attachment.name}" type="${attachment.contentType ?? ""}" />`,
          },
        ],
      };
    },

    async remove(_attachment: Attachment): Promise<void> {
      // Removal from the visible composer strip is handled by the existing
      // useAttachments state in ChatPage — nothing to do here.
    },
  };
}
