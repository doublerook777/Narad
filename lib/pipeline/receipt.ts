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
  // eslint-disable-next-line no-var
  var __naradWarmBrowser: WarmBrowserState | null | undefined;
}

async function getWarmBrowser(): Promise<Browser | null> {
  const existing = globalThis.__naradWarmBrowser;
  if (existing && existing.browser.isConnected()) {
    // If session is older than 4.5 minutes (timeout is 300s), refresh it
    if (Date.now() - existing.createdAt < 270_000) {
      return existing.browser;
    }
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    console.warn("[receipt] TINYFISH_API_KEY not configured, cannot start browser session");
    return null;
  }

  try {
    const tf = getTinyFishClient();
    console.log("[receipt] Creating warm browser session (timeout 300s)...");
    const session = await tf.browser.sessions.create({
      url: "about:blank",
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

  const capturePromise = (async (): Promise<string | undefined> => {
    await fs.mkdir(receiptsDir, { recursive: true });

    const browser = await getWarmBrowser();
    if (!browser) return undefined;

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
        await page.evaluate((targetQuote) => {
          function searchAndHighlight(node: Node): boolean {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent || "";
              const idx = text.toLowerCase().indexOf(targetQuote.toLowerCase());
              if (idx !== -1) {
                const parent = node.parentElement;
                if (parent) {
                  const mark = document.createElement("mark");
                  mark.style.backgroundColor = "#fef08a";
                  mark.style.color = "#000000";
                  mark.style.padding = "2px 4px";
                  mark.style.borderRadius = "3px";
                  mark.style.boxShadow = "0 0 0 2px #eab308";
                  mark.textContent = text.slice(idx, idx + targetQuote.length);

                  const before = document.createTextNode(text.slice(0, idx));
                  const after = document.createTextNode(text.slice(idx + targetQuote.length));

                  parent.replaceChild(after, node);
                  parent.insertBefore(mark, after);
                  parent.insertBefore(before, mark);

                  mark.scrollIntoView({ behavior: "instant", block: "center" });
                  return true;
                }
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              const tag = el.tagName.toLowerCase();
              if (tag !== "script" && tag !== "style" && tag !== "mark") {
                for (let i = 0; i < node.childNodes.length; i++) {
                  if (searchAndHighlight(node.childNodes[i])) {
                    return true;
                  }
                }
              }
            }
            return false;
          }

          searchAndHighlight(document.body);
        }, cleanQuote);
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
