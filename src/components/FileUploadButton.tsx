import { useRef } from 'react';

interface Props {
  onFile: (file: File) => void;
  label?: string;
  icon?: string;
  tooltip?: string;
}

export function FileUploadButton({ onFile, label = '이미지 불러오기', icon, tooltip }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        className={icon ? 'icon-button' : undefined}
        title={tooltip ?? label}
        aria-label={tooltip ?? label}
        data-tooltip={tooltip ?? label}
        onClick={() => inputRef.current?.click()}
      >
        {icon ? <span aria-hidden="true">{icon}</span> : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
    </>
  );
}
