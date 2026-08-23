"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type CatalogItem = {
  id: string;
  label: string;
  url: string;
};

type Profile = {
  name: string | null;
  category: string | null;
  specs: Record<string, string | number>;
  source_url: string | null;
};

type Verdict = {
  result: "compatible" | "incompatible" | "conditional" | "unclear";
  reasoning: string;
  decisive_fields: string[];
  sources: { url: string; part: "a" | "b" }[];
};

type CompatPayload = {
  mode: "fixture" | "live";
  collectorId: string | null;
  query: { profile: Profile; raw: unknown; mode: string };
  matches: {
    id: string;
    label: string;
    url: string;
    verdict: Verdict;
  }[];
};

const selectClass =
  "h-10 w-full border-b border-input bg-transparent text-sm outline-none";

export function CompatLab() {
  const [parts, setParts] = useState<CatalogItem[]>([]);
  const [catalogId, setCatalogId] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompatPayload | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data: { parts: CatalogItem[] }) => {
        setParts(data.parts);
        if (data.parts[0]) {
          setCatalogId(data.parts[0].id);
        }
      })
      .catch(() => toast.error("Could not load catalog"));
  }, []);

  const selected = useMemo(
    () => parts.find((part) => part.id === catalogId),
    [parts, catalogId],
  );

  async function run(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    const body = url.trim() ? { url: url.trim() } : { catalogId };
    try {
      const res = await fetch("/api/compat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          CompatibilityProof
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Will these two parts work together?
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Specs come from manufacturer and wiki pages via Bright Data Scraper
          Studio. Fit is scored against the actual extracted fields, with
          citations, not a page-level guess.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your part</CardTitle>
          <CardDescription>
            Pick a catalog item (fixture, free) or paste a product URL (live
            Studio run when collector ids are set).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-6" onSubmit={run}>
            <Field>
              <FieldLabel htmlFor="catalog">Catalog</FieldLabel>
              <select
                id="catalog"
                className={selectClass}
                value={catalogId}
                onChange={(event) => setCatalogId(event.target.value)}
              >
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.label}
                  </option>
                ))}
              </select>
              {selected && (
                <p className="text-xs text-muted-foreground">
                  Source:{" "}
                  <a
                    className="underline underline-offset-4"
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.url}
                  </a>
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="url">Or paste a spec page URL</FieldLabel>
              <Input
                id="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/products/…"
              />
            </Field>
            <Button type="submit" disabled={loading}>
              {loading ? "Extracting…" : "Find matching parts"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? <Results payload={result} /> : null}
    </div>
  );
}

function Results({ payload }: { payload: CompatPayload }) {
  const profile = payload.query.profile;
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Extracted profile</CardTitle>
          <CardDescription>
            Mode {payload.mode}
            {payload.collectorId ? ` · collector ${payload.collectorId}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">
            {profile.name ?? "Unnamed"}{" "}
            {profile.category && (
              <span className="text-muted-foreground">({profile.category})</span>
            )}
          </p>
          {profile.source_url ? (
            <Link
              className="text-sm underline underline-offset-4"
              href={String(profile.source_url)}
              target="_blank"
            >
              Open source page
            </Link>
          ) : null}
          <pre className="overflow-x-auto border border-border bg-muted/40 p-4 text-xs">
            {JSON.stringify(profile.specs, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <ul className="flex flex-col gap-4">
        {payload.matches.map((match) => (
          <li key={match.id}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{match.label}</CardTitle>
                    <CardDescription>
                      <a
                        className="underline underline-offset-4"
                        href={match.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source
                      </a>
                    </CardDescription>
                  </div>
                  <ResultBadge result={match.verdict.result} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p>{match.verdict.reasoning}</p>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Fields: {match.verdict.decisive_fields.join(", ") || "—"}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultBadge({ result }: { result: Verdict["result"] }) {
  const label =
    result === "compatible"
      ? "Compatible"
      : result === "incompatible"
        ? "Incompatible"
        : result === "conditional"
          ? "Conditional"
          : "Unclear";
  return (
    <span className="border border-border px-2 py-1 text-xs font-semibold tracking-widest uppercase">
      {label}
    </span>
  );
}
