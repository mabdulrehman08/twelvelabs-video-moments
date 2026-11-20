# video-moments

A small TypeScript CLI that answers the question every video team has:
"somewhere in our footage, someone dunks a basketball -- where?"

It searches a video library for natural-language moments using the
[Twelve Labs Search API](https://docs.twelvelabs.io) (Marengo video
understanding model) and prints ranked clips with timestamps and
confidence bars, right in the terminal.

Built by Muhammad Abdulrehman as a pitch for the Developer Experience
Intern role at Twelve Labs -- the kind of small, runnable, copy-paste-able
demo app that role exists to produce.

## Quickstart (no API key needed)

```
npm install
npm run demo -- "person dunks a basketball"
```

That is the whole setup. With no API key present, the CLI replays
realistic recorded Search API responses from `fixtures/`, so anyone can
see the developer experience in under a minute.

## Real output

```
video-moments | backend: fixtures | recorded fixtures (set TWELVE_LABS_API_KEY to go live)
query: "person dunks a basketball"

Found 6 moment(s), best match first:

   1. pickup-game-rucker-park.mp4
      6:52 - 6:59       [#################...] 86.4  high
   2. high-school-finals-q4.mp4
      36:51 - 36:58     [#################...] 85.0  high
   3. pickup-game-rucker-park.mp4
      16:28 - 16:36     [################....] 81.3  high
   4. high-school-finals-q4.mp4
      10:47 - 10:53     [###############.....] 74.1  medium
   5. pickup-game-rucker-park.mp4
      2:00 - 2:07       [##############......] 68.5  medium
   6. trail-ride-gopro-moab.mp4
      25:02 - 25:08     [##########..........] 52.2  low
```

Another query, another recorded response:

```
query: "chef tosses pasta in a pan"

Found 4 moment(s), best match first:

   1. cooking-show-ep12-pasta.mp4
      15:03 - 15:11     [##################..] 88.2  high
   2. cooking-show-ep12-pasta.mp4
      21:28 - 21:34     [################....] 79.6  medium
   3. cooking-show-ep12-pasta.mp4
      7:35 - 7:43       [##############......] 71.4  medium
   4. city-street-timelapse.mp4
      5:10 - 5:15       [##########..........] 49.9  low
```

## Going live is one env var

```
set TWELVE_LABS_API_KEY=tlk_...        (Windows)
export TWELVE_LABS_API_KEY=tlk_...     (macOS/Linux)

npm run demo -- "person dunks a basketball"
```

When the key is set, the CLI switches to the official `twelvelabs-js`
SDK and calls the real `/v1.3/search` endpoint against your index.
Optionally set `TWELVE_LABS_INDEX_ID`; otherwise the first index on the
account is used.

## Architecture: one interface, two backends

```
src/index.ts              CLI: parses the query, renders results
src/types.ts              Moment + MomentSearchBackend interface
src/twelveLabsBackend.ts  real API via the official twelvelabs-js SDK
src/fixtureBackend.ts     replays recorded /v1.3/search JSON responses
fixtures/*.json           recorded responses + video library metadata
```

Everything funnels through one seam:

```ts
interface MomentSearchBackend {
  readonly name: "twelvelabs" | "fixtures";
  search(query: string, limit: number): Promise<SearchResult>;
}
```

The CLI picks the backend at startup -- `TWELVE_LABS_API_KEY` set means
live API, unset means fixtures -- and never knows which one it got.
The fixture files deliberately mirror the real Search API response shape
(`data[]` of clips with `video_id`, `start`/`end` in seconds, `score`,
`confidence`, plus `page_info`), so the normalization code in the fixture
backend is the same mapping the live backend performs on real responses.

Why this matters for developer experience: most people evaluating a video
understanding API bounce before they have an API key and an indexed video.
A demo that runs instantly on recorded responses, with a one-env-var path
to the real thing, removes that first wall without faking what the API
returns.

## Notes on the live backend

- Uses `client.search.create({ indexId, queryText, searchOptions: ["visual", "audio"], pageLimit })`
  from `twelvelabs-js` 1.3.x (API version v1.3, Marengo).
- Looks up video filenames via `client.indexes.videos.list` so results
  print human-readable titles instead of raw video ids.
- Scores are Marengo relevance scores (roughly 0-100); the bar is a
  direct rendering of the score, and `confidence` is the API's own
  high/medium/low bucket.
