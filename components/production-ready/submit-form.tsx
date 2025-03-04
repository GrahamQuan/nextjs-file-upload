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
    .refine((file) => file.type.startsWith('image/')),
  // .optional() // this line and below line make file type optional
  // .or(z.any()),
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

      // 1. 获取分片上传的预签名URL
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
        console.error('获取预签名URL失败:', presignedUrlJson);
        alert('获取上传URL失败');
        return;
      }

      const { key, uploadId, presignedUrlList } = presignedUrlJson.data;

      // 2. 将文件分片
      const slicedFileList = sliceFileToMultipart(formData.image);
      const totalParts = presignedUrlList.length;
      let completedParts = 0;

      // 3. 上传每个分片并跟踪进度
      const uploadPromises = presignedUrlList.map(
        async (
          el: { presignedUrl: string; partNumber: number },
          idx: number
        ) => {
          if (!el.presignedUrl) {
            throw new Error('No presigned URL found for upload');
          }

          // 使用XMLHttpRequest来监听上传进度
          return new Promise<{ etag: string; partNumber: number }>(
            (resolve, reject) => {
              const xhr = new XMLHttpRequest();

              // 监听上传进度
              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  // 计算当前分片的进度
                  const partProgress = event.loaded / event.total;

                  // 更新总体进度 - 每个分片占总进度的比例是 1/totalParts
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

                  // 更新整体进度
                  setUploadProgress(
                    Math.floor((completedParts / totalParts) * 100)
                  );

                  // 从响应头中获取ETag
                  const etag =
                    xhr.getResponseHeader('ETag') ||
                    xhr.getResponseHeader('etag') ||
                    xhr.getResponseHeader('Etag') ||
                    '';

                  resolve({
                    etag: etag.replace(/"/g, ''), // 移除引号
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

      // 等待所有分片上传完成
      const uploadResults = await Promise.all(uploadPromises);

      // 4. 通知服务器所有分片已上传
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
        console.log('文件上传成功:', completeResult.fileUrl);
        // 这里可以将文件URL保存到表单或显示给用户
      } else {
        console.error('完成上传失败:', completeResult);
        alert('上传失败');
      }
    } catch (error) {
      console.error('上传过程出错:', error);
      alert('上传过程中发生错误');
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
              <span>上传进度</span>
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
          {isUploading ? '上传中...' : '提交'}
        </button>
        <div className='h-px w-[300px] bg-sky-500' />
        <div className='text-teal-500'>success result:</div>
        <div className='w-full border border-teal-500 aspect-square'></div>
      </form>
    </Form>
  );
}
