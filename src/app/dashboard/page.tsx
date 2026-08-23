import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CompatLab } from "@/components/compat-lab";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          {session.user.name} · {session.user.email}
        </p>
        <SignOutButton />
      </div>
      <CompatLab />
    </div>
  );
}
