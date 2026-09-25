const FR: Record<string, string> = {
  exec_summary_smni:
    "Quel est le résumé exécutif SMNI de ce mois (environ 100 à 150 mots) ? Indiquez comment les activités ont contribué à sauver des vies.",
  exec_summary_nutrition:
    "Quel est le résumé exécutif nutrition de ce mois (environ 100 à 150 mots) ? Indiquez comment les activités ont contribué à sauver des vies.",
  exec_summary_malaria:
    "Quel est le résumé exécutif paludisme de ce mois (environ 100 à 150 mots) ? Indiquez comment les activités ont contribué à sauver des vies.",
  coordination_smne:
    "Quels partenaires ont contribué au SMNI ce mois, et quelle a été leur contribution ?",
  coordination_vaccination:
    "Quels partenaires ont contribué à la vaccination ce mois, et quelle a été leur contribution ?",
  coordination_nutrition:
    "Quels partenaires ont contribué à la nutrition ce mois, et quelle a été leur contribution ?",
  coordination_malaria:
    "Quels partenaires ont contribué au paludisme ce mois, et quelle a été leur contribution ?",
  coordination_hmis:
    "Quels partenaires ont contribué au HMIS ce mois, et quelle a été leur contribution ?",
  coordination_medicines:
    "Quels partenaires ont contribué aux médicaments ce mois, et quelle a été leur contribution ?",
  success_smne_vaccination:
    "Quelles sont 2 à 3 histoires de succès SMNI / vaccination : ce qui a été fait, comment, qui en a bénéficié, les données, et pourquoi c'est important ?",
  success_nutrition:
    "Quelles sont 2 à 3 histoires de succès nutrition : ce qui a été fait, comment, qui en a bénéficié, les données, et pourquoi c'est important ?",
  success_malaria:
    "Quelles sont 2 à 3 histoires de succès paludisme : ce qui a été fait, comment, qui en a bénéficié, les données, et pourquoi c'est important ?",
  lessons_learned: "Quelles leçons ont été apprises ce mois ?",
  challenge_1:
    "Quel est le défi 1 (prestations, ressources humaines, produits, HMIS, financement ou leadership) ?",
  response_1: "Quelle réponse ou adaptation a été apportée au défi 1 ?",
  challenge_2:
    "Quel est le défi 2 (prestations, ressources humaines, produits, HMIS, financement ou leadership) ?",
  response_2: "Quelle réponse ou adaptation a été apportée au défi 2 ?",
  challenge_3:
    "Quel est le défi 3 (prestations, ressources humaines, produits, HMIS, financement ou leadership) ?",
  response_3: "Quelle réponse ou adaptation a été apportée au défi 3 ?",
  priorities_objective_1: "Quelles sont les activités prioritaires de l'objectif 1 pour le mois prochain ?",
  priorities_objective_2: "Quelles sont les activités prioritaires de l'objectif 2 pour le mois prochain ?",
  priorities_objective_3: "Quelles sont les activités prioritaires de l'objectif 3 pour le mois prochain ?",
};

const EN: Record<string, string> = {
  exec_summary_smni:
    "What is this month’s MNCH executive summary (about 100–150 words)? Say how the work helped save lives.",
  exec_summary_nutrition:
    "What is this month’s nutrition executive summary (about 100–150 words)? Say how the work helped save lives.",
  exec_summary_malaria:
    "What is this month’s malaria executive summary (about 100–150 words)? Say how the work helped save lives.",
  coordination_smne: "Which partners contributed to MNCH this month, and what did they contribute?",
  coordination_vaccination: "Which partners contributed to vaccination this month, and what did they contribute?",
  coordination_nutrition: "Which partners contributed to nutrition this month, and what did they contribute?",
  coordination_malaria: "Which partners contributed to malaria this month, and what did they contribute?",
  coordination_hmis: "Which partners contributed to HMIS this month, and what did they contribute?",
  coordination_medicines: "Which partners contributed to medicines this month, and what did they contribute?",
  success_smne_vaccination:
    "What are 2–3 MNCH / vaccination success stories: what was done, how, who benefited, the data, and why it matters?",
  success_nutrition:
    "What are 2–3 nutrition success stories: what was done, how, who benefited, the data, and why it matters?",
  success_malaria:
    "What are 2–3 malaria success stories: what was done, how, who benefited, the data, and why it matters?",
  lessons_learned: "What lessons were learned this month?",
  challenge_1: "What is challenge 1 (services, HR, supplies, HMIS, financing, or leadership)?",
  response_1: "What response or adaptation addressed challenge 1?",
  challenge_2: "What is challenge 2 (services, HR, supplies, HMIS, financing, or leadership)?",
  response_2: "What response or adaptation addressed challenge 2?",
  challenge_3: "What is challenge 3 (services, HR, supplies, HMIS, financing, or leadership)?",
  response_3: "What response or adaptation addressed challenge 3?",
  priorities_objective_1: "What are the priority activities for objective 1 next month?",
  priorities_objective_2: "What are the priority activities for objective 2 next month?",
  priorities_objective_3: "What are the priority activities for objective 3 next month?",
};

export function narrativeQuestion(key: string, lang: "fr" | "en"): string {
  const bare = key.startsWith("field:") ? key.slice(6) : key;
  return (lang === "en" ? EN : FR)[bare] || "";
}
