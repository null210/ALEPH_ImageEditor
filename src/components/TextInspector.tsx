import { LIMITS } from '../domain/constants';
import type { Align, TextItem, Weight } from '../domain/types';

interface Props {
  item: TextItem;
  onChange: (patch: Partial<Omit<TextItem, 'id'>>) => void;
}

const ALIGNS: Align[] = ['left', 'center', 'right'];
const WEIGHTS: Weight[] = [400, 700];

export function TextInspector({ item, onChange }: Props) {
  return (
    <section className="panel">
      <h3>문구 편집</h3>

      <label>
        내용
        <textarea
          value={item.content}
          maxLength={LIMITS.maxContentLength}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={3}
        />
      </label>

      <label>
        크기 <span className="muted">{(item.fontSize * 100).toFixed(1)}%</span>
        <input
          type="range"
          min={0.01}
          max={0.3}
          step={0.001}
          value={item.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        />
      </label>

      <label>
        줄 간격 <span className="muted">{item.lineHeight.toFixed(1)}</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={item.lineHeight}
          onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
        />
      </label>

      <label>
        X <span className="muted">{item.x.toFixed(2)}</span>
        <input
          type="range" min={0} max={1} step={0.001} value={item.x}
          onChange={(e) => onChange({ x: Number(e.target.value) })}
        />
      </label>

      <label>
        Y <span className="muted">{item.y.toFixed(2)}</span>
        <input
          type="range" min={0} max={1} step={0.001} value={item.y}
          onChange={(e) => onChange({ y: Number(e.target.value) })}
        />
      </label>

      <label>
        색
        <input
          type="color"
          value={item.color}
          onChange={(e) => onChange({ color: e.target.value })}
        />
      </label>

      <div className="row">
        <label>
          정렬
          <select
            value={item.align}
            onChange={(e) => onChange({ align: e.target.value as Align })}
          >
            {ALIGNS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label>
          굵기
          <select
            value={item.weight}
            onChange={(e) => onChange({ weight: Number(e.target.value) as Weight })}
          >
            {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
