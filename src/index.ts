import { FixtureBackend } from "./fixtureBackend.js";
import type { Moment, MomentSearchBackend } from "./types.js";

const DEFAULT_LIMIT = 10;

async function pickBackend(): Promise<MomentSearchBackend> {
  const apiKey = process.env.TWELVE_LABS_API_KEY;
  if (apiKey) {
    // One env var is the entire switch to the live API.
    const { TwelveLabsBackend } = await import("./twelveLabsBackend.js");
    return new TwelveLabsBackend(apiKey);
  }
  return new FixtureBackend();
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function confidenceBar(score: number, width = 20): string {
  const filled = Math.round((Math.min(score, 100) / 100) * width);
  return "#".repeat(filled) + ".".repeat(width - filled);
}

function printMoment(rank: number, moment: Moment): void {
  const range = `${formatTimestamp(moment.start)} - ${formatTimestamp(moment.end)}`;
  const bar = confidenceBar(moment.score);
  console.log(`  ${String(rank).padStart(2)}. ${moment.videoTitle}`);
  console.log(`      ${range.padEnd(17)} [${bar}] ${moment.score.toFixed(1)}  ${moment.confidence}`);
}

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    console.log('Usage: npm run demo -- "person dunks a basketball"');
    process.exitCode = 1;
    return;
  }

  const backend = await pickBackend();
  const modeNote =
    backend.name === "twelvelabs"
      ? "live Twelve Labs Search API (Marengo)"
      : "recorded fixtures (set TWELVE_LABS_API_KEY to go live)";

  console.log();
  console.log(`video-moments | backend: ${backend.name} | ${modeNote}`);
  console.log(`query: "${query}"`);
  console.log();

  const result = await backend.search(query, DEFAULT_LIMIT);

  if (result.moments.length === 0) {
    console.log("No moments matched this query.");
    return;
  }

  console.log(`Found ${result.moments.length} moment(s), best match first:`);
  console.log();
  result.moments.forEach((moment, i) => printMoment(i + 1, moment));
  console.log();
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
