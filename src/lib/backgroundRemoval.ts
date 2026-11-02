/**
 * 선택 영역 배경 제거 알고리즘 (DOM 비의존 → Node/vitest에서 그대로 검증 가능).
 *
 * 동작
 *  1. 선택 영역 **테두리 픽셀**에서 가장 많이 나타나는 색을 배경색으로 추정한다.
 *  2. 테두리 중 배경색과 가까운 픽셀을 시작점으로, 선택 영역 안에서만 flood fill 한다.
 *  3. 도달한 픽셀의 알파를 0으로 만든다 (투명화).
 *
 * 테두리와 연결된 배경만 지우므로, 영역 가운데 놓인 피사체 내부의 비슷한 색은 보존된다.
 * 큰 영역에서도 UI가 멈추지 않도록 일정 픽셀마다 이벤트 루프에 양보한다 (TEST-08).
 */
import type { PixelRect } from '../domain/selection';

/** ImageData와 호환되는 최소 구조 (테스트에서 직접 생성 가능). */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface RemovalOptions {
  /** 배경색과의 허용 색 거리 (RGB 유클리드, 0~441). 기본 48. */
  tolerance?: number;
  /** 한 번에 처리할 픽셀 수. 이후 이벤트 루프에 양보한다. */
  chunkSize?: number;
  /** 0~1 진행률 콜백. */
  onProgress?: (ratio: number) => void;
  /** 이벤트 루프 양보 함수 (테스트 주입용). */
  yieldFn?: () => Promise<void>;
}

export interface RemovalResult {
  /** 투명화된 픽셀 수. */
  removed: number;
  /** 추정된 배경색 [r, g, b]. 선택 영역이 이미 투명하면 null. */
  background: [number, number, number] | null;
}

export const DEFAULT_TOLERANCE = 48;
const DEFAULT_CHUNK = 40_000;

export const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/** 선택 영역을 버퍼 경계 안으로 보정한다. 겹치는 부분이 없으면 null. */
export function clampRect(rect: PixelRect, width: number, height: number): PixelRect | null {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const right = Math.min(width, Math.floor(rect.x + rect.width));
  const bottom = Math.min(height, Math.floor(rect.y + rect.height));
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/** 사각형 테두리 픽셀 인덱스(버퍼 내 픽셀 번호)를 중복 없이 나열한다. */
export function borderPixels(rect: PixelRect, bufferWidth: number): number[] {
  const { x, y, width, height } = rect;
  const out: number[] = [];
  const right = x + width - 1;
  const bottom = y + height - 1;
  for (let cx = x; cx <= right; cx++) {
    out.push(y * bufferWidth + cx);
    if (bottom !== y) out.push(bottom * bufferWidth + cx);
  }
  for (let cy = y + 1; cy < bottom; cy++) {
    out.push(cy * bufferWidth + x);
    if (right !== x) out.push(cy * bufferWidth + right);
  }
  return out;
}

/**
 * 테두리 픽셀의 최빈 색(4비트 양자화 버킷)을 구한 뒤, 그 버킷의 실제 평균색을 배경색으로 반환.
 * 완전 투명 픽셀은 제외한다.
 */
export function estimateBackground(buf: PixelBuffer, rect: PixelRect): [number, number, number] | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (const p of borderPixels(rect, buf.width)) {
    const i = p * 4;
    if (buf.data[i + 3] === 0) continue;
    const r = buf.data[i], g = buf.data[i + 1], b = buf.data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n++; bucket.r += r; bucket.g += g; bucket.b += b;
    buckets.set(key, bucket);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) if (!best || bucket.n > best.n) best = bucket;
  if (!best) return null;
  return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
}

function colorDistanceSq(data: Uint8ClampedArray, i: number, bg: [number, number, number]): number {
  const dr = data[i] - bg[0];
  const dg = data[i + 1] - bg[1];
  const db = data[i + 2] - bg[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * 버퍼를 **제자리에서** 수정해 선택 영역의 배경을 투명화한다.
 * 잘못된 영역(0 크기, 버퍼 밖)은 예외 없이 removed: 0 으로 끝난다 (TEST-09).
 */
export async function removeBackgroundInRect(
  buf: PixelBuffer,
  rect: PixelRect,
  options: RemovalOptions = {},
): Promise<RemovalResult> {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const chunkSize = Math.max(1, options.chunkSize ?? DEFAULT_CHUNK);
  const yieldFn = options.yieldFn ?? yieldToEventLoop;
  const { data, width } = buf;

  const area = clampRect(rect, buf.width, buf.height);
  if (!area) { options.onProgress?.(1); return { removed: 0, background: null }; }

  const background = estimateBackground(buf, area);
  if (!background) { options.onProgress?.(1); return { removed: 0, background: null }; }

  const tolSq = tolerance * tolerance;
  const total = area.width * area.height;
  const right = area.x + area.width;
  const bottom = area.y + area.height;
  // 영역 내부 로컬 인덱스 기준 방문 표시 (영역 크기만큼만 할당 → 메모리 절약, TEST-10)
  const visited = new Uint8Array(total);
  const local = (p: number) => (Math.floor(p / width) - area.y) * area.width + ((p % width) - area.x);

  const stack: number[] = [];
  const tryPush = (p: number) => {
    const l = local(p);
    if (visited[l]) return;
    visited[l] = 1;
    const i = p * 4;
    if (data[i + 3] !== 0 && colorDistanceSq(data, i, background) > tolSq) return;
    stack.push(p);
  };

  for (const p of borderPixels(area, width)) tryPush(p);

  let removed = 0;
  let processed = 0;
  while (stack.length > 0) {
    const p = stack.pop()!;
    const i = p * 4;
    if (data[i + 3] !== 0) { data[i + 3] = 0; removed++; }
    const px = p % width;
    const py = (p - px) / width;
    if (px > area.x) tryPush(p - 1);
    if (px < right - 1) tryPush(p + 1);
    if (py > area.y) tryPush(p - width);
    if (py < bottom - 1) tryPush(p + width);

    if (++processed % chunkSize === 0) {
      options.onProgress?.(Math.min(0.99, processed / total));
      await yieldFn();
    }
  }

  options.onProgress?.(1);
  return { removed, background };
}
