import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LangSwitch } from "@/components/lang-switch";
import { BrandArcs, BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const { t } = useT();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        return;
      }
      const hash = window.location.hash;
      if (hash.includes("type=recovery") || hash.includes("access_token")) {
        await new Promise((r) => setTimeout(r, 500));
        const { data: { session: s2 } } = await supabase.auth.getSession();
        setReady(!!s2);
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    check();
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t.passwordsMismatch);
      return;
    }
    if (password.length < 8) {
      toast.error(t.error);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t.passwordUpdated);
      await supabase.auth.signOut();
      nav({ to: "/login" });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BrandArcs />
      <div className="absolute right-4 top-4 z-10"><LangSwitch tone="utility" /></div>
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <BrandLogo className="mb-6 h-10" />
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader><CardTitle>{t.resetPasswordTitle}</CardTitle></CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground">{t.resetPasswordInvalid}</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t.newPassword}</Label>
                <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.confirmPassword}</Label>
                <Input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "..." : t.save}</Button>
            </form>
          )}
          <Link to="/login" className="mt-4 block text-center text-sm text-primary underline">{t.backToLogin}</Link>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
