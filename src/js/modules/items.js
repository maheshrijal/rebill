/**
 * Items Module
 * Line items form management
 */

import { getValue } from './dom.js';
import { parseNumber, formatCurrency } from './formatters.js';

/**
 * Ensure at least one item row exists
 * @param {Function} addItemRowFn - Function to add an item row
 */
export function ensureAtLeastOneItemRow(addItemRowFn) {
    const container = document.getElementById('itemsContainer');
    if (!container || container.querySelectorAll('.item-row').length > 0) return;
    addItemRowFn({
        description: '',
        quantity: 1,
        unitPrice: 0
    });
}

/**
 * Add an item row to the form
 * @param {Object} item - Item data (description, quantity, unitPrice)
 */
export function addItemRow(item = {}) {
    const container = document.getElementById('itemsContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'item-row';

    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'item-description';
    descInput.placeholder = 'Description';
    descInput.value = item.description ?? '';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'item-quantity';
    qtyInput.min = '0';
    qtyInput.step = '1';
    qtyInput.value = item.quantity ?? 1;

    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'item-unit-price';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.value = item.unitPrice ?? 0;

    const totalSpan = document.createElement('span');
    totalSpan.className = 'item-total';
    const currentCurrency = getValue('currencyCode', 'INR');
    const initialTotal = (item.quantity ?? 1) * (item.unitPrice ?? 0);
    totalSpan.textContent = formatCurrency(initialTotal, currentCurrency);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item';
    removeBtn.setAttribute('aria-label', 'Remove line item');
    removeBtn.textContent = '×';

    row.appendChild(descInput);
    row.appendChild(qtyInput);
    row.appendChild(priceInput);
    row.appendChild(totalSpan);
    row.appendChild(removeBtn);

    container.appendChild(row);
}

/**
 * Render items form from data
 * @param {Array} items - Array of item objects
 */
export function renderItemsForm(items) {
    const container = document.getElementById('itemsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!Array.isArray(items) || items.length === 0) {
        addItemRow();
        return;
    }

    items.forEach((item) => addItemRow(item));
}

/**
 * Collect items data from the form
 * @param {Object} settings - Settings with currency and locale
 * @returns {Array} Array of item objects with totals
 */
export function collectItemsFromForm(settings) {
    const rows = Array.from(document.querySelectorAll('.item-row'));
    const items = rows.map((row) => {
        const description = row.querySelector('.item-description')?.value?.trim() ?? '';
        const quantity = parseNumber(row.querySelector('.item-quantity')?.value, 0);
        const unitPrice = parseNumber(row.querySelector('.item-unit-price')?.value, 0);
        const total = quantity * unitPrice;
        const totalEl = row.querySelector('.item-total');
        if (totalEl) {
            totalEl.textContent = formatCurrency(total, settings.currency, settings.locale);
        }
        return {
            description,
            quantity,
            unitPrice,
            total
        };
    });

    return items;
}
