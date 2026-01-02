/**
 * Storage Module
 * Draft save/load and deep merge utilities
 */

const STORAGE_KEY = 'invoice.draft.v1';

/**
 * Save draft data to localStorage
 * @param {Object} data - Invoice data to save
 */
export function saveDraft(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save draft:', e);
    }
}

/**
 * Load draft data from localStorage
 * @returns {Object|null} Saved draft or null
 */
export function loadDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

/**
 * Clear the saved draft
 */
export function clearDraft() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Deep merge source object into target
 * Includes protection against prototype pollution
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} Merged target object
 */
export function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;

    const UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype'];

    Object.keys(source).forEach((key) => {
        if (UNSAFE_KEYS.includes(key)) return;
        if (!Object.prototype.hasOwnProperty.call(source, key)) return;

        const value = source[key];
        if (Array.isArray(value)) {
            target[key] = value.slice();
        } else if (value && typeof value === 'object') {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            deepMerge(target[key], value);
        } else {
            target[key] = value;
        }
    });
    return target;
}

export { STORAGE_KEY };
