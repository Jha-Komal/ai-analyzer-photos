import type { RawDocument } from "@/types/document";

export type DocumentStats = {
  total: number;
  bySource: Record<string, number>;
  bySourceType: Record<string, number>;
};

export function computeDocumentStats(documents: RawDocument[]): DocumentStats {
  const bySource: Record<string, number> = {};
  const bySourceType: Record<string, number> = {};

  for (const doc of documents) {
    bySource[doc.source] = (bySource[doc.source] ?? 0) + 1;
    bySourceType[doc.sourceType] = (bySourceType[doc.sourceType] ?? 0) + 1;
  }

  return { total: documents.length, bySource, bySourceType };
}
