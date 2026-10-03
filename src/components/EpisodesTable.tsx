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

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

const selectClass = "rounded-lg px-2 py-1.5 text-sm";
const selectStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" };

function relevanceOf(e: RetrievalEpisode): "DIRECT_RETRIEVAL" | "ADJACENT_RETRIEVAL" {
  return e.relevanceClass ?? "DIRECT_RETRIEVAL";
}

export default function EpisodesTable({ episodes }: { episodes: RetrievalEpisode[] }) {
  const [relevanceClass, setRelevanceClass] = useState("");
  const [scenario, setScenario] = useState("");
  const [outcome, setOutcome] = useState("");
  const [failureStage, setFailureStage] = useState("");
  const [memoryCue, setMemoryCue] = useState("");
  const [scopeClass, setScopeClass] = useState("");
  const [memorySpecificity, setMemorySpecificity] = useState("");
  const [observedFailure, setObservedFailure] = useState("");
  const [evidenceStrength, setEvidenceStrength] = useState("");

  const options = useMemo(
    () => ({
      scenarios: uniqueSorted(episodes.map((e) => e.scenario.category)),
      outcomes: uniqueSorted(episodes.map((e) => e.outcome)),
      failureStages: uniqueSorted(episodes.map((e) => e.failureStage)),
      scopeClasses: uniqueSorted(episodes.map((e) => e.taxonomy?.scopeClass).filter((v) => !!v) as string[]),
      memorySpecificities: uniqueSorted(episodes.map((e) => e.taxonomy?.memorySpecificity).filter((v) => !!v) as string[]),
      observedFailures: uniqueSorted(episodes.map((e) => e.taxonomy?.observedFailure).filter((v) => !!v) as string[]),
      evidenceStrengths: uniqueSorted(episodes.map((e) => e.taxonomy?.evidenceStrength).filter((v) => !!v) as string[]),
    }),
    [episodes],
  );

  const filtered = useMemo(() => {
    return episodes.filter((e) => {
      if (relevanceClass && relevanceOf(e) !== relevanceClass) return false;
      if (scenario && e.scenario.category !== scenario) return false;
      if (outcome && e.outcome !== outcome) return false;
      if (failureStage && e.failureStage !== failureStage) return false;
      if (memoryCue && !(e.remembered[memoryCue as keyof RetrievalEpisode["remembered"]]?.length > 0)) return false;
      if (scopeClass && e.taxonomy?.scopeClass !== scopeClass) return false;
      if (memorySpecificity && e.taxonomy?.memorySpecificity !== memorySpecificity) return false;
      if (observedFailure && e.taxonomy?.observedFailure !== observedFailure) return false;
      if (evidenceStrength && e.taxonomy?.evidenceStrength !== evidenceStrength) return false;
      return true;
    });
  }, [episodes, relevanceClass, scenario, outcome, failureStage, memoryCue, scopeClass, memorySpecificity, observedFailure, evidenceStrength]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <select
          className={selectClass}
          style={selectStyle}
          value={relevanceClass}
          onChange={(e) => setRelevanceClass(e.target.value)}
        >
          <option value="">All types (direct + adjacent)</option>
          <option value="DIRECT_RETRIEVAL">Direct retrieval only</option>
          <option value="ADJACENT_RETRIEVAL">Adjacent (backup/sync) only</option>
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
        <select className={selectClass} style={selectStyle} value={scopeClass} onChange={(e) => setScopeClass(e.target.value)}>
          <option value="">All scope classes</option>
          {options.scopeClasses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          style={selectStyle}
          value={memorySpecificity}
          onChange={(e) => setMemorySpecificity(e.target.value)}
        >
          <option value="">All memory specificities</option>
          {options.memorySpecificities.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          style={selectStyle}
          value={observedFailure}
          onChange={(e) => setObservedFailure(e.target.value)}
        >
          <option value="">All observed failures</option>
          {options.observedFailures.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          style={selectStyle}
          value={evidenceStrength}
          onChange={(e) => setEvidenceStrength(e.target.value)}
        >
          <option value="">All evidence strengths</option>
          {options.evidenceStrengths.map((s) => (
            <option key={s} value={s}>
              {s}
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
              {["Episode", "Type", "Scenario", "Target", "Remembered", "Search steps", "Outcome", "Failure", "Scope class", "Observed failure"].map(
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
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={
                      relevanceOf(e) === "DIRECT_RETRIEVAL"
                        ? { background: "var(--positive)", color: "white", opacity: 0.85 }
                        : { background: "var(--muted-background)", color: "var(--text-secondary)" }
                    }
                  >
                    {relevanceOf(e) === "DIRECT_RETRIEVAL" ? "Direct" : "Adjacent"}
                  </span>
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
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {e.taxonomy?.scopeClass ?? "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                  {e.taxonomy?.observedFailure ?? "—"}
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
