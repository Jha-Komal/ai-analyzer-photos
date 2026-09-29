import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RetrievalEpisode } from "@/types/episode";
import type { RawDocument } from "@/types/document";

async function loadJson<T>(relPath: string, fallback: T): Promise<T> {
  try {
    const filePath = path.join(process.cwd(), relPath);
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

export function loadEpisodes(): Promise<RetrievalEpisode[]> {
  return loadJson("data/processed/episodes.json", []);
}

export function loadDocuments(): Promise<RawDocument[]> {
  return loadJson("data/raw/documents.json", []);
}
