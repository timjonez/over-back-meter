/**
 * Shared scoring rules for the Over–Back Meter.
 * Imported by the page. No network, no tokens, no Node built-ins.
 */

export const OVER_QUERY = `("it's so over" OR "its so over") -is:retweet`;
export const BACK_QUERY = `("we're so back" OR "were so back" OR "we are so back") -is:retweet`;

export const QUERIES = Object.freeze({
  over: OVER_QUERY,
  back: BACK_QUERY,
});

/**
 * round((back - over) / (back + over) * 100)
 * Returns null when both counts are zero (the ratio is undefined).
 */
export function scoreFromCounts(back, over) {
  assertCount(back, "back");
  assertCount(over, "over");
  const total = back + over;
  if (total === 0) return null;
  return Math.round(((back - over) / total) * 100);
}

export function verdictFor(score) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return { id: "none", label: "NO READING", tone: "mid" };
  }
  if (score <= -20) return { id: "over", label: "IT'S SO OVER", tone: "over" };
  if (score >= 20) return { id: "back", label: "WE'RE SO BACK", tone: "back" };
  return { id: "mid", label: "IT'S... MID", tone: "mid" };
}

export function formatScore(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return "—";
  if (score > 0) return `+${score}`;
  return String(score);
}

/** Position of a score on the bar, 0 = so over, 100 = so back. */
export function markerPercent(score) {
  const value = score === null || score === undefined || Number.isNaN(score) ? 0 : score;
  const clamped = Math.max(-100, Math.min(100, value));
  return ((clamped + 100) / 200) * 100;
}

/**
 * One plain sentence describing the count ratio.
 * 2,042 back vs 902 over → about 2.3 to 1.
 */
export function sentenceFor(back, over) {
  assertCount(back, "back");
  assertCount(over, "over");
  if (back === 0 && over === 0) {
    return "Neither phrase showed up in the last 24 hours.";
  }
  if (over === 0) {
    return `“We're so back” showed up ${formatCount(back)} ${plural(back)}, and “it's so over” did not show up at all.`;
  }
  if (back === 0) {
    return `“It's so over” showed up ${formatCount(over)} ${plural(over)}, and “we're so back” did not show up at all.`;
  }
  if (back === over) {
    return "The two phrases showed up in equal numbers today.";
  }
  const backLeads = back > over;
  const ratio = aboutRatio(Math.max(back, over) / Math.min(back, over));
  if (backLeads) {
    return `“We're so back” posts outnumber “it's so over” posts ${ratio} today.`;
  }
  return `“It's so over” posts outnumber “we're so back” posts ${ratio} today.`;
}

function assertCount(value, label) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} count must be a non-negative integer.`);
  }
}

function formatCount(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function plural(value) {
  return value === 1 ? "time" : "times";
}

function aboutRatio(ratio) {
  const rounded = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `about ${text} to 1`;
}
