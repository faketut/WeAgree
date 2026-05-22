"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PDFDownloadButtonProps {
    contentId: string;
    filename: string;
    title: string;
}

export function PDFDownloadButton({ contentId, filename, title }: PDFDownloadButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const downloadPDF = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const element = document.getElementById(contentId);
            if (!element) {
                throw new Error("Content element not found");
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: "a4",
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${filename}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            setError(
                err instanceof Error ? err.message : "Failed to generate PDF. Please try again."
            );
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={downloadPDF}
                disabled={isGenerating}
                className="gap-2"
                aria-label={`Download ${title} as PDF`}
            >
                {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Download className="h-4 w-4" />
                )}
                Download PDF
            </Button>
            {error && (
                <Alert variant="destructive" role="alert">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>PDF generation failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
