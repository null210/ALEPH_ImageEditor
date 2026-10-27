import type { Template } from '../domain/types';

const STORAGE_KEY = 'editor.templates.v1';

export interface TemplateRepository {
  list(): Template[];
  upsert(template: Template): void;
  remove(id: string): void;
}

const isTemplate = (x: unknown): x is Template =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as Template).id === 'string' &&
  typeof (x as Template).name === 'string' &&
  typeof (x as Template).createdAt === 'number' &&
  Array.isArray((x as Template).texts);

export function createLocalTemplateRepository(): TemplateRepository {
  const read = (): Template[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isTemplate) : [];
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
