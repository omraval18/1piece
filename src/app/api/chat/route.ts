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

export const maxDuration = 60;

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
    system: `You help users check 3D-printer nozzle and hotend compatibility.
Use listParts, extractPart, and findCompatibleParts instead of guessing specs.
Cite the fields those tools return. If a required spec is missing, say the result is unclear.`,
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    stopWhen: stepCountIs(8),
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
