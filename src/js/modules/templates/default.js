/**
 * Default Template Module
 * Standard invoice layout
 */

import { formatCurrency, formatDate } from '../formatters.js';

export default {
    id: 'default',
    name: 'Default Standard',

    /**
     * Generate PDF Document Definition
     * @param {Object} data - Invoice data
     * @returns {Object} pdfmake document definition
     */
    generateDocumentDefinition(data) {
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
                            layout: {
                                // Add a top border line only above the last row (Total)
                                hLineWidth: (i, node) => {
                                    const lastRowIndex = node.table.body.length;
                                    return i === lastRowIndex - 1 ? 0.5 : 0;
                                },
                                vLineWidth: () => 0,
                                hLineColor: () => '#9CA3AF',
                                paddingLeft: () => 8,
                                paddingRight: () => 0,
                                paddingTop: (i, node) => {
                                    const lastRowIndex = node.table.body.length;
                                    return i === lastRowIndex - 1 ? 6 : 2;
                                },
                                paddingBottom: () => 2
                            }
                        }
                    ],
                    marginBottom: 40
                },

                // Footer Section
                {
                    stack: [
                        // Notes
                        invoice.notes ? {
                            text: invoice.notes,
                            style: 'footerNote',
                            alignment: 'center',
                            marginBottom: 10
                        } : null,

                        // Instructions
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
                tableCell: { fontSize: 10, color: '#111827', margin: [0, 2, 0, 2] },

                // Footer styles
                footerNote: { fontSize: 14, bold: true, color: '#111827' },
                footerText: { fontSize: 10, color: '#111827', lineHeight: 1.5 }
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };
    }
};
