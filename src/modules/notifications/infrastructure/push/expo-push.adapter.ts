import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonLoggerService } from '../../../../common/logger/json-logger.service';
import { PushMessage, PushProvider, PushSendResult } from './push-provider.interface';

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Expo Push Service adapter. Never receives token hashes: callers resolve
 * the cleartext token only at the dispatch boundary and never log it.
 */
@Injectable()
export class ExpoPushAdapter implements PushProvider {
  private readonly logger = new JsonLoggerService(ExpoPushAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async sendBatch(messages: PushMessage[]): Promise<PushSendResult[]> {
    const url = this.configService.get<string>('push.expoPushUrl');
    const timeoutMs = this.configService.get<number>('push.timeoutMs', 8000);
    const results: PushSendResult[] = [];

    for (const message of messages) {
      results.push(await this.sendOne(url!, timeoutMs, message));
    }

    return results;
  }

  private async sendOne(
    url: string,
    timeoutMs: number,
    message: PushMessage,
  ): Promise<PushSendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: message.to,
          title: message.title,
          body: message.body,
          data: message.data,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return { status: 'transient_error', errorCode: `EXPO_HTTP_${response.status}` };
      }

      const payload = (await response.json()) as { data?: ExpoPushTicket | ExpoPushTicket[] };
      const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;

      if (!ticket) {
        return { status: 'transient_error', errorCode: 'EXPO_EMPTY_RESPONSE' };
      }

      if (ticket.status === 'ok') {
        return { status: 'ok', receiptId: ticket.id ?? null };
      }

      const error = ticket.details?.error ?? 'UNKNOWN';

      if (error === 'DeviceNotRegistered') {
        return { status: 'invalid_token', errorCode: 'EXPO_DEVICE_NOT_REGISTERED' };
      }

      return { status: 'transient_error', errorCode: `EXPO_${error}` };
    } catch (error) {
      const code =
        error instanceof Error && error.name === 'AbortError'
          ? 'EXPO_TIMEOUT'
          : 'EXPO_NETWORK_ERROR';
      this.logger.error({ event: 'push.send.failed', errorCode: code });

      return { status: 'transient_error', errorCode: code };
    } finally {
      clearTimeout(timer);
    }
  }
}
