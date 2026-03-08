// Moonshot Kimi API rejects certain JSON Schema keywords in tool definitions.
// This module strips unsupported keywords to prevent 400 errors.

// Keywords that Moonshot API rejects or has issues with.
// Based on similar constraints in Gemini and xAI APIs.
export const MOONSHOT_UNSUPPORTED_SCHEMA_KEYWORDS = new Set([
  // Validation constraints that frequently cause issues
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "multipleOf",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
  "minContains",
  "maxContains",

  // Meta keywords that may not be supported
  "patternProperties",
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "definitions",
  "examples",
]);

const SCHEMA_META_KEYS = ["description", "title", "default"] as const;

function copySchemaMeta(from: Record<string, unknown>, to: Record<string, unknown>): void {
  for (const key of SCHEMA_META_KEYS) {
    if (key in from && from[key] !== undefined) {
      to[key] = from[key];
    }
  }
}

type SchemaDefs = Map<string, unknown>;

function extendSchemaDefs(
  defs: SchemaDefs | undefined,
  schema: Record<string, unknown>,
): SchemaDefs | undefined {
  const defsEntry =
    schema.$defs && typeof schema.$defs === "object" && !Array.isArray(schema.$defs)
      ? (schema.$defs as Record<string, unknown>)
      : undefined;
  const legacyDefsEntry =
    schema.definitions &&
    typeof schema.definitions === "object" &&
    !Array.isArray(schema.definitions)
      ? (schema.definitions as Record<string, unknown>)
      : undefined;

  if (!defsEntry && !legacyDefsEntry) {
    return defs;
  }

  const next = defs ? new Map(defs) : new Map<string, unknown>();
  if (defsEntry) {
    for (const [key, value] of Object.entries(defsEntry)) {
      next.set(key, value);
    }
  }
  if (legacyDefsEntry) {
    for (const [key, value] of Object.entries(legacyDefsEntry)) {
      next.set(key, value);
    }
  }
  return next;
}

function decodeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

function tryResolveLocalRef(ref: string, defs: SchemaDefs | undefined): unknown {
  if (!defs) {
    return undefined;
  }
  const match = ref.match(/^#\/(?:\$defs|definitions)\/(.+)$/);
  if (!match) {
    return undefined;
  }
  const name = decodeJsonPointerSegment(match[1] ?? "");
  if (!name) {
    return undefined;
  }
  return defs.get(name);
}

function stripMoonshotUnsupportedKeywordsWithDefs(
  schema: unknown,
  defs: SchemaDefs | undefined,
  refStack: Set<string> | undefined,
): unknown {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => stripMoonshotUnsupportedKeywordsWithDefs(item, defs, refStack));
  }

  const obj = schema as Record<string, unknown>;
  const nextDefs = extendSchemaDefs(defs, obj);

  const refValue = typeof obj.$ref === "string" ? obj.$ref : undefined;
  if (refValue) {
    if (refStack?.has(refValue)) {
      return {};
    }

    const resolved = tryResolveLocalRef(refValue, nextDefs);
    if (resolved) {
      const nextRefStack = refStack ? new Set(refStack) : new Set<string>();
      nextRefStack.add(refValue);

      const cleaned = stripMoonshotUnsupportedKeywordsWithDefs(resolved, nextDefs, nextRefStack);
      if (!cleaned || typeof cleaned !== "object" || Array.isArray(cleaned)) {
        return cleaned;
      }

      const result: Record<string, unknown> = {
        ...(cleaned as Record<string, unknown>),
      };
      copySchemaMeta(obj, result);
      return result;
    }
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (MOONSHOT_UNSUPPORTED_SCHEMA_KEYWORDS.has(key)) {
      continue;
    }
    if (key === "properties" && value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          stripMoonshotUnsupportedKeywordsWithDefs(v, nextDefs, refStack),
        ]),
      );
    } else if (key === "items" && value && typeof value === "object") {
      cleaned[key] = Array.isArray(value)
        ? value.map((entry) => stripMoonshotUnsupportedKeywordsWithDefs(entry, nextDefs, refStack))
        : stripMoonshotUnsupportedKeywordsWithDefs(value, nextDefs, refStack);
    } else if ((key === "anyOf" || key === "oneOf" || key === "allOf") && Array.isArray(value)) {
      cleaned[key] = value.map((entry) =>
        stripMoonshotUnsupportedKeywordsWithDefs(entry, nextDefs, refStack),
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export function stripMoonshotUnsupportedKeywords(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(stripMoonshotUnsupportedKeywords);
  }
  const defs = extendSchemaDefs(undefined, schema as Record<string, unknown>);
  return stripMoonshotUnsupportedKeywordsWithDefs(schema, defs, undefined);
}

export function isMoonshotProvider(modelProvider?: string, modelId?: string): boolean {
  const provider = modelProvider?.toLowerCase() ?? "";
  if (provider.includes("moonshot")) {
    return true;
  }
  const lowerModelId = modelId?.toLowerCase() ?? "";

  // Known proxy providers may expose Moonshot models under either
  // `moonshot...` or bare `kimi...` model IDs.
  const isMoonshotLikeModelId =
    lowerModelId.includes("moonshot") ||
    lowerModelId.includes("moonshotai") ||
    lowerModelId.includes("kimi-") ||
    lowerModelId === "kimi";

  const proxyProviders = new Set(["openrouter", "deepinfra", "nvidia", "nvidia-nim", "together"]);

  if (proxyProviders.has(provider) && isMoonshotLikeModelId) {
    return true;
  }

  return false;
}
