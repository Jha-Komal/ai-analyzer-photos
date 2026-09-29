import { loadEpisodes } from "@/lib/data";
import NavHeader from "@/components/NavHeader";
import EpisodesTable from "@/components/EpisodesTable";

export default async function EpisodesPage() {
  const episodes = await loadEpisodes();

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <NavHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-xl font-medium" style={{ color: "var(--foreground)" }}>
            Retrieval Episodes
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {episodes.length.toLocaleString()} extracted episodes. Each row is one attempt by a user to find a
            specific remembered visual item -- filter to explore, click a row for the full search journey.
          </p>
        </div>
        <EpisodesTable episodes={episodes} />
      </main>
    </div>
  );
}
