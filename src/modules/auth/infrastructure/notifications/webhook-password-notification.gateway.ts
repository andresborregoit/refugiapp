import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonLoggerService } from '../../../../common/logger/json-logger.service';
import { PasswordNotificationGateway } from '../../domain/services/password-notification.gateway';

@Injectable()
export class WebhookPasswordNotificationGateway implements PasswordNotificationGateway {
  private readonly logger = new JsonLoggerService(WebhookPasswordNotificationGateway.name);

  constructor(private readonly configService: ConfigService) {}

  sendPasswordReset(email: string, rawToken: string, expiresAt: Date): Promise<void> {
    const resetUrl = new URL(
      this.configService.get<string>('passwordNotification.resetUrl', 'http://localhost:3000/reset-password'),
    );
    resetUrl.searchParams.set('token', rawToken);

    return this.send({
      recipient: email,
      template: 'password_reset',
      variables: { resetUrl: resetUrl.toString(), expiresAt: expiresAt.toISOString() },
    });
  }

  sendPasswordChanged(email: string): Promise<void> {
    return this.send({ recipient: email, template: 'password_changed', variables: {} });
  }

  private async send(payload: {
    recipient: string;
    template: 'password_reset' | 'password_changed';
    variables: Record<string, string>;
  }): Promise<void> {
    const webhookUrl = this.configService.get<string>('passwordNotification.webhookUrl', '');

    if (!webhookUrl) {
      this.logger.warn({ message: 'Password notification webhook is not configured.', template: payload.template });
      return;
    }

    const secret = this.configService.get<string>('passwordNotification.webhookSecret', '');
    const timeoutMs = this.configService.get<number>('passwordNotification.timeoutMs', 5000);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Password notification provider returned HTTP ${response.status}.`);
    }
  }
}
