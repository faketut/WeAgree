"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Check } from "lucide-react";

interface SignatureUploadProps {
  onSave: (_dataUri: string) => void;
  onClear: () => void;
}

export const MAX_SIGNATURE_UPLOAD_BYTES = 1024 * 1024; // 1 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

export function SignatureUpload({ onSave, onClear }: SignatureUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only PNG or JPG images are accepted.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIGNATURE_UPLOAD_BYTES) {
      setError("Image is larger than 1 MB. Please upload a smaller file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clear = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClear();
  };

  const save = () => {
    if (preview) {
      onSave(preview);
    }
  };

  return (
    <div className="space-y-3">
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-border bg-card transition-colors duration-150 hover:bg-muted/40"
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Click to upload signature image</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, up to 1 MB</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg"
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-sm border border-border bg-card p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Signature preview"
              className="max-h-full max-w-full object-contain dark:invert"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7"
              onClick={clear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center">
            <Button size="sm" onClick={save}>
              <Check className="mr-2 h-4 w-4" />
              Apply uploaded signature
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
