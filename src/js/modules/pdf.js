/**
 * PDF Module
 * PDF generation and sharing functionality using pdfmake
 */

import { getDataFromForm } from './form.js';
import { formatCurrency, formatDate } from './formatters.js';

/**
 * Generate PDF Document Definition from data
 * @param {Object} data - Invoice data
 * @returns {Object} pdfmake document definition
 */
function generateDocumentDefinition(data) {
    const { seller, billTo, invoice, items, totals, settings } = data;
    const currency = settings.currency;
    const locale = settings.locale;

    // Helper to format currency
    const fmt = (amount) => formatCurrency(amount, currency, locale);

    // Prepare table body
    const tableBody = [];

    // Header
    tableBody.push([
        { text: 'DESCRIPTION', style: 'tableHeader' },
        { text: 'QTY', style: 'tableHeader', alignment: 'center' },
        { text: 'UNIT PRICE', style: 'tableHeader', alignment: 'right' },
        { text: 'TOTAL', style: 'tableHeader', alignment: 'right' }
    ]);

    // Items
    items.forEach(item => {
        tableBody.push([
            { text: item.description || '', style: 'tableCell' },
            { text: item.quantity, style: 'tableCell', alignment: 'center' },
            { text: fmt(item.unitPrice), style: 'tableCell', alignment: 'right' },
            { text: fmt(item.total), style: 'tableCell', alignment: 'right' }
        ]);
    });

    // Totals section (rows)
    const totalsRows = [];

    // Only show Subtotal if there are adjustments (tax or discount)
    if (totals.taxAmount > 0 || totals.discount > 0) {
        totalsRows.push([
            { text: 'Subtotal', alignment: 'right' },
            { text: fmt(totals.subtotal), alignment: 'right' }
        ]);

        if (totals.taxAmount > 0) {
            totalsRows.push([
                { text: `Tax (${totals.taxRate}%)`, alignment: 'right' },
                { text: fmt(totals.taxAmount), alignment: 'right' }
            ]);
        }

        if (totals.discount > 0) {
            totalsRows.push([
                { text: 'Discount', alignment: 'right' },
                { text: `-${fmt(totals.discount)}`, alignment: 'right' }
            ]);
        }
    }

    // Total Row
    totalsRows.push([
        { text: 'Total', bold: true, fontSize: 12, alignment: 'right' },
        { text: fmt(totals.total), bold: true, fontSize: 12, alignment: 'right' }
    ]);

    const invoiceNumber = invoice.number || 'draft';
    const customerName = billTo.name || 'Customer';

    return {
        // Moderate margins: [left, top, right, bottom]
        pageMargins: [30, 40, 30, 40],

        info: {
            title: `Invoice ${invoiceNumber}`,
            author: seller.name || 'Rebill',
            subject: `Invoice for ${customerName}`,
            creator: 'Rebill - Invoice Generator'
        },
        content: [
            // Header Section
            {
                columns: [
                    // Seller Info (Left)
                    {
                        width: '*',
                        stack: [
                            { text: seller.name || 'Business Name', style: 'businessName' },
                            { text: seller.address || '', style: 'normalText' },
                            seller.email ? { text: seller.email, style: 'normalText' } : null,
                            seller.phone ? { text: seller.phone, style: 'normalText' } : null
                        ].filter(Boolean)
                    },
                    // Invoice Title & Meta (Right)
                    {
                        width: 'auto',
                        alignment: 'right',
                        stack: [
                            { text: invoice.title || 'INVOICE', style: 'invoiceTitle' },
                            {
                                text: [
                                    { text: 'Invoice #: ', bold: true },
                                    invoiceNumber
                                ],
                                style: 'metaText'
                            },
                            {
                                text: [
                                    { text: 'Date: ', bold: true },
                                    formatDate(invoice.date)
                                ],
                                style: 'metaText'
                            },
                            invoice.dueDate ? {
                                text: [
                                    { text: 'Due Date: ', bold: true },
                                    formatDate(invoice.dueDate)
                                ],
                                style: 'metaText'
                            } : null
                        ].filter(Boolean)
                    }
                ],
                columnGap: 20,
                marginBottom: 40
            },

            // Bill To Section
            {
                text: 'BILL TO',
                style: 'sectionLabel',
                marginBottom: 5
            },
            {
                stack: [
                    { text: customerName, style: 'customerName' },
                    { text: billTo.address || '', style: 'normalText' },
                    billTo.email ? { text: billTo.email, style: 'normalText' } : null,
                    billTo.phone ? { text: billTo.phone, style: 'normalText' } : null
                ].filter(Boolean),
                marginBottom: 40
            },

            // Items Table
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 50, 80, 80],
                    body: tableBody
                },
                layout: {
                    hLineWidth: (i, node) => 0.5,
                    vLineWidth: (i, node) => 0.5,
                    hLineColor: (i, node) => '#E5E7EB',
                    vLineColor: (i, node) => '#E5E7EB',
                    paddingLeft: (i) => 8,
                    paddingRight: (i) => 8,
                    paddingTop: (i) => 4,
                    paddingBottom: (i) => 4
                },
                marginBottom: 20
            },

            // Totals
            {
                columns: [
                    { width: '*', text: '' }, // Spacer
                    {
                        width: 'auto',
                        table: {
                            widths: ['auto', 100],
                            body: totalsRows
                        },
                        layout: 'noBorders'
                    }
                ],
                marginBottom: 40
            },

            // Footer Section: Center aligned, standard font size, bold "Thank you"
            {
                stack: [
                    // Notes (Thank you message)
                    invoice.notes ? {
                        text: invoice.notes,
                        style: 'footerNote',
                        alignment: 'center',
                        marginBottom: 10
                    } : null,

                    // Instructions (Bank details etc)
                    invoice.instructions ? {
                        text: invoice.instructions,
                        style: 'footerText',
                        alignment: 'center'
                    } : null
                ].filter(Boolean)
            }
        ].filter(Boolean),

        styles: {
            businessName: { fontSize: 18, bold: true, marginBottom: 4, color: '#111827' },
            invoiceTitle: { fontSize: 24, bold: true, marginBottom: 8, color: '#111827' },
            sectionLabel: { fontSize: 10, bold: true, color: '#6B7280', letterSpacing: 1, marginBottom: 4 },
            customerName: { fontSize: 14, bold: true, marginBottom: 4, color: '#111827' },
            normalText: { fontSize: 10, lineHeight: 1.4, color: '#4B5563' },
            metaText: { fontSize: 10, marginBottom: 4, alignment: 'right', color: '#4B5563' },

            // Table styles
            tableHeader: { fontSize: 10, bold: true, color: '#111827', fillColor: '#F3F4F6', margin: [0, 2, 0, 2] },
            tableCell: { fontSize: 10, color: '#374151', margin: [0, 2, 0, 2] },

            // Footer styles
            footerNote: { fontSize: 14, bold: true, color: '#111827' },
            footerText: { fontSize: 10, color: '#6B7280', lineHeight: 1.5 }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };
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
            pdfMake.createPdf(docDefinition).getBlob((blob) => {
                resolve(blob);
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
