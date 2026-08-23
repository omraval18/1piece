import { NextResponse } from "next/server";
import { listCatalog } from "@/lib/compat/catalog";

export function GET() {
  return NextResponse.json({ parts: listCatalog() });
}
