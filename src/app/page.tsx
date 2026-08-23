import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        OnePiece
      </h1>
      <p className="max-w-md text-muted-foreground">
        Will this nozzle fit that hotend? Sourced from real manufacturer and
        community docs, not guesswork.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/sign-up">Sign up</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
