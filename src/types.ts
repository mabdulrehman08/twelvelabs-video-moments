/**
 * A single matched moment inside a video, normalized from the
 * Twelve Labs Search API response shape.
 */
export interface Moment {
  videoId: string;
  videoTitle: string;
  /** Clip start, in seconds from the beginning of the video. */
  start: number;
  /** Clip end, in seconds from the beginning of the video. */
  end: number;
  /** Relevance score returned by Marengo (roughly 0-100). */
  score: number;
  confidence: "high" | "medium" | "low";
}

export interface SearchResult {
  query: string;
  backend: "twelvelabs" | "fixtures";
  moments: Moment[];
}

/**
 * The one seam in the app. Both the real Twelve Labs backend and the
 * recorded-fixture backend implement this, so the CLI never knows (or
 * cares) which one it is talking to.
 */
export interface MomentSearchBackend {
  readonly name: "twelvelabs" | "fixtures";
  search(query: string, limit: number): Promise<SearchResult>;
}
