/**
 * 执行带重试的fetch请求，针对文件上传进行了优化
 * @param url 请求URL
 * @param options fetch选项
 * @param retries 重试次数
 * @param parseResponse 如何处理响应的函数，默认返回原始响应
 * @param partInfo 可选的分片信息，用于日志记录
 * @returns 处理后的响应
 */
export const fetchWithRetry = async <T>({
  url,
  options,
  retries = 3,
  parseResponse = async (response: Response) => response as unknown as T,
  partInfo,
}: {
  url: string;
  options: RequestInit;
  retries?: number;
  parseResponse?: (response: Response) => Promise<T>;
  partInfo?: { partNumber?: number; fileName?: string; totalParts?: number };
}) => {
  const logPrefix = partInfo
    ? `[File: ${partInfo.fileName || 'unknown'}${
        partInfo.partNumber
          ? `, Part ${partInfo.partNumber}/${partInfo.totalParts || '?'}`
          : ''
      }]`
    : '[Fetch]';

  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      // 添加指数退避策略，每次重试等待时间增加
      if (i > 0) {
        const delayMs = Math.min(1000 * Math.pow(2, i - 1), 10000); // 最大10秒
        console.log(
          `${logPrefix} Retry ${i + 1}/${retries} after ${delayMs}ms delay`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const response = await fetch(url, options);

      if (response.ok) {
        if (partInfo?.partNumber) {
          console.log(`${logPrefix} Upload successful (${response.status})`);
        }
        return await parseResponse(response);
      }

      // 记录失败情况
      const errorText = `Status: ${response.status} ${response.statusText}`;
      console.warn(`${logPrefix} Request failed: ${errorText}`);
      lastError = new Error(errorText);

      // 对于某些特定状态码，我们可以立即停止尝试
      if (response.status === 403 || response.status === 401) {
        console.error(`${logPrefix} Authentication error, stopping retries`);
        throw lastError;
      }
    } catch (error) {
      console.error(`${logPrefix} Fetch attempt ${i + 1} failed:`, error);
      lastError = error;
    }
  }

  throw (
    lastError ||
    new Error(`${logPrefix} Failed to fetch data after ${retries} attempts`)
  );
};

/**
 * 专门用于文件分片上传的辅助函数
 */
export const uploadFilePart = async ({
  url,
  fileChunk,
  contentType,
  partNumber,
  fileName,
  totalParts,
  retries = 3,
}: {
  url: string;
  fileChunk: Blob;
  contentType: string;
  partNumber: number;
  fileName?: string;
  totalParts?: number;
  retries?: number;
}) => {
  const result = await fetchWithRetry({
    url,
    options: {
      method: 'PUT',
      body: fileChunk,
      headers: {
        'Content-Type': contentType,
      },
    },
    retries,
    // 对于上传，我们需要获取原始 ETag（保留引号）
    parseResponse: async (response) => {
      // 获取原始 ETag 值
      let etag = response.headers.get('ETag');

      // 如果获取不到 ETag，尝试其他大小写变体
      if (!etag) {
        etag =
          response.headers.get('etag') ||
          response.headers.get('Etag') ||
          response.headers.get('ETAG');
      }

      // 打印所有头信息，便于调试
      console.log(`Response headers for part ${partNumber}:`);
      response.headers.forEach((value, key) => {
        console.log(`${key}: ${value}`);
      });

      // 如果仍然没有 ETag，则生成一个模拟的 ETag
      // 注意：这只是为了调试/开发目的，实际生产环境应该使用实际的 ETag
      if (!etag) {
        console.warn(
          `No ETag found in response headers for part ${partNumber}. Using fallback.`
        );
        etag = `"part${partNumber}-${Date.now()}"`;
      }

      console.log(`Part ${partNumber} uploaded with ETag: ${etag}`);

      return {
        response,
        etag, // 保留原始 ETag 格式，包括引号
        partNumber,
      };
    },
    partInfo: {
      partNumber,
      fileName,
      totalParts,
    },
  });

  return result;
};
