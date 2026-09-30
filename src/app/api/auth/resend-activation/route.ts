import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Email tidak valid." }, { status: 400 });
    }

    const { email } = parsed.data;

    const callbackOrigin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    const supabase = createServiceClient();

    // Cek apakah user ada dan belum confirmed
    const { data: userList } = await supabase.auth.admin.listUsers();
    const user = userList?.users.find((u) => u.email === email);

    if (!user) {
      // Jangan beri tahu kalau email tidak ada (security)
      return NextResponse.json({ success: true });
    }

    if (user.email_confirmed_at) {
      return NextResponse.json(
        { success: false, error: "Akun sudah aktif. Silakan masuk." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${callbackOrigin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      console.error("[auth/resend-activation] generateLink error:", error);
      return NextResponse.json(
        { success: false, error: "Gagal kirim ulang. Coba lagi." },
        { status: 500 },
      );
    }

    const tokenHash = data.properties.hashed_token;
    const activationUrl = `${callbackOrigin}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/dashboard`;
    const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? email;

    await sendWelcomeEmail({ to: email, name, activationUrl }).catch((err) => {
      console.error("[auth/resend-activation] sendWelcomeEmail error:", err);
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 },
    );
  }
}
