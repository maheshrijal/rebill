/**
 * Rebill - Invoice Generator
 * Main Application Entry Point
 */

// Import modules
import { getValue, setValue } from './modules/dom.js';
import { parseNumber } from './modules/formatters.js';
import { saveDraft, loadDraft, clearDraft, STORAGE_KEY } from './modules/storage.js';
import {
    getHistory,
    saveToHistory,
    deleteFromHistory,
    clearHistory,
    getHistoryEntry,
    renderHistoryList,
    toggleHistoryPanel
} from './modules/history.js';
import { addItemRow, renderItemsForm, ensureAtLeastOneItemRow } from './modules/items.js';
import { renderInvoice, isInvoiceVisible } from './modules/invoice.js';
import {
    getDataFromForm,
    updateFormTotalsDisplay,
    validateData,
    syncFromForm,
    applyDataToForm
} from './modules/form.js';
import { downloadPDF, shareInvoice } from './modules/pdf.js';
import {
    exportJsonToTextarea,
    downloadJsonFile,
    importJsonData,
    handleFileImport
} from './modules/json-io.js';

// Constants
const LAST_NUMBER_KEY = 'invoice.lastNumber';

// State
let isApplyingData = false;

/**
 * Generate bill from form data
 */
function generateBill() {
    const data = syncFromForm({ showInvoice: true });
    if (!validateData(data)) {
        alert('Please fill in all required fields and add at least one line item.');
        return;
    }
    data.meta.showInvoice = true;
    saveDraft(data);
    renderInvoice(data);
    localStorage.setItem(LAST_NUMBER_KEY, data.invoice.number);
    saveToHistory(data);
    document.getElementById('invoice').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Load invoice from history by ID
 * @param {number} id - History entry ID
 */
function loadFromHistory(id) {
    const entry = getHistoryEntry(id);
    if (!entry || !entry.data) return;
    applyDataToForm(entry.data, (options) => {
        isApplyingData = true;
        syncFromForm(options);
        isApplyingData = false;
    });
    toggleHistoryPanel(false);
}

/**
 * Reset the current draft
 */
function resetDraft() {
    const shouldReset = confirm('Reset the current draft? Your stored draft will be cleared.');
    if (!shouldReset) return;

    clearDraft();
    document.getElementById('invoice').style.display = 'none';
    document.getElementById('invoicePlaceholder').style.display = 'flex';
    document.getElementById('downloadBtn').style.display = 'none';
    document.getElementById('shareBtn').style.display = 'none';
    setValue('jsonData', '');

    // Reset all form fields
    setValue('sellerName', '');
    setValue('sellerAddress', '');
    setValue('sellerEmail', '');
    setValue('sellerPhone', '');
    setValue('billToName', '');
    setValue('billToAddress', '');
    setValue('billToEmail', '');
    setValue('billToPhone', '');
    setValue('invoiceTitle', 'INVOICE');
    setValue('invoiceDueDate', '');
    setValue('currencyCode', 'INR');
    setValue('taxRate', '0');
    setValue('discountAmount', '0');
    setValue('invoiceNotes', '');
    setValue('invoiceInstructions', '');

    const today = new Date().toISOString().split('T')[0];
    setValue('invoiceDate', today);

    const lastNumber = localStorage.getItem(LAST_NUMBER_KEY);
    if (lastNumber) {
        setValue('invoiceNumber', String(parseNumber(lastNumber, 0) + 1));
    } else {
        setValue('invoiceNumber', '1');
    }

    renderItemsForm([]);
    ensureAtLeastOneItemRow(addItemRow);
    syncFromForm({ render: false, showInvoice: false });
}

/**
 * Attach all event handlers
 */
function attachEventHandlers() {
    const form = document.getElementById('billForm');
    form.addEventListener('input', () => {
        if (isApplyingData) return;
        const shouldRender = isInvoiceVisible();
        syncFromForm({ render: shouldRender });
    });

    document.getElementById('addItemBtn').addEventListener('click', () => {
        addItemRow({ description: '', quantity: 1, unitPrice: 0 });
        syncFromForm({ render: isInvoiceVisible() });
    });

    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.addEventListener('click', (event) => {
        if (!event.target.classList.contains('remove-item')) return;
        const row = event.target.closest('.item-row');
        if (row) row.remove();
        ensureAtLeastOneItemRow(addItemRow);
        syncFromForm({ render: isInvoiceVisible() });
    });

    document.getElementById('exportJsonBtn').addEventListener('click', exportJsonToTextarea);
    document.getElementById('downloadJsonBtn').addEventListener('click', downloadJsonFile);
    document.getElementById('importJsonBtn').addEventListener('click', () => {
        const raw = getValue('jsonData');
        if (!raw.trim()) {
            alert('Paste invoice JSON first.');
            return;
        }
        importJsonData(raw, (options) => {
            isApplyingData = true;
            syncFromForm(options);
            isApplyingData = false;
        });
    });

    document.getElementById('importFile').addEventListener('change', (event) => {
        handleFileImport(event, (options) => {
            isApplyingData = true;
            syncFromForm(options);
            isApplyingData = false;
        });
    });
    document.getElementById('resetDraftBtn').addEventListener('click', resetDraft);

    // Invoice number increment/decrement buttons
    document.getElementById('incrementInvoice').addEventListener('click', () => {
        const input = document.getElementById('invoiceNumber');
        const current = parseNumber(input.value, 0);
        input.value = current + 1;
        syncFromForm({ render: isInvoiceVisible() });
    });

    document.getElementById('decrementInvoice').addEventListener('click', () => {
        const input = document.getElementById('invoiceNumber');
        const current = parseNumber(input.value, 0);
        if (current > 1) {
            input.value = current - 1;
            syncFromForm({ render: isInvoiceVisible() });
        }
    });

    // Drag and drop support for JSON textarea
    const jsonTextarea = document.getElementById('jsonData');

    jsonTextarea.addEventListener('dragover', (e) => {
        e.preventDefault();
        jsonTextarea.classList.add('drag-over');
    });

    jsonTextarea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        jsonTextarea.classList.remove('drag-over');
    });

    jsonTextarea.addEventListener('drop', (e) => {
        e.preventDefault();
        jsonTextarea.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json') && file.type !== 'application/json') {
            alert('Please drop a .json file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            importJsonData(reader.result, (options) => {
                isApplyingData = true;
                syncFromForm(options);
                isApplyingData = false;
            });
        };
        reader.readAsText(file);
    });

    // History panel handlers
    document.getElementById('historyToggle').addEventListener('click', () => toggleHistoryPanel());
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        clearHistory();
        renderHistoryList();
    });

    document.getElementById('historyList').addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.history-item-delete');
        if (deleteBtn) {
            e.stopPropagation();
            const id = parseInt(deleteBtn.dataset.id, 10);
            deleteFromHistory(id);
            renderHistoryList();
            return;
        }

        const item = e.target.closest('.history-item');
        if (item) {
            const id = parseInt(item.dataset.id, 10);
            loadFromHistory(id);
        }
    });
}

/**
 * Initialize the application
 */
function init() {
    const today = new Date().toISOString().split('T')[0];
    if (!getValue('invoiceDate')) {
        setValue('invoiceDate', today);
    }

    attachEventHandlers();

    const storedDraft = loadDraft();
    if (storedDraft) {
        isApplyingData = true;
        applyDataToForm(storedDraft, (options) => {
            syncFromForm(options);
        });
        isApplyingData = false;
        if (storedDraft.meta?.showInvoice) {
            renderInvoice(storedDraft);
        }
        return;
    }

    const lastNumber = localStorage.getItem(LAST_NUMBER_KEY);
    if (lastNumber && !getValue('invoiceNumber')) {
        setValue('invoiceNumber', String(parseNumber(lastNumber, 0) + 1));
    }

    ensureAtLeastOneItemRow(addItemRow);
    syncFromForm({ render: false, showInvoice: false });
}

// Expose functions to global scope for onclick handlers in HTML
window.generateBill = generateBill;
window.downloadPDF = downloadPDF;
window.shareInvoice = shareInvoice;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
