import { createFileRoute } from "@tanstack/react-router";
import { ProgramSourcePanel } from "@/components/program-source-panel";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/program")({ component: ProgramPage });

function ProgramPage() {
  const { t } = useT();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">{t.programDataTitle}</h1>
      <ProgramSourcePanel />
    </div>
  );
}
