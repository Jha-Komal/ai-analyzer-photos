// Drives the real Photo Finder UI headlessly: describe -> candidates -> "Looks close" -> refine -> reject -> "This is it".
// Usage: node scripts/mvp/uiSmoke.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? ".";
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

await page.goto(`${base}/photo-finder?tester=smoke&task=kitchen`);
await page.getByText("Your task").waitFor();
await shot(page, "1-describe");

await page.getByPlaceholder(/concert/i).fill("My mom cooking in our old kitchen");
await page.getByRole("button", { name: "Find possible photos" }).click();
await page.getByText("What you remember").waitFor({ timeout: 60_000 });
await page.getByRole("button", { name: "This is it" }).first().waitFor();
const firstGrid = await page.locator("img[alt^='Candidate photo']").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
console.log("grid 1:", firstGrid.map((s) => s.split("/").pop()).join(" "));
await shot(page, "2-results");

// Looks close on the photo that is the scenario's anchor (IMG_4296) if shown, else the first one.
const anchorIdx = Math.max(0, firstGrid.findIndex((s) => s.includes("IMG_4296")));
await page.getByRole("button", { name: "Looks close" }).nth(anchorIdx).click();
await page.getByText("What about this feels close").waitFor();
await shot(page, "3-refine");
await page.getByRole("button", { name: "Similar place" }).click();
await page.getByPlaceholder(/lighting is similar/i).fill("There was green patterned tiling on the wall behind her");
await page.getByRole("button", { name: "Narrow the results" }).click();
await page.getByText("What you remember").waitFor({ timeout: 60_000 });
await page.getByRole("button", { name: "This is it" }).first().waitFor();
const secondGrid = await page.locator("img[alt^='Candidate photo']").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
console.log("grid 2:", secondGrid.map((s) => s.split("/").pop()).join(" "));
console.log("clue chips:", await page.locator("section span.rounded-full").allInnerTexts());
await shot(page, "4-results-after-refine");

// Not this on the first card: it must disappear immediately and the grid must refill to 6.
const rejected = secondGrid[0];
await page.getByRole("button", { name: "Not this" }).first().click();
await page.waitForFunction((src) => ![...document.querySelectorAll("img[alt^='Candidate photo']")].some((e) => e.getAttribute("src") === src), rejected);
await page.waitForFunction(() => document.querySelectorAll("img[alt^='Candidate photo']").length === 6, null, { timeout: 15_000 });
console.log("rejected", rejected.split("/").pop(), "-> gone, grid refilled to 6");

await page.getByRole("button", { name: "This is it" }).first().click();
await page.getByText("Found it").waitFor();
await shot(page, "5-found");
console.log("found-screen stats:", (await page.getByText(/rounds? ·/).innerText()).trim());
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
