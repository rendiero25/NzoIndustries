import { FROM, resend } from "@/lib/email/resend";
import { welcomeEmailHtml } from "@/lib/email/templates/welcome";

export async function sendWelcomeEmail({
  to,
  name,
  activationUrl,
}: {
  to: string;
  name: string;
  activationUrl?: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nzo-industries.test";

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: activationUrl
      ? "Aktifkan Akunmu di NZO Industries!"
      : "Selamat Datang di NZO Industries!",
    html: welcomeEmailHtml({ name, appUrl, activationUrl }),
  });

  if (error) {
    console.error("[email] sendWelcomeEmail failed:", error);
  }
}
