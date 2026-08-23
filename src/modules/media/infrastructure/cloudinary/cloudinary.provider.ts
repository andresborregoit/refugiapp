import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export const CLOUDINARY_CLIENT = Symbol('CLOUDINARY_CLIENT');
export type CloudinaryClient = typeof cloudinary;

export const CloudinaryProvider = {
  provide: CLOUDINARY_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): CloudinaryClient => {
    cloudinary.config({
      cloud_name: configService.get<string>('cloudinary.cloudName', ''),
      api_key: configService.get<string>('cloudinary.apiKey', ''),
      api_secret: configService.get<string>('cloudinary.apiSecret', ''),
      secure: configService.get<boolean>('cloudinary.secure', true),
    });

    return cloudinary;
  },
};
