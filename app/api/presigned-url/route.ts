import { NextRequest, NextResponse } from 'next/server';
import {
  PresignedUrlRequestBody,
  PresignedUrlResponse,
  ResponseRows,
} from '@/types';
import { createPresignedUrl } from '@/lib/server-only';

export async function POST(request: NextRequest) {
  try {
    const body: PresignedUrlRequestBody = await request.json();
    const { files } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        {
          code: 400,
          msg: 'Missing or invalid files array',
        } satisfies ResponseRows,
        { status: 400 }
      );
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const { fileUrl, presignedUrl } = await createPresignedUrl(
          file.mimeType
        );
        return {
          fileUrl,
          presignedUrl,
        };
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
      } satisfies ResponseRows,
      { status: 500 }
    );
  }
}
