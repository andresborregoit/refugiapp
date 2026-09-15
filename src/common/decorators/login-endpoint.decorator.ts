import { SetMetadata } from '@nestjs/common';

export const LOGIN_ENDPOINT_METADATA = 'login_endpoint';

export const LoginEndpoint = () => SetMetadata(LOGIN_ENDPOINT_METADATA, true);