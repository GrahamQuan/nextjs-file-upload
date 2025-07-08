import { getFileNameFromUrl } from '@/lib/file-utils';
import { useCallback, useState } from 'react';

export default function useFileDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const fileDownload = useCallback(
    async (url: string) => {
      try {
        setIsDownloading(true);
        // add timestamp to url to avoid browser cache and CORS
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
        setIsDownloading(false);
      } catch (error) {
        console.error('download file error:', error);
      } finally {
        setIsDownloading(false);
      }
    },
    [setIsDownloading]
  );

  return { isDownloading, fileDownload };
}
