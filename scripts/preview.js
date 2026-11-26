/**
 * Write the social preview from the newest day in data.json.
 * Link crawlers do not run the page, so the score has to live in the
 * tags and in og.png. Run this after appending a day.
 */

import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatScore, markerPercent, sentenceFor, verdictFor } from "./meter.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://timjonez.github.io/over-back-meter/";
const IMAGE = `${SITE}og.png`;
const START = "<!-- social-preview -->";
const END = "<!-- /social-preview -->";

const TONES = {
  over: { bg: "#d0121a", fg: "#ffffff", theme: "#d0121a" },
  back: { bg: "#0e7a32", fg: "#ffffff", theme: "#0e7a32" },
  mid: { bg: "#f0c400", fg: "#1a120c", theme: "#f0c400" },
};

export function latestDay(data) {
  if (!Array.isArray(data?.days) || data.days.length === 0) {
    throw new Error("data.json has no days.");
  }
  return data.days.reduce((newest, day) => (day.date > newest.date ? day : newest));
}

export function previewCopy(day) {
  const verdict = verdictFor(day.score);
  const score = formatScore(day.score);
  const title = `${verdict.label} (${score})`;
  const description =
    Number.isInteger(day.over) && Number.isInteger(day.back)
      ? sentenceFor(day.back, day.over)
      : "Exact phrase counts were not recorded for this day.";
  return {
    verdict,
    score,
    title,
    description,
    alt: `${verdict.label}, ${score}. ${description}`,
    percent: markerPercent(day.score),
    tone: TONES[verdict.tone],
  };
}

export function socialBlock(copy) {
  const title = esc(copy.title);
  const description = esc(copy.description);
  const alt = esc(copy.alt);
  return `${START}
  <meta name="theme-color" content="${copy.tone.theme}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="The Over–Back Meter">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="${SITE}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${IMAGE}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${alt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${IMAGE}">
  <meta name="twitter:image:alt" content="${alt}">
  ${END}`;
}

export function applySocialBlock(html, copy) {
  const block = socialBlock(copy);
  if (html.includes(START) && html.includes(END)) {
    return html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
  }
  const canonical = `<link rel="canonical" href="${SITE}">`;
  if (!html.includes(canonical)) {
    throw new Error("index.html has no social-preview markers and no canonical link.");
  }
  return html.replace(canonical, `${canonical}\n  ${block}`);
}

function cardHtml(copy) {
  const flip = copy.percent >= 50 ? " flip" : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Source+Sans+3:wght@600;700&display=swap" rel="stylesheet">
  <style>
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #f4efe4; color: #1a120c; }
    body { display: flex; flex-direction: column; font-family: "Source Sans 3", "Segoe UI", sans-serif; }
    header { background: ${copy.tone.bg}; color: ${copy.tone.fg}; text-align: center; padding: 32px 48px 26px; }
    .kicker { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
    h1 { margin: 10px 0 0; font-family: Anton, Impact, "Arial Black", sans-serif; font-size: 112px; font-weight: 400; line-height: 0.86; letter-spacing: 0.01em; }
    .score { margin: 8px 0 0; font-family: Anton, Impact, "Arial Black", sans-serif; font-size: 88px; line-height: 1; }
    .meter { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 8px 72px 28px; }
    .ends { display: flex; justify-content: space-between; font-size: 26px; font-weight: 800; letter-spacing: 0.04em; }
    .over { color: #d0121a; }
    .back { color: #0e7a32; }
    .track { position: relative; height: 40px; margin: 28px 4px 0; border-radius: 999px; background: linear-gradient(90deg, #d0121a 0%, #d0121a 16%, #f0c400 50%, #0e7a32 84%, #0e7a32 100%); box-shadow: inset 0 0 0 3px rgba(26, 18, 12, 0.85); }
    .marker { position: absolute; top: 50%; left: ${copy.percent}%; width: 0; height: 0; }
    .stem { position: absolute; width: 12px; height: 64px; background: #1a120c; border: 3px solid #fff; border-radius: 4px; transform: translate(-50%, -50%); box-sizing: border-box; }
    .chip { position: absolute; top: 0; transform: translateY(-50%); background: #fff; color: #1a120c; border: 3px solid #1a120c; border-radius: 6px; font-family: Anton, Impact, sans-serif; font-size: 46px; line-height: 1; padding: 4px 12px 0; white-space: nowrap; }
    .marker.flip .chip { right: 18px; }
    .marker:not(.flip) .chip { left: 18px; }
    .sentence { margin: 28px 0 0; text-align: center; font-size: 30px; font-weight: 700; line-height: 1.3; }
  </style>
</head>
<body>
  <header>
    <p class="kicker">Last 24 hours on X</p>
    <h1>${esc(copy.verdict.label)}</h1>
    <p class="score">${esc(copy.score)}</p>
  </header>
  <section class="meter">
    <div class="ends"><span class="over">IT'S SO OVER</span><span class="back">WE'RE SO BACK</span></div>
    <div class="track"><div class="marker${flip}"><span class="stem"></span><span class="chip">${esc(copy.score)}</span></div></div>
    <p class="sentence">${esc(copy.description)}</p>
  </section>
</body>
</html>`;
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function writePreview() {
  const data = JSON.parse(await readFile(path.join(root, "data.json"), "utf8"));
  const copy = previewCopy(latestDay(data));
  const indexPath = path.join(root, "index.html");
  const html = await readFile(indexPath, "utf8");
  await writeFile(indexPath, applySocialBlock(html, copy));

  const cardPath = path.join(tmpdir(), "over-back-og.html");
  const imagePath = path.join(root, "og.png");
  await writeFile(cardPath, cardHtml(copy));
  const chrome = process.env.CHROME_PATH || "google-chrome";
  await run(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    `--user-data-dir=${path.join(tmpdir(), "over-back-chrome")}`,
    "--virtual-time-budget=12000",
    "--timeout=15000",
    "--window-size=1200,630",
    `--screenshot=${imagePath}`,
    `file://${cardPath}`,
  ]);
  const png = await readFile(imagePath);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (png[0] !== 0x89 || width !== 1200 || height !== 630) {
    throw new Error(`og.png should be a 1200x630 PNG, got ${width}x${height}.`);
  }
  console.log(`${copy.title}`);
  console.log(copy.description);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 20000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  writePreview().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
