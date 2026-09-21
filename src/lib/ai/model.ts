import { createGateway } from "@ai-sdk/gateway";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import {
  getAiGatewayApiKey,
  getAiGatewayModel,
  getOpenAiApiKey,
  getOpenAiModel,
} from "@/lib/ai/env";

export function resolveAiModel(): { model: LanguageModel; modelId: string } {
  const openAiKey = getOpenAiApiKey();
  if (openAiKey) {
    const modelName = getOpenAiModel();
    const openai = createOpenAI({ apiKey: openAiKey });
    return { model: openai(modelName), modelId: `openai/${modelName}` };
  }

  const gatewayKey = getAiGatewayApiKey();
  if (gatewayKey) {
    const modelId = getAiGatewayModel();
    const gateway = createGateway({ apiKey: gatewayKey });
    return { model: gateway(modelId), modelId };
  }

  throw new Error("No AI provider configured");
}
