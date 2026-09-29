"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RetrievalEpisode } from "@/types/episode";

const MEMORY_DIMENSIONS = [
  "people",
  "places",
  "objects",
  "events",
  "activities",
  "visualAttributes",
  "textInImage",
  "time",
  "relationships",
  "context",
] as const;

function sourceOf(episode: RetrievalEpisode): string {
  return episode.sourceDocumentId.split("_")[0];
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

const selectClass = "rounded-lg px-2 py-1.5 text-sm";
const selectStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" };

export default function EpisodesTable({ episodes }: { episodes: RetrievalEpisode[] }) {
  const [source, setSource] = useState("");
  const [scenario, setScenario] = useState("");
  const [outcome, setOutcome] = useState("");
  const [failureStage, setFailureStage] = useState("");
  const [memoryCue, setMemoryCue] = useState("");

  const options = useMemo(
    () => ({
      sources: uniqueSorted(episodes.map(sourceOf)),
      scenarios: uniqueSorted(episodes.map((e) => e.scenario.category)),
      outcomes: uniqueSorted(episodes.map((e) => e.outcome)),
      failureStages: uniqueSorted(episodes.map((e) => e.failureStage)),
    }),
    [episodes],
  );

  const filtered = useMemo(() => {
    return episodes.filter((e) => {
      if (source && sourceOf(e) !== source) return false;
      if (scenario && e.scenario.category !== scenario) return false;
      if (outcome && e.outcome !== outcome) return false;
      if (failureStage && e.failureStage !== failureStage) return false;
      if (memoryCue && !(e.remembered[memoryCue as keyof RetrievalEpisode["remembered"]]?.length > 0)) return false;
      return true;
    });
  }, [episodes, source, scenario, outcome, failureStage, memoryCue]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <select className={selectClass} style={selectStyle} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {options.sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={selectClass} style={selectStyle} value={scenario} onChange={(e) => setScenario(e.target.value)}>
          <option value="">All scenarios</option>
          {options.scenarios.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={selectClass} style={selectStyle} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          <option value="">All outcomes</option>
          {options.outcomes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          style={selectStyle}
          value={failureStage}
          onChange={(e) => setFailureStage(e.target.value)}
        >
          <option value="">All failure stages</option>
          {options.failureStages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={selectClass} style={selectStyle} value={memoryCue} onChange={(e) => setMemoryCue(e.target.value)}>
          <option value="">Any memory cue</option>
          {MEMORY_DIMENSIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <span className="ml-auto self-center text-sm" style={{ color: "var(--text-secondary)" }}>
          {filtered.length} of {episodes.length}
        </span>
      </div>

      <div
        className="overflow-x-auto rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Episode", "Source", "Scenario", "Target", "Remembered", "Search steps", "Outcome", "Failure"].map(
                (h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link href={`/episodes/${e.id}`} style={{ color: "var(--accent)" }}>
                    EP-{i + 1}
                  </Link>
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {sourceOf(e)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {e.scenario.category}
                </td>
                <td className="max-w-xs truncate px-3 py-2" style={{ color: "var(--foreground)" }} title={e.target.description}>
                  {e.target.type}: {e.target.description}
                </td>
                <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {MEMORY_DIMENSIONS.filter((d) => e.remembered[d]?.length > 0).length} dims
                </td>
                <td className="px-3 py-2 text-center" style={{ color: "var(--foreground)" }}>
                  {e.searchJourney.length}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {e.outcome}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {e.failureStage}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            No episodes match these filters.
          </p>
        )}
      </div>
    </div>
  );
}
