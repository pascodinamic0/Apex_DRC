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
      "Remplissez les onglets, y compris Média pour les photos de mise en œuvre (Annexe B).",
      "Enregistrez le brouillon (autosauvegarde toutes les 30 s) puis Soumettre.",
      "Après soumission, le statut devient « En attente de validation ». Vous pouvez encore modifier le rapport jusqu'à validation par l'AT.",
    ],
  },
  {
    id: "at-validate",
    title: "Valider les rapports (AT)",
    roles: ["technical_assistant"],
    body: [
      "Consultez le Bureau AT pour voir l'état des neuf provinces.",
      "Ouvrez un rapport soumis, commentez par section, retournez au CP ou cliquez sur Valider.",
      "La consolidation nationale agrège tous les rapports validés du mois sélectionné.",
    ],
  },
  {
    id: "dt-accounts",
    title: "Comptes Directeur Technique",
    roles: ["technical_director"],
    body: [
      "Le TDR prévoit trois personnes au niveau DT (Directeur de projet et conseillers seniors).",
      "Dans Utilisateurs, invitez chaque personne avec un rôle. Le rang (DT, AT, CP, Lecteur) attache automatiquement ses tâches.",
      "Vous pouvez encore ajuster les tâches ensuite. Les lecteurs n'ont aucune tâche d'écriture.",
      "Utilisez Modifier le membre pour relever ou réduire les droits sans renvoyer d'invitation.",
    ],
  },
  {
    id: "export",
    title: "Export Word",
    roles: ["technical_director", "technical_assistant", "read_only"],
    body: [
      "Sur Consolidation, choisissez le mois et l'année puis exportez le document Word officiel.",
      "Le rapport national suit le modèle de rapport mensuel provincial : couverture, table des matières, sigles, résumé exécutif, tableau des résultats et annexes.",
    ],
  },
  {
    id: "readonly",
    title: "Lecteur",
    roles: ["read_only"],
    body: [
      "Vous pouvez consulter les rapports validés et le tableau de bord sans modifier, commenter ni valider.",
    ],
  },
  {
    id: "at-comments",
    title: "Assistant Technique (AT)",
    roles: ["technical_assistant"],
    body: [
      "Vous validez les rapports provinciaux depuis le Bureau AT : commentaires par section, retour au CP ou validation.",
      "Vous pouvez aussi commenter les activités de la consolidation nationale.",
    ],
  },
  {
    id: "profile",
    title: "Paramètres et mot de passe",
    roles: "all",
    body: [
      "Paramètres (menu utilisateur en bas de la barre latérale) : nom, fonction, langue, rôle, province et mot de passe.",
      "La langue est aussi accessible depuis le menu utilisateur. Le mot de passe oublié se gère depuis la page de connexion.",
    ],
  },
];
