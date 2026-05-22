"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Check, Image as ImageIcon } from "lucide-react";

interface SignatureUploadProps {
    onSave: (dataUri: string) => void;
    onClear: () => void;
}

export function SignatureUpload({ onSave, onClear }: SignatureUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const clear = () => {
        setPreview(null);
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
                    className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Click to upload signature image</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 1MB</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="relative rounded-md border bg-white dark:bg-slate-950 p-4 h-40 flex items-center justify-center overflow-hidden">
                        <img
                            src={preview}
                            alt="Signature preview"
                            className="max-w-full max-h-full object-contain"
                        />
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7"
                            onClick={clear}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex justify-center">
                        <Button size="sm" onClick={save}>
                            <Check className="mr-2 h-4 w-4" />
                            Apply Uploaded Signature
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
