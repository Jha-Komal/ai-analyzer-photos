"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RELEVANCE_TERMS = [
  {
    term: "DIRECT_RETRIEVAL",
    tone: "positive" as const,
    plain: "The user is actively trying to find a photo/video they remember exists -- searching, browsing, checking albums.",
    example: '"I remember a photo of that café in Goa but can\'t find it no matter what I search."',
  },
  {
    term: "ADJACENT_RETRIEVAL",
    tone: "neutral" as const,
    plain: "They can't see a photo, but the real problem is backup, sync, or deletion -- not search. Sounds similar but a different root cause, out of scope for this research.",
    example: '"My photos got deleted when I switched phones and now they\'re all gone."',
  },
  {
    term: "NOT_RELEVANT",
    tone: "negative" as const,
    plain: "Nothing to do with finding a remembered photo -- just happened to contain a keyword like \"find\" or \"missing.\"",
    example: '"Love this app, editing tools are great!"',
  },
  {
    term: "UNCERTAIN",
    tone: "neutral" as const,
    plain: "Too vague or short to tell which of the above it is -- parked here rather than guessed at.",
    example: '"Doesn\'t work well. Fix it."',
  },
];

const FAILURE_STAGES = [
  {
    term: "MEMORY_EXPRESSION",
    plain: "The user can't even put what they remember into words.",
    example: '"That weird thing in the background of some photo..."',
  },
  {
    term: "QUERY_FORMULATION",
    plain: "They know what they remember, but can't turn it into a search term.",
    example: 'Remembers "a small blue café near the beach" but doesn\'t know what words would find it.',
  },
  {
    term: "QUERY_UNDERSTANDING",
    plain: "They typed a reasonable search, but Google Photos seems to misinterpret it.",
    example: 'Searches "birthday cake," gets irrelevant results.',
  },
  {
    term: "SEMANTIC_RETRIEVAL",
    plain: "The system seems to get what they mean, but the actual photo never surfaces.",
    example: "Search \"understood\" the query but the relevant item just doesn't show up.",
  },
  {
    term: "RESULT_EVALUATION",
    plain: "Results show up, but the user can't tell which one (if any) is the right photo.",
    example: 'Scrolling through 40 similar photos, unsure which is "the one."',
  },
  {
    term: "RECOVERY",
    plain: "The first search failed and they have no good next move -- give up, scroll endlessly, or try random things.",
    example: "Usually the biggest bucket -- most failures aren't misunderstanding, they're no good way to recover after one failed search.",
  },
  {
    term: "NONE",
    plain: "No failure -- they found it fine. Included as the success baseline.",
    example: null,
  },
];

export function GlossaryModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted-background"
        title="What do these terms mean?"
      >
        <Info className="h-4 w-4" />
        Glossary
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">What do these terms mean?</h2>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Relevance classification -- is this document actually about retrieval?
            </h3>
            <div className="mb-6 space-y-3">
              {RELEVANCE_TERMS.map((t) => (
                <div key={t.term} className="rounded-lg border border-border p-3">
                  <Badge tone={t.tone}>{t.term}</Badge>
                  <p className="mt-1.5 text-sm text-foreground">{t.plain}</p>
                  <p className="mt-1 text-xs italic text-muted">{t.example}</p>
                </div>
              ))}
            </div>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Failure stage -- where the retrieval attempt actually broke down
            </h3>
            <p className="mb-3 text-xs text-muted">
              These form a funnel: MEMORY_EXPRESSION &rarr; QUERY_FORMULATION &rarr; QUERY_UNDERSTANDING &rarr;
              SEMANTIC_RETRIEVAL &rarr; RESULT_EVALUATION &rarr; RECOVERY
            </p>
            <div className="space-y-3">
              {FAILURE_STAGES.map((t) => (
                <div key={t.term} className="rounded-lg border border-border p-3">
                  <Badge tone="primary">{t.term}</Badge>
                  <p className="mt-1.5 text-sm text-foreground">{t.plain}</p>
                  {t.example && <p className="mt-1 text-xs italic text-muted">{t.example}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
