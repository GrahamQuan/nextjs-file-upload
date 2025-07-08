/**
 * @description The response data.
 */
export type ResponseData<T = any> = {
  code: number;
  msg: string;
  data?: T;
};

/**
 * @description The file info.
 */
export type FileInfo = {
  mimeType: string;
  fileSize: number;
};

/**
 * @description The request body for the presigned url.
 */
export type PresignedUrlRequestBody = {
  files: FileInfo[];
  enableSlicedUpload?: boolean;
  slicedSize?: number;
};

/**
 * @description The response data for the presigned url.
 */
export type PresignedUrlResponse = ResponseData<
  {
    fileUrl: string;
    presignedUrl: string;
  }[]
>;

/**
 * @description The response data for the multi parts presigned url.
 */
export type MultiPartsPresignedUrlResponse = ResponseData<{
  key: string;
  uploadId: string;
  presignedUrlList: {
    presignedUrl: string;
    partNumber: number;
  }[];
}>;

/**
 * @description The request body for the completed multi part upload.
 */
export type CompletedMultiPartUploadRequestBody = {
  key: string;
  uploadId: string;
  parts: {
    partNumber: number;
    etag: string;
  }[];
};

/**
 * @description The response data for the completed multi part upload.
 */
export type CompletedMultiPartUploadResponse = ResponseData<{
  fileUrl: string;
}>;
