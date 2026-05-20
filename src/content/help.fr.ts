import type { AppRole } from "@/lib/auth";

export interface HelpSection {
  id: string;
  title: string;
  roles: AppRole[] | "all";
  body: string[];
}

export const helpSectionsFr: HelpSection[] = [
  {
    id: "intro",
    title: "Introduction",
    roles: "all",
    body: [
      "EPIC RDC est la plateforme de reporting mensuel pour les neuf provinces.",
      "Utilisez le menu pour accéder au tableau de bord, aux rapports, à la consolidation (DT) et à l'historique.",
    ],
  },
  {
    id: "province-report",
    title: "Rédiger un rapport provincial",
    roles: ["province_user"],
    body: [
      "Créez un rapport via Rapports → Nouveau rapport (mois et année).",
      "Remplissez les onglets A à G : activités, récits et résumé exécutif.",
      "Enregistrez le brouillon (autosauvegarde toutes les 30 s) puis Soumettre.",
      "Après soumission, le statut devient « En attente de validation ». Vous pouvez encore modifier le rapport jusqu'à validation par le DT.",
    ],
  },
  {
    id: "dt-validate",
    title: "Valider les rapports (DT)",
    roles: ["technical_director"],
    body: [
      "Consultez le tableau de bord pour voir l'état des neuf provinces.",
      "Ouvrez un rapport soumis et cliquez sur Valider.",
      "La consolidation nationale agrège tous les rapports du mois sélectionné.",
    ],
  },
  {
    id: "dt-accounts",
    title: "Comptes Directeur Technique",
    roles: ["technical_director"],
    body: [
      "Le TDR prévoit trois personnes au niveau DT (Directeur de projet et conseillers seniors).",
      "Créez trois utilisateurs avec le rôle Directeur Technique dans Utilisateurs.",
      "Attribuez un titre distinct (ex. Directeur de projet, Conseiller senior) pour les identifier dans l'interface.",
    ],
  },
  {
    id: "export",
    title: "Export PDF et Word",
    roles: ["technical_director", "read_only"],
    body: [
      "Sur Consolidation, choisissez le mois et l'année puis exportez en PDF ou Word.",
      "Le rapport national inclut le tableau consolidé et les récits par province.",
    ],
  },
  {
    id: "readonly",
    title: "Lecture seule",
    roles: ["read_only"],
    body: [
      "Vous pouvez consulter tous les rapports et le tableau de bord sans modifier ni valider.",
    ],
  },
  {
    id: "profile",
    title: "Profil et mot de passe",
    roles: "all",
    body: [
      "Profil : modifiez votre nom, la langue et votre mot de passe.",
      "Mot de passe oublié : utilisez le lien sur la page de connexion.",
    ],
  },
];
