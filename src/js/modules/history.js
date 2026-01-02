/**
 * History Module
 * Invoice history management in localStorage
 */

import { formatDate, formatCurrency } from './formatters.js';

const HISTORY_KEY = 'invoice.history';

/**
 * Get all history entries from localStorage
 * @returns {Array} Array of history entries
 */
export function getHistory() {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

/**
 * Save invoice data to history
 * @param {Object} data - Invoice data to save
 */
export function saveToHistory(data) {
    const history = getHistory();
    const entry = {
        id: Date.now(),
        date: data.invoice?.date || new Date().toISOString().split('T')[0],
        number: data.invoice?.number || '',
        customerName: data.billTo?.name || '',
        total: data.totals?.total || 0,
        currency: data.settings?.currency || 'INR',
        data: data
    };

    // Check for duplicate invoice number
    const existingIndex = history.findIndex(h => h.number === entry.number && entry.number);
    if (existingIndex >= 0) {
        history[existingIndex] = entry;
    } else {
        history.unshift(entry);
    }

    // Keep only last 50 entries
    const trimmed = history.slice(0, 50);

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.warn('Failed to save history:', e);
    }
}

/**
 * Delete a history entry by ID
 * @param {number} id - Entry ID to delete
 */
export function deleteFromHistory(id) {
    const history = getHistory().filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/**
 * Clear all history entries
 */
export function clearHistory() {
    if (!confirm('Clear all invoice history? This cannot be undone.')) return;
    localStorage.removeItem(HISTORY_KEY);
}

/**
 * Get a history entry by ID
 * @param {number} id - Entry ID
 * @returns {Object|null} History entry or null
 */
export function getHistoryEntry(id) {
    const history = getHistory();
    return history.find(h => h.id === id) || null;
}

/**
 * Render the history list in the UI
 * @param {Function} onLoad - Callback when an entry is loaded
 * @param {Function} onDelete - Callback when an entry is deleted
 */
export function renderHistoryList() {
    const list = document.getElementById('historyList');
    if (!list) return;

    const history = getHistory();
    list.innerHTML = '';

    if (history.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'history-empty';
        empty.textContent = 'No saved invoices yet';
        list.appendChild(empty);
        return;
    }

    history.forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.dataset.id = entry.id;

        const info = document.createElement('div');
        info.className = 'history-item-info';

        const title = document.createElement('div');
        title.className = 'history-item-title';
        title.textContent = `#${entry.number} - ${entry.customerName || 'Unknown'}`;

        const meta = document.createElement('div');
        meta.className = 'history-item-meta';
        meta.textContent = `${formatDate(entry.date)} · ${formatCurrency(entry.total, entry.currency)}`;

        info.appendChild(title);
        info.appendChild(meta);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'history-item-delete';
        deleteBtn.dataset.id = entry.id;
        deleteBtn.title = 'Delete';
        deleteBtn.textContent = '×';

        item.appendChild(info);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

/**
 * Toggle history panel visibility
 * @param {boolean} show - Optional explicit show/hide
 */
export function toggleHistoryPanel(show) {
    const panel = document.getElementById('historyPanel');
    if (!panel) return;

    if (typeof show === 'boolean') {
        panel.style.display = show ? 'block' : 'none';
    } else {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    if (panel.style.display === 'block') {
        renderHistoryList();
    }
}

export { HISTORY_KEY };
