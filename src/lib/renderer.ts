import { RATIO_DIMS } from '../domain/constants';
import { drawTextItem } from './textLayout';
import type { Project, SourceImage } from '../domain/types';

export interface RenderTarget {
  width: number;
  height: number;
}

/** 비율과 (선택) 기준 폭으로 렌더 타깃 크기를 계산. */
export function targetFor(project: Project, overrideWidth?: number): RenderTarget {
  const { w, h } = RATIO_DIMS[project.ratio];
  const width = Math.round(overrideWidth ?? w);
  return { width, height: Math.round(width * (h / w)) };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  W: number,
  H: number,
): void {
  const scale = Math.max(W / image.naturalWidth, H / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.drawImage(image, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

/**
 * 미리보기·내보내기가 **반드시 이 함수 하나**를 통해 그려야 한다.
 * 좌표가 정규화되어 있어 target 크기가 달라도 시각 결과는 동일하다.
 */
export function renderProject(
  ctx: CanvasRenderingContext2D,
  project: Project,
  image: HTMLImageElement | null,
  target: RenderTarget,
): void {
  const { width: W, height: H } = target;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  if (image) drawCover(ctx, image, W, H);

  for (const item of project.texts) drawTextItem(ctx, item, W, H);
}

export type { SourceImage };
