import { useRef } from 'react';

interface Props {
  onFile: (file: File) => void;
  label?: string;
}

export function FileUploadButton({ onFile, label = '이미지 불러오기' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()}>
        {label}
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
