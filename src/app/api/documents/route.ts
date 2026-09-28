import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { RawDocument } from "@/types/document";

export async function GET() {
  let documents: RawDocument[] = [];
  try {
    const filePath = path.join(process.cwd(), "data", "raw", "documents.json");
    documents = JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    documents = [];
  }

  return NextResponse.json(documents);
}
