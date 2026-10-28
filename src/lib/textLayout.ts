import { LIMITS } from '../domain/constants';
import { clamp } from './number';
import type { FontFamily, TextItem } from '../domain/types';

type SegmenterCtor = new (
  locales?: string | string[],
  options?: { granularity: 'grapheme' },
) => { segment(input: string): Iterable<{ segment: string }> };

function splitGraphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  if (!Seg) return Array.from(text);
  return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment);
}

const CJK_RE = /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/;

function canvasFontFamily(fontFamily: FontFamily): string {
  return fontFamily.includes(' ') ? `'${fontFamily}'` : fontFamily;
}

/** 공백 단위 + CJK 문자 단위로 분할 → word-wrap 기반. */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let buffer = '';

  for (const g of splitGraphemes(text)) {
    if (CJK_RE.test(g)) {
      if (buffer) { tokens.push(buffer); buffer = ''; }
      tokens.push(g);
    } else if (g === ' ') {
      buffer += g;
      tokens.push(buffer);
      buffer = '';
    } else {
      buffer += g;
    }
  }
  if (buffer) tokens.push(buffer);
  return tokens;
}

function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = '';

  for (const token of tokenize(text)) {
    const candidate = current + token;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      const trimmed = current.trimEnd();
      if (trimmed) lines.push(trimmed);
      current = token.trimStart();
    } else {
      current = candidate;
    }
  }
  if (current.trim()) lines.push(current.trimEnd());
  return lines.length > 0 ? lines : [''];
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  content: string,
  maxWidth: number,
): string[] {
  return content.split('\n').flatMap((p) =>
    p === '' ? [''] : wrapParagraph(ctx, p, maxWidth),
  );
}

export interface TextMeasurement {
  fontSize: number;
  lineHeight: number;
  lines: string[];
  left: number;
  top: number;
  width: number;
  height: number;
}

export function measureTextItem(
  ctx: CanvasRenderingContext2D,
  item: TextItem,
  W: number,
  H: number,
): TextMeasurement {
  const fontSize = clamp(item.fontSize, LIMITS.minFontSize, LIMITS.maxFontSize) * W;
  const lineHeight = clamp(item.lineHeight, LIMITS.minLineHeight, LIMITS.maxLineHeight);
  const x = clamp(item.x, 0, 1) * W;
  const top = clamp(item.y, 0, 1) * H;

  ctx.save();
  ctx.font = `${item.weight} ${fontSize}px ${canvasFontFamily(item.fontFamily ?? 'system-ui')}, sans-serif`;
  const lines = wrapText(ctx, item.content, W * 0.95);
  const maxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
  ctx.restore();

  const left = item.align === 'center' ? x - maxWidth / 2
    : item.align === 'right' ? x - maxWidth
      : x;
  const step = fontSize * lineHeight;

  return {
    fontSize,
    lineHeight,
    lines,
    left,
    top,
    width: maxWidth,
    height: Math.max(lines.length * step, fontSize),
  };
}

export function drawTextItem(
  ctx: CanvasRenderingContext2D,
  item: TextItem,
  W: number,
  H: number,
): void {
  if (item.content.trim() === '') return;

  const measurement = measureTextItem(ctx, item, W, H);
  const x = clamp(item.x, 0, 1) * W;
  const y = clamp(item.y, 0, 1) * H;

  ctx.save();
  ctx.font = `${item.weight} ${measurement.fontSize}px ${canvasFontFamily(item.fontFamily ?? 'system-ui')}, sans-serif`;
  ctx.fillStyle = item.color;
  ctx.textAlign = item.align;
  ctx.textBaseline = 'top';

  const step = measurement.fontSize * measurement.lineHeight;
  measurement.lines.forEach((line, i) => ctx.fillText(line, x, y + i * step));

  ctx.restore();
}
