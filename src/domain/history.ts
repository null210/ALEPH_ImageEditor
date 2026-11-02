/**
 * 크기 제한이 있는 실행 취소 스택 (순수 로직).
 * 오래된 항목은 버려서 반복 편집 시 메모리가 무한히 늘지 않게 한다 (TEST-10).
 */
export interface UndoStack<T> {
  readonly items: readonly T[];
  readonly limit: number;
}

export const DEFAULT_HISTORY_LIMIT = 20;

export function createUndoStack<T>(limit = DEFAULT_HISTORY_LIMIT): UndoStack<T> {
  return { items: [], limit: Math.max(1, limit) };
}

export function pushUndo<T>(stack: UndoStack<T>, item: T): UndoStack<T> {
  const items = [...stack.items, item];
  return { ...stack, items: items.length > stack.limit ? items.slice(items.length - stack.limit) : items };
}

export function popUndo<T>(stack: UndoStack<T>): { stack: UndoStack<T>; item: T | undefined } {
  if (stack.items.length === 0) return { stack, item: undefined };
  return { stack: { ...stack, items: stack.items.slice(0, -1) }, item: stack.items[stack.items.length - 1] };
}
