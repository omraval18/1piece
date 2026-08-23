import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { UIMessage } from "ai";
import { auth } from "@/lib/auth";
import { getConversation } from "@/lib/chat-store";
import { ChatView } from "@/components/chat-view";
import { ConversationEmptyState } from "@/components/ai-elements/conversation";

export default async function AppPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const slug = (await params).slug ?? [];

  if (slug.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <ConversationEmptyState
          title="Pick or start a chat"
          description="Ask about any two pieces of hardware. The agent discovers spec pages, scrapes them with Bright Data, and scores fit. Use New chat in the sidebar."
        />
      </div>
    );
  }

  if (slug.length === 1) {
    const chat = await getConversation(slug[0], session.user.id);
    if (!chat) {
      notFound();
    }
    return (
      <ChatView
        id={chat.id}
        initialMessages={(chat.messages as UIMessage[]) ?? []}
      />
    );
  }

  notFound();
}
