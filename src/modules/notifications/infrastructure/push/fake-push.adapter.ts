import { Injectable } from '@nestjs/common';
import { PushMessage, PushProvider, PushSendResult } from './push-provider.interface';

/** Deterministic no-op provider for local, test and dry-run environments. */
@Injectable()
export class NoopPushAdapter implements PushProvider {
  async sendBatch(messages: PushMessage[]): Promise<PushSendResult[]> {
    return messages.map((_, index) => ({ status: 'ok' as const, receiptId: `noop-${index}` }));
  }
}

/** In-memory fake for unit and e2e tests with scripted per-message results. */
export class FakePushAdapter implements PushProvider {
  public sent: PushMessage[][] = [];

  constructor(private readonly script: PushSendResult[] = []) {}

  async sendBatch(messages: PushMessage[]): Promise<PushSendResult[]> {
    this.sent.push(messages);

    return messages.map(
      (_, index) => this.script[index] ?? { status: 'ok' as const, receiptId: `fake-${index}` },
    );
  }
}
