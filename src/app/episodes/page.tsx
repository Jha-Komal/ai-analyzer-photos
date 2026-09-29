import { loadEpisodes } from "@/lib/data";
import { TopNav } from "@/components/layout/TopNav";
import EpisodesTable from "@/components/EpisodesTable";

export default async function EpisodesPage() {
  const episodes = await loadEpisodes();

  return (
    <>
      <TopNav
        title="Retrieval Episodes"
        subtitle={`${episodes.length.toLocaleString()} extracted episodes -- filter to explore, click a row for the full search journey`}
      />
      <div className="p-6">
        <EpisodesTable episodes={episodes} />
      </div>
    </>
  );
}
