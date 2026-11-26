import {
  formatScore,
  markerPercent,
  sentenceFor,
  verdictFor,
} from "./scripts/meter.js";

const numberFormat = new Intl.NumberFormat("en-US");
const SVG = "http://www.w3.org/2000/svg";
const THEME = { over: "#d0121a", mid: "#f0c400", back: "#0e7a32" };

const pacific = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const dayLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

async function load() {
  const response = await fetch("data.json", { cache: "no-store" });
  if (!response.ok) throw new Error("The meter data didn't load.");
  render(await response.json());
}

function render(data) {
  const days = Array.isArray(data?.days) ? data.days : [];
  if (!days.length) throw new Error("data.json has no days.");
  const latest = days.reduce((newest, day) => (day.date > newest.date ? day : newest), days[0]);
  const verdict = verdictFor(latest.score);
  document.body.dataset.tone = verdict.tone;
  document.title = `${verdict.label} (${formatScore(latest.score)}) · The Over–Back Meter`;
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.content = THEME[verdict.tone];

  const banner = document.getElementById("seed-banner");
  if (latest.seed) {
    banner.hidden = false;
    banner.textContent = `Manual snapshot · ${formatWhen(latest)}.`;
  } else {
    banner.hidden = true;
    banner.textContent = "";
  }

  document.getElementById("headline").textContent = verdict.label;
  document.getElementById("band-score").textContent = formatScore(latest.score);

  const percent = markerPercent(latest.score);
  const meter = document.getElementById("meter");
  meter.setAttribute("aria-valuenow", latest.score === null || latest.score === undefined ? "0" : String(latest.score));
  meter.setAttribute("aria-valuetext", `${formatScore(latest.score)}, ${verdict.label}`);

  const marker = document.getElementById("marker");
  marker.style.left = `${percent}%`;
  marker.classList.toggle("flip", percent >= 50);
  document.getElementById("marker-score").textContent = formatScore(latest.score);

  document.getElementById("sentence").textContent = readingSentence(latest);
  document.getElementById("count-over").textContent = formatCount(latest.over);
  document.getElementById("count-back").textContent = formatCount(latest.back);
  document.getElementById("formula").textContent = formulaLine(latest);

  const chronological = days.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const chartNote = document.getElementById("chart-note");
  chartNote.hidden = !data.note;
  chartNote.textContent = data.note || "";
  drawChart(chronological);
  fillChartList(chronological);

  renderQuotes(latest.quotes);

  const kind = latest.seed ? " Manual snapshot." : "";
  document.getElementById("updated").textContent = `Last updated ${formatWhen(latest)}.${kind}`;
}

function formatWhen(day) {
  if (day.measured_at) return pacific.format(new Date(day.measured_at));
  return dayLabel.format(new Date(`${day.date}T12:00:00-08:00`));
}

function formatCount(value) {
  return Number.isInteger(value) ? numberFormat.format(value) : "—";
}

function readingSentence(day) {
  if (!Number.isInteger(day.over) || !Number.isInteger(day.back)) {
    return "Exact phrase counts were not recorded for this day.";
  }
  return sentenceFor(day.back, day.over);
}

function formulaLine(day) {
  if (!Number.isInteger(day.over) || !Number.isInteger(day.back)) {
    return "Exact counts were not recorded for this day.";
  }
  if (day.score === null || day.score === undefined) {
    return "The score is undefined when both counts are zero.";
  }
  const back = numberFormat.format(day.back);
  const over = numberFormat.format(day.over);
  return `${formatScore(day.score)} = (${back} − ${over}) / (${back} + ${over})`;
}

function fillChartList(days) {
  const list = document.getElementById("chart-list");
  list.replaceChildren();
  for (const day of days) {
    const item = document.createElement("li");
    item.textContent = `${day.date}: ${formatScore(day.score)}`;
    list.append(item);
  }
}

function renderQuotes(quotes) {
  const host = document.getElementById("quotes");
  host.replaceChildren();
  const sides = [
    ["It's so over", quotes?.over],
    ["We're so back", quotes?.back],
  ];
  let shown = 0;
  for (const [label, posts] of sides) {
    if (!posts?.length) continue;
    shown += posts.length;
    const block = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = label;
    const list = document.createElement("ul");
    for (const post of posts) {
      const item = document.createElement("li");
      if (post.url) {
        const link = document.createElement("a");
        link.href = post.url;
        link.rel = "noopener noreferrer";
        link.target = "_blank";
        link.textContent = post.text;
        item.append(link);
      } else {
        item.textContent = post.text;
      }
      list.append(item);
    }
    block.append(heading, list);
    host.append(block);
  }
  if (shown === 0) host.append(quiet("No sample posts for this reading."));
}

function quiet(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "quiet";
  paragraph.textContent = text;
  return paragraph;
}

function drawChart(days) {
  const svg = document.getElementById("chart");
  svg.replaceChildren();
  if (!days.length) return;

  const width = 720;
  const height = 250;
  const pad = { l: 40, r: 14, t: 26, b: 42 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const scores = days.map((day) => day.score);
  const span = Math.max(40, Math.max(...scores, 0) - Math.min(...scores, 0));
  const min = Math.max(-100, Math.min(...scores, 0) - span * 0.08);
  const max = Math.min(100, Math.max(...scores, 0) + span * 0.16);
  const yFor = (score) => pad.t + ((max - score) / (max - min)) * innerH;
  const zeroY = yFor(0);
  const gap = days.length > 10 ? 8 : 36;
  const natural = (innerW - gap * Math.max(days.length - 1, 0)) / days.length;
  const barW = Math.min(96, natural);
  const used = days.length * barW + Math.max(days.length - 1, 0) * gap;
  const origin = pad.l + (innerW - used) / 2;
  svg.style.minWidth = days.length > 8 ? `${days.length * 4.25}rem` : "";

  svg.append(line(pad.l, zeroY, width - pad.r, zeroY, "#1a120c", 1.5));
  const zero = text(pad.l - 8, zeroY + 4, "0", "end");
  zero.setAttribute("fill", "#5c5146");
  svg.append(zero);

  days.forEach((day, index) => {
    const x = origin + index * (barW + gap);
    const score = day.score;
    const y = yFor(score);
    const top = Math.min(y, zeroY);
    const barH = Math.max(2, Math.abs(zeroY - y));
    const rect = document.createElementNS(SVG, "rect");
    rect.setAttribute("x", x.toFixed(1));
    rect.setAttribute("y", top.toFixed(1));
    rect.setAttribute("width", barW.toFixed(1));
    rect.setAttribute("height", barH.toFixed(1));
    rect.setAttribute("rx", "3");
    rect.setAttribute("fill", barColor(score));
    const title = document.createElementNS(SVG, "title");
    title.textContent = day.note ? `${day.date}: ${formatScore(score)}. ${day.note}` : `${day.date}: ${formatScore(score)}`;
    rect.append(title);
    svg.append(rect);

    if (barW >= 28) {
      const label = text(x + barW / 2, score >= 0 ? top - 6 : top + barH + 14, formatScore(score), "middle");
      label.setAttribute("font-size", "13");
      label.setAttribute("font-weight", "700");
      svg.append(label);
    }

    const showDate = days.length <= 10 || index % Math.ceil(days.length / 8) === 0 || index === days.length - 1;
    if (showDate) {
      const date = text(x + barW / 2, height - 16, dayLabel.format(new Date(`${day.date}T00:00:00Z`)), "middle");
      date.setAttribute("fill", "#5c5146");
      date.setAttribute("font-size", "12");
      svg.append(date);
    }
  });
}

function barColor(score) {
  if (score <= -20) return "#d0121a";
  if (score >= 20) return "#0e7a32";
  return "#c4920a";
}

function line(x1, y1, x2, y2, stroke, width) {
  const element = document.createElementNS(SVG, "line");
  element.setAttribute("x1", x1);
  element.setAttribute("y1", y1);
  element.setAttribute("x2", x2);
  element.setAttribute("y2", y2);
  element.setAttribute("stroke", stroke);
  element.setAttribute("stroke-width", width);
  return element;
}

function text(x, y, value, anchor) {
  const element = document.createElementNS(SVG, "text");
  element.setAttribute("x", x);
  element.setAttribute("y", y);
  element.setAttribute("text-anchor", anchor);
  element.setAttribute("fill", "#1a120c");
  element.setAttribute("font-family", '"Source Sans 3", sans-serif');
  element.textContent = value;
  return element;
}

load().catch((error) => {
  document.getElementById("headline").textContent = "COULDN'T LOAD";
  document.getElementById("sentence").textContent = error.message || "The meter data didn't load.";
});
