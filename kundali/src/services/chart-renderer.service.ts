import sharp from "sharp";
import type { D1Chart, D9Chart, DerivedMoonChart } from "../models/astrology-model.js";

export type ChartLayout = "north_indian";
export type PlanetDisplayMode = "vedic" | "all";

export type ChartRenderOptions = {
  layout?: ChartLayout;
  planetDisplay?: PlanetDisplayMode;
  includeOuterPlanets?: boolean;
  degreePrecision?: number;
};

export type RenderedChart = {
  format: "png";
  encoding: "base64";
  mimeType: "image/png";
  width: number;
  height: number;
  data: string;
};

export type GenericChartInput = {
  title: string;
  referenceSignId: number;
  ascendantHouse: number;
  houses: Record<number, string[]>;
  options?: ChartRenderOptions;
};

const W = 800;
const H = 800;
const PLANET_SHORT: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Ve",
  Saturn: "Sa", Rahu: "Ra", Ketu: "Ke", Uranus: "Ur", Neptune: "Ne", Pluto: "Pl"
};
const SIGN_SHORT = ["", "Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"];
const VEDIC_PLANETS = new Set(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]);

const HOUSE_CENTERS: Record<number, [number, number]> = {
  1: [400, 185], 2: [235, 105], 3: [120, 230], 4: [185, 400], 5: [120, 570], 6: [235, 695],
  7: [400, 615], 8: [565, 695], 9: [680, 570], 10: [615, 400], 11: [680, 230], 12: [565, 105]
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function localDegree(longitude: number, precision = 2): string {
  const normalized = ((longitude % 30) + 30) % 30;
  const rounded = Number(normalized.toFixed(Math.max(0, Math.min(4, precision))));
  return rounded.toFixed(Math.max(0, Math.min(4, precision)));
}

function planetIsVisible(name: string, options: ChartRenderOptions): boolean {
  if (options.includeOuterPlanets === true || options.planetDisplay === "all") return true;
  return VEDIC_PLANETS.has(name);
}

function houseText(lines: string[], house: number, isAsc = false): string[] {
  const [x, y] = HOUSE_CENTERS[house]!;
  const out: string[] = [];
  if (isAsc) {
    out.push(`<text x="${x}" y="${y - 22}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#b8860b">Asc</text>`);
  }
  lines.forEach((line, i) => {
    out.push(`<text x="${x}" y="${y + (isAsc ? 8 : -10) + i * 23}" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="600" fill="#222">${esc(line)}</text>`);
  });
  return out;
}

function northIndianShell(title: string): string[] {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="800" height="800" fill="white"/>`,
    `<text x="400" y="25" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700">${esc(title)}</text>`,
    `<g stroke="#222" stroke-width="2" fill="none">`,
    `<rect x="30" y="30" width="740" height="740"/>`,
    `<line x1="30" y1="30" x2="770" y2="770"/><line x1="770" y1="30" x2="30" y2="770"/>`,
    `<line x1="400" y1="30" x2="30" y2="400"/><line x1="400" y1="30" x2="770" y2="400"/>`,
    `<line x1="30" y1="400" x2="400" y2="770"/><line x1="770" y1="400" x2="400" y2="770"/>`,
    `</g>`
  ];
}

/** Generic chart renderer. The renderer only needs a house -> display-lines map. */
export async function renderChart(input: GenericChartInput): Promise<RenderedChart> {
  const options: ChartRenderOptions = {
    layout: "north_indian",
    planetDisplay: "vedic",
    includeOuterPlanets: false,
    degreePrecision: 2,
    ...input.options
  };

  if (options.layout !== "north_indian") {
    throw new Error(`Unsupported chart layout: ${options.layout}`);
  }

  const svg = northIndianShell(input.title);
  for (let house = 1; house <= 12; house++) {
    const signId = ((input.referenceSignId + house - 2 + 12) % 12) + 1;
    const [x, y] = HOUSE_CENTERS[house]!;
    svg.push(`<text x="${x}" y="${y - 45}" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#777">${signId} ${esc(SIGN_SHORT[signId] ?? "")}</text>`);
    svg.push(...houseText(input.houses[house] ?? [], house, house === input.ascendantHouse));
  }
  svg.push(`<text x="400" y="790" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#777">Bhavishya Katha</text></svg>`);

  const png = await sharp(Buffer.from(svg.join(""))).png().toBuffer();
  return { format: "png", encoding: "base64", mimeType: "image/png", width: W, height: H, data: png.toString("base64") };
}

function d1Data(chart: D1Chart, options: ChartRenderOptions) {
  const byHouse: Record<number, string[]> = {};
  const precision = options.degreePrecision ?? 2;
  for (const [name, planet] of Object.entries(chart.planets)) {
    if (!planetIsVisible(name, options)) continue;
    const degree = localDegree(planet.position.longitude, precision);
    const retro = planet.position.retrograde ? "®" : "";
    (byHouse[planet.house] ??= []).push(`${PLANET_SHORT[name] ?? name.slice(0, 2)}-${degree}°${retro}`);
  }
  return { referenceSignId: chart.ascendant.position.sign.id, ascHouse: chart.ascendant.house, byHouse };
}

function d9Data(chart: D9Chart, options: ChartRenderOptions) {
  const byHouse: Record<number, string[]> = {};
  const precision = options.degreePrecision ?? 2;
  for (const [name, placement] of Object.entries(chart.placements)) {
    if (!planetIsVisible(name, options)) continue;
    const degree = localDegree(placement.longitude, precision);
    (byHouse[placement.house] ??= []).push(`${PLANET_SHORT[name] ?? name.slice(0, 2)}-${degree}°`);
  }
  const ref = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"].indexOf(chart.referenceSign) + 1;
  return { referenceSignId: ref > 0 ? ref : 1, ascHouse: 1, byHouse };
}

function moonData(chart: DerivedMoonChart, options: ChartRenderOptions) {
  const byHouse: Record<number, string[]> = {};
  const precision = options.degreePrecision ?? 2;
  for (const [name, planet] of Object.entries(chart.planets)) {
    if (!planetIsVisible(name, options)) continue;
    const degree = localDegree(planet.longitude, precision);
    (byHouse[planet.house] ??= []).push(`${PLANET_SHORT[name] ?? name.slice(0, 2)}-${degree}°`);
  }
  return { referenceSignId: chart.referenceSignId, ascHouse: 1, byHouse };
}

export async function renderD1(chart: D1Chart, options?: ChartRenderOptions) {
  const d = d1Data(chart, options ?? {});
  return renderChart({ title: "Lagna / Rasi", referenceSignId: d.referenceSignId, ascendantHouse: d.ascHouse, houses: d.byHouse, options: options ?? {} });
}

export async function renderD9(chart: D9Chart, options?: ChartRenderOptions) {
  const d = d9Data(chart, options ?? {});
  return renderChart({ title: "Navamsa (D9)", referenceSignId: d.referenceSignId, ascendantHouse: d.ascHouse, houses: d.byHouse, options: options ?? {} });
}

export async function renderMoon(chart: DerivedMoonChart, options?: ChartRenderOptions) {
  const d = moonData(chart, options ?? {});
  return renderChart({ title: "Moon Chart", referenceSignId: d.referenceSignId, ascendantHouse: d.ascHouse, houses: d.byHouse, options: options ?? {} });
}
