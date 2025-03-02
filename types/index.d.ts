export interface FileInfo {
  mimeType: string;
  fileSize: number;
}

export interface PresignedUrlRequestBody {
  files: FileInfo[];
  enableSlicedUpload?: boolean;
  slicedSize?: number;
}

export interface PresignedUrlResponse {
  code: number;
  msg: string;
  rows: (
    | {
        key: string;
        fileUrl: string;
        isMultipart: boolean;
        uploadId: string | undefined;
        parts: {
          partNumber: number;
          presignedUrl: string;
        }[];
        presignedUrl?: undefined;
      }
    | {
        key: string;
        fileUrl: string;
        isMultipart: boolean;
        presignedUrl: string;
        uploadId?: undefined;
        parts?: undefined;
      }
  )[];
}
