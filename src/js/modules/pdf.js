/**
 * PDF Module
 * PDF generation and sharing functionality
 */

import { getValue } from './dom.js';
import { getDataFromForm } from './form.js';

/**
 * Generate PDF and download it
 */
export async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const invoiceElement = document.getElementById('invoice');
    const downloadBtn = document.getElementById('downloadBtn');

    // Show loading state
    const originalBtnText = downloadBtn.textContent;
    downloadBtn.textContent = 'Generating...';
    downloadBtn.disabled = true;

    // Get invoice data for metadata
    const data = getDataFromForm();
    const customerName = data.billTo?.name?.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-') || 'Customer';
    const invoiceNumber = data.invoice?.number || 'draft';
    const filename = `Invoice-${invoiceNumber}-${customerName}.pdf`;

    // Store original styles to restore later
    const originalStyles = {
        formDisplay: document.querySelector('.form-section').style.display,
        invoiceHeight: invoiceElement.style.height,
        invoiceOverflow: invoiceElement.style.overflow
    };

    try {
        // Prepare invoice for capture
        document.querySelector('.form-section').style.display = 'none';
        invoiceElement.style.height = 'auto';
        invoiceElement.style.overflow = 'visible';
        document.body.classList.add('pdf-generation');

        // Add print-optimized styles
        const printStyles = document.createElement('style');
        printStyles.id = 'pdf-print-styles';
        printStyles.textContent = `
            .pdf-generation .invoice-section {
                background: white !important;
                box-shadow: none !important;
                padding: 40px !important;
                margin: 0 !important;
                width: 794px !important;
                min-height: auto !important;
                height: auto !important;
                overflow: visible !important;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
            }
            .pdf-generation .invoice-header { margin-bottom: 30px !important; }
            .pdf-generation .business-info h1 { font-size: 18px !important; font-weight: 600 !important; }
            .pdf-generation .business-info p { font-size: 11px !important; line-height: 1.5 !important; }
            .pdf-generation .invoice-title h1 { font-size: 28px !important; font-weight: 700 !important; }
            .pdf-generation .invoice-table { font-size: 11px !important; }
            .pdf-generation .invoice-table th,
            .pdf-generation .invoice-table td { padding: 10px !important; }
            .pdf-generation .invoice-table th { font-size: 10px !important; font-weight: 600 !important; }
            /* Tabular figures for number alignment */
            .pdf-generation .invoice-table td:nth-child(2),
            .pdf-generation .invoice-table td:nth-child(3),
            .pdf-generation .invoice-table td:nth-child(4),
            .pdf-generation .invoice-totals span,
            .pdf-generation .balance-due span {
                font-variant-numeric: tabular-nums !important;
            }
        `;
        document.head.appendChild(printStyles);

        // Wait for styles to apply
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        // Capture with high DPI for crisp output
        const canvas = await html2canvas(invoiceElement, {
            scale: 3, // Higher scale for better quality
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 794, // A4 width at 96 DPI
            onclone: (clonedDoc) => {
                // Ensure cloned element is fully visible
                const clonedInvoice = clonedDoc.getElementById('invoice');
                if (clonedInvoice) {
                    clonedInvoice.style.height = 'auto';
                    clonedInvoice.style.overflow = 'visible';
                }
            }
        });

        // Create PDF with proper A4 dimensions
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        // Set PDF metadata
        pdf.setProperties({
            title: `Invoice ${invoiceNumber}`,
            subject: `Invoice for ${data.billTo?.name || 'Customer'}`,
            author: data.seller?.name || 'Rebill',
            creator: 'Rebill - Invoice Generator (rebill.mrjl.dev)',
            keywords: 'invoice, receipt, billing'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);

        // Calculate image dimensions maintaining aspect ratio
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Handle multi-page if content is taller than one page
        const maxHeightPerPage = pageHeight - (margin * 2);

        if (imgHeight <= maxHeightPerPage) {
            // Single page - center vertically if short
            const yOffset = margin;
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', margin, yOffset, imgWidth, imgHeight);
        } else {
            // Multi-page handling for long invoices
            let remainingHeight = imgHeight;
            let sourceY = 0;
            let pageNum = 0;

            while (remainingHeight > 0) {
                if (pageNum > 0) pdf.addPage();

                const sliceHeight = Math.min(remainingHeight, maxHeightPerPage);
                const sourceSliceHeight = (sliceHeight / imgHeight) * canvas.height;

                // Create a slice canvas for this page
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sourceSliceHeight;
                const ctx = sliceCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceSliceHeight, 0, 0, canvas.width, sourceSliceHeight);

                pdf.addImage(sliceCanvas.toDataURL('image/png', 1.0), 'PNG', margin, margin, imgWidth, sliceHeight);

                sourceY += sourceSliceHeight;
                remainingHeight -= sliceHeight;
                pageNum++;
            }
        }

        pdf.save(filename);

        // Remove print styles
        document.head.removeChild(printStyles);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        // Restore original styles
        document.querySelector('.form-section').style.display = originalStyles.formDisplay;
        invoiceElement.style.height = originalStyles.invoiceHeight;
        invoiceElement.style.overflow = originalStyles.invoiceOverflow;
        document.body.classList.remove('pdf-generation');

        // Remove print styles if still present
        const printStyles = document.getElementById('pdf-print-styles');
        if (printStyles) printStyles.remove();

        // Restore button
        downloadBtn.textContent = originalBtnText;
        downloadBtn.disabled = false;
    }
}

/**
 * Generate PDF as Blob for sharing
 * @returns {Promise<{blob: Blob, filename: string}>} PDF blob and filename
 */
export async function generatePDFBlob() {
    const { jsPDF } = window.jspdf;
    const invoiceElement = document.getElementById('invoice');

    const data = getDataFromForm();
    const customerName = data.billTo?.name?.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-') || 'Customer';
    const invoiceNumber = data.invoice?.number || 'draft';
    const filename = `Invoice-${invoiceNumber}-${customerName}.pdf`;

    // Store original styles
    const originalStyles = {
        formDisplay: document.querySelector('.form-section').style.display,
        invoiceHeight: invoiceElement.style.height,
        invoiceOverflow: invoiceElement.style.overflow
    };

    try {
        // Prepare invoice for capture
        document.querySelector('.form-section').style.display = 'none';
        invoiceElement.style.height = 'auto';
        invoiceElement.style.overflow = 'visible';
        document.body.classList.add('pdf-generation');

        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        // Capture with html2canvas
        const canvas = await html2canvas(invoiceElement, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 794,
            onclone: (clonedDoc) => {
                const clonedInvoice = clonedDoc.getElementById('invoice');
                if (clonedInvoice) {
                    clonedInvoice.style.height = 'auto';
                    clonedInvoice.style.overflow = 'visible';
                }
            }
        });

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        pdf.setProperties({
            title: `Invoice ${invoiceNumber}`,
            subject: `Invoice for ${data.billTo?.name || 'Customer'}`,
            author: data.seller?.name || 'Rebill',
            creator: 'Rebill - Invoice Generator',
            keywords: 'invoice, receipt, billing'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const maxHeightPerPage = pageHeight - (margin * 2);

        if (imgHeight <= maxHeightPerPage) {
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', margin, margin, imgWidth, imgHeight);
        } else {
            let remainingHeight = imgHeight;
            let sourceY = 0;
            let pageNum = 0;

            while (remainingHeight > 0) {
                if (pageNum > 0) pdf.addPage();
                const sliceHeight = Math.min(remainingHeight, maxHeightPerPage);
                const sourceSliceHeight = (sliceHeight / imgHeight) * canvas.height;
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sourceSliceHeight;
                const ctx = sliceCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceSliceHeight, 0, 0, canvas.width, sourceSliceHeight);
                pdf.addImage(sliceCanvas.toDataURL('image/png', 1.0), 'PNG', margin, margin, imgWidth, sliceHeight);
                sourceY += sourceSliceHeight;
                remainingHeight -= sliceHeight;
                pageNum++;
            }
        }

        return { blob: pdf.output('blob'), filename };
    } finally {
        // Restore original styles
        document.querySelector('.form-section').style.display = originalStyles.formDisplay;
        invoiceElement.style.height = originalStyles.invoiceHeight;
        invoiceElement.style.overflow = originalStyles.invoiceOverflow;
        document.body.classList.remove('pdf-generation');
    }
}

/**
 * Share invoice using Web Share API
 */
export async function shareInvoice() {
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.textContent = 'Preparing...';
        shareBtn.disabled = true;
    }

    try {
        const { blob, filename } = await generatePDFBlob();
        const file = new File([blob], filename, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: filename.replace('.pdf', ''),
                text: 'Invoice generated with Rebill'
            });
        } else {
            // Fallback: download the file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            // Show a message that sharing isn't available
            if (!navigator.share) {
                console.log('Web Share API not available, downloaded file instead');
            }
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error sharing invoice:', error);
            alert('Error sharing invoice. Please try downloading instead.');
        }
    } finally {
        if (shareBtn) {
            shareBtn.textContent = '📤 Share';
            shareBtn.disabled = false;
        }
    }
}
