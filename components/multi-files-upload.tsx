'use client';

import { useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import { FileInfo, PresignedUrlResponse } from '@/types';
import useFileDownload from '@/hooks/use-file-download';

export default function MultiFilesUpload() {
  const [fileList, setFileList] = useState<FileList>();
  const [previewUrlList, setPreviewUrlList] = useState<string[]>();
  const [loading, setLoading] = useState(false);
  const { isDownloading, fileDownload } = useFileDownload();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const formFileList = formData.getAll('file') as File[];

    if (!formFileList.length) {
      alert('Please select a file');
      return;
    }

    setLoading(true);

    const reqList = formFileList.map((el) => ({
      mimeType: el.type,
      fileSize: el.size,
    })) satisfies FileInfo[];

    try {
      const res = await fetch('/api/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: reqList,
        }),
      });

      const resJson = (await res.json()) as PresignedUrlResponse;

      if (resJson.code !== 200 || !resJson.data) {
        console.log('error msg', resJson);
        return;
      }

      await Promise.all(
        resJson.data.map(async (el, idx) => {
          if (!el.presignedUrl) {
            throw new Error('No presigned url found for upload');
          }
          return fetch(el.presignedUrl, {
            method: 'PUT',
            body: formFileList[idx],
            headers: {
              'Content-Type': formFileList[idx].type,
            },
          });
        })
      );

      setPreviewUrlList(resJson.data.map((el) => el.fileUrl));
    } catch (error: any) {
      console.error(error);
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFileList(files);
    }
  };

  const onDownload = (url: string) => {
    if (url) {
      fileDownload(url);
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
              multiple // (1)true for multiple files (2)false for single file
              className='hidden'
              onChange={handleFileChange}
              accept='image/*' // only allow image files
            />
          </label>
          {fileList && fileList?.length > 0 && (
            <div>{fileList.length} items</div>
          )}
        </div>
        <button type='submit' className='py-2 px-3 bg-sky-500 rounded'>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      <div>upload result:</div>
      {previewUrlList &&
        previewUrlList.map((url) => (
          <div
            key={url}
            className='relative size-[200px] border rounded border-teal-500 flex justify-center items-center'
          >
            <button
              type='button'
              disabled={isDownloading}
              onClick={() => onDownload(url)}
              className='absolute top-2 right-2 size-6 rounded bg-white/20 backdrop-blur-md flex justify-center items-center'
            >
              {isDownloading ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Download className='size-4' />
              )}
            </button>
            <img
              src={url}
              alt='preview'
              className='object-cover max-w-full max-h-full'
            />
          </div>
        ))}
    </div>
  );
}
