export const PASSWORD_NOTIFICATION_GATEWAY = Symbol('PASSWORD_NOTIFICATION_GATEWAY');

export interface PasswordNotificationGateway {
  sendPasswordReset(email: string, rawToken: string, expiresAt: Date): Promise<void>;
  sendPasswordChanged(email: string): Promise<void>;
}
