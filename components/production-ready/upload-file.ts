// ... existing code ...

import { sliceFileToMultipart } from '@/lib/file-utils';
import { nanoid } from 'nanoid';

// 上传状态类型
export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'canceled'
  | 'error';

// 定义文件上传结果接口
export interface FileUploadResult {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  parts: { etag: string; partNumber: number }[];
}

// 定义上传控制器接口
export interface UploadController {
  pause: () => void;
  resume: () => Promise<any>;
  cancel: () => Promise<void>;
  getStatus: () => UploadStatus;
  getProgress: () => number;
  getResult: () => Promise<FileUploadResult | null>;
  getError: () => Error | null;
}

// 文件上传事件监听器接口
export interface FileUploadListeners {
  onProgress?: (fileId: string, progress: number) => void;
  onStatusChange?: (fileId: string, status: UploadStatus) => void;
  onComplete?: (fileId: string, result: FileUploadResult) => void;
  onError?: (fileId: string, error: Error) => void;
}

// 增强的文件上传类
export class FileUploader {
  private file: File;
  private fileId: string;
  private listeners: FileUploadListeners;
  private uploadStatus: UploadStatus = 'pending';
  private uploadProgress: number = 0;
  private uploadError: Error | null = null;
  private uploadAbortControllers: AbortController[] = [];
  private completedParts: { etag: string; partNumber: number }[] = [];
  private slicedFileList: Blob[] = [];
  private presignedUrlList: { presignedUrl: string; partNumber: number }[] = [];
  private key = '';
  private uploadId = '';
  private resultPromise: Promise<FileUploadResult | null>;
  private resolveResult!: (value: FileUploadResult | null) => void;
  private rejectResult!: (reason: Error) => void;
  private uploadResult: FileUploadResult | null = null;

  constructor(file: File, fileId: string, listeners: FileUploadListeners = {}) {
    this.file = file;
    this.fileId = fileId;
    this.listeners = listeners;

    this.resultPromise = new Promise((resolve, reject) => {
      this.resolveResult = resolve;
      this.rejectResult = reject;
    });
  }

  // 获取上传控制器
  public getController(): UploadController {
    return {
      pause: () => this.pause(),
      resume: () => this.resume(),
      cancel: () => this.cancel(),
      getStatus: () => this.uploadStatus,
      getProgress: () => this.uploadProgress,
      getResult: () => this.resultPromise,
      getError: () => this.uploadError,
    };
  }

  // 设置上传状态并触发状态变更事件
  private setStatus(status: UploadStatus) {
    if (this.uploadStatus !== status) {
      this.uploadStatus = status;
      if (this.listeners.onStatusChange) {
        this.listeners.onStatusChange(this.fileId, status);
      }
    }
  }

  // 设置上传进度并触发进度事件
  private setProgress(progress: number) {
    if (this.uploadProgress !== progress) {
      this.uploadProgress = progress;
      if (this.listeners.onProgress) {
        this.listeners.onProgress(this.fileId, progress);
      }
    }
  }

  // 上传文件部分
  private uploadPart(
    partInfo: { presignedUrl: string; partNumber: number },
    partIndex: number
  ): Promise<{ etag: string; partNumber: number }> {
    return new Promise((resolve, reject) => {
      if (this.uploadStatus === 'canceled') {
        reject(new Error('Upload canceled'));
        return;
      }

      // 如果这部分已经上传完成，直接返回
      const completed = this.completedParts.find(
        (p) => p.partNumber === partInfo.partNumber
      );
      if (completed) {
        resolve(completed);
        return;
      }

      const xhr = new XMLHttpRequest();
      const abortController = new AbortController();
      this.uploadAbortControllers.push(abortController);

      // 监听中止事件
      abortController.signal.addEventListener('abort', () => {
        xhr.abort();

        // 只有在取消而不是暂停的情况下才拒绝Promise
        if (this.uploadStatus === 'canceled') {
          reject(new Error('Upload canceled'));
        }
      });

      // 监控上传进度
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && this.uploadStatus === 'uploading') {
          // 计算整体进度 - 已完成部分 + 当前部分的进度
          const completedWeight =
            this.completedParts.length / this.presignedUrlList.length;
          const currentPartProgress =
            event.loaded / event.total / this.presignedUrlList.length;
          const totalProgress = Math.floor(
            (completedWeight + currentPartProgress) * 100
          );
          this.setProgress(totalProgress);
        }
      };

      xhr.open('PUT', partInfo.presignedUrl, true);
      xhr.setRequestHeader('Content-Type', this.file.type);

      xhr.onload = () => {
        // 从控制器数组中移除
        const index = this.uploadAbortControllers.indexOf(abortController);
        if (index > -1) {
          this.uploadAbortControllers.splice(index, 1);
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          // 获取ETag
          const etag =
            xhr.getResponseHeader('ETag') ||
            xhr.getResponseHeader('etag') ||
            xhr.getResponseHeader('Etag') ||
            '';

          const result = {
            etag: etag.replace(/"/g, ''),
            partNumber: partInfo.partNumber,
          };

          // 添加到已完成部分
          this.completedParts.push(result);

          // 更新进度
          if (this.uploadStatus === 'uploading') {
            this.setProgress(
              Math.floor(
                (this.completedParts.length / this.presignedUrlList.length) *
                  100
              )
            );
          }

          resolve(result);
        } else {
          if (
            this.uploadStatus !== 'canceled' &&
            this.uploadStatus !== 'paused'
          ) {
            this.setStatus('error');
            const error = new Error(`Upload failed with status: ${xhr.status}`);
            this.uploadError = error;
            reject(error);
          } else {
            reject(new Error(`Upload ${this.uploadStatus}`));
          }
        }
      };

      xhr.onerror = () => {
        // 从控制器数组中移除
        const index = this.uploadAbortControllers.indexOf(abortController);
        if (index > -1) {
          this.uploadAbortControllers.splice(index, 1);
        }

        if (
          this.uploadStatus !== 'canceled' &&
          this.uploadStatus !== 'paused'
        ) {
          this.setStatus('error');
          const error = new Error('Network error during upload');
          this.uploadError = error;
          reject(error);
        } else {
          reject(new Error(`Upload ${this.uploadStatus}`));
        }
      };

      xhr.send(this.slicedFileList[partIndex]);
    });
  }

  // 完成上传过程
  private async completeUpload() {
    try {
      // 构建完成请求参数
      const completeParams = {
        key: this.key,
        uploadId: this.uploadId,
        parts: this.completedParts.sort((a, b) => a.partNumber - b.partNumber),
        fileName: this.file.name,
        fileSize: this.file.size,
        mimeType: this.file.type,
      };

      // 通知服务器所有部分已上传完成
      const completeResponse = await fetch('/api/completed-multi-part-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeParams),
      });

      const completeResult = await completeResponse.json();

      if (completeResult.code !== 200) {
        console.error('Failed to complete upload:', completeResult);
        this.setStatus('error');
        const error = new Error('Upload failed during completion');
        this.uploadError = error;
        throw error;
      }

      const result: FileUploadResult = {
        fileUrl: completeResult.fileUrl,
        fileKey: this.key,
        fileName: this.file.name,
        fileSize: this.file.size,
        mimeType: this.file.type,
        parts: this.completedParts,
      };

      this.uploadResult = result;
      this.setStatus('completed');

      if (this.listeners.onComplete) {
        this.listeners.onComplete(this.fileId, result);
      }

      return result;
    } catch (error) {
      this.setStatus('error');
      this.uploadError = error as Error;

      if (this.listeners.onError) {
        this.listeners.onError(this.fileId, error as Error);
      }

      throw error;
    }
  }

  // 初始化上传获取预签名URL
  private async initializeUpload() {
    try {
      // 获取分段上传的预签名URL
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
                mimeType: this.file.type,
                fileSize: this.file.size,
                fileName: this.file.name,
              },
            ],
          }),
        }
      );

      const presignedUrlJson = await presignedUrlResponse.json();

      if (presignedUrlJson.code !== 200 || !presignedUrlJson.data) {
        console.error('Failed to get presigned URL:', presignedUrlJson);
        this.setStatus('error');
        const error = new Error('Failed to get upload URL');
        this.uploadError = error;
        throw error;
      }

      // 保存上传信息
      const { key, uploadId, presignedUrlList } = presignedUrlJson.data;
      this.key = key;
      this.uploadId = uploadId;
      this.presignedUrlList = presignedUrlList;

      // 切片文件
      this.slicedFileList = sliceFileToMultipart(this.file);

      return { key, uploadId, presignedUrlList };
    } catch (error) {
      this.setStatus('error');
      this.uploadError = error as Error;

      if (this.listeners.onError) {
        this.listeners.onError(this.fileId, error as Error);
      }

      throw error;
    }
  }

  // 开始或恢复上传过程
  private async startUpload(isResume = false) {
    try {
      if (!isResume) {
        await this.initializeUpload();
      }

      // 过滤出未完成的部分
      const remainingParts = this.presignedUrlList.filter(
        (part) =>
          !this.completedParts.some(
            (completed) => completed.partNumber === part.partNumber
          )
      );

      // 创建上传Promise数组
      const uploadPromises = remainingParts.map((part) => {
        const globalIndex = this.presignedUrlList.findIndex(
          (p) => p.partNumber === part.partNumber
        );
        return this.uploadPart(part, globalIndex);
      });

      // 等待所有部分上传完成
      const results = await Promise.all(uploadPromises);

      // 添加到已完成部分
      results.forEach((result) => {
        if (
          !this.completedParts.some((p) => p.partNumber === result.partNumber)
        ) {
          this.completedParts.push(result);
        }
      });

      // 完成上传
      const finalResult = await this.completeUpload();
      this.resolveResult(finalResult);
      return finalResult;
    } catch (error) {
      if (this.uploadStatus !== 'paused' && this.uploadStatus !== 'canceled') {
        this.setStatus('error');
        this.uploadError = error as Error;
        this.rejectResult(error as Error);

        if (this.listeners.onError) {
          this.listeners.onError(this.fileId, error as Error);
        }
      }
      throw error;
    }
  }

  // 启动上传过程
  public async upload() {
    if (this.uploadStatus !== 'pending' && this.uploadStatus !== 'paused') {
      return this.resultPromise;
    }

    this.setStatus('uploading');

    try {
      return await this.startUpload(this.uploadStatus === 'paused');
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  // 暂停上传
  private pause() {
    if (this.uploadStatus === 'uploading') {
      this.setStatus('paused');
      // 中止当前正在进行的上传请求，但不取消整个上传
      this.uploadAbortControllers.forEach((controller) => controller.abort());
      this.uploadAbortControllers = [];
    }
  }

  // 恢复上传
  private resume() {
    if (this.uploadStatus !== 'paused') return this.resultPromise;

    this.setStatus('uploading');
    return this.startUpload(true);
  }

  // 取消上传
  private async cancel() {
    if (this.uploadStatus === 'completed' || this.uploadStatus === 'canceled') {
      return;
    }

    this.setStatus('canceled');

    // 中止所有进行中的上传
    this.uploadAbortControllers.forEach((controller) => controller.abort());
    this.uploadAbortControllers = [];

    // 如果已经有uploadId，调用API取消上传（清理S3上的部分上传）
    if (this.uploadId && this.key) {
      try {
        await fetch('/api/cancel-multi-part-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: this.key, uploadId: this.uploadId }),
        });
      } catch (error) {
        console.error('Failed to cancel multipart upload:', error);
      }
    }

    this.rejectResult(new Error('Upload canceled'));
  }
}

// 上传管理器配置接口
export interface FileUploadManagerConfig {
  maxConcurrentUploads?: number;
  listeners?: FileUploadListeners;
}

// 文件上传管理器类 - 处理多个文件上传
export class FileUploadManager {
  private uploaders: Map<string, FileUploader> = new Map();
  private controllers: Map<string, UploadController> = new Map();
  private queue: string[] = [];
  private activeUploads = 0;
  private config: FileUploadManagerConfig;

  constructor(config: FileUploadManagerConfig = {}) {
    this.config = {
      maxConcurrentUploads: 3,
      ...config,
    };
  }

  // 添加文件到上传队列
  public addFile(file: File): string {
    const fileId = nanoid();
    const uploader = new FileUploader(file, fileId, this.config.listeners);
    const controller = uploader.getController();

    this.uploaders.set(fileId, uploader);
    this.controllers.set(fileId, controller);
    this.queue.push(fileId);

    // 如果可以立即上传，则开始上传
    this.processQueue();

    return fileId;
  }

  // 添加多个文件到上传队列
  public addFilesList(files: File[]): string[] {
    const fileIds = files.map((file) => this.addFile(file));
    return fileIds;
  }

  // 处理上传队列
  private async processQueue() {
    // 如果达到最大并发上传数，等待
    if (this.activeUploads >= (this.config.maxConcurrentUploads || 3)) {
      return;
    }

    // 从队列中获取下一个文件
    const nextFileId = this.queue.shift();
    if (!nextFileId) {
      return;
    }

    const uploader = this.uploaders.get(nextFileId);
    if (!uploader) {
      return;
    }

    this.activeUploads++;

    try {
      await uploader.upload();
    } catch (error) {
      // 错误已在上传器中处理
    } finally {
      this.activeUploads--;
      // 继续处理队列
      this.processQueue();
    }
  }

  // 获取特定文件的上传控制器
  public getController(fileId: string): UploadController | undefined {
    return this.controllers.get(fileId);
  }

  // 获取所有上传控制器
  public getAllControllers(): Map<string, UploadController> {
    return this.controllers;
  }

  // 暂停所有上传
  public pauseAll() {
    this.controllers.forEach((controller) => {
      if (controller.getStatus() === 'uploading') {
        controller.pause();
      }
    });
  }

  // 恢复所有上传
  public resumeAll() {
    this.controllers.forEach((controller) => {
      if (controller.getStatus() === 'paused') {
        controller.resume().catch((error) => {
          console.error('Failed to resume upload:', error);
        });
      }
    });
  }

  // 取消所有上传
  public async cancelAll() {
    const cancelPromises: Promise<void>[] = [];

    this.controllers.forEach((controller) => {
      if (['uploading', 'paused', 'pending'].includes(controller.getStatus())) {
        cancelPromises.push(controller.cancel());
      }
    });

    await Promise.all(cancelPromises);

    // 清空队列
    this.queue = [];
  }

  // 获取总体上传进度
  public getTotalProgress(): number {
    if (this.controllers.size === 0) return 0;

    let totalProgress = 0;
    this.controllers.forEach((controller) => {
      totalProgress += controller.getProgress();
    });

    return Math.floor(totalProgress / this.controllers.size);
  }

  // 等待所有上传完成
  public async waitForAll(): Promise<FileUploadResult[]> {
    const resultPromises = Array.from(this.controllers.values()).map(
      (controller) => controller.getResult()
    );

    const results = await Promise.all(resultPromises);
    return results.filter(Boolean) as FileUploadResult[];
  }
}

// 示例用法
export const createFileUploader = (
  files: File[],
  { onProgress, onStatusChange, onComplete, onError }: FileUploadListeners = {}
): {
  uploadManager: FileUploadManager;
  fileIds: string[];
} => {
  const uploadManager = new FileUploadManager({
    maxConcurrentUploads: 3,
    listeners: {
      onProgress,
      onStatusChange,
      onComplete,
      onError,
    },
  });

  const fileIds = uploadManager.addFilesList(files);

  return {
    uploadManager,
    fileIds,
  };
};
