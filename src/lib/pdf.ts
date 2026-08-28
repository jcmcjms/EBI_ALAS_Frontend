import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

/**
 * Captures an element as PNG and embeds it into a multi-page PDF.
 * Keeps the layout WYSIWYG (matches the approval form exactly).
 *
 * Uses html2canvas-pro which natively supports modern CSS color functions
 * (oklch, lab, lch) used by Tailwind CSS v4.
 *
 * TODO(api): for the production version, consider generating the PDF
 * server-side from the authoritative loan record so the document
 * is cryptographically verifiable and the layout can never diverge
 * from the .NET computation engine.
 */
export async function generatePdfFromElement(
    element: HTMLElement,
    filename: string
): Promise<void> {
    // Render at 2x scale for print quality; drop shadows / blur on the source
    // are flattened so the PNG is a faithful snapshot.
    const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const usableWidth = pageWidth - margin * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let remainingHeight = imgHeight;
    let srcY = 0;
    let page = 0;

    // Split the tall image across A4 pages while keeping the content continuous.
    while (remainingHeight > 0) {
        if (page > 0) pdf.addPage();
        const sliceHeight = Math.min(remainingHeight, pageHeight - margin * 2);
        const sourceSliceHeight = (sliceHeight / imgHeight) * canvas.height;

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceSliceHeight;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.drawImage(canvas, 0, srcY, canvas.width, sourceSliceHeight, 0, 0, canvas.width, sourceSliceHeight);

        pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, imgWidth, sliceHeight);

        srcY += sourceSliceHeight;
        remainingHeight -= sliceHeight;
        page++;
    }

    pdf.save(filename);
}