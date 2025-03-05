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

export async function fileDownload(url: string) {
  try {
    // add timestamp to url to avoid browser cache
    const response = await fetch(`${url}?t=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getFileNameFromUrl(url);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('download file error:', error);
    throw error;
  }
}
