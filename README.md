# The Over–Back Meter

A static page that says where X sat in the last 24 hours, between **it's so over** and **we're so back**.

The page fetches one file, [`data.json`](data.json). The newest `date` in that file is the reading at the top. Older entries are the chart. Adding a day means appending one object to `data.json` and nothing else.

The score is `round((back − over) / (back + over) × 100)`. −100 is only "it's so over". +100 is only "we're so back". At or below −20 the verdict is **IT'S SO OVER**. From −19 to +19 it is **IT'S... MID**. At or above +20 it is **WE'RE SO BACK**.

The file shipped with a manual snapshot, so the page renders before anyone adds a day:

- November 26, 2026, 8:16 AM PT: over 902, back 2,042, score **+39**. Marked `"seed": true`.
- November 23: over 955, back 5,948, score **+72**. The time of day was not recorded.
- November 20, 21, 22, 24, and 25 are placeholders spread across the reported +31 to +37 range. They are marked `"approximate": true`, with `over` and `back` set to `null`. Those exact daily counts were not kept. The chart draws them lighter and prefixes the score with ~.

## What you still need to do

Turn on GitHub Pages once. Repo → Settings → Pages → Build and deployment → Source: **Deploy from a branch**. Branch: **master**. Folder: **/ (root)**. Save.

There is a `.nojekyll` file so Pages serves the files as they are. After the first build, the site is at [https://timjonez.github.io/over-back-meter/](https://timjonez.github.io/over-back-meter/).

A pull request that only changes `data.json` updates the site when it merges to `master`. This repo does not call the X API, and it has no token and no scheduled workflow.

## How to add a day

1. Open `data.json`.
2. Append one object to the end of `days`. Leave every older object alone. Do not edit `index.html`, `app.js`, or any other file.
3. Keep the array in date order. The page uses the newest `date` as the current reading even if the array is out of order, but a sorted file keeps the diff to the one new object.
4. Open a pull request whose only change is `data.json`.

Copy this and fill it in:

```json
{
  "date": "2026-11-27",
  "measured_at": "2026-11-27T08:10:00-08:00",
  "over": 1000,
  "back": 2000,
  "score": 33,
  "quotes": {
    "over": [
      { "text": "it's so over", "url": "https://x.com/someone/status/1" }
    ],
    "back": [
      { "text": "we're so back", "url": "https://x.com/someone/status/2" }
    ]
  }
}
```

`score` for that example is `round((2000 − 1000) / (2000 + 1000) × 100) = 33`. Omit `quotes` when you don't have any. Two or three quotes per side is enough. Do not set `seed` or `approximate` on a new day. Those flags belong to the original snapshot.

## Schema

`data.json` is one object:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `note` | string | no | Sentence shown under the chart. Leave it alone when you append a day. |
| `days` | array | yes | One object per day, oldest first. |

Each day:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `date` | string | yes | `YYYY-MM-DD`. The Pacific calendar date of the reading. |
| `measured_at` | string or null | yes | When the counts were taken, Pacific time, ISO 8601 with a numeric offset. PST is `-08:00`. PDT is `-07:00`. Example: `2026-11-26T08:16:00-08:00` is 8:16 AM PT. Use `null` only when the time was not recorded. |
| `over` | integer or null | yes | Posts matching the over query in that 24-hour window. `null` if the count was not kept. |
| `back` | integer or null | yes | Posts matching the back query. `null` if the count was not kept. |
| `score` | integer or null | yes | `round((back − over) / (back + over) × 100)`, from −100 to +100. `null` when both counts are 0, because the ratio is undefined. On an approximate day, a score in the reported range with null counts. |
| `quotes` | object | no | Optional sample posts for that day. Omit the key when there are none. |
| `quotes.over` | array | no | Up to 3 posts. Each item is `{ "text": string, "url": string }`. `url` is a link to the post. |
| `quotes.back` | array | no | Same, for the back phrase. |
| `approximate` | boolean | no | `true` on a placeholder day whose exact counts were not kept. Omit it on a real day. |
| `seed` | boolean | no | `true` only on the original November 26 snapshot. The page shows a "Manual snapshot" line when the newest day has this flag. Omit it on a new day. |
| `note` | string | no | Optional note for that day. The chart tooltip shows it. |

The page shows quotes from the newest day only. Quotes on older days stay in the file.

## What gets counted

- Over: `("it's so over" OR "its so over") -is:retweet`
- Back: `("we're so back" OR "were so back" OR "we are so back") -is:retweet`

The bare phrase "it's over" is not included. Retweets are excluded. This is a phrase count, not a sentiment reading. Jokes, irony, and people quoting the phrase all count.

## See it locally

From the repo root:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 . Opening `index.html` as a file will not load `data.json`.

Check the seed file and the score math:

```bash
npm test
```

## Files

- `index.html`, `styles.css`, `app.js` — the page. No build step.
- `data.json` — every reading. The only file a daily update touches.
- `scripts/meter.js` — score, verdict bands, and the sentence. The page imports it.
