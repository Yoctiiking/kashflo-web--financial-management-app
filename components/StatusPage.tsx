import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatusPageProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function StatusPage({
  icon: Icon,
  title,
  message,
  actionHref = "/",
  actionLabel = "Retour à l'accueil"
}: StatusPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Kash<span className="text-emerald-600 dark:text-emerald-500">Flo</span>
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <Icon className="w-10 h-10 text-gray-400 dark:text-gray-600" strokeWidth={2} />
          </div>
          <h2 className="text-gray-900 dark:text-white font-semibold text-xl mb-2">{title}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{message}</p>

          <Link
            href={actionHref}
            className="block w-full bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
