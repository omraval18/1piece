import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const baseURL =
  process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1";

export const minimax = createOpenAICompatible({
  name: "minimax",
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL,
});

export const minimaxModelId = process.env.MINIMAX_MODEL ?? "MiniMax-M2.5";
