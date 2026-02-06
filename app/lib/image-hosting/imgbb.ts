import { ImageHostingService, HostedImage } from './types';

export class ImgBBService implements ImageHostingService {
  private apiKey: string;

  constructor() {
    const key = process.env.IMGBB_API_KEY;
    if (!key) {
      throw new Error('IMGBB_API_KEY environment variable is not set');
    }
    this.apiKey = key;
  }

  async upload(image: Buffer, filename: string): Promise<HostedImage> {
    const base64 = image.toString('base64');

    const formData = new FormData();
    formData.append('key', this.apiKey);
    formData.append('image', base64);
    formData.append('name', filename.replace(/\.[^.]+$/, ''));

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ImgBB upload failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`ImgBB upload failed: ${JSON.stringify(data)}`);
    }

    return {
      url: data.data.url,
      deleteUrl: data.data.delete_url,
      id: data.data.id,
    };
  }
}
