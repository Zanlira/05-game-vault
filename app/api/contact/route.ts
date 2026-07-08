import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, msg } = body as {
    name: string;
    email: string;
    msg: string;
  };

  if (!name?.trim() || !email?.trim() || !msg?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "support@elyntic.mx",
      to: [
        "yairramirezgaona@gmail.com",
        "zantlira@gmail.com"
      ],
      subject: `Mensaje de ${name} — Elyntic Compras`,
      text: `Nombre: ${name}\nEmail: ${email}\n\n${msg}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
