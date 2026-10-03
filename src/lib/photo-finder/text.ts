const STOP = new Set(
  ("a an the of and or but to in on at for with from by as into my me i we our us you your was were is are be been it its this that " +
    "there then maybe about around some very really quite just also not no had have has having taken take took remember remembered " +
    "photo photos picture pictures pic pics image images shot shots one").split(" "),
);

/** Cheap, consistent stemmer: only needs to map both sides (queries and captions) to the same form. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
  else if (/(sses|xes|ches|shes|zes)$/.test(w) && w.length > 4) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  return w;
}

/** UK/US spelling variants collapse to one form (captions say "coloured", users type "colored"). */
function normalizeSpelling(text: string): string {
  return text.toLowerCase().replace(/colour/g, "color").replace(/grey/g, "gray").replace(/centre/g, "center").replace(/favour/g, "favor");
}

export function tokens(text: string): string[] {
  return (normalizeSpelling(text).match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 1 && !STOP.has(t)).map(stem);
}

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
