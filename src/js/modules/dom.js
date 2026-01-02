/**
 * DOM Helper Functions
 * Utilities for getting/setting form values and creating clickable links
 */

/**
 * Get value from a form element by ID
 * @param {string} id - Element ID
 * @param {string} fallback - Default value if element not found
 * @returns {string} Element value or fallback
 */
export function getValue(id, fallback = '') {
    const el = document.getElementById(id);
    if (!el) return fallback;
    return el.value ?? fallback;
}

/**
 * Set value on a form element by ID
 * @param {string} id - Element ID
 * @param {*} value - Value to set
 */
export function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? '';
}

/**
 * Set text content of an element by ID
 * @param {string} id - Element ID
 * @param {*} value - Text to set
 */
export function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value ?? '';
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Set clickable email link in an element
 * @param {string} id - Element ID
 * @param {string} email - Email address
 */
export function setEmailLink(id, email) {
    const el = document.getElementById(id);
    if (!el) return;
    if (email && email.trim()) {
        el.innerHTML = '';
        const link = document.createElement('a');
        link.href = `mailto:${escapeHtml(email.trim())}`;
        link.textContent = email.trim();
        link.style.color = 'inherit';
        link.style.textDecoration = 'none';
        el.appendChild(link);
    } else {
        el.textContent = '';
    }
}

/**
 * Set clickable phone link in an element
 * @param {string} id - Element ID
 * @param {string} phone - Phone number
 */
export function setPhoneLink(id, phone) {
    const el = document.getElementById(id);
    if (!el) return;
    if (phone && phone.trim()) {
        el.innerHTML = '';
        const link = document.createElement('a');
        // Remove spaces and special chars for tel: link
        const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
        link.href = `tel:${escapeHtml(cleanPhone)}`;
        link.textContent = phone.trim();
        link.style.color = 'inherit';
        link.style.textDecoration = 'none';
        el.appendChild(link);
    } else {
        el.textContent = '';
    }
}
