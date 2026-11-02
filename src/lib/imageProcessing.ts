/**
 * 브라우저(Canvas) 어댑터: HTMLImageElement ↔ 픽셀 버퍼 ↔ PNG dataURL.
 * 실제 알고리즘은 backgroundRemoval.ts(순수 함수)에 있다.
 */
import { removeBackgroundInRect, type RemovalOptions, type RemovalResult } from './backgroundRemoval';
import type { PixelRect } from '../domain/selection';

export interface ProcessedImage extends RemovalResult {
  /** 알파 채널이 보존되는 PNG dataURL. */
  dataUrl: string;
  width: number;
  height: number;
}

export async function removeBackgroundFromImage(
  image: HTMLImageElement,
  rect: PixelRect,
  options: RemovalOptions = {},
): Promise<ProcessedImage> {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  try {
    // willReadFrequently: getImageData 성능 힌트
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D context unavailable');
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, height);
    const result = await removeBackgroundInRect(imageData, rect, options);
    ctx.putImageData(imageData, 0, 0);

    // JPEG 등 알파 없는 포맷으로 저장하면 투명도가 사라지므로 반드시 PNG
    return { ...result, dataUrl: canvas.toDataURL('image/png'), width, height };
  } finally {
    // 대형 캔버스 백버퍼를 즉시 해제 (반복 실행 시 메모리 누적 방지, TEST-10)
    canvas.width = 0;
    canvas.height = 0;
  }
}
