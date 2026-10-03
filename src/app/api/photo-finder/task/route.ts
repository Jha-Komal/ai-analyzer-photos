import { loadTasks } from "@/lib/photo-finder/library";
import { ok } from "@/lib/api-response";

/** Test-task narratives only. The target photo id and expected refinement never leave the server. */
export async function GET() {
  const tasks = await loadTasks();
  return ok(tasks.map(({ id, title, narrative }) => ({ id, title, narrative })));
}
