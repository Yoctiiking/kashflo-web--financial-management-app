"use client";

import { useAuth } from "@/lib/providers/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutUser } from "@/lib/firebase/auth";
import { getRecurrences } from "@/lib/firebase/firestore";
import Link from "next/link";
import { useInactivityLogout } from "@/lib/hooks/useInactivityLogout";
import { useAppLock } from "@/lib/hooks/useAppLock";
import LockScreen from "@/components/LockScreen";
import { useUserProfile } from "@/lib/providers/UserProfileProvider";
import { isAdmin } from "@/lib/admin";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Users,
  PiggyBank,
  Repeat,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ShieldCheck
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/shared-budgets", label: "Partagés", icon: Users },
  { href: "/savings", label: "Épargne", icon: PiggyBank },
  { href: "/recurrences", label: "Récurrences", icon: Repeat },
  { href: "/stats", label: "Statistiques", icon: BarChart3 },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

const adminNavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };

const primaryMobileItems = ["/dashboard", "/transactions", "/budgets", "/recurrences"];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { locked, unlock } = useAppLock();

  useInactivityLogout(user);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!user.emailVerified) {
      router.push("/verify-email");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !user.emailVerified) return;
    const loadUpcoming = async () => {
      try {
        const recurrences = await getRecurrences(user.uid);
        const now = new Date();
        const upcoming = recurrences.filter(r => {
          if (!r.isActive) return false;
          const diffDays = (r.nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 3;
        });
        setUpcomingCount(upcoming.length);
      } catch (err) {
        console.error(err);
      }
    };
    loadUpcoming();
  }, [user]);

  useEffect(() => {
    setShowMoreMenu(false);
  }, [pathname]);

  if (loading || !user || !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = isAdmin(user.email, profile?.isAdmin) ? [...navItems, adminNavItem] : navItems;
  const mobilePrimary = items.filter(item => primaryMobileItems.includes(item.href));
  const mobileMore = items.filter(item => !primaryMobileItems.includes(item.href));
  const isMoreActive = mobileMore.some(item => item.href === pathname);

  if (locked) {
    return <LockScreen onUnlock={unlock} />;
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar — desktop uniquement */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Kash<span className="text-emerald-600 dark:text-emerald-500">Flo</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{profile?.displayName || user.displayName}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href;
            const showBadge = item.href === "/recurrences" && upcomingCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative ${isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                <item.icon className="w-5 h-5" strokeWidth={2} />
                {item.label}
                {showBadge && (
                  <span className="ml-auto bg-amber-500 text-gray-950 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {upcomingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => logoutUser().then(() => router.push("/login"))}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" strokeWidth={2} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Menu "Plus" — mobile uniquement */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-6"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {mobileMore.map(item => {
              const isActive = pathname === item.href;
              const showBadge = item.href === "/recurrences" && upcomingCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-6 py-4 text-base border-b border-gray-200 dark:border-gray-800 last:border-0 transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "text-gray-700 dark:text-gray-300"
                    }`}
                >
                  <item.icon className="w-5 h-5" strokeWidth={2} />
                  {item.label}
                  {showBadge && (
                    <span className="ml-auto bg-amber-500 text-gray-950 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {upcomingCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={() => logoutUser().then(() => router.push("/login"))}
              className="w-full flex items-center gap-4 px-6 py-4 text-base text-red-600 dark:text-red-400 border-t border-gray-200 dark:border-gray-800"
            >
              <LogOut className="w-5 h-5" strokeWidth={2} />
              Déconnexion
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav — mobile uniquement */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex z-50">
        {mobilePrimary.map((item) => {
          const isActive = pathname === item.href;
          const showBadge = item.href === "/recurrences" && upcomingCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors relative ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500"
                }`}
            >
              <span className="relative">
                <item.icon className="w-5 h-5" strokeWidth={2} />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-gray-950 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {upcomingCount}
                  </span>
                )}
              </span>
              <span className="truncate w-full text-center px-0.5">
                {item.label === "Récurrences" ? "Récurr." : item.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${isMoreActive || showMoreMenu ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500"
            }`}
        >
          <Menu className="w-5 h-5" strokeWidth={2} />
          <span>Plus</span>
        </button>
      </nav>
    </div>
  );
}