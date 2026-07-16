// Type declarations for Worker environment
export {};

declare global {
  interface R2Bucket {
    put(key: string, body: BodyInit | ReadableStream, options?: any): Promise<void>;
    get?(key: string): Promise<{
      body: ReadableStream<Uint8Array> | null;
      size?: number;
      httpMetadata?: Record<string, string>;
      customMetadata?: Record<string, string>;
    } | null>;
  }

  interface Env {
    R2_BUCKET: R2Bucket;
    CLOUDFARE_S3_ENDPOINT: string;
    CLOUDFARE_API_TOKEN: string;
    CLOUDFARE_ZONE_ID: string;
    BACKEND_AUTH_TOKEN: string;
  }
}
