'use client';

import { zodResolver } from '@hookform/resolvers/zod';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import ImageUploadFormItem from './image-upload-form-item';
import { useState } from 'react';
import { sliceFileToMultipart } from '@/lib/file-utils';

const FormSchema = z.object({
  image: z
    .instanceof(File)
    .refine((file) => file.size >= 0)
    .refine((file) => file.type.startsWith('image/'))
    .optional() // this line and below line make file type optional
    .or(z.any()),
});

export default function SubmitForm() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const onSubmit = async (formData: z.infer<typeof FormSchema>) => {
    if (!formData.image) {
      alert('Please upload an image');
      return;
    }

    try {
      setIsUploading(true);

      // 1. Get presigned URL for multipart upload
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
                mimeType: formData.image.type,
                fileSize: formData.image.size,
              },
            ],
          }),
        }
      );

      const presignedUrlJson = await presignedUrlResponse.json();

      if (presignedUrlJson.code !== 200 || !presignedUrlJson.data) {
        console.error('Failed to get presigned URL:', presignedUrlJson);
        alert('Failed to get upload URL');
        return;
      }

      const { key, uploadId, presignedUrlList } = presignedUrlJson.data;

      // 2. Slice the file
      const slicedFileList = sliceFileToMultipart(formData.image);
      const totalParts = presignedUrlList.length;
      let completedParts = 0;

      // 3. Upload each part and track progress
      const uploadPromises = presignedUrlList.map(
        async (
          el: { presignedUrl: string; partNumber: number },
          idx: number
        ) => {
          if (!el.presignedUrl) {
            throw new Error('No presigned URL found for upload');
          }

          // Use XMLHttpRequest to monitor upload progress
          return new Promise<{ etag: string; partNumber: number }>(
            (resolve, reject) => {
              const xhr = new XMLHttpRequest();

              // Monitor upload progress
              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  // Calculate the progress of the current part
                  const partProgress = event.loaded / event.total;

                  // Update the overall progress - each part accounts for 1/totalParts of the total progress
                  const overallPartProgress =
                    idx / totalParts + partProgress / totalParts;
                  setUploadProgress(Math.floor(overallPartProgress * 100));
                }
              };

              xhr.open('PUT', el.presignedUrl, true);
              xhr.setRequestHeader('Content-Type', formData.image.type);

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  completedParts++;

                  // Update the overall progress
                  setUploadProgress(
                    Math.floor((completedParts / totalParts) * 100)
                  );

                  // Get ETag from the response header
                  const etag =
                    xhr.getResponseHeader('ETag') ||
                    xhr.getResponseHeader('etag') ||
                    xhr.getResponseHeader('Etag') ||
                    '';

                  resolve({
                    etag: etag.replace(/"/g, ''), // Remove quotes
                    partNumber: el.partNumber,
                  });
                } else {
                  reject(new Error(`Upload failed with status: ${xhr.status}`));
                }
              };

              xhr.onerror = () => {
                reject(new Error('Network error during upload'));
              };

              xhr.send(slicedFileList[idx]);
            }
          );
        }
      );

      // Wait for all parts to be uploaded
      const uploadResults = await Promise.all(uploadPromises);

      // 4. Notify the server that all parts have been uploaded
      const completeParams = {
        key,
        uploadId,
        parts: uploadResults.map((result) => ({
          partNumber: result.partNumber,
          etag: result.etag,
        })),
      };

      const completeResponse = await fetch('/api/completed-multi-part-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeParams),
      });

      const completeResult = await completeResponse.json();

      if (completeResult.code === 200) {
        console.log('File uploaded successfully:', completeResult.fileUrl);
        // Here you can save the file URL to the form or display it to the user
      } else {
        console.error('Failed to complete upload:', completeResult);
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Error during upload process:', error);
      alert('An error occurred during the upload process');
    } finally {
      setIsUploading(false);
    }

    console.log(formData);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex gap-5 flex-col border border-sky-500 rounded-xl p-5'
      >
        {/* `name` must match `FormSchema --> image` */}
        <ImageUploadFormItem name='image' />

        {isUploading && (
          <div className='w-full'>
            <div className='text-sm mb-1 flex justify-between'>
              <span>Upload progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className='w-full bg-gray-200 rounded-full h-2.5'>
              <div
                className='bg-sky-500 h-2.5 rounded-full'
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <button
          type='submit'
          disabled={isUploading}
          className='min-w-[80px] flex justify-center items-center h-11 bg-sky-500 text-white rounded-full hover:opacity-60 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isUploading ? 'Uploading...' : 'Submit'}
        </button>
        <div className='h-px w-[300px] bg-sky-500' />
        <div className='text-teal-500'>success result:</div>
        <div className='w-full border border-teal-500 aspect-square'></div>
      </form>
    </Form>
  );
}
