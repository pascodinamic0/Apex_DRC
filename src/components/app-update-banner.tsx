import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { BrandArcs, BrandLogo } from "@/components/brand-logo";

const UPDATE_MS = 680;

async function remoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    return data.id || null;
  } catch {
    return null;
  }
}

export function AppUpdateBanner() {
  const { t } = useT();
  const previewing = useRouterState({ select: (s) => s.location.href.includes("updatePreview=1") });
  const [available, setAvailable] = useState(false);
  const [updating, setUpdating] = useState(previewing);

  useEffect(() => {
    let stop = false;
    const current = typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "";

    const check = async () => {
      const remote = await remoteBuildId();
      if (stop || !remote || !current) return;
      if (remote !== current) setAvailable(true);
    };

    void check();
    const timer = window.setInterval(check, 60_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      stop = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!updating) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : previewing ? 1400 : UPDATE_MS;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = previewing ? (now - start) % Math.max(duration, 1) : now - start;
      const next = duration === 0 ? 100 : Math.min(100, (elapsed / duration) * 100);
      if (previewing || next < 100) {
        frame = requestAnimationFrame(tick);
        return;
      }
      window.location.reload();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [previewing, updating]);

  const applyUpdate = () => {
    setUpdating(true);
  };

  if (updating) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background" role="status" aria-live="polite">
        <BrandArcs />
        <div className="relative flex w-72 flex-col items-center gap-6 px-6">
          <div className="relative grid size-32 place-items-center">
            <div className="update-logo-ring absolute inset-0">
              <svg className="size-full" viewBox="0 0 100 100" aria-hidden>
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="250 39"
                  className="text-primary"
                />
              </svg>
            </div>
            <BrandLogo className="update-logo relative z-10 h-10" />
          </div>
          <p className="text-sm font-medium text-foreground">{t.updatingApp}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className={`update-progress-bar h-full rounded-full bg-primary ${previewing ? "is-preview" : ""}`} />
          </div>
        </div>
      </div>
    );
  }

  if (!available) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-lg flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-background px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{t.updateAvailable}</p>
        <Button size="sm" onClick={applyUpdate} disabled={updating}>
          {updating ? t.updatingApp : t.updateApp}
        </Button>
      </div>
    </div>
  );
}
