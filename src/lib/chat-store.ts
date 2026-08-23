import { desc, eq, and } from "drizzle-orm";
import { generateId, type UIMessage } from "ai";
import { db } from "@/db";
import { conversation } from "@/db/schema";

const idPattern = /^[A-Za-z0-9_-]+$/;

function isChatId(id: string) {
  return idPattern.test(id);
}

function titleFromMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "New chat";
  const text = firstUser.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
  if (!text) return "New chat";
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

export async function createConversation(userId: string) {
  const id = generateId();
  await db.insert(conversation).values({
    id,
    userId,
    title: "New chat",
    messages: [],
  });
  return id;
}

export async function listConversations(userId: string) {
  return db
    .select({
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
    })
    .from(conversation)
    .where(eq(conversation.userId, userId))
    .orderBy(desc(conversation.updatedAt));
}

export async function loadChat(id: string, userId: string): Promise<UIMessage[]> {
  if (!isChatId(id)) return [];
  const [row] = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.id, id), eq(conversation.userId, userId)))
    .limit(1);
  if (!row) return [];
  return (row.messages as UIMessage[]) ?? [];
}

export async function getConversation(id: string, userId: string) {
  if (!isChatId(id)) return null;
  const [row] = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.id, id), eq(conversation.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function saveChat({
  chatId,
  userId,
  messages,
}: {
  chatId: string;
  userId: string;
  messages: UIMessage[];
}) {
  if (!isChatId(chatId)) {
    throw new Error("Invalid chat id");
  }
  const existing = await getConversation(chatId, userId);
  if (!existing) {
    throw new Error("Chat not found");
  }
  const title =
    existing.title === "New chat" ? titleFromMessages(messages) : existing.title;
  await db
    .update(conversation)
    .set({
      messages,
      title,
      updatedAt: new Date(),
    })
    .where(and(eq(conversation.id, chatId), eq(conversation.userId, userId)));
}
