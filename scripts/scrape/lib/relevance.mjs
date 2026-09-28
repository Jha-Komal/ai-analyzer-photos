// Lightweight keyword prefilter used ONLY to keep scrape volume manageable.
// This is NOT the AI relevance classifier described in the spec (section 9/10) --
// it exists so we don't store every single "great app!" review. Anything that
// matches is still just a raw candidate document; DIRECT_RETRIEVAL vs
// ADJACENT_RETRIEVAL vs NOT_RELEVANT classification happens later in the
// pipeline (Prompt 1), not here.

export const RETRIEVAL_KEYWORDS = [
  "can't find",
  "cant find",
  "cannot find",
  "can't locate",
  "couldn't find",
  "could not find",
  "search doesn't work",
  "search does not work",
  "search not working",
  "search stopped",
  "search results",
  "search not showing",
  "old photo",
  "old picture",
  "old video",
  "find specific",
  "find a photo",
  "find a picture",
  "find my photo",
  "find my picture",
  "find that photo",
  "find that picture",
  "search memory",
  "search object",
  "search screenshot",
  "search document",
  "search exact",
  "search keyword",
  "timeline scrolling",
  "keyword search",
  "missing photo",
  "missing picture",
  "lost photo",
  "search for a photo",
  "search for photos",
  "looking for a photo",
  "looking for a picture",
  "where is my photo",
  "where are my photos",
];

const normalized = RETRIEVAL_KEYWORDS.map((k) => k.toLowerCase());

export function isRetrievalRelevant(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return normalized.some((k) => lower.includes(k));
}

export function matchedKeywords(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return normalized.filter((k) => lower.includes(k));
}
