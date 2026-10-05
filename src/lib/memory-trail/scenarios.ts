import type { NearMatchSignalType } from "@/types/memory-trail";

/**
 * The three scripted interview scenarios. Each one names a real target/near-match
 * pair in demoPhotos.ts -- used by the moderator script (see MEMORY_TRAIL_INTERVIEWS.md)
 * and by scripts/verify-memory-trail-scenarios.ts to guarantee the arc actually
 * converges before running a real session.
 */
export type Scenario = {
  id: string;
  title: string;
  startingMemory: string;
  targetId: string;
  /** The photo a participant should recognize as useful context -- not the target. */
  nearMatchId: string;
  /** Any of these near-match signals (chosen on nearMatchId) should reliably work, not just one. */
  robustSignals: NearMatchSignalType[];
  /** The clue that should surface only after seeing related results. */
  laterClue: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "concert",
    title: "Concert with a friend",
    startingMemory: "a concert, with a friend, probably last year",
    targetId: "IMG_4081",
    nearMatchId: "IMG_4089",
    robustSignals: ["same_event", "same_people", "similar_scene"],
    laterClue: "fireworks",
  },
  {
    id: "dinner",
    title: "A friend's birthday dinner",
    startingMemory: "a dinner with a friend",
    targetId: "IMG_4408",
    nearMatchId: "IMG_4382",
    robustSignals: ["same_event", "same_people"],
    laterClue: "cake",
  },
  {
    id: "roadtrip",
    title: "Sunset on a road trip",
    startingMemory: "a sunset photo from a road trip with a friend",
    targetId: "IMG_8311",
    nearMatchId: "IMG_8308",
    robustSignals: ["same_event", "same_people", "similar_scene"],
    laterClue: "river",
  },
];
