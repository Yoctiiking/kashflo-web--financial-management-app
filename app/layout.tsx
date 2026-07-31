import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { ConfirmProvider } from "@/lib/providers/ConfirmProvider";
import { UserProfileProvider } from "@/lib/providers/UserProfileProvider";
import { LanguageProvider } from "@/lib/providers/LanguageProvider";
import { ThemeProvider } from "@/lib/providers/ThemeProvider";
import EnterKeyNavigation from "@/components/EnterKeyNavigation";
import EscapeKeyClose from "@/components/EscapeKeyClose";

// Applique le thème stocké avant le premier rendu pour éviter un flash du mauvais thème.
// Le mode sombre reste la valeur par défaut (className="dark" sur <html>) tant que
// l'utilisateur n'a pas explicitement choisi le mode clair.
const themeBootScript = `
  try {
    if (localStorage.getItem('kashflo-theme') === 'light') {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kash Flo",
  description: "Know where your money flows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <EnterKeyNavigation />
          <EscapeKeyClose />
          <AuthProvider>
            <UserProfileProvider>
              <LanguageProvider>
                <ConfirmProvider>
                  {children}
                </ConfirmProvider>
              </LanguageProvider>
            </UserProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}