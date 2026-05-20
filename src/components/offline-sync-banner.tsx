import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { getPendingCount, replayDraftQueue } from "@/lib/offline/draft-queue";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function OfflineSyncBanner() {
  const { t } = useT();
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState(0);

  const refreshPending = () => getPendingCount().then(setPending).catch(() => setPending(0));

  useEffect(() => {
    refreshPending();
    const onOnline = async () => {
      setOnline(true);
      const n = await replayDraftQueue(async (item) => {
        await supabase.from("report_drafts").upsert(
          { report_id: item.reportId, payload: item.payload as any, updated_at: new Date().toISOString() },
          { onConflict: "report_id" },
        );
        const acts = item.payload.activities as any[];
        await supabase.from("activities").delete().eq("report_id", item.reportId);
        if (acts?.length) {
          await supabase.from("activities").insert(acts.map((a: any, idx: number) => ({
            report_id: item.reportId,
            objective: a.objective,
            activity_code: a.activity_code,
            description: a.description,
            planned: a.planned || 0,
            achieved: a.achieved || 0,
            position: idx,
          })));
        }
        for (const [section_type, content] of Object.entries(item.payload.narratives || {})) {
          await supabase.from("narratives").upsert(
            { report_id: item.reportId, section_type: section_type as any, content },
            { onConflict: "report_id,section_type" },
          );
        }
      });
      await refreshPending();
      if (n > 0) toast.success(`${t.syncComplete} (${n})`);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const id = setInterval(refreshPending, 10000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(id);
    };
  }, [t.syncComplete]);

  if (online && pending === 0) return null;

  return (
    <div className={`text-center text-xs py-1.5 px-3 ${online ? "bg-amber-500/15 text-amber-900 dark:text-amber-100" : "bg-destructive/15 text-destructive"}`}>
      {!online ? t.offline : `${pending} ${t.pendingSync}`}
    </div>
  );
}
