import { NextResponse } from "next/server";
import { z } from "zod";
import { partKindSchema } from "@/lib/compat/contracts";
import { extractDevice } from "@/lib/compat/extract";

export const maxDuration = 180;

const bodySchema = z
  .object({
    catalogId: z.string().min(1).optional(),
    url: z.string().url().optional(),
    kind: partKindSchema.optional(),
  })
  .refine((value) => value.catalogId || value.url, {
    message: "catalogId or url is required",
  });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  try {
    const result = await extractDevice(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extract failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
