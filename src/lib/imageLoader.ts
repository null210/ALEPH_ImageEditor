export interface LoadedImage {
  element: HTMLImageElement;
  dataUrl: string;
  width: number;
  height: number;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

export function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 디코딩 실패'));
    img.src = dataUrl;
  });
}

export async function loadImageFromFile(file: File): Promise<LoadedImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const element = await decodeImage(dataUrl);
  return { element, dataUrl, width: element.naturalWidth, height: element.naturalHeight };
}
