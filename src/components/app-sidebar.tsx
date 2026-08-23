"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquareIcon, PuzzleIcon } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { NewChatButton } from "@/components/new-chat-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type SidebarConversation = {
  id: string;
  title: string;
  updatedAt: Date | string;
};

export function AppSidebar({
  conversations,
  userLabel,
}: {
  conversations: SidebarConversation[];
  userLabel: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/"}>
              <Link href="/">
                <MessageSquareIcon />
                <span>Chats</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/parts"}>
              <Link href="/parts">
                <PuzzleIcon />
                <span>Parts lab</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <NewChatButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.length === 0 ? (
                <p className="px-2 text-xs text-muted-foreground">
                  No chats yet. Start one to save messages and tool calls.
                </p>
              ) : (
                conversations.map((item) => {
                  const href = `/${item.id}`;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild isActive={pathname === href}>
                        <Link href={href}>
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="truncate px-2 text-xs text-muted-foreground">{userLabel}</p>
        <SignOutButton />
      </SidebarFooter>
    </Sidebar>
  );
}
