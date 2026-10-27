import { useState } from 'react';
import type { Template } from '../domain/types';

interface Props {
  open: boolean;
  templates: Template[];
  onClose: () => void;
  onLoad: (template: Template) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSaveCurrent: (name: string) => void;
}

export function TemplateDrawer({
  open, templates, onClose, onLoad, onRename, onDelete, onSaveCurrent,
}: Props) {
  const [name, setName] = useState('');
  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSaveCurrent(trimmed);
    setName('');
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="panel-header">
          <h2>템플릿</h2>
          <button type="button" onClick={onClose}>닫기</button>
        </header>

        <div className="save-current">
          <input
            placeholder="새 템플릿 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button type="button" onClick={submit} disabled={!name.trim()}>
            현재 상태 저장
          </button>
        </div>

        <ul className="template-list">
          {templates.length === 0 && <li className="muted">저장된 템플릿이 없습니다.</li>}
          {templates.map((t) => (
            <li key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <span className="muted"> · {t.ratio} · 문구 {t.texts.length}개</span>
              </div>
              <div className="row">
                <button type="button" onClick={() => onLoad(t)}>불러오기</button>
                <button type="button" onClick={() => {
                  const next = window.prompt('새 이름', t.name);
                  if (next?.trim()) onRename(t.id, next.trim());
                }}>이름 변경</button>
                <button type="button" className="danger" onClick={() => onDelete(t.id)}>삭제</button>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
