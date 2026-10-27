import type { TextItem } from '../domain/types';

interface Props {
  texts: TextItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export function TextList({ texts, selectedId, onSelect, onRemove, onAdd }: Props) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h3>문구</h3>
        <button type="button" onClick={onAdd}>+ 추가</button>
      </header>
      <ul className="text-list">
        {texts.length === 0 && <li className="muted">문구가 없습니다.</li>}
        {texts.map((item) => (
          <li
            key={item.id}
            className={item.id === selectedId ? 'selected' : ''}
            onClick={() => onSelect(item.id)}
          >
            <span className="text-preview">{item.content.split('\n')[0] || '(빈 문구)'}</span>
            <button
              type="button"
              className="danger"
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              aria-label="삭제"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
