import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listConversations } from "@/lib/chat-store";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const conversations = await listConversations(session.user.id);

  return (
    <SidebarProvider className="h-dvh overflow-hidden">
      <AppSidebar
        conversations={conversations}
        userLabel={`${session.user.name} · ${session.user.email}`}
      />
      <SidebarInset className="flex h-full min-h-0 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          <Separator className="h-4 !self-center" orientation="vertical" />
          <span className="text-xs font-semibold tracking-widest uppercase">
            OnePiece
          </span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
