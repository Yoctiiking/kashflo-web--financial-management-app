"use client";

import { useAuth } from "@/lib/providers/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { logoutUser } from "@/lib/firebase/auth";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "💸" },
  { href: "/budgets", label: "Budgets", icon: "🎯" },
  { href: "/recurrences", label: "Récurrences", icon: "🔄" },
  { href: "/stats", label: "Statistiques", icon: "📈" },
  { href: "/settings", label: "Paramètres", icon: "⚙️" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar — desktop uniquement */}
      <aside className="hidden md:flex w-64 bg-gray-900 border-r border-gray-800 flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">
            Kash<span className="text-emerald-500">Flo</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{user.displayName}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 font-medium"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => logoutUser().then(() => router.push("/login"))}
            className="w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile uniquement */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                isActive ? "text-emerald-400" : "text-gray-500"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="truncate w-full text-center px-0.5">
                {item.label === "Récurrences" ? "Récurr." : item.label === "Statistiques" ? "Stats" : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}