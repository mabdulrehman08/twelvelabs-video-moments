import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Moment, MomentSearchBackend, SearchResult } from "./types.js";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const FIXTURE_FILES = ["basketball.json", "cooking.json", "outdoor.json"];

interface RawClip {
  video_id: string;
  start: number;
  end: number;
  score: number;
  confidence: "high" | "medium" | "low";
}

interface Fixture {
  _fixture: { query_text: string; keywords: string[] };
  data: RawClip[];
}

interface Library {
  videos: Record<string, { title: string; duration: number }>;
}

/**
 * Replays recorded Twelve Labs Search API responses from fixtures/.
 * The JSON files match the real /v1.3/search response shape, so the
 * normalization code below is exactly what the real backend does too.
 */
export class FixtureBackend implements MomentSearchBackend {
  readonly name = "fixtures" as const;

  async search(query: string, limit: number): Promise<SearchResult> {
    const [library, fixtures] = await Promise.all([
      this.loadLibrary(),
      Promise.all(FIXTURE_FILES.map((f) => this.loadFixture(f))),
    ]);

    const fixture = this.bestMatch(query, fixtures);
    const moments: Moment[] = fixture.data.slice(0, limit).map((clip) => ({
      videoId: clip.video_id,
      videoTitle: library.videos[clip.video_id]?.title ?? clip.video_id,
      start: clip.start,
      end: clip.end,
      score: clip.score,
      confidence: clip.confidence,
    }));

    return { query, backend: this.name, moments };
  }

  /** Pick the recorded response whose query keywords best overlap the user's query. */
  private bestMatch(query: string, fixtures: Fixture[]): Fixture {
    const words = query.toLowerCase().split(/\W+/).filter(Boolean);
    let best = fixtures[0];
    let bestScore = -1;
    for (const fixture of fixtures) {
      const keywords = new Set(fixture._fixture.keywords);
      const score = words.filter((w) => keywords.has(w)).length;
      if (score > bestScore) {
        bestScore = score;
        best = fixture;
      }
    }
    return best;
  }

  private async loadFixture(file: string): Promise<Fixture> {
    return JSON.parse(await readFile(join(FIXTURES_DIR, file), "utf8"));
  }

  private async loadLibrary(): Promise<Library> {
    return JSON.parse(await readFile(join(FIXTURES_DIR, "library.json"), "utf8"));
  }
}
