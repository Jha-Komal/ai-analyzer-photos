import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Photo, PublicPhoto } from "@/types/photo-finder";

export type Task = {
  id: string;
  title: string;
  narrative: string;
  targetId: string;
  suggestedQuery: string;
  anchorId: string;
  refinement: string;
};

let libraryCache: Photo[] | null = null;
let taskCache: Task[] | null = null;

async function readJson<T>(rel: string): Promise<T> {
  return JSON.parse(await readFile(path.join(process.cwd(), rel), "utf-8")) as T;
}

export async function loadLibrary(): Promise<Photo[]> {
  if (!libraryCache) libraryCache = await readJson<Photo[]>("data/mvp/library.json");
  return libraryCache;
}

export async function loadTasks(): Promise<Task[]> {
  if (!taskCache) taskCache = await readJson<Task[]>("data/mvp/tasks.json");
  return taskCache;
}

export function toPublic(photo: Photo): PublicPhoto {
  return { id: photo.id, url: photo.url, date: photo.metadata.date, location: photo.metadata.location };
}

/** A random slice of the library, shown as a decorative backdrop before any search -- not search results. */
export async function sampleLibrary(count: number): Promise<PublicPhoto[]> {
  const photos = await loadLibrary();
  const shuffled = [...photos].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(toPublic);
}
