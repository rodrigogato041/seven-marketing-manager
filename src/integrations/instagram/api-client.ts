export type ApiSendResult = { status: "sent" | "dry_run"; externalId?: string };

export interface InstagramApiClientContract {
  sendReply(recipientId: string, message: string): Promise<ApiSendResult>;
}

export class InstagramApiClient implements InstagramApiClientContract {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string | undefined,
    private readonly businessAccountId: string | undefined,
    private readonly dryRun: boolean,
  ) {}

  async sendReply(recipientId: string, message: string): Promise<ApiSendResult> {
    if (this.dryRun) return { status: "dry_run" };
    if (!this.accessToken || !this.businessAccountId) throw new Error("Instagram API credentials are not configured");
    const response = await fetch(`${this.baseUrl}/${this.businessAccountId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.accessToken}` },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message } }),
    });
    if (!response.ok) throw new Error(`Instagram API error: ${response.status}`);
    const payload = await response.json() as { message_id?: string };
    return { status: "sent", externalId: payload.message_id };
  }
}
