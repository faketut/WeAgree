"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (_dataUri: string) => void;
  onClear: () => void;
}

export function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    onClear();
  };

  const save = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUri = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
      onSave(dataUri);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-md border bg-white dark:bg-slate-950 overflow-hidden">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: "signature-canvas w-full h-40 cursor-crosshair",
          }}
          onEnd={() => setIsEmpty(false)}
        />
        <div className="absolute bottom-2 right-2 flex gap-2">
          <Button variant="outline" size="sm" onClick={clear} className="h-8 px-2">
            <Eraser className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
          <Button size="sm" onClick={save} disabled={isEmpty} className="h-8 px-2">
            <Check className="mr-1 h-3.5 w-3.5" />
            Apply Signature
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Use your mouse or touch screen to draw your signature above.
      </p>
    </div>
  );
}
