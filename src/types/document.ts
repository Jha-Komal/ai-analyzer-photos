export type SourceType = "review" | "discussion" | "comment";

export type Source = "reddit" | "google_photos_community" | "play_store" | "app_store";

export type RawDocument = {
  id: string;
  source: Source;
  sourceType: SourceType;
  title: string;
  text: string;
  url: string;
  publishedAt: string | null;
  metadata: Record<string, unknown>;
};
