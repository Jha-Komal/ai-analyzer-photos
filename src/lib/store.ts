import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Insight, ResearchReport } from "@/types/insight";

const PROCESSED_DIR = path.join(process.cwd(), "data", "processed");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(PROCESSED_DIR, file), "utf-8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(PROCESSED_DIR, { recursive: true });
  await writeFile(path.join(PROCESSED_DIR, file), JSON.stringify(data, null, 2), "utf-8");
}

export function getInsights(): Promise<Insight[]> {
  return readJson<Insight[]>("insights.json", []);
}

export function saveInsights(insights: Insight[]): Promise<void> {
  return writeJson("insights.json", insights);
}

export function getResearchReport(): Promise<ResearchReport | null> {
  return readJson<ResearchReport | null>("researchReport.json", null);
}

export function saveResearchReport(report: ResearchReport): Promise<void> {
  return writeJson("researchReport.json", report);
}
