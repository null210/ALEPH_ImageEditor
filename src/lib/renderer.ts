import { RATIO_DIMS } from '../domain/constants';
import { drawTextItem } from './textLayout';
import type { CloneStroke, Project, SourceImage } from '../domain/types';

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

export interface ImageDisplayBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function imageDisplayBox(
  project: Project,
  image: HTMLImageElement,
  W: number,
  H: number,
): ImageDisplayBox {
  const fit = Math.min(W / image.naturalWidth, H / image.naturalHeight);
  const sizeScale = project.image?.scale ?? 1;
  const width = image.naturalWidth * fit * sizeScale;
  const height = image.naturalHeight * fit * sizeScale;
  const centerX = (project.image?.x ?? 0.5) * W;
  const centerY = (project.image?.y ?? 0.5) * H;
  return { left: centerX - width / 2, top: centerY - height / 2, width, height };
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  project: Project,
  image: HTMLImageElement,
  W: number,
  H: number,
): void {
  const box = imageDisplayBox(project, image, W, H);
  ctx.drawImage(image, box.left, box.top, box.width, box.height);
}

/** 미리보기는 투명 영역을 체커보드로, 내보내기는 실제 투명(알파 0)으로 남긴다. */
export type RenderSurface = 'preview' | 'export';

export type BackgroundMode = 'solid' | 'checker' | 'transparent';

/** 이미지에 투명 픽셀이 있으면 검정 배경을 깔지 않는다 (TEST-07). */
export function backgroundModeFor(project: Project, surface: RenderSurface): BackgroundMode {
  if (!project.image?.hasTransparency) return 'solid';
  return surface === 'export' ? 'transparent' : 'checker';
}

const CHECKER_LIGHT = '#d4d4d4';
const CHECKER_DARK = '#a3a3a3';

function paintBackground(ctx: CanvasRenderingContext2D, mode: BackgroundMode, W: number, H: number): void {
  if (mode === 'transparent') return;
  if (mode === 'solid') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const cell = Math.max(8, Math.round(W / 40));
  ctx.fillStyle = CHECKER_LIGHT;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = CHECKER_DARK;
  for (let y = 0; y < H; y += cell) {
    for (let x = (y / cell) % 2 === 0 ? cell : 0; x < W; x += cell * 2) {
      ctx.fillRect(x, y, cell, cell);
    }
  }
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
  surface: RenderSurface = 'preview',
): void {
  const { width: W, height: H } = target;

  ctx.clearRect(0, 0, W, H);
  paintBackground(ctx, backgroundModeFor(project, surface), W, H);

  if (image) drawContain(ctx, project, image, W, H);

  for (const stroke of project.cloneStrokes ?? []) {
    drawCloneStroke(ctx, project, image, stroke, W, H);
  }

  for (const item of project.texts) drawTextItem(ctx, item, W, H);
}

function drawCloneStroke(
  ctx: CanvasRenderingContext2D,
  project: Project,
  image: HTMLImageElement | null,
  stroke: CloneStroke,
  W: number,
  H: number,
): void {
  if (!image || stroke.dabs.length === 0) return;

  const box = imageDisplayBox(project, image, W, H);
  const dw = box.width;
  const dh = box.height;
  const dx = box.left;
  const dy = box.top;

  for (const dab of stroke.dabs) {
    const destX = dab.x * W;
    const destY = dab.y * H;
    const radius = dab.radius * W;
    const sourceX = stroke.sourceX + (dab.x - stroke.originX);
    const sourceY = stroke.sourceY + (dab.y - stroke.originY);
    const sourceTargetX = sourceX * W;
    const sourceTargetY = sourceY * H;

    const sx = (sourceTargetX - radius - dx) / dw * image.naturalWidth;
    const sy = (sourceTargetY - radius - dy) / dh * image.naturalHeight;
    const sw = (radius * 2) / dw * image.naturalWidth;
    const sh = (radius * 2) / dh * image.naturalHeight;

    if (sx < 0 || sy < 0 || sx + sw > image.naturalWidth || sy + sh > image.naturalHeight) continue;

    ctx.save();
    ctx.beginPath();
    ctx.arc(destX, destY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = dab.opacity;
    ctx.drawImage(image, sx, sy, sw, sh, destX - radius, destY - radius, radius * 2, radius * 2);
    ctx.restore();
  }
}

export type { SourceImage };
