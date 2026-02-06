import { ImageHostingService } from './types';
import { ImgBBService } from './imgbb';

export type { ImageHostingService, HostedImage } from './types';

export function getImageHostingService(): ImageHostingService {
  const provider = process.env.IMAGE_HOSTING_PROVIDER || 'imgbb';

  switch (provider) {
    case 'imgbb':
      return new ImgBBService();
    default:
      throw new Error(`Unknown image hosting provider: ${provider}`);
  }
}
