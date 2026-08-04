import type { EmailTransport, SendEmailInput, SendEmailResult } from "@/lib/communications/providers/email-transport";

export type CommunicationChannelContext = {
  transport: EmailTransport;
  input: SendEmailInput;
};

export interface CommunicationChannelProvider {
  readonly channel: "email";
  deliver(ctx: CommunicationChannelContext): Promise<SendEmailResult>;
}

export const emailChannelProvider: CommunicationChannelProvider = {
  channel: "email",
  async deliver(ctx) {
    return ctx.transport.send(ctx.input);
  },
};
