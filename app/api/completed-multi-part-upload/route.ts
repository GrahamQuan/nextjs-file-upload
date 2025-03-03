import { NextRequest, NextResponse } from 'next/server';
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import BucketClient from '@/lib/server-only/bucket-client';
import { CompletedMultiPartUploadRequestBody } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: CompletedMultiPartUploadRequestBody = await request.json();
    const { key, uploadId, parts } = body;

    if (!key || !uploadId || !parts || !Array.isArray(parts)) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('Received completion request for:', { key, uploadId });
    console.log('Parts data:', JSON.stringify(parts));

    // Prepare part information for CompleteMultipartUpload, ensuring it's sorted by PartNumber
    const completedParts = parts
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((part) => ({
        PartNumber: part.partNumber,
        ETag: part.etag,
      }));

    console.log('Formatted parts for S3:', JSON.stringify(completedParts));

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: completedParts,
      },
    });

    try {
      const result = await BucketClient.send(completeCommand);
      console.log('Multipart upload completed successfully:', result);
    } catch (error) {
      console.error('S3 CompleteMultipartUpload error details:', error);
      throw error;
    }

    // return the file url
    const fileUrl = `${process.env.BUCKET_PUBLIC_URL}/${key}`;

    return NextResponse.json({
      code: 200,
      msg: 'Multipart upload completed successfully',
      fileUrl,
    });
  } catch (error) {
    console.error('Error completing multipart upload:', error);
    return NextResponse.json(
      {
        code: 500,
        msg:
          'Failed to complete multipart upload: ' +
          (error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
