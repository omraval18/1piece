import { headers } from "next/headers";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { minimax, minimaxModelId } from "@/lib/minimax";
import { auth } from "@/lib/auth";
import { chatTools } from "@/lib/chat-tools";
import { loadChat, saveChat } from "@/lib/chat-store";

export const maxDuration = 300;

const CHAT_SYSTEM = [
  "You answer hardware compatibility questions for any products and any manufacturers: CPU/motherboard, RAM, GPU/PSU, camera/lens, flash, storage, docking, networking optics, 3D-printer parts, chargers, etc. Nothing is out of scope because of brand or category.",
  "",
  "Always use tools. Never refuse for being the wrong vertical. Never invent spec values.",
  "",
  "Flow:",
  "1. Call checkCompatibility with deviceQuery, candidateQuery, and question set to the user's full message (including BIOS, firmware, AF, wattage, and other caveats).",
  "2. Or discoverSpecUrls then scrapeSpecs if you need extra pages.",
  "3. Use extracted specs and page_text. Cite source URLs. If a BIOS/firmware condition is in the evidence, the verdict is conditional. If a required fact is missing, unclear — list what was checked.",
  "",
  "Do not tell the user a brand is unsupported.",
].join("\n");

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.MINIMAX_API_KEY) {
    return Response.json(
      { error: "Set MINIMAX_API_KEY to enable chat." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    id?: string;
    message?: UIMessage;
  };
  const chatId = body.id;
  const message = body.message;
  if (!chatId || !message) {
    return Response.json({ error: "id and message are required" }, { status: 400 });
  }

  const previous = await loadChat(chatId, session.user.id);
  const messages = await validateUIMessages({
    messages: [...previous, message],
  });

  const result = streamText({
    model: minimax.chatModel(minimaxModelId),
    system: CHAT_SYSTEM,
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    stopWhen: stepCountIs(12),
    abortSignal: request.signal,
    providerOptions: {
      minimax: {
        thinking: { type: "adaptive" },
      },
    },
  });

  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      onEnd: async ({ messages: next }) => {
        await saveChat({
          chatId,
          userId: session.user.id,
          messages: next,
        });
      },
    }),
  });
}
