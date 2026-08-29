import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("presents the implemented Scaur surface", async () => {
  const html = await readFile(new URL("site/index.html", root), "utf8");

  assert.match(html, /Scaur.*control layer/);
  assert.match(html, /scaur_research_equity/);
  assert.match(html, /scaur_compare_equities/);
  assert.match(html, /scaur_live_order/);
  assert.match(html, /accountDataRead.*false/);
  assert.match(html, /orderToolsCalled.*false/);
  assert.match(html, /exact-order permit/);
  assert.match(html, /Robinhood Chain registry and settlement adapters/);
});

test("keeps the static site accessible and self-contained", async () => {
  const html = await readFile(new URL("site/index.html", root), "utf8");
  const css = await readFile(new URL("site/site.css", root), "utf8");
  await Promise.all([
    readFile(new URL("site/assets/favicon.svg", root)),
    readFile(new URL("site/assets/scaur-mark.svg", root)),
    readFile(new URL("site/assets/scaur-banner.png", root)),
  ]);

  assert.match(html, /<main id="content">/);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-label=/);
  assert.match(html, /assets\/scaur-banner\.png/);
  assert.match(css, /prefers-reduced-motion/);
});
