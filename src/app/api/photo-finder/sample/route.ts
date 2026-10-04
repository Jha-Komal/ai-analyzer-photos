import { sampleLibrary } from "@/lib/photo-finder/library";
import { ok } from "@/lib/api-response";

/** Random decorative photos for the pre-search screen -- public fields only, no AI captions/tags. */
export async function GET() {
  return ok(await sampleLibrary(18));
}
