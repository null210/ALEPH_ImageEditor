import { RATIO_KEYS } from '../domain/constants';
import type { Ratio } from '../domain/types';

interface Props {
  value: Ratio;
  onChange: (ratio: Ratio) => void;
}

export function RatioTabs({ value, onChange }: Props) {
  return (
    <div className="ratio-tabs" role="tablist">
      {RATIO_KEYS.map((ratio) => (
        <button
          key={ratio}
          type="button"
          role="tab"
          aria-label={`${ratio} 비율로 변경`}
          title={`${ratio} 비율로 변경`}
          data-tooltip={`${ratio} 비율로 변경`}
          aria-selected={ratio === value}
          className={ratio === value ? 'active' : ''}
          onClick={() => onChange(ratio)}
        >
          {ratio === '1:1' ? '⬜ 1:1' : ratio === '4:5' ? '▯ 4:5' : '▯ 9:16'}
        </button>
      ))}
    </div>
  );
}
