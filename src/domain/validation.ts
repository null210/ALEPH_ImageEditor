import { DEFAULTS, LIMITS } from './constants';
import { createId } from './id';
import { clamp } from '../lib/number';
import type { Align, FontFamily, Ratio, TemplatePayload, TextItem } from './types';

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export type ImageKind = 'png' | 'jpeg';
export type ImageValidation =
  | { ok: true; kind: ImageKind }
  | { ok: false; reason: string };

const PNG_SIG  = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIG = [0xff, 0xd8, 0xff];

const startsWith = (bytes: Uint8Array, sig: number[]): boolean =>
  sig.every((b, i) => bytes[i] === b);

/** MIME/확장자가 아닌 매직 바이트로 파일 종류 판정. */
export async function validateImageFile(file: File): Promise<ImageValidation> {
  if (file.size === 0) return { ok: false, reason: '빈 파일입니다.' };
  if (file.size > LIMITS.maxFileBytes) return { ok: false, reason: '20MB를 초과합니다.' };

  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (startsWith(head, PNG_SIG)) return { ok: true, kind: 'png' };
  if (startsWith(head, JPEG_SIG)) return { ok: true, kind: 'jpeg' };
  return { ok: false, reason: 'PNG 또는 JPEG만 지원합니다.' };
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;

const isRatio = (x: unknown): x is Ratio =>
  x === '1:1' || x === '4:5' || x === '9:16';

const isAlign = (x: unknown): x is Align =>
  x === 'left' || x === 'center' || x === 'right';

const isWeight = (x: unknown): x is 400 | 700 => x === 400 || x === 700;
const isHexColor = (x: unknown): x is string => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x);
const FONT_FAMILIES: FontFamily[] = ['system-ui', 'Arial', 'Georgia', 'Times New Roman', 'Courier New'];
const isFontFamily = (x: unknown): x is FontFamily => typeof x === 'string' && FONT_FAMILIES.includes(x as FontFamily);

function parseTextItem(raw: unknown, i: number): Result<TextItem> {
  if (!isRecord(raw)) return { ok: false, errors: [`texts[${i}]가 객체가 아닙니다.`] };

  const { content, x, y, fontSize, color, fontFamily, align, weight, lineHeight } = raw;

  if (typeof content !== 'string')      return { ok: false, errors: [`texts[${i}].content`] };
  if (content.length > LIMITS.maxContentLength)
    return { ok: false, errors: [`texts[${i}].content 길이 초과`] };
  if (typeof x !== 'number')            return { ok: false, errors: [`texts[${i}].x`] };
  if (typeof y !== 'number')            return { ok: false, errors: [`texts[${i}].y`] };
  if (typeof fontSize !== 'number')     return { ok: false, errors: [`texts[${i}].fontSize`] };
  if (!isHexColor(color))               return { ok: false, errors: [`texts[${i}].color 형식 오류`] };
  if (fontFamily !== undefined && !isFontFamily(fontFamily))
    return { ok: false, errors: [`texts[${i}].fontFamily`] };
  if (!isAlign(align))                  return { ok: false, errors: [`texts[${i}].align`] };
  if (!isWeight(weight))                return { ok: false, errors: [`texts[${i}].weight`] };
  if (typeof lineHeight !== 'number')   return { ok: false, errors: [`texts[${i}].lineHeight`] };

  return {
    ok: true,
    value: {
      id: createId(),
      content,
      x: clamp(x, 0, 1),
      y: clamp(y, 0, 1),
      fontSize: clamp(fontSize, LIMITS.minFontSize, LIMITS.maxFontSize),
      color,
      fontFamily: isFontFamily(fontFamily) ? fontFamily : DEFAULTS.fontFamily,
      align,
      weight,
      lineHeight: clamp(lineHeight, LIMITS.minLineHeight, LIMITS.maxLineHeight),
    },
  };
}

/** 손상/필수 누락 JSON을 사유별로 수집해 Result로 반환. */
export function parseTemplatePayload(raw: string): Result<TemplatePayload> {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ['JSON을 해석할 수 없습니다.'] };
  }

  if (!isRecord(json))     return { ok: false, errors: ['최상위가 객체가 아닙니다.'] };
  if (json.version !== 1)  return { ok: false, errors: [`지원하지 않는 version: ${String(json.version)}`] };
  if (!isRatio(json.ratio))return { ok: false, errors: ['ratio 값이 올바르지 않습니다.'] };
  if (!Array.isArray(json.texts)) return { ok: false, errors: ['texts가 배열이 아닙니다.'] };
  if (json.texts.length > LIMITS.maxTexts)
    return { ok: false, errors: [`texts는 ${LIMITS.maxTexts}개 이하여야 합니다.`] };

  const errors: string[] = [];
  const texts: TextItem[] = [];
  json.texts.forEach((rawItem, i) => {
    const res = parseTextItem(rawItem, i);
    if (res.ok) texts.push(res.value);
    else errors.push(...res.errors);
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { version: 1, ratio: json.ratio, texts } };
}
