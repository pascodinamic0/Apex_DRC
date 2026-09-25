import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { HtmlLang } from "@/components/html-lang";
import { Toaster } from "@/components/ui/sonner";
import { registerServiceWorker } from "@/lib/pwa-register";
import { AppUpdateBanner } from "@/components/app-update-banner";

if (typeof window !== "undefined") registerServiceWorker();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">Page introuvable</p>
        <Link to="/" className="mt-6 inline-block text-primary underline">Accueil</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google", content: "notranslate" },
      { title: "FHI 360 · EPIC RDC — Reporting" },
      { name: "description", content: "Plateforme de reporting mensuel EPIC RDC, FHI 360." },
      { property: "og:title", content: "FHI 360 · EPIC RDC — Reporting" },
      { name: "twitter:title", content: "FHI 360 · EPIC RDC — Reporting" },
      { property: "og:description", content: "Plateforme de reporting mensuel EPIC RDC, FHI 360." },
      { name: "twitter:description", content: "Plateforme de reporting mensuel EPIC RDC, FHI 360." },
      { name: "theme-color", content: "#FF4719" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d5a67f40-6b15-4bc3-a720-d15113445340" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d5a67f40-6b15-4bc3-a720-d15113445340" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" translate="no" className="notranslate">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <HtmlLang />
        <AuthProvider>
          <Outlet />
          <AppUpdateBanner />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
