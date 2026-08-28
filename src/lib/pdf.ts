import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Captures an element as PNG and embeds it into a multi-page PDF.
 * Keeps the layout WYSIWYG (matches the approval form exactly).
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
    // Use onclone to fix oklch() color functions that html2canvas can't parse (Tailwind v4).
    const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
            fixOklchColors(clonedDoc, element);
        },
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

/**
 * Walks the cloned document and replaces oklch() color functions with their
 * computed RGB equivalents so html2canvas can render them.
 * Tailwind CSS v4 uses oklch() for all color utilities.
 */
function fixOklchColors(clonedDoc: Document, originalElement: HTMLElement): void {
    const colorProperties = [
        "color",
        "backgroundColor",
        "borderColor",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor",
        "outlineColor",
        "textDecorationColor",
        "textEmphasisColor",
        "caretColor",
        "columnRuleColor",
        "accentColor",
        "fill",
        "stroke",
        "stopColor",
        "floodColor",
        "lightingColor",
    ];

    // Collect all elements from original and clone in tree order
    const originalElements = getAllElements(originalElement);
    const clonedElements = getAllElements(clonedDoc.body);

    // Map by index - they should be in the same order since html2canvas clones the tree
    for (let i = 0; i < originalElements.length && i < clonedElements.length; i++) {
        const originalEl = originalElements[i];
        const clonedEl = clonedElements[i] as HTMLElement;

        const computedStyle = getComputedStyle(originalEl);

        for (const prop of colorProperties) {
            const value = computedStyle.getPropertyValue(prop);
            if (value && value.includes("oklch")) {
                // The computed style from getComputedStyle returns rgb()/rgba() for oklch colors
                // So we can directly apply this resolved value to the clone
                clonedEl.style.setProperty(prop, value);
            }
        }
    }
}

/**
 * Returns all descendant elements in tree order (depth-first).
 */
function getAllElements(root: Element | HTMLElement): Element[] {
    const elements: Element[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    let node: Element | null;
    while ((node = walker.nextNode())) {
        elements.push(node);
    }
    return elements;
}