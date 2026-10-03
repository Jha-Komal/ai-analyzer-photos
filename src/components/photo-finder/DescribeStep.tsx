"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const EXAMPLES = ["My mom cooking in our old kitchen", "A handwritten recipe from my nani", "A sunset photo from our Manali trip"];

export function DescribeStep({ busy, onSubmit, task }: { busy: boolean; onSubmit: (query: string) => void; task?: { title: string; narrative: string } | null }) {
  const [text, setText] = useState("");
  const submit = () => text.trim() && !busy && onSubmit(text.trim());

  return (
    <div className="mx-auto max-w-2xl py-10">
      {task && (
        <div className="mb-8 rounded-2xl border border-primary/30 bg-primary-light p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your task</p>
          <p className="mt-1 text-sm text-foreground">{task.narrative}</p>
          <p className="mt-2 text-xs text-muted">Describe it below in your own words, as you would when searching.</p>
        </div>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-foreground">Find a photo you only partly remember</h2>
      <p className="mt-2 text-muted">Describe anything you remember. You do not need the date or exact details.</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && submit()}
        maxLength={500}
        rows={5}
        autoFocus
        placeholder="A photo of me and a friend at a concert, maybe 2022 or 2023. It was dark and crowded."
        className="mt-6 w-full resize-none rounded-2xl border border-border bg-card p-4 text-base text-foreground shadow-sm outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="mt-4 flex items-center gap-3">
        <Button size="lg" onClick={submit} disabled={!text.trim() || busy}>
          <Search className="h-5 w-5" />
          {busy ? "Looking…" : "Find possible photos"}
        </Button>
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Or try</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted-background">
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
