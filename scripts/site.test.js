import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  documentTitle,
  embedPngMarker,
  latestDay,
  markerText,
  previewCopy,
  readPngMarker,
  socialBlock,
} from "./preview.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function missing(relativePath) {
  await assert.rejects(access(path.join(root, relativePath)));
}

test("the page is static and reads only data.json", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const css = await readFile(path.join(root, "styles.css"), "utf8");
  const app = await readFile(path.join(root, "app.js"), "utf8");
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const tree = [html, css, app, readme].join("\n");

  assert.match(html, /IT'S SO OVER/);
  assert.match(html, /WE'RE SO BACK/);
  assert.match(html, /property="og:image" content="https:\/\/timjonez\.github\.io\/over-back-meter\/og\.png"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  await access(path.join(root, "og.png"));
  assert.match(html, /styles\.css/);
  assert.match(html, /app\.js/);
  assert.equal(html.includes('src="/'), false);
  assert.equal(html.includes('href="/'), false);
  assert.match(app, /data\.json/);
  assert.equal(app.includes("latest.json"), false);
  assert.equal(app.includes("history.json"), false);
  assert.match(css, /linear-gradient/);
  assert.match(readme, /data\.json/);
  assert.match(readme, /measured_at/);
  assert.match(readme, /append/i);
  assert.match(readme, /index\.html/);
  assert.match(readme, /og\.png/);
  assert.match(readme, /npm run preview/);
  assert.match(readme, /every daily stats pull request/i);
  assert.match(readme, /Settings → Pages/);
  assert.match(readme, /https:\/\/timjonez\.github\.io\/over-back-meter\//);
  assert.equal(tree.includes("X_BEARER_TOKEN"), false);
  assert.equal(tree.includes("api.x.com"), false);

  await missing("data/latest.json");
  await missing("data/history.json");
  await missing("scripts/fetch.js");
  await missing(".github/workflows/update.yml");
});

test("the share card and index title match the latest day", async () => {
  const data = JSON.parse(await readFile(path.join(root, "data.json"), "utf8"));
  const day = latestDay(data);
  const copy = previewCopy(day);
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const png = await readFile(path.join(root, "og.png"));

  assert.equal(copy.title, `${copy.verdict.label} (${copy.score})`);
  assert.ok(html.includes(`<title>${documentTitle(copy)}</title>`));
  assert.ok(html.includes(socialBlock(copy)));
  assert.ok(html.includes(copy.verdict.label));
  assert.ok(html.includes(copy.score));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.equal(readPngMarker(png), markerText(day));
});

test("an og.png stamp can be replaced without leaving the previous day", async () => {
  const png = await readFile(path.join(root, "og.png"));
  const first = embedPngMarker(png, "date=2000-01-01;score=1;verdict=WE'RE SO BACK");
  const second = embedPngMarker(first, "date=2000-01-02;score=-20;verdict=IT'S SO OVER");
  const key = Buffer.from("OverBack\0date=");
  const count = (buf) => {
    let n = 0;
    let i = 0;
    while ((i = buf.indexOf(key, i)) !== -1) {
      n += 1;
      i += key.length;
    }
    return n;
  };
  assert.equal(readPngMarker(first), "date=2000-01-01;score=1;verdict=WE'RE SO BACK");
  assert.equal(count(first), 1);
  assert.equal(readPngMarker(second), "date=2000-01-02;score=-20;verdict=IT'S SO OVER");
  assert.equal(count(second), 1);
  assert.equal(readPngMarker(png), readPngMarker(await readFile(path.join(root, "og.png"))));
});
