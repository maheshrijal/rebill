/**
 * PDF Module
 * PDF generation and sharing functionality using pdfmake
 */

import { getTemplate } from './templates/template-registry.js';

/**
 * Generate PDF Document Definition from data
 * @param {Object} data - Invoice data
 * @returns {Object} pdfmake document definition
 */
function generateDocumentDefinition(data) {
    const templateId = data.settings?.templateId || 'default';
    const template = getTemplate(templateId);
    return template.generateDocumentDefinition(data);
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
        downloadBtn.textContent = 'Generating...';
        downloadBtn.disabled = true;
    }

    try {
        const data = getDataFromForm();
        const docDefinition = generateDocumentDefinition(data);
        const invoiceNumber = data.invoice.number || 'draft';
        // Sanitize filename
        const safeNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '-');
        const filename = `Invoice-${safeNumber}.pdf`;

        // Create and download
        pdfMake.createPdf(docDefinition).download(filename);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        // Restore button if it exists
        if (downloadBtn) {
            downloadBtn.textContent = originalBtnText;
            downloadBtn.disabled = false;
        }
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
        const data = getDataFromForm();
        const invoiceNumber = data.invoice.number || 'draft';
        const docDefinition = generateDocumentDefinition(data);

        // Sanitize filename
        const safeNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '-');
        const filename = `Invoice-${safeNumber}.pdf`;

        // Generate Blob
        const blob = await new Promise((resolve) => {
            pdfMake.createPdf(docDefinition).getBlob((pdfBlob) => {
                resolve(pdfBlob);
            });
        });

        const file = new File([blob], filename, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: filename.replace('.pdf', ''),
                text: 'Invoice generated with Rebill'
            });
        } else {
            // Fallback: download
            pdfMake.createPdf(docDefinition).download(filename);

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
