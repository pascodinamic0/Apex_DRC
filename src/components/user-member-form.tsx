import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppRole } from "@/lib/auth";
import {
  defaultAccessLevelForRole,
  defaultDutiesForRole,
  dutiesForRole,
  type AccessLevel,
  type AppDuty,
} from "@/lib/auth/duties";
import { useT } from "@/lib/i18n";

export interface MemberFormState {
  email: string;
  fullName: string;
  provinceId: string;
  jobTitle: string;
  role: AppRole;
  accessLevel: AccessLevel;
  duties: AppDuty[];
}

interface ProvinceRow {
  id: string;
  name: string;
}

interface UserMemberFormProps {
  form: MemberFormState;
  setForm: (next: MemberFormState) => void;
  provinces: ProvinceRow[];
  showEmail?: boolean;
  idPrefix?: string;
  allowedRoles?: AppRole[];
}

const DUTY_LABEL_KEYS: Record<AppDuty, string> = {
  edit_reports: "dutyEditReports",
  submit_reports: "dutySubmitReports",
  validate_reports: "dutyValidateReports",
  comment_consolidation: "dutyCommentConsolidation",
  write_national_summary: "dutyWriteNationalSummary",
  manage_users: "dutyManageUsers",
  manage_provincial_users: "dutyManageProvincialUsers",
  manage_provinces: "dutyManageProvinces",
};

const ALL_ROLES: AppRole[] = ["technical_director", "technical_assistant", "province_user", "read_only"];

export function UserMemberForm({
  form,
  setForm,
  provinces,
  showEmail = true,
  idPrefix = "member",
  allowedRoles = ALL_ROLES,
}: UserMemberFormProps) {
  const { t } = useT();
  const availableDuties = dutiesForRole(form.role);
  const dutiesDisabled = form.accessLevel === "view";

  const setRole = (role: AppRole) => {
    const accessLevel = defaultAccessLevelForRole(role);
    setForm({
      ...form,
      role,
      accessLevel,
      duties: accessLevel === "view" ? [] : defaultDutiesForRole(role),
      provinceId: role === "province_user" || role === "read_only" ? form.provinceId : "",
    });
  };

  const setAccessLevel = (accessLevel: AccessLevel) => {
    setForm({
      ...form,
      accessLevel,
      duties: accessLevel === "view" ? [] : defaultDutiesForRole(form.role),
    });
  };

  const toggleDuty = (duty: AppDuty, checked: boolean) => {
    const next = checked ? [...form.duties, duty] : form.duties.filter((d) => d !== duty);
    setForm({ ...form, duties: next });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showEmail && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-email`}>{t.email}</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            autoComplete="email"
            placeholder="marie@epic.cd"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      )}
      <div className={`space-y-1.5 ${showEmail ? "" : "sm:col-span-2"}`}>
        <Label htmlFor={`${idPrefix}-name`}>{t.fullName}</Label>
        <Input
          id={`${idPrefix}-name`}
          autoComplete="name"
          placeholder="Marie Kabila"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t.role}</Label>
        <Select value={form.role} onValueChange={(v) => setRole(v as AppRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedRoles.includes("technical_director") && (
              <SelectItem value="technical_director">{t.director}</SelectItem>
            )}
            {allowedRoles.includes("technical_assistant") && (
              <SelectItem value="technical_assistant">{t.technicalAssistant}</SelectItem>
            )}
            {allowedRoles.includes("province_user") && (
              <SelectItem value="province_user">{t.provinceUser}</SelectItem>
            )}
            {allowedRoles.includes("read_only") && (
              <SelectItem value="read_only">{t.readOnly}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>{t.jobTitle}</Label>
        <Input
          id={`${idPrefix}-title`}
          placeholder={t.jobTitlePlaceholder}
          value={form.jobTitle}
          onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
        />
      </div>
      {(form.role === "province_user" || form.role === "read_only") && (
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t.province}</Label>
          <Select value={form.provinceId} onValueChange={(v) => setForm({ ...form, provinceId: v })}>
            <SelectTrigger>
              <SelectValue placeholder={t.selectProvince} />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>{t.accountLevel}</Label>
        <Select
          value={form.accessLevel}
          onValueChange={(v) => setAccessLevel(v as AccessLevel)}
          disabled={form.role === "read_only"}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="edit">{t.accessLevelEdit}</SelectItem>
            <SelectItem value="view">{t.accessLevelView}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>{t.dutiesLabel}</Label>
        <p className="text-xs text-muted-foreground">{dutiesDisabled ? t.dutiesViewOnlyHint : t.dutiesHint}</p>
        {availableDuties.length === 0 ? null : (
        <div className="grid gap-2 sm:grid-cols-2">
          {availableDuties.map((duty) => (
            <label
              key={duty}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                dutiesDisabled ? "opacity-50" : "hover:bg-accent/40"
              }`}
            >
              <Checkbox
                checked={form.duties.includes(duty)}
                disabled={dutiesDisabled}
                onCheckedChange={(c) => toggleDuty(duty, c === true)}
              />
              <span>{(t as Record<string, string>)[DUTY_LABEL_KEYS[duty]]}</span>
            </label>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
