import type { Ratio } from './types';

export const PROJECT_VERSION = 1 as const;

export const RATIO_DIMS: Record<Ratio, { w: number; h: number }> = {
  '1:1':  { w: 1080, h: 1080 },
  '4:5':  { w: 1080, h: 1350 },
  '9:16': { w: 1080, h: 1920 },
};

export const RATIO_KEYS = Object.keys(RATIO_DIMS) as Ratio[];

export const LIMITS = {
  maxFileBytes: 20 * 1024 * 1024,
  maxTexts: 100,
  maxContentLength: 2000,
  minFontSize: 0.005,
  maxFontSize: 0.5,
  minLineHeight: 1,
  maxLineHeight: 3,
} as const;

export const DEFAULTS = {
  color: '#ffffff',
  fontFamily: 'system-ui' as const,
  fontSize: 0.06,
  weight: 700 as const,
  align: 'center' as const,
  lineHeight: 1.3,
} as const;
