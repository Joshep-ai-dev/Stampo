import { randomUUID } from "node:crypto";

export const CATALOG_DEFAULTS = {
  countries: [],
  cities: [],
  sights: [],
  collections: [],
  countryCollections: [],
  imageCredits: [],
  importCache: [],
};

export function ensureCatalog(db) {
  for (const [key, value] of Object.entries(CATALOG_DEFAULTS))
    db.data[key] ??= [...value];
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cleanDescription(value, maxSentences = 2) {
  const clean = String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .slice(0, maxSentences)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function rankEntities(items, limit) {
  return [...items]
    .sort(
      (a, b) =>
        (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999) ||
        Number(b.population ?? b.score ?? 0) -
          Number(a.population ?? a.score ?? 0) ||
        String(a.name).localeCompare(String(b.name)),
    )
    .slice(0, limit);
}

export function dedupeByStableId(items, keys) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keys.map((field) => item[field]).find(Boolean);
    const stable = key
      ? String(key).toLowerCase()
      : `${slugify(item.name)}:${Number(item.latitude).toFixed(3)}:${Number(item.longitude).toFixed(3)}`;
    if (seen.has(stable)) return false;
    seen.add(stable);
    return true;
  });
}

export function upsertImported(list, match, incoming) {
  const existing = list.find(match);
  if (!existing) {
    const created = {
      id: incoming.id ?? randomUUID(),
      ...incoming,
      manualFields: incoming.manualFields ?? [],
    };
    list.push(created);
    return created;
  }
  const manual = new Set(existing.manualFields ?? []);
  for (const [key, value] of Object.entries(incoming))
    if (!manual.has(key) && value !== undefined) existing[key] = value;
  return existing;
}

export function imageCredit(entityType, entityId, image = {}) {
  if (!image.sourceUrl && !image.filePageUrl) return null;
  return {
    entityType,
    entityId,
    sourceUrl: image.sourceUrl ?? image.url ?? "",
    filePageUrl: image.filePageUrl ?? "",
    creator: image.creator ?? "",
    license: image.license ?? "",
    licenseUrl: image.licenseUrl ?? "",
    attribution: image.attribution ?? "",
  };
}
