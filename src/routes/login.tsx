import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LangSwitch } from "@/components/lang-switch";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) toast.error(t.loginError);
    else nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <div className="absolute top-4 right-4"><LangSwitch /></div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">E</div>
        <h1 className="text-3xl font-bold tracking-tight">{t.appName}</h1>
        <p className="text-muted-foreground mt-1">{t.tagline}</p>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>{t.login}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t.email}</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.password}</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "..." : t.signIn}
            </Button>
          </form>
          <div className="mt-6 text-xs text-muted-foreground border-t pt-4 space-y-1">
            <div className="font-medium text-foreground">Demo accounts (password: Demo1234!)</div>
            <div>director@epic.cd · kinshasa@epic.cd · viewer@epic.cd</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
