/**
 * 사각형 선택 영역 도메인 로직 (DOM 비의존 순수 함수).
 *
 * 좌표계: 선택 영역은 **이미지 기준 0~1 정규화 좌표**로 보관한다.
 * (기존 잘라내기 cropRect와 동일한 규약 → 캔버스 크기·DPR·비율 변경과 무관)
 */

export interface Point {
  x: number;
  y: number;
}

/** 이미지 기준 정규화 사각형 (x, y, width, height 모두 0~1). */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 이미지 원본 픽셀 단위 정수 사각형. */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 캔버스 상에서 이미지가 그려진 박스 (renderer.imageDisplayBox 결과와 동일한 형태). */
export interface DisplayBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 배경 제거를 허용하는 최소 선택 크기 (원본 픽셀 기준, TEST-09). */
export const MIN_SELECTION_PX = 10;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/**
 * 드래그 시작점·현재점(캔버스 픽셀)으로 이미지 기준 정규화 사각형을 만든다.
 * - 드래그 방향(좌상→우하, 우하→좌상 등)과 무관하게 동일한 결과
 * - 이미지 바깥으로 벗어난 부분은 이미지 경계로 잘라낸다
 * - 이미지와 겹치지 않거나 넓이가 0이면 null
 */
export function rectFromDrag(start: Point, end: Point, box: DisplayBox): SelectionRect | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const toNorm = (p: Point) => ({
    x: (p.x - box.left) / box.width,
    y: (p.y - box.top) / box.height,
  });
  const a = toNorm(start);
  const b = toNorm(end);
  const left = clamp01(Math.min(a.x, b.x));
  const right = clamp01(Math.max(a.x, b.x));
  const top = clamp01(Math.min(a.y, b.y));
  const bottom = clamp01(Math.max(a.y, b.y));
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { x: left, y: top, width, height };
}

/** 정규화 사각형 → 원본 이미지 픽셀 사각형 (경계 안쪽으로 보정된 정수). */
export function toPixelRect(rect: SelectionRect, imageWidth: number, imageHeight: number): PixelRect {
  const x = Math.max(0, Math.floor(rect.x * imageWidth));
  const y = Math.max(0, Math.floor(rect.y * imageHeight));
  const right = Math.min(imageWidth, Math.ceil((rect.x + rect.width) * imageWidth));
  const bottom = Math.min(imageHeight, Math.ceil((rect.y + rect.height) * imageHeight));
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/** 정규화 사각형 → 캔버스 좌표 (선택 박스 시각화용). */
export function toDisplayRect(rect: SelectionRect, box: DisplayBox): DisplayBox {
  return {
    left: box.left + rect.x * box.width,
    top: box.top + rect.y * box.height,
    width: rect.width * box.width,
    height: rect.height * box.height,
  };
}

export type SelectionCheck =
  | { ok: true; pixelRect: PixelRect }
  | { ok: false; reason: string };

export const SELECTION_MESSAGES = {
  noImage: '먼저 이미지를 불러오세요.',
  noSelection: '선택된 영역이 없습니다.',
  tooSmall: `선택 영역이 너무 작습니다. (최소 ${MIN_SELECTION_PX}×${MIN_SELECTION_PX}px)`,
} as const;

/** 배경 제거 실행 전 입력 검증 (TEST-05, TEST-09). 예외를 던지지 않는다. */
export function checkSelection(
  rect: SelectionRect | null,
  image: { width: number; height: number } | null,
): SelectionCheck {
  if (!image || image.width <= 0 || image.height <= 0) return { ok: false, reason: SELECTION_MESSAGES.noImage };
  if (!rect) return { ok: false, reason: SELECTION_MESSAGES.noSelection };
  const pixelRect = toPixelRect(rect, image.width, image.height);
  if (pixelRect.width < MIN_SELECTION_PX || pixelRect.height < MIN_SELECTION_PX) {
    return { ok: false, reason: SELECTION_MESSAGES.tooSmall };
  }
  return { ok: true, pixelRect };
}
