import { LIMITS } from '../domain/constants';
import type { Align, FontFamily, TextItem, Weight } from '../domain/types';

interface Props {
  item: TextItem;
  onChange: (patch: Partial<Omit<TextItem, 'id'>>) => void;
}

const ALIGNS: Align[] = ['left', 'center', 'right'];
const WEIGHTS: Weight[] = [400, 700];
const FONT_FAMILIES: FontFamily[] = ['system-ui', 'Arial', 'Georgia', 'Times New Roman', 'Courier New'];

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

      <div className="row">
        <label>
          글자 크기 <span className="muted">{Math.round(item.fontSize * 1000) / 10}%</span>
          <input
            type="range"
            min={LIMITS.minFontSize}
            max={LIMITS.maxFontSize}
            step={0.005}
            value={item.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          />
        </label>
        <label>
          글꼴
          <select
            value={item.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value as FontFamily })}
          >
            {FONT_FAMILIES.map((font) => <option key={font} value={font}>{font}</option>)}
          </select>
        </label>
      </div>

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
