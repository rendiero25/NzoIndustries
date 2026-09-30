import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sendContactMessage } from "@/lib/email/send-contact-message";

const contactFormSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  phone: z
    .string()
    .min(10)
    .regex(/^(\+62|0)[0-9]{9,}$/),
  subject: z.string().min(5).max(100),
  message: z.string().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = contactFormSchema.parse(body);

    const result = await sendContactMessage(data);
    if (result.error) {
      return NextResponse.json(
        { success: false, error: "Gagal mengirim pesan. Coba lagi nanti." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, message: "Pesan berhasil dikirim" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Data tidak valid", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Contact form error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengirim pesan. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
