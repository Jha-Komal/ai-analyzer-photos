// Runs the 5 predefined retrieval scenarios end to end against the real engine (real OpenRouter calls)
// and checks that anchor selection + refinement genuinely changes the ranking.
// Usage: npx tsx scripts/mvp/verifyScenarios.ts [--quiet]
import { config } from "dotenv";
config({ path: ".env.local" });

import { startRetrieval, refineRetrieval, fullOrder } from "../../src/lib/photo-finder/engine";
import { loadTasks, loadLibrary } from "../../src/lib/photo-finder/library";

const rankOf = (order: string[], id: string) => order.indexOf(id) + 1;

async function main() {
  const tasks = await loadTasks();
  const library = new Map((await loadLibrary()).map((p) => [p.id, p]));
  let failures = 0;
  const rows: string[] = [];

  for (const t of tasks) {
    const started = await startRetrieval(t.suggestedQuery);
    const before = await fullOrder(started.session);
    const r0 = rankOf(before, t.targetId);

    const refined = await refineRetrieval(started.session, t.anchorId, t.refinement);
    const after = await fullOrder(refined.session);
    const r1 = rankOf(after, t.targetId);

    const firstSet = started.candidates.map((c) => c.id);
    const secondSet = refined.candidates.map((c) => c.id);
    const changed = secondSet.filter((id) => !firstSet.includes(id)).length;
    const inGrid = secondSet.includes(t.targetId);
    const positionsChanged = secondSet.filter((id, i) => firstSet[i] !== id).length;
    const improved = r1 < r0;
    // Ablation: same refinement text but a wrong anchor from another scenario must not give the same grid.
    const wrongAnchor = tasks[(tasks.indexOf(t) + 1) % tasks.length].anchorId;
    const wrong = await refineRetrieval(started.session, wrongAnchor, t.refinement);
    const anchorMatters = wrong.candidates.map((c) => c.id).join() !== secondSet.join();
    const trivial = r0 === 1;
    const ok = improved && (changed >= 2 || positionsChanged >= 3) && anchorMatters && !trivial && !refined.degraded && !started.degraded;
    if (!ok) failures++;

    rows.push(`${ok ? "PASS" : "FAIL"}  ${t.id.padEnd(10)} target rank ${String(r0).padStart(3)} -> ${String(r1).padStart(3)}  | new in grid: ${changed}/6, positions changed: ${positionsChanged}/6 | target in grid: ${inGrid ? "yes" : "no"} | anchor matters: ${anchorMatters ? "yes" : "NO"}${trivial ? " | TRIVIAL (target already #1)" : ""}${refined.degraded || started.degraded ? "  (LLM degraded!)" : ""}`);
    console.log(`\n=== ${t.id}: "${t.suggestedQuery}"`);
    console.log("initial clues :", started.session.clues.map((c) => c.text).join(" | "), started.session.time ? `| time ${started.session.time.start}-${started.session.time.end}` : "");
    console.log(`anchor ${t.anchorId}: ${library.get(t.anchorId)?.description.slice(0, 80)}`);
    console.log(`refinement   : "${t.refinement}"`);
    console.log("round-2 clues:", refined.session.rounds[1].extractedClues.join(" | "), "| aspects:", refined.session.anchorAspects.join(",") || "-");
    console.log("grid 1:", firstSet.join(" "));
    console.log("grid 2:", secondSet.join(" "));
  }

  console.log("\n================ SUMMARY ================");
  console.log(rows.join("\n"));
  console.log(failures === 0 ? "\nAll scenarios passed." : `\n${failures} scenario(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
