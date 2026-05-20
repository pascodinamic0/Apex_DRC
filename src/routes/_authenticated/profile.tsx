import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { t, lang, setLang } = useT();
  const [fullName, setFullName] = useState("");
  const [preferredLang, setPreferredLang] = useState<Lang>("fr");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      if (profile.preferred_lang === "en" || profile.preferred_lang === "fr") {
        setPreferredLang(profile.preferred_lang);
      } else setPreferredLang(lang);
    }
  }, [profile, lang]);

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      preferred_lang: preferredLang,
    }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setLang(preferredLang);
      await refreshProfile();
      toast.success(t.profileSaved);
    }
  };

  const savePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t.passwordsMismatch);
      return;
    }
    if (newPassword.length < 8) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t.passwordUpdated);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">{t.profileTitle}</h1>

      <Card>
        <CardHeader><CardTitle>{t.profile}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.email}</Label>
            <Input value={profile?.email || user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>{t.fullName}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t.languagePreference}</Label>
            <Select value={preferredLang} onValueChange={(v) => setPreferredLang(v as Lang)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveProfile} disabled={busy}>{t.save}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t.changePassword}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.newPassword}</Label>
            <Input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t.confirmPassword}</Label>
            <Input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button variant="outline" onClick={savePassword} disabled={busy || !newPassword}>{t.changePassword}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
