import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, message, userId } = body;

        if (!name || !email || !message) {
            return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
        }

        const { error } = await resend.emails.send({
            from: "KashFlo <onboarding@resend.dev>",
            to: "yedeyoctan@gmail.com", // ← remplace par ton vrai email
            replyTo: email,
            subject: `Nouveau feedback KashFlo — ${name}`,
            html: `
        <h2>Nouveau feedback reçu</h2>
        <p><strong>Nom :</strong> ${name}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>User ID :</strong> ${userId || "Non connecté"}</p>
        <p><strong>Message :</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `
        });

        if (error) {
            console.error("Erreur Resend:", error);
            return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}