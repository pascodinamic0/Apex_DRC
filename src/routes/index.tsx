import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ClipboardList,
  FileDown,
  FileText,
  Globe,
  HelpCircle,
  Languages,
  LayoutDashboard,
  Layers,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { accountNeedsOnboarding, useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LangSwitch } from "@/components/lang-switch";
import { BrandArcs, BrandLogo, BrandMark } from "@/components/brand-logo";

export const Route = createFileRoute("/")({
  component: Index,
});

const moduleIcons = [LayoutDashboard, FileText, ClipboardList, Layers, Bell, HelpCircle];

function Index() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const { lang, t } = useT();
  const copy = landingCopy[lang];
  const needsOnboarding = accountNeedsOnboarding(user, profile);
  const primaryHref = !user ? "/login" : needsOnboarding ? "/onboarding" : "/dashboard";

  useEffect(() => {
    if (!loading && needsOnboarding) nav({ to: "/onboarding", replace: true });
  }, [loading, needsOnboarding, nav]);
  const primaryLabel = user ? t.dashboard : t.signIn;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 border-b border-primary/15 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <BrandLogo className="h-9 shrink-0" />
            <div className="hidden min-w-0 border-l border-border pl-3 sm:block">
              <p className="truncate text-sm font-semibold leading-none">{t.appName}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{t.tagline}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/70 lg:flex">
              {copy.nav.map((item) => (
                <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </a>
              ))}
            </nav>
            <LangSwitch tone="utility" />
            <Button asChild size="sm" variant="brand" className="hidden sm:inline-flex">
              <Link to={primaryHref}>{loading ? t.loading : primaryLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <BrandArcs />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-8 pt-16 sm:pt-20 lg:pb-10 lg:pt-24">
          <p className="mb-5 text-sm font-semibold text-primary">{copy.hero.kicker}</p>
          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[4.25rem] lg:leading-[1.05]">
            {copy.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{copy.hero.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="brand">
              <Link to={primaryHref}>{loading ? t.loading : primaryLabel}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#overview">{copy.hero.secondaryCta}</a>
            </Button>
          </div>
          <HeroSignals stats={copy.hero.stats} />
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">{copy.snapshot.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{copy.snapshot.title}</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/85">{copy.snapshot.lead}</p>
            <Button asChild size="lg" variant="secondary" className="mt-8 bg-white text-foreground hover:bg-white/90">
              <Link to={primaryHref}>{copy.snapshot.cta}</Link>
            </Button>
          </div>
          <SnapshotStories stories={copy.snapshot.stories} />
        </div>
      </section>

      <section id="overview" className="mx-auto w-full max-w-6xl px-4 py-20">
        <SectionIntro {...copy.overview} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {copy.outcomes.map((item) => (
            <article key={item.code} className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold text-primary">{item.code}</p>
              <h3 className="mt-3 text-2xl font-bold tracking-tight">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <SectionIntro align="left" {...copy.workflowIntro} />
          <ol className="mt-12 grid gap-0 md:grid-cols-4">
            {copy.workflow.map((step, index) => (
              <li key={step.title} className="relative border-l border-primary/30 pl-6 md:border-l-0 md:border-t-2 md:border-primary md:pl-0 md:pt-8">
                <span className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground md:left-0 md:top-0 md:-translate-y-1/2">
                  {index + 1}
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{step.stage}</p>
                <h3 className="mt-2 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="modules" className="mx-auto w-full max-w-6xl px-4 py-20">
        <SectionIntro {...copy.modulesIntro} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {copy.modules.map((module, i) => {
            const Icon = moduleIcons[i] ?? FileText;
            return (
              <article key={module.title} className="flex h-full flex-col rounded-3xl border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{module.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{module.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="terms" className="bg-foreground text-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            {copy.policy.map((item) => (
              <article key={item.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{item.eyebrow}</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight">{item.title}</h2>
                <p className="mt-4 text-sm leading-7 text-white/75">{item.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-14 flex flex-col gap-6 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-white/90">
                <ShieldCheck className="h-4 w-4" />
                {copy.cta.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">{copy.cta.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">{copy.cta.text}</p>
            </div>
            <Button asChild size="lg" variant="secondary" className="shrink-0 bg-white text-foreground hover:bg-white/90">
              <Link to={primaryHref}>{loading ? t.loading : primaryLabel}</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-foreground text-background">
        <div className="mx-auto w-full max-w-6xl border-t border-white/10 px-4 py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <BrandMark className="h-10 w-7 text-primary" />
                <div>
                  <p className="font-semibold">{t.appName}</p>
                  <p className="text-sm text-white/65">{t.tagline}</p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/65">{copy.footer.text}</p>
            </div>
            <div className="grid gap-6 text-sm sm:grid-cols-3">
              {copy.footer.groups.map((group) => (
                <div key={group.title}>
                  <p className="font-semibold">{group.title}</p>
                  <div className="mt-3 grid gap-2 text-white/65">
                    {group.links.map((link) => (
                      <a key={link.href} href={link.href} className="hover:text-white">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p>{copy.footer.copyright}</p>
              <p>
                {copy.footer.credit.madeBy}{" "}
                <a
                  href="https://digni-digital-llc.com"
                  className="underline hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  Digni Digital LLC
                </a>
                {" · "}
                <a
                  href="https://digni-digital-llc.com"
                  className="underline hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  digni-digital-llc.com
                </a>
                {" · "}
                <a
                  href="https://digni-digital-llc.com/custom-saas"
                  className="underline hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  Agentic Softwares
                </a>
              </p>
            </div>
            <p className="inline-flex items-center gap-1">
              <Languages className="h-3.5 w-3.5" />
              {copy.footer.note}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

const signalIcons = {
  language: Languages,
  export: FileDown,
  access: Users,
} satisfies Record<HeroSignal["key"], LucideIcon>;

function HeroSignals({ stats }: { stats: HeroSignal[] }) {
  return (
    <div className="mt-14 grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = signalIcons[stat.key];
        return (
          <article
            key={stat.key}
            className="group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card/90 p-5 shadow-[0_24px_60px_-36px_oklch(0.45_0.12_35)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_28px_70px_-32px_oklch(0.5_0.16_35)] sm:p-6"
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {stat.kicker}
              </span>
            </div>
            <p className="mt-6 text-3xl font-extrabold tracking-tight">{stat.value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.detail}</p>
            {stat.key === "access" ? (
              <ul className="mt-auto grid grid-cols-2 gap-2 pt-5">
                {stat.chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-2xl border border-border/80 bg-background px-3 py-2 text-center text-sm font-semibold"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                {stat.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

const storyIcons = {
  province: MapPin,
  review: MessageSquareText,
  national: Globe,
} satisfies Record<SnapshotStory["key"], LucideIcon>;

function SnapshotStories({ stories }: { stories: SnapshotStory[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stories.map((story, index) => {
        const Icon = storyIcons[story.key];
        return (
          <article
            key={story.key}
            className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-white p-5 text-foreground shadow-[0_24px_60px_-36px_oklch(0.2_0.04_35)] transition duration-300 hover:-translate-y-0.5 sm:p-6"
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{story.tag}</p>
            <h3 className="mt-2 text-xl font-extrabold tracking-tight">{story.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{story.text}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {story.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {chip}
                </span>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  text,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  text: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "left" ? "max-w-2xl" : "mx-auto max-w-3xl text-center"}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 leading-7 text-muted-foreground">{text}</p>
    </div>
  );
}

type SnapshotStory = {
  key: "province" | "review" | "national";
  tag: string;
  title: string;
  text: string;
  chips: string[];
};

type HeroSignal = {
  key: "language" | "export" | "access";
  kicker: string;
  value: string;
  detail: string;
  chips: string[];
};

const landingCopy = {
  fr: {
    nav: [
      { label: "Vue d'ensemble", href: "#overview" },
      { label: "Processus", href: "#workflow" },
      { label: "Modules", href: "#modules" },
      { label: "Conditions", href: "#terms" },
    ],
    hero: {
      kicker: "FHI 360 · Programme EPIC RDC",
      title: "Mettre le reporting mensuel à portée de l'équipe.",
      description:
        "Les provinces saisissent, la direction technique révise, le niveau national consolide. Un espace bilingue pour suivre les activités, les commentaires et les exports officiels.",
      secondaryCta: "Découvrir le parcours",
      stats: [
        {
          key: "language",
          kicker: "Interface",
          value: "FR / EN",
          detail: "Français et anglais dans le même dossier.",
          chips: ["Français", "English"],
        },
        {
          key: "export",
          kicker: "Sortie",
          value: "Word",
          detail: "L'export national officiel, prêt à diffuser.",
          chips: [".docx", "Officiel"],
        },
        {
          key: "access",
          kicker: "Accès",
          value: "4 rôles",
          detail: "Chaque compte reste dans son périmètre.",
          chips: ["Province", "AT", "DT", "Lecteur"],
        },
      ] satisfies HeroSignal[],
    },
    snapshot: {
      eyebrow: "Ce qui se passe ce mois-ci",
      title: "Le cycle mensuel, d'une province au national.",
      lead: "Chaque rapport suit le même chemin : saisie guidée, revue commentée, puis consolidation des données validées.",
      cta: "Entrer dans le cycle",
      stories: [
        {
          key: "province",
          tag: "Province",
          title: "Préparer et soumettre",
          text: "Les équipes provinciales complètent les activités du catalogue et envoient le rapport au DT.",
          chips: ["Saisie", "Soumission"],
        },
        {
          key: "review",
          tag: "Revue",
          title: "Commenter et valider",
          text: "Les AT et le DT ouvrent chaque section, laissent des commentaires et approuvent le contenu.",
          chips: ["AT", "DT"],
        },
        {
          key: "national",
          tag: "National",
          title: "Consolider et exporter",
          text: "Les rapports validés alimentent la vue nationale, les résumés IA et l'export Word officiel.",
          chips: ["Consolidation", "Word"],
        },
      ] satisfies SnapshotStory[],
    },
    overview: {
      eyebrow: "Vue d'ensemble",
      title: "Une plateforme, quatre résultats concrets.",
      text: "EPIC RDC aligne la saisie de terrain, la revue technique et le reporting bailleur sans multiplier les fichiers.",
    },
    outcomes: [
      {
        code: "01",
        title: "Saisie guidée",
        text: "Les rapports mensuels suivent le catalogue d'activités EPIC. Moins d'oublis, des codes comparables d'une province à l'autre.",
      },
      {
        code: "02",
        title: "Revue ciblée",
        text: "Les commentaires restent collés à la section ou à l'activité concernée. Les corrections reviennent plus vite au CP.",
      },
      {
        code: "03",
        title: "Suivi national",
        text: "Les rapports validés alimentent tableaux de bord, taux de réalisation et exports de consolidation.",
      },
      {
        code: "04",
        title: "Travail bilingue",
        text: "Français et anglais dans le même espace. Les équipes changent de langue sans quitter leur dossier.",
      },
    ],
    workflowIntro: {
      eyebrow: "Processus",
      title: "Un parcours lisible pour chaque rapport.",
      text: "Quatre étapes, un statut clair à chaque fois : brouillon, soumis, en revue, validé.",
    },
    workflow: [
      { stage: "CP", title: "Saisir", text: "Le coordonnateur provincial rédige et soumet le rapport mensuel." },
      { stage: "AT", title: "Valider", text: "L'assistant technique commente, retourne ou verrouille le rapport provincial." },
      { stage: "DT", title: "Approuver", text: "Le directeur technique approuve la consolidation nationale du mois." },
      { stage: "DT", title: "Extraire", text: "Export Word national ; le CP extrait sa province par période." },
    ],
    modulesIntro: {
      eyebrow: "Modules",
      title: "Tout ce que l'équipe utilise après connexion.",
      text: "Les mêmes outils pour le terrain, les conseillers et le directeur technique — avec un accès selon le rôle.",
    },
    modules: [
      { title: "Tableau de bord", text: "Indicateurs, statuts provinciaux et tendances du mois en cours." },
      { title: "Rapports", text: "Création, édition, soumission et historique des rapports mensuels." },
      { title: "Bureau AT", text: "File de revue, relances, commentaires et validations." },
      { title: "Consolidation", text: "Vue nationale par code d'activité, résumé IA et export Word officiel." },
      { title: "Notifications", text: "Alertes de soumission, de retour et de validation." },
      { title: "Aide", text: "Guide utilisateur intégré, en français et en anglais." },
    ],
    policy: [
      {
        eyebrow: "Accès",
        title: "Réservé aux utilisateurs autorisés.",
        text: "La connexion est obligatoire. Chaque compte n'accède qu'aux provinces et fonctions liées à son rôle : province, AT ou DT.",
      },
      {
        eyebrow: "Conditions",
        title: "Données exactes, usage responsable.",
        text: "Les informations saisies sont professionnelles et destinées au reporting EPIC RDC / FHI 360. Les demandes d'accès passent par l'administrateur.",
      },
    ],
    cta: {
      eyebrow: "Espace sécurisé",
      title: "Poursuivre vers le reporting.",
      text: "Connectez-vous pour saisir un rapport, commenter une activité ou exporter la consolidation du mois.",
    },
    footer: {
      text: "Plateforme interne de reporting mensuel du programme EPIC RDC, mise en œuvre avec FHI 360.",
      groups: [
        {
          title: "Produit",
          links: [
            { label: "Vue d'ensemble", href: "#overview" },
            { label: "Processus", href: "#workflow" },
            { label: "Modules", href: "#modules" },
          ],
        },
        {
          title: "Accès",
          links: [
            { label: "Connexion", href: "/login" },
            { label: "Tableau de bord", href: "/dashboard" },
            { label: "Aide", href: "/help" },
          ],
        },
        {
          title: "Cadre",
          links: [
            { label: "Conditions", href: "#terms" },
            { label: "Confidentialité", href: "#terms" },
            { label: "Usage autorisé", href: "#terms" },
          ],
        },
      ],
      copyright: "© 2026 FHI 360 · EPIC RDC. Tous droits réservés.",
      credit: { madeBy: "Réalisé par" },
      note: "Usage interne autorisé uniquement.",
    },
  },
  en: {
    nav: [
      { label: "Overview", href: "#overview" },
      { label: "Workflow", href: "#workflow" },
      { label: "Modules", href: "#modules" },
      { label: "Terms", href: "#terms" },
    ],
    hero: {
      kicker: "FHI 360 · EPIC DRC program",
      title: "Putting monthly reporting within the team's reach.",
      description:
        "Provinces enter data, technical direction reviews it, national teams consolidate. One bilingual workspace for activities, comments, and official exports.",
      secondaryCta: "See the cycle",
      stats: [
        {
          key: "language",
          kicker: "Interface",
          value: "FR / EN",
          detail: "French and English in the same file.",
          chips: ["Français", "English"],
        },
        {
          key: "export",
          kicker: "Output",
          value: "Word",
          detail: "The official national export, ready to share.",
          chips: [".docx", "Official"],
        },
        {
          key: "access",
          kicker: "Access",
          value: "4 roles",
          detail: "Each account stays inside its scope.",
          chips: ["Province", "TA", "TD", "Viewer"],
        },
      ] satisfies HeroSignal[],
    },
    snapshot: {
      eyebrow: "What's happening this month",
      title: "The monthly cycle, from province to national.",
      lead: "Every report follows the same path: guided entry, commented review, then consolidation of validated data.",
      cta: "Enter the cycle",
      stories: [
        {
          key: "province",
          tag: "Province",
          title: "Prepare and submit",
          text: "Provincial teams complete catalog activities and send the report to the TD.",
          chips: ["Entry", "Submit"],
        },
        {
          key: "review",
          tag: "Review",
          title: "Comment and validate",
          text: "TAs and the TD open each section, leave comments, and approve the content.",
          chips: ["TA", "TD"],
        },
        {
          key: "national",
          tag: "National",
          title: "Consolidate and export",
          text: "Validated reports feed the national view, AI summaries, and the official Word export.",
          chips: ["Consolidation", "Word"],
        },
      ] satisfies SnapshotStory[],
    },
    overview: {
      eyebrow: "Overview",
      title: "One platform, four clear outcomes.",
      text: "EPIC DRC aligns field entry, technical review, and donor reporting without spreading work across files.",
    },
    outcomes: [
      {
        code: "01",
        title: "Guided entry",
        text: "Monthly reports follow the EPIC activity catalog. Fewer omissions, comparable codes across provinces.",
      },
      {
        code: "02",
        title: "Focused review",
        text: "Comments stay attached to the relevant section or activity, so corrections return to the province faster.",
      },
      {
        code: "03",
        title: "National tracking",
        text: "Validated reports feed dashboards, achievement rates, and consolidation exports.",
      },
      {
        code: "04",
        title: "Bilingual work",
        text: "French and English in the same workspace. Teams switch language without leaving the file.",
      },
    ],
    workflowIntro: {
      eyebrow: "Workflow",
      title: "A visible path for every report.",
      text: "Four steps, with a clear status at each one: draft, submitted, in review, validated.",
    },
    workflow: [
      { stage: "CP", title: "Enter", text: "The provincial coordinator drafts and submits the monthly report." },
      { stage: "AT", title: "Validate", text: "The technical assistant comments, returns, or locks the provincial report." },
      { stage: "TD", title: "Approve", text: "The technical director gives final approval to the month's national consolidation." },
      { stage: "TD", title: "Extract", text: "National Word export; CP extracts their province by period." },
    ],
    modulesIntro: {
      eyebrow: "Modules",
      title: "Everything the team uses after signing in.",
      text: "The same tools for field teams, advisors, and the technical director — scoped by role.",
    },
    modules: [
      { title: "Dashboard", text: "Indicators, province statuses, and trends for the current month." },
      { title: "Reports", text: "Create, edit, submit, and review monthly report history." },
      { title: "AT desk", text: "Review queue, reminders, comments, and validations." },
      { title: "Consolidation", text: "National view by activity code, AI summary, and official Word export." },
      { title: "Notifications", text: "Alerts for submissions, returns, and approvals." },
      { title: "Help", text: "Built-in user guide, in French and English." },
    ],
    policy: [
      {
        eyebrow: "Access",
        title: "Reserved for authorized users.",
        text: "Sign-in is required. Each account reaches only the provinces and functions tied to its role: province, TA, or TD.",
      },
      {
        eyebrow: "Terms",
        title: "Accurate data, responsible use.",
        text: "Entries are professional and meant for EPIC DRC / FHI 360 reporting. Access requests go through the administrator.",
      },
    ],
    cta: {
      eyebrow: "Secure workspace",
      title: "Continue to reporting.",
      text: "Sign in to enter a report, comment on an activity, or export this month's consolidation.",
    },
    footer: {
      text: "Internal monthly reporting platform for the EPIC DRC program, implemented with FHI 360.",
      groups: [
        {
          title: "Product",
          links: [
            { label: "Overview", href: "#overview" },
            { label: "Workflow", href: "#workflow" },
            { label: "Modules", href: "#modules" },
          ],
        },
        {
          title: "Access",
          links: [
            { label: "Login", href: "/login" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Help", href: "/help" },
          ],
        },
        {
          title: "Policy",
          links: [
            { label: "Terms", href: "#terms" },
            { label: "Privacy", href: "#terms" },
            { label: "Authorized use", href: "#terms" },
          ],
        },
      ],
      copyright: "© 2026 FHI 360 · EPIC DRC. All rights reserved.",
      credit: { madeBy: "Made by" },
      note: "Authorized internal use only.",
    },
  },
};
