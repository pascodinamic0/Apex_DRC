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

export function aiSetupMessage(): string {
  return (
    "AI is not configured. Add OPENAI_API_KEY to your server environment " +
    "(.env locally, or Vercel → Project → Settings → Environment Variables). " +
    "Alternatively, use AI_GATEWAY_API_KEY from Vercel AI Gateway."
  );
}
