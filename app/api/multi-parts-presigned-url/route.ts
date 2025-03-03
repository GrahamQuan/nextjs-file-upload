import { NextRequest, NextResponse } from 'next/server';
import {
  MultiPartsPresignedUrlResponse,
  PresignedUrlRequestBody,
  ResponseData,
} from '@/types';
import { createMultiPartsPresignedUrl } from '@/lib/server-only';

export async function POST(request: NextRequest) {
  try {
    const body: PresignedUrlRequestBody = await request.json();
    const { files } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        {
          code: 400,
          msg: 'Missing or invalid files array',
        } satisfies ResponseData,
        { status: 400 }
      );
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const { presignedUrlList, key, uploadId } =
          await createMultiPartsPresignedUrl({
            mimeType: file.mimeType,
            fileSize: file.fileSize,
          });

        return {
          key,
          uploadId,
          presignedUrlList,
        };
      })
    );

    return NextResponse.json({
      code: 200,
      msg: 'Presigned URLs generated successfully',
      data: results[0],
    } satisfies MultiPartsPresignedUrlResponse);
  } catch (error) {
    console.error('Error generating presigned URLs:', error);
    return NextResponse.json(
      {
        code: 500,
        msg: 'Failed to generate presigned URLs',
      } satisfies ResponseData,
      { status: 500 }
    );
  }
}
