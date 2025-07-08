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
