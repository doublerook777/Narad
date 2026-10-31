import { chromium, type Browser } from "playwright-core";
import { getTinyFishClient } from "../tinyfish";
import fs from "fs/promises";
import path from "path";

interface WarmBrowserState {
  sessionId: string;
  cdpUrl: string;
  browser: Browser;
  createdAt: number;
}

declare global {
  var __naradWarmBrowser: WarmBrowserState | null | undefined;
  var __naradWarmPending: Promise<Browser | null> | undefined;
}

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

/** One shared session: parallel claims must not each create their own (10-30s and billed). */
function getWarmBrowser(): Promise<Browser | null> {
  const existing = globalThis.__naradWarmBrowser;
  if (existing && existing.browser.isConnected() && Date.now() - existing.createdAt < 270_000) {
    return Promise.resolve(existing.browser);
  }
  if (!globalThis.__naradWarmPending) {
    globalThis.__naradWarmPending = createWarmBrowser().finally(() => {
      globalThis.__naradWarmPending = undefined;
    });
  }
  return globalThis.__naradWarmPending;
}

/** Call when a game starts so the first receipt doesn't pay the session start-up cost. */
export function prewarmBrowser(): void {
  void getWarmBrowser().catch(() => {});
}

async function createWarmBrowser(): Promise<Browser | null> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    console.warn("[receipt] TINYFISH_API_KEY not configured, cannot start browser session");
    return null;
  }

  try {
    const tf = getTinyFishClient();
    console.log("[receipt] Creating warm browser session (timeout 300s)...");
    const session = await tf.browser.sessions.create({
      url: "https://example.com",
      timeout_seconds: 300,
    });

    if (!session || !session.cdp_url) {
      console.warn("[receipt] No cdp_url returned from browser session creation");
      return null;
    }

    const browser = await chromium.connectOverCDP(session.cdp_url);
    globalThis.__naradWarmBrowser = {
      sessionId: session.session_id,
      cdpUrl: session.cdp_url,
      browser,
      createdAt: Date.now(),
    };

    return browser;
  } catch (err) {
    console.warn("[receipt] Failed to create warm browser session:", (err as Error)?.message || err);
    return null;
  }
}

export interface CaptureReceiptInput {
  id: string;
  url: string;
  quote: string;
}

export async function captureReceipt(input: CaptureReceiptInput): Promise<string | undefined> {
  const { id, url, quote } = input;
  if (!url || !url.startsWith("http")) return undefined;

  const receiptsDir = path.join(process.cwd(), ".cache", "receipts");
  const receiptFilePath = path.join(receiptsDir, `${id}.png`);

  // 15-second total timeout as mandated in plan.md A2.1
  const timeoutMs = 15_000;

  // Session start-up has its own allowance; the 15s budget below is only for capturing.
  const browser = await withTimeout(getWarmBrowser(), 45_000, null);
  if (!browser) return undefined;

  const capturePromise = (async (): Promise<string | undefined> => {
    await fs.mkdir(receiptsDir, { recursive: true });

    const context = browser.contexts()[0] || (await browser.newContext());
    const page = await context.newPage();

    try {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(url, {
        timeout: 10_000,
        waitUntil: "domcontentloaded",
      });

      // Highlight the quote in the DOM if found
      if (quote && quote.trim().length > 5) {
        const cleanQuote = quote.trim().slice(0, 120);
        await page.evaluate(`(function(targetQuote) {
          function searchAndHighlight(node) {
            if (node.nodeType === 3) {
              var text = node.textContent || "";
              var idx = text.toLowerCase().indexOf(targetQuote.toLowerCase());
              if (idx !== -1) {
                var parent = node.parentElement;
                if (parent) {
                  var mark = document.createElement("mark");
                  mark.style.backgroundColor = "#fef08a";
                  mark.style.color = "#000000";
                  mark.style.padding = "2px 4px";
                  mark.style.borderRadius = "3px";
                  mark.style.boxShadow = "0 0 0 2px #eab308";
                  mark.textContent = text.slice(idx, idx + targetQuote.length);

                  var before = document.createTextNode(text.slice(0, idx));
                  var after = document.createTextNode(text.slice(idx + targetQuote.length));

                  parent.replaceChild(after, node);
                  parent.insertBefore(mark, after);
                  parent.insertBefore(before, mark);

                  mark.scrollIntoView({ behavior: "instant", block: "center" });
                  return true;
                }
              }
            } else if (node.nodeType === 1) {
              var el = node;
              var tag = el.tagName ? el.tagName.toLowerCase() : "";
              if (tag !== "script" && tag !== "style" && tag !== "mark") {
                for (var i = 0; i < el.childNodes.length; i++) {
                  if (searchAndHighlight(el.childNodes[i])) {
                    return true;
                  }
                }
              }
            }
            return false;
          }
          searchAndHighlight(document.body);
        })(${JSON.stringify(cleanQuote)})`);
      }

      // Small pause for layout/scroll
      await new Promise((r) => setTimeout(r, 400));

      await page.screenshot({
        path: receiptFilePath,
        fullPage: false,
      });

      return id;
    } finally {
      await page.close().catch(() => {});
    }
  })();

  const timeoutPromise = new Promise<undefined>((resolve) => {
    setTimeout(() => resolve(undefined), timeoutMs);
  });

  try {
    const result = await Promise.race([capturePromise, timeoutPromise]);
    return result;
  } catch (err) {
    console.warn(`[receipt] captureReceipt failed for ${id}:`, (err as Error)?.message || err);
    return undefined;
  }
}
