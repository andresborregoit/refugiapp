export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

export type PushSendStatus = 'ok' | 'invalid_token' | 'transient_error';

export interface PushSendResult {
  status: PushSendStatus;
  receiptId?: string | null;
  errorCode?: string | null;
}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushProvider {
  sendBatch(messages: PushMessage[]): Promise<PushSendResult[]>;
}
