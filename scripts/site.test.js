import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

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
  assert.match(html, /property="og:title" content="WE'RE SO BACK \(\+39\)"/);
  assert.match(html, /property="og:description" content="“We're so back” posts outnumber “it's so over” posts about 2\.3 to 1 today\."/);
  assert.match(html, /name="twitter:title" content="WE'RE SO BACK \(\+39\)"/);
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
  assert.match(readme, /Settings → Pages/);
  assert.match(readme, /https:\/\/timjonez\.github\.io\/over-back-meter\//);
  assert.equal(tree.includes("X_BEARER_TOKEN"), false);
  assert.equal(tree.includes("api.x.com"), false);

  await missing("data/latest.json");
  await missing("data/history.json");
  await missing("scripts/fetch.js");
  await missing(".github/workflows/update.yml");
});
