import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import BucketClient from './bucket-client';
import {
  createDateFolderPath,
  getFileExtensionByMimeType,
} from '../file-utils';
import { nanoid } from 'nanoid';

/**
 * Creates a presigned URL for a multipart upload.
 *
 * @param {Object} options - The options for creating the presigned URL.
 * @param {string} options.mimeType - The MIME type of the file, e.g., 'image/png'.
 * @param {number} options.fileSize - The size of the file in bytes. (5 Mb ~ 5 Gb)
 * @param {number} [options.partSize=5242880] - The size of each part in bytes. Defaults to 5MB, the minimum part size requirement for R2/S3 Bucket.
 *
 */
export default async function createMultiPartsPresignedUrl({
  mimeType,
  fileSize,
  partSize = 5 * 1024 * 1024,
}: {
  mimeType: string;
  fileSize: number;
  partSize?: number;
}) {
  const bucketName = process.env.BUCKET_NAME || '';
  // key be like: 2025/03/01/1234567890.png
  const key = `${createDateFolderPath()}/${nanoid()}.${getFileExtensionByMimeType(
    mimeType
  )}`;

  // Calculate the part size and count
  const partCount = Math.ceil(fileSize / partSize);

  // Initialize the multipart upload
  const multipartUpload = await BucketClient.send(
    new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: mimeType,
    })
  );

  const uploadId = multipartUpload.UploadId;

  if (!uploadId) {
    throw new Error('Failed to initialize multipart upload');
  }

  // Generate a presigned URL for each part
  const presignedUrlList = [];

  // partNumber start from 1
  // because AWS S3 API PartNumber start from 1, max is 10000
  for (let partNumber = 1; partNumber <= partCount; partNumber++) {
    const command = new UploadPartCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const presignedUrl = await getSignedUrl(BucketClient, command, {
      expiresIn: 3600,
    });

    presignedUrlList.push({
      presignedUrl,
      partNumber,
    });
  }

  return {
    key,
    uploadId,
    presignedUrlList,
  };
}
