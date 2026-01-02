/**
 * Form Module
 * Form data collection and synchronization
 */

import { getValue, setValue, setText } from './dom.js';
import { parseNumber, formatCurrency } from './formatters.js';
import { calculateTotals } from './calculations.js';
import { collectItemsFromForm, renderItemsForm } from './items.js';
import { saveDraft, deepMerge } from './storage.js';
import { renderInvoice, isInvoiceVisible } from './invoice.js';

/**
 * Get all invoice data from the form
 * @returns {Object} Complete invoice data object
 */
export function getDataFromForm() {
    const settings = {
        currency: getValue('currencyCode', 'INR').trim() || 'INR',
        locale: 'en-IN'
    };

    const items = collectItemsFromForm(settings);
    const taxRate = parseNumber(getValue('taxRate', 0), 0);
    const discount = parseNumber(getValue('discountAmount', 0), 0);
    const totals = calculateTotals(items, taxRate, discount);

    return {
        schemaVersion: 1,
        settings,
        seller: {
            name: getValue('sellerName'),
            address: getValue('sellerAddress'),
            email: getValue('sellerEmail'),
            phone: getValue('sellerPhone')
        },
        billTo: {
            name: getValue('billToName'),
            address: getValue('billToAddress'),
            email: getValue('billToEmail'),
            phone: getValue('billToPhone')
        },
        invoice: {
            title: getValue('invoiceTitle', 'INVOICE'),
            date: getValue('invoiceDate'),
            dueDate: getValue('invoiceDueDate'),
            number: getValue('invoiceNumber'),
            notes: getValue('invoiceNotes'),
            instructions: getValue('invoiceInstructions')
        },
        items,
        totals,
        meta: {
            updatedAt: new Date().toISOString(),
            showInvoice: isInvoiceVisible()
        }
    };
}

/**
 * Update form totals display
 * @param {Object} data - Invoice data with totals
 */
export function updateFormTotalsDisplay(data) {
    const { totals, settings } = data;
    setText('formSubtotal', formatCurrency(totals.subtotal, settings.currency, settings.locale));
    setText('formTaxAmount', formatCurrency(totals.taxAmount, settings.currency, settings.locale));
    setText('formTotal', formatCurrency(totals.total, settings.currency, settings.locale));
}

/**
 * Validate invoice data
 * @param {Object} data - Invoice data to validate
 * @returns {boolean} True if valid
 */
export function validateData(data) {
    if (!data.seller.name || !data.seller.address) return false;
    if (!data.billTo.name || !data.billTo.address) return false;
    if (!data.invoice.date || !data.invoice.number) return false;
    if (!Array.isArray(data.items) || data.items.length === 0) return false;
    const validItems = data.items.some((item) => item.description && item.quantity > 0 && item.unitPrice >= 0);
    return validItems;
}

/**
 * Sync data from form, save draft, and optionally render
 * @param {Object} options - { render: boolean, showInvoice: boolean }
 * @returns {Object} Current form data
 */
export function syncFromForm(options = {}) {
    const data = getDataFromForm();
    if (typeof options.showInvoice === 'boolean') {
        data.meta.showInvoice = options.showInvoice;
    }
    updateFormTotalsDisplay(data);
    saveDraft(data);
    if (options.render) {
        renderInvoice(data);
    }
    return data;
}

/**
 * Apply data to form fields
 * @param {Object} data - Invoice data to apply
 * @param {Function} syncCallback - Callback to sync after applying
 */
export function applyDataToForm(data, syncCallback) {
    setValue('sellerName', data.seller?.name ?? '');
    setValue('sellerAddress', data.seller?.address ?? '');
    setValue('sellerEmail', data.seller?.email ?? '');
    setValue('sellerPhone', data.seller?.phone ?? '');
    setValue('billToName', data.billTo?.name ?? '');
    setValue('billToAddress', data.billTo?.address ?? '');
    setValue('billToEmail', data.billTo?.email ?? '');
    setValue('billToPhone', data.billTo?.phone ?? '');

    setValue('invoiceTitle', data.invoice?.title ?? 'INVOICE');
    setValue('invoiceDate', data.invoice?.date ?? '');
    setValue('invoiceDueDate', data.invoice?.dueDate ?? '');
    setValue('invoiceNumber', data.invoice?.number ?? '');

    setValue('currencyCode', data.settings?.currency ?? 'INR');

    renderItemsForm(data.items || []);

    setValue('taxRate', data.totals?.taxRate ?? 0);
    setValue('discountAmount', data.totals?.discount ?? 0);

    setValue('invoiceNotes', data.invoice?.notes ?? '');

    const legacyBank = data.seller?.bank;
    const legacyInstructions = data.invoice?.terms ?? data.invoice?.instructions ?? '';
    let mergedInstructions = legacyInstructions;
    if (!mergedInstructions && legacyBank) {
        const lines = [];
        if (legacyBank.accountNo) lines.push(`A/c no: ${legacyBank.accountNo}`);
        if (legacyBank.ifsc) lines.push(`IFSC: ${legacyBank.ifsc}`);
        if (legacyBank.name) lines.push(`Name: ${legacyBank.name}`);
        if (lines.length > 0) {
            mergedInstructions = `Please send payment to below bank account.\n${lines.join('\n')}`;
        }
    }
    setValue('invoiceInstructions', mergedInstructions);

    if (syncCallback) {
        syncCallback({ render: data.meta?.showInvoice, showInvoice: data.meta?.showInvoice });
    }
}

export { deepMerge };
