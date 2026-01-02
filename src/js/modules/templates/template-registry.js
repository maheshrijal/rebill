/**
 * Template Registry
 * Manages available invoice templates
 */

const templates = [
    { id: 'default', name: 'Default Standard' },
    { id: 'minimal', name: 'Minimalist' }
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
    return templates.find(t => t.id === id) || templates[0];
}
