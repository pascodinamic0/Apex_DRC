import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ProgramSourcePanel } from "@/components/program-source-panel";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/program")({ component: ProgramPage });

function ProgramPage() {
  const { t } = useT();
  const { role } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (role === "technical_assistant" || role === "province_user") {
      nav({ to: "/dashboard", replace: true });
    }
  }, [role, nav]);
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">{t.programDataTitle}</h1>
      <ProgramSourcePanel />
    </div>
  );
}
