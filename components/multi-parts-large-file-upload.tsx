'use client';

import { useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import {
  CompletedMultiPartUploadRequestBody,
  CompletedMultiPartUploadResponse,
  MultiPartsPresignedUrlResponse,
} from '@/types';
import { sliceFileToMultipart } from '@/lib/file-utils';
import useFileDownload from '@/hooks/use-file-download';

export default function MultipartsLargeFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isDownloading, fileDownload } = useFileDownload();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const formFile = formData.get('file') as File;

    if (!formFile) {
      alert('Please select a file');
      return;
    }

    setLoading(true);

    try {
      // (1) create presigned url
      const presignedUrlResponse = await fetch(
        '/api/multi-parts-presigned-url',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: [
              {
                mimeType: file?.type || '',
                fileSize: file?.size || 0,
              },
            ],
          }),
        }
      );

      const presignedUrlJson =
        (await presignedUrlResponse.json()) as MultiPartsPresignedUrlResponse;

      if (presignedUrlJson.code !== 200 || !presignedUrlJson.data) {
        console.log('error msg', presignedUrlJson);
        return;
      }

      const { key, uploadId, presignedUrlList } = presignedUrlJson.data;

      const slicedFileList = sliceFileToMultipart(formFile);

      // (2) upload sliced file
      const uploadResponse = await Promise.all(
        presignedUrlList.map(async (el, idx) => {
          if (!el.presignedUrl) {
            throw new Error('No presigned url found for upload');
          }

          const sliceResponse = await fetch(el.presignedUrl, {
            method: 'PUT',
            body: slicedFileList[idx],
            headers: {
              'Content-Type': formFile.type,
            },
          });

          if (!sliceResponse.ok) {
            console.error('Upload failed with status:', sliceResponse.status);
            throw new Error(`Upload failed: ${sliceResponse.status}`);
          }

          const etag =
            sliceResponse.headers.get('Etag') ||
            sliceResponse.headers.get('etag') ||
            sliceResponse.headers.get('ETag') ||
            '';

          console.log('Part uploaded with ETag:', etag);

          return {
            etag,
            partNumber: el.partNumber,
          };
        })
      );

      if (!uploadResponse.length) {
        console.log('upload failed');
        return;
      }

      const params: CompletedMultiPartUploadRequestBody = {
        key,
        uploadId,
        parts: uploadResponse.map((el) => ({
          partNumber: el.partNumber,
          etag: el.etag,
        })),
      };

      // (3) tell server all slices is uploaded and get the file url
      const completedRes = await fetch('/api/completed-multi-part-upload', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      const completedJson =
        (await completedRes.json()) as CompletedMultiPartUploadResponse;

      setPreviewUrl(completedJson.data?.fileUrl || '');
    } catch (error: any) {
      console.error(error);
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const onDownload = () => {
    if (previewUrl) {
      fileDownload(previewUrl);
    }
  };

  return (
    <div className='flex flex-col gap-5 w-full items-center py-5'>
      <form
        onSubmit={handleSubmit}
        className='flex flex-col gap-3 border border-sky-500 rounded-lg p-5'
      >
        <div>Upload form</div>
        <div className='flex gap-3'>
          <label
            htmlFor='file' // match with <input> id
            className='size-16 flex justify-center items-center rounded-lg bg-sky-500 hover:cursor-pointer'
          >
            <Upload className='size-8' />
            <input
              type='file'
              name='file' // required for form submission
              id='file' // required for <label>
              multiple={false} // (1)true for multiple files (2)false for single file
              onChange={handleFileChange}
              className='hidden'
              accept='image/*' // only allow image files
            />
          </label>
          {file && (
            <>
              {file.type.startsWith('image') && (
                <div className='size-[150px] border rounded border-sky-500 flex justify-center items-center'>
                  <img
                    src={URL.createObjectURL(file)}
                    alt='preview'
                    className='object-cover max-w-full max-h-full'
                  />
                </div>
              )}
            </>
          )}
        </div>
        <button type='submit' className='py-2 px-3 bg-sky-500 rounded'>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      <div>upload result:</div>
      <div className='relative size-[200px] border rounded border-teal-500 flex justify-center items-center'>
        {previewUrl && (
          <>
            <button
              type='button'
              disabled={isDownloading}
              onClick={onDownload}
              className='absolute top-2 right-2 size-6 rounded bg-white/20 backdrop-blur-md flex justify-center items-center'
            >
              {isDownloading ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Download className='size-4' />
              )}
            </button>
            <img
              src={previewUrl}
              alt='preview'
              className='object-cover max-w-full max-h-full'
            />
          </>
        )}
      </div>
    </div>
  );
}
