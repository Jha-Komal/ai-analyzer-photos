import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export function generateId(prefix, ...parts) {
  const hash = createHash("sha256").update(parts.filter(Boolean).join("|")).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
}

export async function loadExisting(filePath) {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function mergeById(existing, incoming) {
  const byId = new Map(existing.map((item) => [item.id, item]));
  let added = 0;
  for (const item of incoming) {
    if (!byId.has(item.id)) added++;
    byId.set(item.id, { ...byId.get(item.id), ...item });
  }
  return { merged: Array.from(byId.values()), added };
}

export async function saveJson(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
