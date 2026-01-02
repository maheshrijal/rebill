/**
 * Template Registry
 * Manages available invoice templates
 */

import DefaultTemplate from './default.js';
import MinimalTemplate from './minimal.js';

const templates = [
    { id: 'default', name: 'Default Standard', strategy: DefaultTemplate },
    { id: 'minimal', name: 'Minimalist', strategy: MinimalTemplate }
];

/**
 * Get all available templates
 * @returns {Array} List of template objects
 */
export function getAvailableTemplates() {
    return templates;
}

/**
 * Get template definition by ID
 * @param {string} id - Template ID
 * @returns {Object|null} Template object or null if not found
 */
export function getTemplate(id) {
    const template = templates.find(t => t.id === id) || templates[0];
    return template.strategy;
}
