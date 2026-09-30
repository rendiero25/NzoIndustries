import { createHash } from "node:crypto";

import { ADMIN_EMAIL, FROM, resend } from "@/lib/email/resend";

type ContactMessageParams = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[char];
  });
}

export async function sendContactMessage(
  params: ContactMessageParams,
): Promise<{ error?: string }> {
  const subject = params.subject.replace(/\s+/g, " ").trim();
  const idempotencyHash = createHash("sha256")
    .update([params.name, params.email, params.phone, subject, params.message].join("\u0000"))
    .digest("hex");

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: [ADMIN_EMAIL],
      replyTo: params.email,
      subject: `[Form Kontak] ${subject}`,
      text: [
        "Pesan kontak baru dari website NZO Industries",
        `Nama: ${params.name}`,
        `Email: ${params.email}`,
        `Telepon: ${params.phone}`,
        `Subjek: ${subject}`,
        "",
        params.message,
      ].join("\n"),
      html: `
        <h1>Pesan kontak baru</h1>
        <p><strong>Nama:</strong> ${escapeHtml(params.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(params.email)}</p>
        <p><strong>Telepon:</strong> ${escapeHtml(params.phone)}</p>
        <p><strong>Subjek:</strong> ${escapeHtml(subject)}</p>
        <hr />
        <p style="white-space: pre-wrap">${escapeHtml(params.message)}</p>
      `,
      tags: [{ name: "email_type", value: "contact_form" }],
    },
    { idempotencyKey: `contact-form/${idempotencyHash}` },
  );

  if (error) {
    console.error("[email] sendContactMessage failed:", error);
    return { error: error.message };
  }

  return {};
}
