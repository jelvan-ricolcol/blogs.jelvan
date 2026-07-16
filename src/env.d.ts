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

  interface DurableObjectNamespace {
    idFromName(name: string): DurableObjectId;
    get(id: DurableObjectId): DurableObjectStub;
  }

  interface DurableObjectId {
    toString(): string;
  }

  interface DurableObjectStub {
    fetch(request: Request): Promise<Response>;
  }

  interface Env {
    R2_BUCKET: R2Bucket;
    CLOUDFARE_S3_ENDPOINT: string;
    CLOUDFARE_API_TOKEN: string;
    CLOUDFARE_ZONE_ID: string;
    BACKEND_JWT_SECRET?: string;
    CF_ACCESS_JWKS_URL?: string;
    RATE_LIMIT_DO: DurableObjectNamespace;
  }
}
