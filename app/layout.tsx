import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { ConfirmProvider } from "@/lib/providers/ConfirmProvider";
import { UserProfileProvider } from "@/lib/providers/UserProfileProvider";

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
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <UserProfileProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </UserProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}