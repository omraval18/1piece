import type { PartProfile } from "./contracts";

const META_KEYS = new Set([
  "input",
  "error",
  "errors",
  "status",
  "collector",
  "responseId",
  "response_id",
  "elapsedMs",
  "raw",
  "html",
  "screenshot",
]);

const WRAPPER_KEYS = [
  "data",
  "product",
  "result",
  "record",
  "item",
  "json",
  "output",
  "extracted",
  "fields",
  "specs",
  "specification",
  "specifications",
  "attributes",
];

const NAME_KEYS = [
  "name",
  "product_name",
  "productName",
  "title",
  "model",
  "heading",
  "sku_name",
  "product",
];

const CATEGORY_KEYS = [
  "category",
  "part_kind",
  "kind",
  "type",
  "product_type",
  "productType",
];

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return asRecord(JSON.parse(trimmed));
      } catch {
        return { page_text: trimmed };
      }
    }
    return trimmed ? { page_text: trimmed } : {};
  }
  if (Array.isArray(raw)) {
    const first = raw.find((item) => item && typeof item === "object");
    return first && typeof first === "object"
      ? asRecord(first)
      : {};
  }
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function unwrap(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 4) return obj;
  const keys = Object.keys(obj).filter((key) => !META_KEYS.has(key));
  if (keys.length === 1 && WRAPPER_KEYS.includes(keys[0]!)) {
    const inner = obj[keys[0]!];
    if (inner && typeof inner === "object") {
      return unwrap(asRecord(inner), depth + 1);
    }
  }
  return obj;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function flattenSpecs(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string | number> {
  const specs: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (META_KEYS.has(key)) continue;
    if (
      !prefix &&
      (NAME_KEYS.includes(key) ||
        CATEGORY_KEYS.includes(key) ||
        key === "source_url" ||
        key === "page_url")
    ) {
      continue;
    }
    if (value == null || value === "") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "number" && Number.isFinite(value)) {
      specs[path] = value;
      continue;
    }
    if (typeof value === "boolean") {
      specs[path] = String(value);
      continue;
    }
    if (Array.isArray(value)) {
      const scalars = value
        .map((item) =>
          typeof item === "string" || typeof item === "number" ? String(item) : null,
        )
        .filter((item): item is string => Boolean(item));
      if (scalars.length) specs[path] = scalars.join(", ");
      else {
        const text = asString(JSON.stringify(value));
        if (text && text !== "[]") specs[path] = text;
      }
      continue;
    }
    if (typeof value === "object") {
      Object.assign(specs, flattenSpecs(value as Record<string, unknown>, path));
      continue;
    }
    const text = asString(value);
    if (!text) continue;
    specs[path] = /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
  }
  return specs;
}

export function isUsableProfile(profile: PartProfile): boolean {
  const facts = Object.entries(profile.specs).filter(([key]) => {
    const root = key.split(".")[0] ?? key;
    return !META_KEYS.has(root) && root !== "url";
  });
  const pageText = profile.specs.page_text;
  if (typeof pageText === "string" && pageText.length >= 400) return true;
  if (facts.length >= 2) return true;
  return Boolean(profile.name) && facts.length >= 1;
}

export function normalizePart(raw: unknown, sourceUrl: string): PartProfile {
  const obj = unwrap(asRecord(raw));
  const nameValue = pick(obj, NAME_KEYS);
  const name =
    asString(nameValue) ??
    (nameValue && typeof nameValue === "object"
      ? asString(pick(asRecord(nameValue), NAME_KEYS))
      : null);
  const category = asString(pick(obj, CATEGORY_KEYS));
  const source_url =
    asString(pick(obj, ["source_url", "url", "page_url"])) ?? sourceUrl;

  const pageText = asString(
    pick(obj, ["page_text", "markdown", "content", "text", "body"]),
  );
  const specs = flattenSpecs(obj);
  if (pageText && !specs.page_text) specs.page_text = pageText.slice(0, 8000);

  return {
    name,
    category,
    source_url,
    specs,
  };
}
