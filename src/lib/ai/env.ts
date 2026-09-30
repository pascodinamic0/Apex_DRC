/** Server-only AI configuration. Never import from client components. */

export function getOpenAiApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

export function getAiGatewayApiKey(): string | undefined {
  return process.env.AI_GATEWAY_API_KEY?.trim() || undefined;
}

/** Cheap default — suitable for a small OpenAI credit balance. */
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export const DEFAULT_AI_GATEWAY_MODEL = "openai/gpt-4o-mini";

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function getAiGatewayModel(): string {
  return process.env.AI_GATEWAY_MODEL?.trim() || DEFAULT_AI_GATEWAY_MODEL;
}

export function aiConfigured(): boolean {
  return Boolean(getOpenAiApiKey() || getAiGatewayApiKey());
}

export class AiNotConfiguredError extends Error {
  constructor(lang: "fr" | "en" = "en") {
    super(aiSetupMessage(lang));
    this.name = "AiNotConfiguredError";
  }
}

export function aiSetupMessage(lang: "fr" | "en" = "en"): string {
  if (lang === "fr") {
    return (
      "L'IA n'est pas configurée. Ajoutez OPENAI_API_KEY dans l'environnement du serveur " +
      "(.env en local, ou les variables d'environnement de l'hébergement). " +
      "Vous pouvez aussi utiliser AI_GATEWAY_API_KEY."
    );
  }
  return (
    "AI is not configured. Add OPENAI_API_KEY to the server environment " +
    "(.env locally, or the host's environment variables). " +
    "You can also use AI_GATEWAY_API_KEY."
  );
}
