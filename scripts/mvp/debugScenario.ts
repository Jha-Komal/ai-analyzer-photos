// Prints per-signal scores for one scenario after anchor + refinement.
// Usage: npx tsx scripts/mvp/debugScenario.ts <taskId>
import { config } from "dotenv";
config({ path: ".env.local" });

import { startRetrieval, refineRetrieval } from "../../src/lib/photo-finder/engine";
import { loadTasks } from "../../src/lib/photo-finder/library";

async function main() {
  const t = (await loadTasks()).find((x) => x.id === process.argv[2]);
  if (!t) throw new Error("Unknown task id");
  const s = await startRetrieval(t.suggestedQuery);
  const r = await refineRetrieval(s.session, t.anchorId, t.refinement);
  console.log("target", t.targetId, "anchor", t.anchorId);
  console.log("clues:", r.session.clues.map((c) => `${c.polarity[0]}:${c.text}[${(c.terms ?? []).join(",")}]`).join(" | "));
  console.log("aspects:", r.session.anchorAspects, "time:", JSON.stringify(r.session.time));
  for (const d of r.debug ?? []) {
    console.log(d.id, `text ${d.text.toFixed(2)} clue ${d.clue.toFixed(2)} anchor ${d.anchor.toFixed(2)} meta ${d.meta.toFixed(2)} llm ${d.llm?.toFixed(2)} final ${d.final.toFixed(2)}`, d.id === t.targetId ? "<== TARGET" : "");
  }
}
main();
