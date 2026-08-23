import Link from "next/link";
import { CompatLab } from "@/components/compat-lab";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex items-center justify-end gap-4 p-4 text-sm">
        <Link className="underline underline-offset-4" href="/sign-in">
          Sign in
        </Link>
        <Link className="underline underline-offset-4" href="/sign-up">
          Sign up
        </Link>
      </nav>
      <CompatLab />
    </div>
  );
}
