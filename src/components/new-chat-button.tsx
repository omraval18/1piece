"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function NewChatButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <SidebarMenuButton
      disabled={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          const res = await fetch("/api/conversations", { method: "POST" });
          const data = (await res.json()) as { id?: string; error?: string };
          if (!res.ok || !data.id) {
            toast.error(data.error ?? "Could not start a chat");
            return;
          }
          router.push(`/${data.id}`);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <PlusIcon />
      <span>{pending ? "Starting…" : "New chat"}</span>
    </SidebarMenuButton>
  );
}
