import { loadDocuments, loadRelevant, loadEpisodesWithTaxonomy } from "@/lib/data";
import { computeDiscoveryStats } from "@/lib/aggregation";
import { generateResearchReport } from "@/lib/ai-service";
import { getResearchReport, saveResearchReport } from "@/lib/store";
import { ok, fail } from "@/lib/api-response";

export async function GET() {
  try {
    return ok(await getResearchReport());
  } catch (err) {
    return fail(String(err));
  }
}

/** Regenerates the research report from whatever documents/episodes already exist. */
export async function POST() {
  try {
    const [documents, relevant, episodes] = await Promise.all([loadDocuments(), loadRelevant(), loadEpisodesWithTaxonomy()]);

    if (episodes.length === 0) {
      return fail("No episodes extracted yet -- run episode extraction first.", 409);
    }

    const stats = computeDiscoveryStats(documents, relevant, episodes);
    const content = await generateResearchReport(stats, episodes);
    const report = {
      content,
      generatedAt: new Date().toISOString(),
      episodeCount: episodes.length,
      documentCount: documents.length,
    };
    await saveResearchReport(report);
    return ok(report);
  } catch (err) {
    return fail(String(err));
  }
}
