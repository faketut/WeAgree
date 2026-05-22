"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PDFDownloadButtonProps {
    contentId: string;
    filename: string;
    title: string;
}

export function PDFDownloadButton({ contentId, filename, title }: PDFDownloadButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const downloadPDF = async () => {
        setIsGenerating(true);
        try {
            const element = document.getElementById(contentId);
            if (!element) {
                throw new Error("Content element not found");
            }

            // Create a clone to avoid visual issues during capture
            const canvas = await html2canvas(element, {
                scale: 2, // Higher resolution
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

            // Add title to the PDF if needed, or just the captured content
            // For now, let's just add the captured content
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${filename}.pdf`);
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={downloadPDF}
            disabled={isGenerating}
            className="gap-2"
        >
            {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            Download PDF
        </Button>
    );
}
