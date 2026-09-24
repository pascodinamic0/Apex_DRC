import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useT, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, profile, role, refreshProfile } = useAuth();
  const { t, lang, setLang } = useT();
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [preferredLang, setPreferredLang] = useState<Lang>("fr");
  const [provinceName, setProvinceName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const roleLabel =
    role === "technical_director"
      ? (profile?.job_title || t.director)
      : role === "technical_assistant"
        ? (profile?.job_title || t.technicalAssistant)
        : role === "province_user"
          ? t.provinceUser
          : t.readOnly;

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setJobTitle(profile.job_title || "");
      if (profile.preferred_lang === "en" || profile.preferred_lang === "fr") {
        setPreferredLang(profile.preferred_lang);
      } else setPreferredLang(lang);
    }
  }, [profile, lang]);

  useEffect(() => {
    if (!profile?.province_id) {
      setProvinceName("");
      return;
    }
    supabase
      .from("provinces")
      .select("name")
      .eq("id", profile.province_id)
      .maybeSingle()
      .then(({ data }) => setProvinceName(data?.name || ""));
  }, [profile?.province_id]);

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      job_title: jobTitle || null,
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.settings}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.settingsSubtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.account}</CardTitle>
          <CardDescription>{t.accountDesc}</CardDescription>
        </CardHeader>
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
            <Label>{t.jobTitle}</Label>
            <Input
              value={jobTitle}
              placeholder={t.jobTitlePlaceholder}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <Button onClick={saveProfile} disabled={busy}>{t.save}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.access}</CardTitle>
          <CardDescription>{t.accessDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t.assignedRole}</p>
            <Badge variant="secondary">{roleLabel}</Badge>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t.assignedProvince}</p>
            <p className="text-sm text-muted-foreground">
              {profile?.province_id ? (provinceName || t.notAssigned) : t.nationalScope}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.interface}</CardTitle>
          <CardDescription>{t.interfaceDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.languagePreference}</Label>
            <Select value={preferredLang} onValueChange={(v) => setPreferredLang(v as Lang)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">{t.langFrench}</SelectItem>
                <SelectItem value="en">{t.langEnglish}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveProfile} disabled={busy}>{t.save}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.security}</CardTitle>
          <CardDescription>{t.securityDesc}</CardDescription>
        </CardHeader>
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

      <Card>
        <CardHeader>
          <CardTitle>{t.helpResources}</CardTitle>
          <CardDescription>{t.helpResourcesDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/help">
              <BookOpen />
              {t.openUserGuide}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
