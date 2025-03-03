export type FileInfo = {
  mimeType: string;
  fileSize: number;
};

export type PresignedUrlRequestBody = {
  files: FileInfo[];
  enableSlicedUpload?: boolean;
  slicedSize?: number;
};

export type ResponseData<T = any> = {
  code: number;
  msg: string;
  data?: T;
};

export type PresignedUrlResponse = ResponseData<
  {
    fileUrl: string;
    presignedUrl: string;
  }[]
>;

export type MultiPartsPresignedUrlResponse = ResponseData<{
  key: string;
  uploadId: string;
  presignedUrlList: {
    presignedUrl: string;
    partNumber: number;
  }[];
}>;

export type CompletedMultiPartUploadRequestBody = {
  key: string;
  uploadId: string;
  parts: {
    partNumber: number;
    etag: string;
  }[];
};
