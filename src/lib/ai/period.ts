import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AiNotConfiguredError } from "@/lib/ai/env";

export function aiHttpError(lang: "fr" | "en", error: unknown): { message: string; status: number } {
  if (error instanceof AiNotConfiguredError) {
    return { message: error.message, status: 503 };
  }
  console.error("[ai]", error);
  return {
    message: lang === "en" ? "Summary generation failed." : "La génération du résumé a échoué.",
    status: 500,
  };
}

/** Returns a Response when the month is approved or the check itself fails. */
export async function approvedPeriodResponse(month: number, year: number, lang: "fr" | "en"): Promise<Response | null> {
  const { data, error } = await supabaseAdmin
    .from("consolidation_approvals")
    .select("id")
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (error) {
    console.error("[ai] approval lookup", error.message);
    return Response.json(
      {
        error:
          lang === "en"
            ? "Could not check whether this month is approved."
            : "Impossible de vérifier si ce mois est déjà approuvé.",
      },
      { status: 500 },
    );
  }

  if (data) {
    return Response.json(
      {
        error:
          lang === "en"
            ? "This month is already approved. AI summaries are locked."
            : "Ce mois est déjà approuvé. Les résumés IA sont verrouillés.",
      },
      { status: 409 },
    );
  }

  return null;
}
