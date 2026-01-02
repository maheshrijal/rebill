/**
 * Minimalist Template Module
 * Simple, clean layout with less emphasis on borders/boxes
 */

import { formatCurrency, formatDate } from '../formatters.js';

export default {
    id: 'minimal',
    name: 'Minimalist',

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
            { text: 'Description', style: 'tableHeader', alignment: 'left' },
            { text: 'Quantity', style: 'tableHeader', alignment: 'center' },
            { text: 'Price', style: 'tableHeader', alignment: 'right' },
            { text: 'Total', style: 'tableHeader', alignment: 'right' }
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

        // Subtotal
        if (totals.taxAmount > 0 || totals.discount > 0) {
            totalsRows.push([
                { text: 'Subtotal', alignment: 'right', color: '#666666' },
                { text: fmt(totals.subtotal), alignment: 'right', color: '#666666' }
            ]);
        }

        // Tax
        if (totals.taxAmount > 0) {
            totalsRows.push([
                { text: `Tax (${totals.taxRate}%)`, alignment: 'right', color: '#666666' },
                { text: fmt(totals.taxAmount), alignment: 'right', color: '#666666' }
            ]);
        }

        // Discount
        if (totals.discount > 0) {
            totalsRows.push([
                { text: 'Discount', alignment: 'right', color: '#666666' },
                { text: `-${fmt(totals.discount)}`, alignment: 'right', color: '#666666' }
            ]);
        }

        // Total
        totalsRows.push([
            { text: 'Total', bold: true, fontSize: 16, alignment: 'right', margin: [0, 5, 0, 0] },
            { text: fmt(totals.total), bold: true, fontSize: 16, alignment: 'right', margin: [0, 5, 0, 0] }
        ]);

        const invoiceNumber = invoice.number || 'draft';

        return {
            pageMargins: [40, 60, 40, 60],

            info: {
                title: `Invoice ${invoiceNumber}`,
                author: seller.name || 'Rebill',
                creator: 'Rebill'
            },

            content: [
                // Top Header: Brand Left, Invoice Info Right
                {
                    columns: [
                        {
                            width: '*',
                            text: seller.name || 'Business Name',
                            style: 'headerBusinessName'
                        },
                        {
                            width: 'auto',
                            stack: [
                                { text: 'INVOICE', style: 'headerLabel' },
                                { text: invoiceNumber, style: 'headerValue' }
                            ],
                            alignment: 'right'
                        }
                    ],
                    marginBottom: 40
                },

                // Addresses: Side by Side
                {
                    columns: [
                        // From
                        {
                            width: '*',
                            stack: [
                                { text: 'FROM', style: 'sectionLabel' },
                                { text: seller.name || '', bold: true, marginBottom: 2 },
                                { text: seller.address || '', style: 'addressText' },
                                seller.email ? { text: seller.email, style: 'addressText' } : null,
                                seller.phone ? { text: seller.phone, style: 'addressText' } : null
                            ].filter(Boolean)
                        },
                        // To
                        {
                            width: '*',
                            stack: [
                                { text: 'TO', style: 'sectionLabel' },
                                { text: billTo.name || 'Customer Name', bold: true, marginBottom: 2 },
                                { text: billTo.address || '', style: 'addressText' },
                                billTo.email ? { text: billTo.email, style: 'addressText' } : null,
                                billTo.phone ? { text: billTo.phone, style: 'addressText' } : null
                            ].filter(Boolean),
                            alignment: 'right'
                        }
                    ],
                    columnGap: 40,
                    marginBottom: 40
                },

                // Dates
                {
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 'auto',
                            columns: [
                                {
                                    stack: [
                                        { text: 'ISSUED', style: 'sectionLabel' },
                                        { text: formatDate(invoice.date), style: 'dateValue' }
                                    ],
                                    width: 100
                                },
                                invoice.dueDate ? {
                                    stack: [
                                        { text: 'DUE', style: 'sectionLabel' },
                                        { text: formatDate(invoice.dueDate), style: 'dateValue' }
                                    ],
                                    width: 100,
                                    alignment: 'right'
                                } : null
                            ].filter(Boolean)
                        }
                    ],
                    marginBottom: 40
                },

                // Items Table - Minimalist (no borders, just simple lines)
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 60, 80, 80],
                        body: tableBody
                    },
                    layout: {
                        hLineWidth: (i, node) => i === 1 ? 1 : 0, // line under header only
                        vLineWidth: () => 0,
                        hLineColor: () => '#000000',
                        paddingLeft: () => 0,
                        paddingRight: () => 0,
                        paddingTop: (i) => i === 0 ? 0 : 8,
                        paddingBottom: (i) => 8
                    },
                    marginBottom: 20
                },

                // Divider
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }], marginBottom: 10 },

                // Totals
                {
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 'auto',
                            table: {
                                widths: ['auto', 100],
                                body: totalsRows
                            },
                            layout: 'noBorders'
                        }
                    ],
                    marginBottom: 60
                },

                // Footer
                {
                    stack: [
                        invoice.notes ? { text: invoice.notes, style: 'normalText', marginBottom: 20 } : null,
                        invoice.instructions ? { text: invoice.instructions, style: 'normalText' } : null
                    ].filter(Boolean)
                }
            ],

            styles: {
                headerBusinessName: { fontSize: 20, bold: true, letterSpacing: -0.5 },
                headerLabel: { fontSize: 10, color: '#999', letterSpacing: 2, marginBottom: 2 },
                headerValue: { fontSize: 14, bold: true },
                sectionLabel: { fontSize: 9, color: '#999', bold: true, letterSpacing: 1, marginBottom: 5 },
                addressText: { fontSize: 10, lineHeight: 1.4, color: '#333' },
                dateValue: { fontSize: 11, bold: true },
                tableHeader: { fontSize: 10, bold: true, color: '#999', marginBottom: 5 },
                tableCell: { fontSize: 10, color: '#333' },
                normalText: { fontSize: 10, color: '#333', lineHeight: 1.5 }
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };
    }
};
