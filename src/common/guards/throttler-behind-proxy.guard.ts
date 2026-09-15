import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<Record<string, unknown>>();
    const setHeader = response.setHeader as unknown as (name: string, value: number) => void;

    if (typeof setHeader === 'function') {
      setHeader.call(response, 'Retry-After', throttlerLimitDetail.timeToBlockExpire);
    }

    return super.throwThrottlingException(context, throttlerLimitDetail);
  }
}