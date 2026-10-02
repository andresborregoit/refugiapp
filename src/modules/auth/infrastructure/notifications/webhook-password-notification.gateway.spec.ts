import { ConfigService } from '@nestjs/config';
import { WebhookPasswordNotificationGateway } from './webhook-password-notification.gateway';

describe('WebhookPasswordNotificationGateway', () => {
  const values: Record<string, string | number> = {
    'passwordNotification.webhookUrl': 'https://notifications.example.test/password-events',
    'passwordNotification.webhookSecret': 'test-webhook-secret',
    'passwordNotification.resetUrl': 'https://app.example.test/reset-password',
    'passwordNotification.timeoutMs': 1000,
  };
  const configService = {
    get: jest.fn((key: string, fallback?: string | number) => values[key] ?? fallback),
  };
  const fetchMock = jest.fn();
  let gateway: WebhookPasswordNotificationGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true, status: 202 });
    global.fetch = fetchMock as unknown as typeof fetch;
    gateway = new WebhookPasswordNotificationGateway(configService as unknown as ConfigService);
  });

  it('delivers a reset URL and expiration without logging or persisting the raw token', async () => {
    const expiresAt = new Date('2026-10-01T12:00:00.000Z');

    await gateway.sendPasswordReset('user@refugiapp.test', 'raw-single-use-token', expiresAt);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://notifications.example.test/password-events',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer test-webhook-secret' }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
      recipient: string;
      template: string;
      variables: { resetUrl: string; expiresAt: string };
    };
    expect(body).toEqual({
      recipient: 'user@refugiapp.test',
      template: 'password_reset',
      variables: {
        resetUrl: 'https://app.example.test/reset-password?token=raw-single-use-token',
        expiresAt: expiresAt.toISOString(),
      },
    });
  });

  it('fails when the provider rejects the notification', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    await expect(gateway.sendPasswordChanged('user@refugiapp.test')).rejects.toThrow(
      'Password notification provider returned HTTP 503.',
    );
  });
});
