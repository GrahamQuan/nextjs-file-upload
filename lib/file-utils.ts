export function createDateFolderPath() {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function getFileExtensionByMimeType(mimeType: string) {
  return mimeType.split('/')[1];
}

export function sliceFileToMultipart(
  file: File,
  sliceSize: number = 5 * 1024 * 1024
): Blob[] {
  const totalSize = file.size;
  const totalSlices = Math.ceil(totalSize / sliceSize);
  const slices = [];

  for (let i = 0; i < totalSlices; i++) {
    const start = i * sliceSize;
    const end = start + sliceSize;
    const slice = file.slice(start, end);
    slices.push(slice);
  }

  return slices;
}

export function getFileNameFromUrl(url: string) {
  return url.split('/').pop() || '';
}

function getMimeTypeFromExtension(extension: string): string {
  const commonMimeTypes: Record<string, string> = {
    // 图片
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // 文档
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // 音频
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    // 视频
    mp4: 'video/mp4',
    webm: 'video/webm',
    // 压缩文件
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    // 文本
    txt: 'text/plain',
    csv: 'text/csv',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
  };

  return commonMimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// export async function fileDownload(
//   fileUrl: string,
//   filename?: string
// ): Promise<void> {
//   try {
//     // 发起fetch请求获取文件数据
//     const response = await fetch(fileUrl);

//     // 检查响应状态
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     // 将响应转换为Blob对象
//     const blob = await response.blob();

//     // 创建临时URL
//     const downloadUrl = URL.createObjectURL(blob);

//     // 创建下载链接
//     const link = document.createElement('a');
//     link.href = downloadUrl;
//     link.download = filename || getFileNameFromUrl(fileUrl);

//     // 触发下载
//     document.body.appendChild(link);
//     link.click();

//     // 清理资源
//     document.body.removeChild(link);
//     URL.revokeObjectURL(downloadUrl);
//   } catch (error) {
//     console.error('下载文件时出错:', error);
//     throw error;
//   }
// }

export function fileDownload(fileUrl: string, filename?: string) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', fileUrl, true);
  xhr.responseType = 'blob';

  xhr.onload = function () {
    if (xhr.status === 200 || xhr.status === 304) {
      const blob = xhr.response;
      const downloadUrl = URL.createObjectURL(blob); // 从Blob创建一个URL
      console.log(`fileurl:${downloadUrl}`);

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || getFileNameFromUrl(fileUrl); // 设置文件名
      document.body.appendChild(a);
      a.click(); // 模拟点击实现下载

      // 清理资源
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl); // 释放URL对象占用的资源
    }
  };

  xhr.send();
}
