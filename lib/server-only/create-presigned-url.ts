import { PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';
import BucketClient from './bucket-client';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createDateFolderPath,
  getFileExtensionByMimeType,
} from '../file-utils';

export default async function createPresignedUrl(
  mimeType: string
): Promise<{ fileUrl: string; presignedUrl: string }> {
  // key be like: 2025/03/01/1234567890.png
  const key = `${createDateFolderPath()}/${nanoid()}.${getFileExtensionByMimeType(
    mimeType
  )}`;

  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME as string,
    Key: key,
    ContentType: mimeType,
  });

  const presignedUrl = await getSignedUrl(BucketClient, command, {
    expiresIn: 3600,
  });

  const fileUrl = `${process.env.BUCKET_PUBLIC_URL}/${key}`;

  return { fileUrl, presignedUrl };
}
