export type FileInfo = {
  mimeType: string;
  fileSize: number;
};

export type PresignedUrlRequestBody = {
  files: FileInfo[];
  enableSlicedUpload?: boolean;
  slicedSize?: number;
};

export type ResponseRows<T = any> = {
  code: number;
  msg: string;
  rows?: T[];
};

export type PresignedUrlResponse = ResponseRows<{
  fileUrl: string;
  presignedUrl: string;
}>;
