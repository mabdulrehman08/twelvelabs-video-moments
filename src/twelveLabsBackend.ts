import { TwelveLabs } from "twelvelabs-js";
import type { Moment, MomentSearchBackend, SearchResult } from "./types.js";

/**
 * The live API response includes relevance fields (score, confidence) on
 * each clip; this local type widens the SDK's SearchItem to read them.
 */
interface LiveClip {
  videoId?: string;
  start?: number;
  end?: number;
  score?: number;
  confidence?: string;
}

/**
 * The real thing: calls the Twelve Labs Search API (Marengo) through the
 * official twelvelabs-js SDK. Selected automatically when the
 * TWELVE_LABS_API_KEY environment variable is set -- that is the only
 * switch between demo mode and production mode.
 *
 * Also honors TWELVE_LABS_INDEX_ID; if unset, the first index on the
 * account is used.
 */
export class TwelveLabsBackend implements MomentSearchBackend {
  readonly name = "twelvelabs" as const;
  private client: TwelveLabs;

  constructor(apiKey: string) {
    this.client = new TwelveLabs({ apiKey });
  }

  async search(query: string, limit: number): Promise<SearchResult> {
    const indexId = process.env.TWELVE_LABS_INDEX_ID ?? (await this.firstIndexId());

    const results = await this.client.search.create({
      indexId,
      queryText: query,
      searchOptions: ["visual", "audio"],
      pageLimit: limit,
    });

    const titles = await this.videoTitles(indexId);

    const moments: Moment[] = ((results.data ?? []) as LiveClip[]).map((clip) => {
      const videoId = clip.videoId ?? "";
      return {
        videoId,
        videoTitle: titles.get(videoId) ?? videoId,
        start: clip.start ?? 0,
        end: clip.end ?? 0,
        score: clip.score ?? 0,
        confidence: normalizeConfidence(clip.confidence),
      };
    });

    return { query, backend: this.name, moments };
  }

  private async firstIndexId(): Promise<string> {
    const page = await this.client.indexes.list({ pageLimit: 1 });
    const first = page.data[0];
    if (!first?.id) {
      throw new Error(
        "No indexes found on this account. Create one at https://playground.twelvelabs.io " +
          "or set TWELVE_LABS_INDEX_ID.",
      );
    }
    return first.id;
  }

  /** Map video ids to filenames so results are human-readable. Cosmetic only. */
  private async videoTitles(indexId: string): Promise<Map<string, string>> {
    const titles = new Map<string, string>();
    try {
      const page = await this.client.indexes.videos.list(indexId, { pageLimit: 50 });
      for (const video of page.data) {
        if (video.id) titles.set(video.id, video.systemMetadata?.filename ?? video.id);
      }
    } catch {
      // Fall back to raw video ids.
    }
    return titles;
  }
}

function normalizeConfidence(value: string | undefined): Moment["confidence"] {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}
