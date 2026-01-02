/**
 * JSON Import/Export Module
 * Export and import invoice data as JSON
 */

import { getValue, setValue } from './dom.js';
import { getDataFromForm, applyDataToForm, syncFromForm } from './form.js';
import { deepMerge } from './storage.js';

/**
 * Export current form data to JSON textarea
 */
export function exportJsonToTextarea() {
    const data = syncFromForm({ render: false });
    const json = JSON.stringify(data, null, 2);
    setValue('jsonData', json);
}

/**
 * Download form data as JSON file
 */
export function downloadJsonFile() {
    const data = syncFromForm({ render: false });
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const invoiceNumber = data.invoice.number || 'draft';
    anchor.href = url;
    anchor.download = `invoice-${invoiceNumber}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

/**
 * Import JSON data and apply to form
 * @param {string} rawJson - JSON string to import
 * @param {Function} syncCallback - Callback to sync after import
 */
export function importJsonData(rawJson, syncCallback) {
    let parsed;
    try {
        parsed = JSON.parse(rawJson);
    } catch (error) {
        alert('Invalid JSON. Please check the format and try again.');
        return;
    }

    const base = getDataFromForm();
    const merged = deepMerge(base, parsed);
    merged.meta = merged.meta || {};
    merged.meta.showInvoice = true;

    applyDataToForm(merged, syncCallback);
}

/**
 * Handle file import from file input
 * @param {Event} event - File input change event
 * @param {Function} syncCallback - Callback to sync after import
 */
export function handleFileImport(event, syncCallback) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        importJsonData(reader.result, syncCallback);
    };
    reader.readAsText(file);
}
