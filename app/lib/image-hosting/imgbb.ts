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
    console.log(`[ImgBB] Uploading "${filename}" (${image.length} bytes)`);

    const base64 = image.toString('base64');

    const formData = new FormData();
    formData.append('key', this.apiKey);
    formData.append('image', base64);
    formData.append('name', filename.replace(/\.[^.]+$/, ''));

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    console.log(`[ImgBB] Response status: ${response.status}`);

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[ImgBB] Upload failed (${response.status}):`, responseText);
      throw new Error(`ImgBB upload failed (${response.status}): ${responseText}`);
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[ImgBB] Non-JSON response:', responseText.slice(0, 500));
      throw new Error(`ImgBB returned non-JSON response: ${responseText.slice(0, 200)}`);
    }

    if (!data.success) {
      console.error('[ImgBB] Upload unsuccessful:', JSON.stringify(data));
      throw new Error(`ImgBB upload failed: ${JSON.stringify(data)}`);
    }

    console.log(`[ImgBB] Upload successful: ${data.data.url}`);

    return {
      url: data.data.url,
      deleteUrl: data.data.delete_url,
      id: data.data.id,
    };
  }
}
