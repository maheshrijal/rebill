/**
 * Invoice Rendering Module
 * Display invoice preview
 */

import { setText, setEmailLink, setPhoneLink } from './dom.js';
import { formatCurrency, formatDate } from './formatters.js';

/**
 * Check if invoice preview is currently visible
 * @returns {boolean} True if invoice is visible
 */
export function isInvoiceVisible() {
    const invoice = document.getElementById('invoice');
    return invoice && invoice.style.display === 'block';
}

/**
 * Render invoice preview from data
 * @param {Object} data - Complete invoice data object
 */
export function renderInvoice(data) {
    const { settings, seller, billTo, invoice, items, totals } = data;
    const templateId = settings.templateId || 'default';

    const invoiceEl = document.getElementById('invoice');
    // Remove existing template classes
    invoiceEl.className = invoiceEl.className.replace(/invoice-template-[^\s]+/, '').trim();
    // Add new template class
    invoiceEl.classList.add(`invoice-template-${templateId}`);

    setText('displaySellerName', seller.name);
    setText('displaySellerAddress', seller.address || '');
    setEmailLink('displaySellerEmail', seller.email);
    setPhoneLink('displaySellerPhone', seller.phone);

    setText('displayInvoiceTitle', invoice.title || 'INVOICE');

    setText('displayBillToName', billTo.name);
    setText('displayBillToAddress', billTo.address || '');
    setEmailLink('displayBillToEmail', billTo.email);
    setPhoneLink('displayBillToPhone', billTo.phone);

    setText('displayInvoiceDate', formatDate(invoice.date));

    // Conditionally show/hide due date row
    const dueDateRow = document.getElementById('dueDateRow');
    if (dueDateRow) {
        if (invoice.dueDate) {
            dueDateRow.style.display = '';
            setText('displayInvoiceDueDate', formatDate(invoice.dueDate));
        } else {
            dueDateRow.style.display = 'none';
        }
    }

    setText('displayInvoiceNumber', invoice.number);

    const itemsBody = document.getElementById('displayItemsBody');
    if (itemsBody) {
        itemsBody.innerHTML = '';
        items.forEach((item) => {
            const row = document.createElement('tr');

            const descTd = document.createElement('td');
            descTd.textContent = item.description || '';

            const qtyTd = document.createElement('td');
            qtyTd.textContent = item.quantity || 0;

            const priceTd = document.createElement('td');
            priceTd.textContent = formatCurrency(item.unitPrice || 0, settings.currency, settings.locale);

            const totalTd = document.createElement('td');
            totalTd.textContent = formatCurrency(item.total || 0, settings.currency, settings.locale);

            row.appendChild(descTd);
            row.appendChild(qtyTd);
            row.appendChild(priceTd);
            row.appendChild(totalTd);

            itemsBody.appendChild(row);
        });
    }

    // Handle totals breakdown visibility (match PDF logic)
    const hasAdjustments = totals.taxAmount > 0 || totals.discount > 0;

    // Subtotal row - only show when there are adjustments
    const subtotalRow = document.getElementById('subtotalRow');
    if (subtotalRow) {
        if (hasAdjustments) {
            subtotalRow.style.display = '';
            setText('displaySubtotal', formatCurrency(totals.subtotal, settings.currency, settings.locale));
        } else {
            subtotalRow.style.display = 'none';
        }
    }

    // Conditionally show/hide tax row
    const taxRow = document.getElementById('taxRow');
    if (taxRow) {
        if (totals.taxAmount > 0) {
            taxRow.style.display = '';
            setText('displayTaxAmount', formatCurrency(totals.taxAmount, settings.currency, settings.locale));
        } else {
            taxRow.style.display = 'none';
        }
    }

    // Conditionally show/hide discount row
    const discountRow = document.getElementById('discountRow');
    if (discountRow) {
        if (totals.discount > 0) {
            discountRow.style.display = '';
            setText('displayDiscount', formatCurrency(totals.discount, settings.currency, settings.locale));
        } else {
            discountRow.style.display = 'none';
        }
    }

    setText('displayBalanceDue', formatCurrency(totals.balanceDue, settings.currency, settings.locale));

    setText('displayNotesHeading', invoice.notes || 'Thank you for your business');
    setText('displayInstructions', invoice.instructions || '');

    document.getElementById('invoicePlaceholder').style.display = 'none';
    document.getElementById('invoice').style.display = 'block';
    document.getElementById('downloadBtn').style.display = 'inline-block';
    document.getElementById('shareBtn').style.display = 'inline-block';
}
