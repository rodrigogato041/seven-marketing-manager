import { chromium } from "playwright-core";
import fs from "node:fs/promises";

export type BrowserSendResult = { status: "sent" | "dry_run"; evidence?: string };

export interface BrowserClient {
  sendFirstMessage(handle: string, message: string): Promise<BrowserSendResult>;
}

export class InstagramCdpClient implements BrowserClient {
  constructor(private readonly cdpUrl: string, private readonly dryRun: boolean) {}

  async sendFirstMessage(handle: string, message: string): Promise<BrowserSendResult> {
    if (this.dryRun) return { status: "dry_run", evidence: `Would send to ${handle}: ${message}` };

    const browser = await chromium.connectOverCDP(this.cdpUrl);
    const context = browser.contexts()[0];
    if (!context) throw new Error("No logged-in Chrome context is available");
    const page = await context.newPage();
    try {
      await page.goto(`https://www.instagram.com/${handle.replace(/^@/, "")}/`, { waitUntil: "domcontentloaded" });
      const messageButton = page.getByRole("button", { name: /mensagem|message/i });
      await messageButton.click();
      const textbox = page.getByRole("textbox").last();
      await textbox.click();
      await textbox.pressSequentially(message, { delay: 65 });
      await page.waitForTimeout(800);
      await textbox.press("Enter");
      return { status: "sent" };
    } catch (error) {
      const filename = `screenshots/browser-${Date.now()}.png`;
      await fs.mkdir("screenshots", { recursive: true });
      await page.screenshot({ path: filename, fullPage: true }).catch(() => undefined);
      throw error;
    } finally {
      await page.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
  }
}
