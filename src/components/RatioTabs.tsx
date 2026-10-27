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
          aria-selected={ratio === value}
          className={ratio === value ? 'active' : ''}
          onClick={() => onChange(ratio)}
        >
          {ratio}
        </button>
      ))}
    </div>
  );
}
