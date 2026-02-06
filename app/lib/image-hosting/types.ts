export interface HostedImage {
  url: string;
  deleteUrl?: string;
  id: string;
}

export interface ImageHostingService {
  upload(image: Buffer, filename: string): Promise<HostedImage>;
}
