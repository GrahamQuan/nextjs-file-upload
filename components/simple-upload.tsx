'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { PresignedUrlResponse } from '@/types';

export default function SimpleUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;

    if (!file) {
      alert('Please select a file');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/presigned-url', {
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
      });

      const resJson = (await res.json()) as PresignedUrlResponse;

      if (resJson.code !== 200) {
        console.log('error msg', resJson);
        return;
      }

      await Promise.all(
        resJson.rows.map(async (el) => {
          if (!el.presignedUrl) {
            throw new Error('No presigned url found for upload');
          }
          return fetch(el.presignedUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type,
            },
          });
        })
      );

      setPreviewUrl(resJson.rows[0].fileUrl);
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

  return (
    <div className='flex flex-col gap-5 w-full min-h-screen items-center'>
      <h1>File Uploader and Downloader</h1>
      <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
        <div className='flex gap-3'>
          <label
            htmlFor='file'
            className='size-16 flex justify-center items-center rounded-lg bg-sky-500 hover:cursor-pointer'
          >
            <Upload className='size-8' />
            <input
              type='file'
              name='file' // required for form submission
              id='file' // required for <label>
              multiple={false}
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
      <div className='size-[200px] border rounded border-teal-500 flex justify-center items-center'>
        {previewUrl && (
          <img
            src={previewUrl}
            alt='preview'
            className='object-cover max-w-full max-h-full'
          />
        )}
      </div>
    </div>
  );
}
