import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { accountNeedsOnboarding, useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LangSwitch } from "@/components/lang-switch";
import { BrandArcs, BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

function OnboardingPage() {
  const { t } = useT();
  const nav = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/login", replace: true });
      return;
    }
    if (profile && !accountNeedsOnboarding(user, profile)) {
      nav({ to: "/dashboard", replace: true });
    }
  }, [loading, user, profile, nav]);

  useEffect(() => {
    if (!profile) return;
    const named = profile.full_name && profile.full_name !== profile.email ? profile.full_name : "";
    setFullName((current) => current || named);
    setPhone((current) => current || profile.phone || "");
    setAddress((current) => current || profile.address || "");
  }, [profile]);

  const continueToIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t.passwordsMismatch);
      return;
    }
    if (password.length < 8) {
      toast.error(t.securityDesc);
      return;
    }
    setStep(2);
  };

  const finish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || phone.trim().length < 6 || address.trim().length < 3) {
      toast.error(t.onboardingRequired);
      return;
    }
    setBusy(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`,
      },
      body: JSON.stringify({
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      }),
    });
    if (!res.ok) {
      setBusy(false);
      toast.error(await res.text());
      return;
    }
    await supabase.auth.refreshSession();
    await refreshProfile();
    setBusy(false);
    toast.success(t.onboardingDone);
    nav({ to: "/dashboard", replace: true });
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BrandArcs />
      <div className="absolute right-4 top-4 z-10"><LangSwitch tone="utility" /></div>
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <BrandLogo className="mb-6 h-10" />
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>{t.onboardingTitle}</CardTitle>
            <CardDescription>
              {step === 1 ? t.onboardingPasswordDesc : t.onboardingIdentityDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={continueToIdentity} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.email}</Label>
                  <Input value={user.email || profile?.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>{t.newPassword}</Label>
                  <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t.confirmPassword}</Label>
                  <Input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <Button type="submit" className="w-full">{t.continue}</Button>
              </form>
            ) : (
              <form onSubmit={finish} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.fullName}</Label>
                  <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t.phone}</Label>
                  <Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t.address}</Label>
                  <Input required value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={busy}>{t.back}</Button>
                  <Button type="submit" className="flex-1" disabled={busy}>{busy ? "..." : t.onboardingFinish}</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
