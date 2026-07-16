import { SearchX } from "lucide-react";
import StatusPage from "@/components/StatusPage";

export default function NotFound() {
  return (
    <StatusPage
      icon={SearchX}
      title="Page introuvable"
      message="Cette page n'existe pas ou a été déplacée."
    />
  );
}
