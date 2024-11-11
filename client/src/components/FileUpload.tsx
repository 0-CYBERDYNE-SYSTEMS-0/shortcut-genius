import { useRef } from 'react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onUpload: (content: string) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onUpload(content);
    };
    reader.readAsText(file);
  };

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept=".shortcut,.json"
        className="hidden"
      />
      <Button
        variant="secondary"
        onClick={() => inputRef.current?.click()}
      >
        Import
      </Button>
    </>
  );
}
