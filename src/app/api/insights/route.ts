import { loadEpisodesWithTaxonomy } from "@/lib/data";
import { generateInsights } from "@/lib/ai-service";
import { getInsights, saveInsights } from "@/lib/store";
import { DISCOVERY_QUESTIONS } from "@/lib/constants";
import { ok, fail } from "@/lib/api-response";

export async function GET() {
  try {
    return ok(await getInsights());
  } catch (err) {
    return fail(String(err));
  }
}

/** Regenerates insights from whatever episodes already exist. */
export async function POST() {
  try {
    const episodes = await loadEpisodesWithTaxonomy();
    if (episodes.length === 0) {
      return fail("No episodes extracted yet -- run episode extraction first.", 409);
    }

    const insights = await generateInsights(episodes, DISCOVERY_QUESTIONS);
    await saveInsights(insights);
    return ok(insights);
  } catch (err) {
    return fail(String(err));
  }
}
