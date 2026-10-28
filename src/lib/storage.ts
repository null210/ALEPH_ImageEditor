import { DEFAULTS } from '../domain/constants';
import type { FontFamily, Template, TextItem } from '../domain/types';

const STORAGE_KEY = 'editor.templates.v1';

export interface TemplateRepository {
  list(): Template[];
  upsert(template: Template): void;
  remove(id: string): void;
}

const FONT_FAMILIES: FontFamily[] = ['system-ui', 'Arial', 'Georgia', 'Times New Roman', 'Courier New'];
const normalizeText = (raw: unknown): TextItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  const text = raw as Partial<TextItem>;
  if (typeof text.id !== 'string' || typeof text.content !== 'string') return null;
  if (typeof text.x !== 'number' || typeof text.y !== 'number') return null;
  if (!Number.isFinite(text.x) || !Number.isFinite(text.y)) return null;
  if (typeof text.fontSize !== 'number' || !Number.isFinite(text.fontSize)) return null;
  return {
    ...text,
    color: typeof text.color === 'string' && /^#[0-9a-f]{6}$/i.test(text.color) ? text.color : DEFAULTS.color,
    fontFamily: FONT_FAMILIES.includes(text.fontFamily as FontFamily) ? text.fontFamily as FontFamily : DEFAULTS.fontFamily,
    align: text.align === 'left' || text.align === 'right' || text.align === 'center' ? text.align : DEFAULTS.align,
    weight: text.weight === 400 || text.weight === 700 ? text.weight : DEFAULTS.weight,
    lineHeight: typeof text.lineHeight === 'number' ? text.lineHeight : DEFAULTS.lineHeight,
  } as TextItem;
};

const isTemplate = (x: unknown): x is Template => {
  if (!x || typeof x !== 'object') return false;
  const template = x as Partial<Template>;
  return typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.createdAt === 'number' &&
    (template.ratio === '1:1' || template.ratio === '4:5' || template.ratio === '9:16') &&
    Array.isArray(template.texts) && template.texts.every((text) => normalizeText(text) !== null);
};

export function createLocalTemplateRepository(): TemplateRepository {
  const read = (): Template[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter(isTemplate).map((template) => ({
          ...template,
          texts: template.texts.map((text) => normalizeText(text)).filter((text): text is TextItem => text !== null),
        }))
        : [];
    } catch {
      return [];
    }
  };

  const write = (items: Template[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  return {
    list: read,
    upsert(template) {
      write([...read().filter((t) => t.id !== template.id), template]);
    },
    remove(id) {
      write(read().filter((t) => t.id !== id));
    },
  };
}
