import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BACK_QUERY,
  OVER_QUERY,
  formatScore,
  markerPercent,
  scoreFromCounts,
  sentenceFor,
  verdictFor,
} from "./meter.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the manual snapshot scores match the published counts", () => {
  assert.equal(scoreFromCounts(2042, 902), 39);
  assert.equal(scoreFromCounts(5948, 955), 72);
});

test("score is null when nobody said either phrase", () => {
  assert.equal(scoreFromCounts(0, 0), null);
});

test("score rejects bad counts", () => {
  assert.throws(() => scoreFromCounts(-1, 1), /back/);
  assert.throws(() => scoreFromCounts(1.5, 1), /back/);
});

test("verdict bands use the published thresholds", () => {
  assert.equal(verdictFor(-100).label, "IT'S SO OVER");
  assert.equal(verdictFor(-20).label, "IT'S SO OVER");
  assert.equal(verdictFor(-19).label, "IT'S... MID");
  assert.equal(verdictFor(0).label, "IT'S... MID");
  assert.equal(verdictFor(19).label, "IT'S... MID");
  assert.equal(verdictFor(20).label, "WE'RE SO BACK");
  assert.equal(verdictFor(39).label, "WE'RE SO BACK");
  assert.equal(verdictFor(100).label, "WE'RE SO BACK");
  assert.equal(verdictFor(null).label, "NO READING");
  assert.equal(verdictFor(-20).tone, "over");
  assert.equal(verdictFor(0).tone, "mid");
  assert.equal(verdictFor(39).tone, "back");
});

test("the seed timestamp is 8:16 AM Pacific", () => {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date("2026-11-26T08:16:00-08:00"));
  assert.match(formatted, /8:16/);
  assert.match(formatted, /PST/);
});

test("the marker sits at the score, with zero in the middle", () => {
  assert.equal(markerPercent(-100), 0);
  assert.equal(markerPercent(0), 50);
  assert.equal(markerPercent(39), 69.5);
  assert.equal(markerPercent(100), 100);
  assert.equal(markerPercent(null), 50);
});

test("the sentence describes the seed ratio", () => {
  assert.equal(
    sentenceFor(2042, 902),
    "“We're so back” posts outnumber “it's so over” posts about 2.3 to 1 today.",
  );
  assert.match(sentenceFor(10, 30), /“It's so over” posts outnumber/);
  assert.match(sentenceFor(4, 4), /equal numbers/);
  assert.match(sentenceFor(0, 0), /Neither phrase/);
  assert.equal(formatScore(39), "+39");
  assert.equal(formatScore(-4), "-4");
  assert.equal(formatScore(0), "0");
  assert.equal(formatScore(null), "—");
});

test("queries count the long phrases and skip retweets", () => {
  assert.equal(OVER_QUERY, `("it's so over" OR "its so over") -is:retweet`);
  assert.equal(BACK_QUERY, `("we're so back" OR "were so back" OR "we are so back") -is:retweet`);
  assert.equal(OVER_QUERY.includes(`"it's over"`), false);
});

test("data.json is the only reading, and recorded scores match the counts", async () => {
  const data = JSON.parse(await readFile(path.join(root, "data.json"), "utf8"));
  assert.ok(Array.isArray(data.days));
  assert.deepEqual(
    data.days.map((day) => day.date),
    ["2026-11-23", "2026-11-26"],
  );
  assert.equal(JSON.stringify(data).includes("approximate"), false);
  assert.equal(JSON.stringify(data).includes("placeholder"), false);

  const byDate = Object.fromEntries(data.days.map((day) => [day.date, day]));

  const nov26 = byDate["2026-11-26"];
  assert.equal(nov26.seed, true);
  assert.equal(nov26.over, 902);
  assert.equal(nov26.back, 2042);
  assert.equal(nov26.score, 39);
  assert.equal(nov26.measured_at, "2026-11-26T08:16:00-08:00");
  assert.equal(nov26.score, scoreFromCounts(nov26.back, nov26.over));
  assert.match(nov26.note, /Manual snapshot/);

  const nov23 = byDate["2026-11-23"];
  assert.equal(nov23.over, 955);
  assert.equal(nov23.back, 5948);
  assert.equal(nov23.score, 72);
  assert.equal(nov23.score, scoreFromCounts(nov23.back, nov23.over));
  assert.equal(nov23.measured_at, null);

  for (const day of data.days) {
    assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/);
    if (day.measured_at !== null) assert.match(day.measured_at, /T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    if (day.quotes) {
      for (const side of ["over", "back"]) {
        assert.ok(day.quotes[side].length <= 3);
        for (const quote of day.quotes[side]) {
          assert.equal(typeof quote.text, "string");
          assert.equal(typeof quote.url, "string");
        }
      }
    }
  }
});
