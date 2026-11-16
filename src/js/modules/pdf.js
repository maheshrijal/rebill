/**
 * PDF Module
 * PDF generation and sharing using pdfcn components rendered by Takumi
 */

import { getDataFromForm } from './form.js';

function invoiceFilename(data) {
    const safeNumber = (data.invoice.number || 'draft').replace(/[^a-zA-Z0-9-_]/g, '-');
    return `Invoice-${safeNumber}.pdf`;
}

/**
 * Render the invoice to a PDF blob. The renderer (WASM + fonts) loads on first use.
 * @param {Object} data - Invoice data
 * @returns {Promise<Blob>}
 */
async function createPdfBlob(data) {
    const { renderInvoicePdf } = await import('../../pdf/render.tsx');
    return renderInvoicePdf(data);
}

/**
 * Start loading the renderer in the background so the first download doesn't wait.
 */
export function preloadPdfRenderer() {
    import('../../pdf/render.tsx')
        .then(({ loadRenderer }) => loadRenderer())
        .catch(() => {
            // Ignored here; a real download retries and reports the error.
        });
}

function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate PDF and download it
 */
export async function downloadPDF() {
    const downloadBtn = document.getElementById('downloadBtn');
    let originalBtnText = '';

    // Show loading state if button exists
    if (downloadBtn) {
        originalBtnText = downloadBtn.textContent;
        downloadBtn.textContent = 'Creating PDF…';
        downloadBtn.disabled = true;
        downloadBtn.setAttribute('aria-busy', 'true');
    }

    try {
        const data = getDataFromForm();
        saveBlob(await createPdfBlob(data), invoiceFilename(data));

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Couldn’t create the PDF. Check your internet connection and try again.');
    } finally {
        // Restore button if it exists
        if (downloadBtn) {
            downloadBtn.textContent = originalBtnText;
            downloadBtn.disabled = false;
            downloadBtn.removeAttribute('aria-busy');
        }
    }
}

/**
 * Share invoice using Web Share API
 */
export async function shareInvoice() {
    const shareBtn = document.getElementById('shareBtn');
    // Keep the original markup so the icon stays hidden from screen readers.
    const originalShareHtml = shareBtn ? shareBtn.innerHTML : '';
    if (shareBtn) {
        shareBtn.textContent = 'Creating PDF…';
        shareBtn.disabled = true;
        shareBtn.setAttribute('aria-busy', 'true');
    }

    try {
        const data = getDataFromForm();
        const filename = invoiceFilename(data);
        const blob = await createPdfBlob(data);

        const file = new File([blob], filename, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: filename.replace('.pdf', ''),
                text: 'Invoice generated with Rebill'
            });
        } else {
            // Fallback: download
            saveBlob(blob, filename);

            if (!navigator.share) {
                console.log('Web Share API not available, downloaded file instead');
            }
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error sharing invoice:', error);
            alert('Couldn’t share the invoice. Use Download PDF instead.');
        }
    } finally {
        if (shareBtn) {
            shareBtn.innerHTML = originalShareHtml;
            shareBtn.disabled = false;
            shareBtn.removeAttribute('aria-busy');
        }
    }
}
