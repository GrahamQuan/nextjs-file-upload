import { sliceFileToMultipart } from '@/lib/file-utils';
import {
  CompletedMultiPartUploadRequestBody,
  MultiPartsPresignedUrlResponse,
} from '@/types';

// (1) Get the presigned URL for multipart upload
export async function getPresignedUrl({
  mimeType,
  fileSize,
}: {
  mimeType: string;
  fileSize: number;
}) {
  const res = await fetch('/api/multi-parts-presigned-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [
        {
          mimeType,
          fileSize,
        },
      ],
    }),
  });

  return (await res.json()) as MultiPartsPresignedUrlResponse;
}

// (2) Slice the file
export async function uploadFile(file: File) {
  const slicedFile = sliceFileToMultipart(file);
}

// (3) Notify the server that all parts have been uploaded
export async function completeUpload(
  completeParams: CompletedMultiPartUploadRequestBody
) {
  const res = await fetch('/api/completed-multi-part-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(completeParams),
  });

  return (await res.json()) as CompletedMultiPartUploadRequestBody;
}
