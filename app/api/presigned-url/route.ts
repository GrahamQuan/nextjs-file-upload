import { NextRequest, NextResponse } from 'next/server';
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import { PresignedUrlRequestBody, PresignedUrlResponse } from '@/types';
import { getFileExtensionByMimeType } from '@/lib/file-utils';
import BucketClient from '@/lib/server-only/bucket-client';

const BucketName = process.env.BUCKET_NAME || '';
// Fixed slice size for multipart uploads (5MB in bytes)
const SLICE_SIZE = 5 * 1024 * 1024;

function createDateFolderPath() {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: PresignedUrlRequestBody = await request.json();
    const { files, enableSlicedUpload = false, slicedSize = SLICE_SIZE } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid files array' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const { mimeType, fileSize } = file;

        // Generate a unique key for each file
        const key = `${createDateFolderPath()}/${nanoid()}.${getFileExtensionByMimeType(
          mimeType
        )}`;

        // TODO
        // Check if we need multipart upload (large file handling)
        if (enableSlicedUpload && fileSize > slicedSize) {
          // Create multipart upload
          const createCommand = new CreateMultipartUploadCommand({
            Bucket: BucketName,
            Key: key,
            ContentType: mimeType,
          });

          const { UploadId } = await BucketClient.send(createCommand);

          // Calculate number of parts needed
          const partCount = Math.ceil(fileSize / slicedSize);

          // Generate signed URLs for each part
          const uploadPartUrls = [];
          for (let partNumber = 1; partNumber <= partCount; partNumber++) {
            const uploadPartCommand = new UploadPartCommand({
              Bucket: BucketName,
              Key: key,
              UploadId,
              PartNumber: partNumber,
            });

            const presignedPartUrl = await getSignedUrl(
              BucketClient,
              uploadPartCommand,
              {
                expiresIn: 3600,
              }
            );
            uploadPartUrls.push({
              partNumber,
              presignedUrl: presignedPartUrl,
            });
          }

          const fileUrl = `${process.env.BUCKET_PUBLIC_URL}/${key}`;
          return {
            key,
            fileUrl,
            isMultipart: true,
            uploadId: UploadId,
            parts: uploadPartUrls,
          };
        } else {
          // Regular single-part upload
          const command = new PutObjectCommand({
            Bucket: BucketName,
            Key: key,
            ContentType: mimeType,
          });

          const presignedUrl = await getSignedUrl(BucketClient, command, {
            expiresIn: 3600,
          });
          const fileUrl = `${process.env.BUCKET_PUBLIC_URL}/${key}`;

          return {
            key,
            fileUrl,
            isMultipart: false,
            presignedUrl,
          };
        }
      })
    );

    return NextResponse.json({
      code: 200,
      msg: 'Presigned URLs generated successfully',
      rows: results,
    } satisfies PresignedUrlResponse);
  } catch (error) {
    console.error('Error generating presigned URLs:', error);
    return NextResponse.json(
      {
        code: 500,
        msg: 'Failed to generate presigned URLs',
      },
      { status: 500 }
    );
  }
}
