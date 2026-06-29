import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LangSwitch } from "@/components/lang-switch";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const { lang, t } = useT();
  const copy = landingCopy[lang];
  const primaryHref = user ? "/dashboard" : "/login";
  const primaryLabel = user ? t.dashboard : t.signIn;

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted px-4 py-6">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-muted-foreground/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between rounded-3xl border bg-card/55 px-4 py-3 shadow-sm backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg">
              E
            </div>
            <div>
              <p className="font-semibold leading-none">{t.appName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.tagline}</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
              {copy.nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <LangSwitch />
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-7rem)] items-center gap-10 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div>
            <div className="mb-6 inline-flex rounded-full border bg-card/65 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
              {copy.hero.kicker}
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {copy.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              {copy.hero.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to={primaryHref}>{loading ? t.loading : primaryLabel}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-background/60 backdrop-blur"
              >
                <a href="#overview">{copy.hero.secondaryCta}</a>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {copy.hero.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border bg-card/55 p-4 backdrop-blur">
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden border-white/40 bg-card/70 shadow-2xl backdrop-blur-xl">
            <CardContent className="p-0">
              <div className="border-b bg-primary p-6 text-primary-foreground">
                <p className="text-sm opacity-80">{copy.snapshot.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold">{copy.snapshot.title}</h2>
              </div>
              <div className="space-y-4 p-6">
                {copy.snapshot.items.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">{item.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  {copy.snapshot.cards.map((card) => (
                    <div key={card.title} className="rounded-2xl border bg-background/55 p-4">
                      <p className="text-sm font-medium">{card.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="overview" className="py-12">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <SectionIntro align="left" {...copy.overview} />
            <div className="grid gap-4 md:grid-cols-2">
              {copy.outcomes.map((item) => (
                <Card key={item.title} className="border-white/40 bg-card/65 backdrop-blur-xl">
                  <CardContent className="p-6">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                      {item.code}
                    </div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="py-12">
          <SectionIntro {...copy.workflowIntro} />
          <div className="mt-10 rounded-3xl border bg-card/65 p-5 shadow-xl backdrop-blur-xl">
            <div className="grid gap-4 lg:grid-cols-4">
              {copy.workflow.map((step, index) => (
                <div key={step.title} className="relative rounded-2xl bg-background/55 p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {step.stage}
                    </span>
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="modules" className="py-12">
          <div className="rounded-3xl border bg-card/70 p-6 shadow-xl backdrop-blur-xl sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <SectionIntro align="left" {...copy.modulesIntro} />
              <div className="grid gap-3 sm:grid-cols-2">
                {copy.modules.map((module) => (
                  <div key={module.title} className="rounded-2xl border bg-background/55 p-4">
                    <p className="font-semibold">{module.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="terms" className="grid gap-4 py-12 lg:grid-cols-[1fr_1fr]">
          {copy.policy.map((item) => (
            <Card key={item.title} className="border-white/40 bg-card/65 backdrop-blur-xl">
              <CardContent className="p-6 sm:p-8">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {item.eyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight">{item.title}</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="py-12">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-6 text-primary-foreground shadow-2xl sm:p-8 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-medium opacity-80">{copy.cta.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">{copy.cta.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 opacity-80">{copy.cta.text}</p>
            </div>
            <Button asChild size="lg" variant="secondary" className="shrink-0">
              <Link to={primaryHref}>{loading ? t.loading : primaryLabel}</Link>
            </Button>
          </div>
        </section>

        <footer className="border-t py-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
                  E
                </div>
                <div>
                  <p className="font-semibold">{t.appName}</p>
                  <p className="text-sm text-muted-foreground">{t.tagline}</p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                {copy.footer.text}
              </p>
            </div>
            <div className="grid gap-6 text-sm sm:grid-cols-3">
              {copy.footer.groups.map((group) => (
                <div key={group.title}>
                  <p className="font-semibold">{group.title}</p>
                  <div className="mt-3 grid gap-2 text-muted-foreground">
                    {group.links.map((link) => (
                      <a key={link.href} href={link.href} className="hover:text-foreground">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>{copy.footer.copyright}</p>
            <p>{copy.footer.note}</p>
          </div>
        </footer>
      </div>
    </main>
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
    <div className={align === "left" ? "max-w-xl" : "mx-auto max-w-3xl text-center"}>
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 leading-7 text-muted-foreground">{text}</p>
    </div>
  );
}

const landingCopy = {
  fr: {
    nav: [
      { label: "Vue d'ensemble", href: "#overview" },
      { label: "Processus", href: "#workflow" },
      { label: "Modules", href: "#modules" },
      { label: "Conditions", href: "#terms" },
    ],
    hero: {
      kicker: "Reporting mensuel EPIC RDC",
      title: "Une page d'accueil claire pour entrer dans le cycle de reporting.",
      description:
        "Accédez aux rapports provinciaux, à la revue technique et aux exports nationaux depuis une interface unique, bilingue et pensée pour le suivi mensuel.",
      secondaryCta: "Voir les capacités",
      stats: [
        { value: "FR/EN", label: "interface bilingue" },
        { value: "PDF", label: "exports prêts" },
        { value: "RLS", label: "accès contrôlé" },
      ],
    },
    snapshot: {
      eyebrow: "Aperçu opérationnel",
      title: "Cycle mensuel en cours",
      items: [
        { label: "Rapports soumis", value: "Province -> DT", width: "72%" },
        { label: "Revue technique", value: "Commentaires ciblés", width: "56%" },
        { label: "Consolidation", value: "Vue nationale", width: "84%" },
      ],
      cards: [
        { title: "Provinces", text: "Préparent et soumettent les rapports mensuels." },
        { title: "Direction technique", text: "Valide, retourne ou commente les sections." },
      ],
    },
    overview: {
      eyebrow: "Vue d'ensemble",
      title: "Une plateforme, quatre résultats concrets.",
      text: "La landing page ne répète pas les modules internes. Elle explique simplement pourquoi la plateforme existe et comment elle aide les équipes à avancer.",
    },
    outcomes: [
      {
        code: "01",
        title: "Saisie guidée",
        text: "Les rapports mensuels suivent une structure commune pour limiter les oublis et faciliter la comparaison.",
      },
      {
        code: "02",
        title: "Revue ciblée",
        text: "Les commentaires sont rattachés aux sections concernées, ce qui rend les corrections plus rapides.",
      },
      {
        code: "03",
        title: "Suivi national",
        text: "Les rapports validés alimentent les tableaux de bord, statistiques et exports de consolidation.",
      },
      {
        code: "04",
        title: "Travail bilingue",
        text: "Les utilisateurs peuvent passer du français à l'anglais sans changer d'espace de travail.",
      },
    ],
    workflowIntro: {
      eyebrow: "Processus",
      title: "Un parcours lisible pour chaque rapport.",
      text: "Le cycle est présenté comme une progression, pas comme une liste répétée de fonctionnalités.",
    },
    workflow: [
      {
        stage: "Province",
        title: "Préparer",
        text: "Compléter les sections et sauvegarder le brouillon.",
      },
      {
        stage: "Province",
        title: "Soumettre",
        text: "Envoyer le rapport mensuel à la revue technique.",
      },
      { stage: "DT", title: "Revoir", text: "Commenter, retourner ou approuver les sections." },
      {
        stage: "National",
        title: "Consolider",
        text: "Exploiter les données validées dans les exports.",
      },
    ],
    modulesIntro: {
      eyebrow: "Modules inclus",
      title: "Ce que l'utilisateur trouve après connexion.",
      text: "Cette section clarifie les zones principales de l'application sans doubler les explications du workflow.",
    },
    modules: [
      {
        title: "Tableau de bord",
        text: "Indicateurs, statuts provinciaux et tendances mensuelles.",
      },
      { title: "Rapports", text: "Création, édition, soumission et historique des rapports." },
      { title: "Bureau DT", text: "File de revue, commentaires, retours et validations." },
      { title: "Consolidation", text: "Prévisualisation et exports nationaux Word, PDF ou Excel." },
      {
        title: "Notifications",
        text: "Alertes liées aux soumissions, corrections et validations.",
      },
      { title: "Aide", text: "Guide utilisateur intégré pour accompagner les équipes." },
    ],
    policy: [
      {
        eyebrow: "Accès",
        title: "Usage réservé aux utilisateurs autorisés.",
        text: "Les espaces de travail de reporting nécessitent une connexion. Chaque utilisateur doit protéger ses identifiants et accéder uniquement aux informations nécessaires à son rôle.",
      },
      {
        eyebrow: "Conditions",
        title: "Données exactes et usage responsable.",
        text: "En utilisant la plateforme, vous acceptez de saisir des informations professionnelles, exactes et conformes aux règles internes EPIC RDC. Les demandes d'accès ou de correction doivent passer par l'administrateur.",
      },
    ],
    cta: {
      eyebrow: "Continuer",
      title: "Accédez à l'espace de reporting.",
      text: "Connectez-vous pour gérer les rapports mensuels, suivre les commentaires et exporter les données validées.",
    },
    footer: {
      text: "Plateforme de reporting mensuel pour soutenir le suivi provincial et national du programme EPIC RDC.",
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
      copyright: "© 2026 EPIC RDC. Tous droits réservés.",
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
      kicker: "EPIC DRC monthly reporting",
      title: "A clearer front door for the reporting cycle.",
      description:
        "Access provincial reports, technical review, and national exports from one bilingual workspace designed for monthly program monitoring.",
      secondaryCta: "See capabilities",
      stats: [
        { value: "FR/EN", label: "bilingual interface" },
        { value: "PDF", label: "ready exports" },
        { value: "RLS", label: "controlled access" },
      ],
    },
    snapshot: {
      eyebrow: "Operational snapshot",
      title: "Current monthly cycle",
      items: [
        { label: "Reports submitted", value: "Province -> TD", width: "72%" },
        { label: "Technical review", value: "Targeted comments", width: "56%" },
        { label: "Consolidation", value: "National view", width: "84%" },
      ],
      cards: [
        { title: "Provinces", text: "Prepare and submit monthly reports." },
        { title: "Technical direction", text: "Validates, returns, or comments on sections." },
      ],
    },
    overview: {
      eyebrow: "Overview",
      title: "One platform, four clear outcomes.",
      text: "The landing page now explains why the platform exists without repeating the same feature claims in every section.",
    },
    outcomes: [
      {
        code: "01",
        title: "Guided entry",
        text: "Monthly reports follow a shared structure to reduce omissions and simplify comparison.",
      },
      {
        code: "02",
        title: "Focused review",
        text: "Comments stay tied to the relevant sections, making corrections easier to resolve.",
      },
      {
        code: "03",
        title: "National tracking",
        text: "Validated reports feed dashboards, statistics, and consolidation exports.",
      },
      {
        code: "04",
        title: "Bilingual work",
        text: "Users can switch between French and English without changing workspace.",
      },
    ],
    workflowIntro: {
      eyebrow: "Workflow",
      title: "A visible path for every report.",
      text: "The cycle is shown as a progression, not another repeated feature grid.",
    },
    workflow: [
      { stage: "Province", title: "Prepare", text: "Complete sections and save the draft." },
      { stage: "Province", title: "Submit", text: "Send the monthly report for technical review." },
      { stage: "TD", title: "Review", text: "Comment, return, or approve report sections." },
      { stage: "National", title: "Consolidate", text: "Use validated data in national exports." },
    ],
    modulesIntro: {
      eyebrow: "Included modules",
      title: "What users find after signing in.",
      text: "This section clarifies the main application areas without duplicating the workflow explanation.",
    },
    modules: [
      { title: "Dashboard", text: "Indicators, province statuses, and monthly trends." },
      { title: "Reports", text: "Create, edit, submit, and review report history." },
      { title: "TD desk", text: "Review queue, comments, returns, and validations." },
      { title: "Consolidation", text: "National preview and Word, PDF, or Excel exports." },
      { title: "Notifications", text: "Alerts for submissions, corrections, and approvals." },
      { title: "Help", text: "Integrated user guide for field and national teams." },
    ],
    policy: [
      {
        eyebrow: "Access",
        title: "Reserved for authorized users.",
        text: "Reporting workspaces require sign-in. Each user must protect credentials and access only the information required for their role.",
      },
      {
        eyebrow: "Terms",
        title: "Accurate data and responsible use.",
        text: "By using the platform, you agree to enter professional, accurate information and follow EPIC DRC internal data rules. Access or correction requests should go through the administrator.",
      },
    ],
    cta: {
      eyebrow: "Continue",
      title: "Enter the reporting workspace.",
      text: "Sign in to manage monthly reports, follow comments, and export validated data.",
    },
    footer: {
      text: "Monthly reporting platform supporting provincial and national monitoring for the EPIC DRC program.",
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
      copyright: "© 2026 EPIC DRC. All rights reserved.",
      note: "Authorized internal use only.",
    },
  },
};
