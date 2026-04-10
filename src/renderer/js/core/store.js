import { api } from './api.js';

/** @typedef {Object} Todo
 * @property {string} id
 * @property {string} text
 * @property {string|null} description
 * @property {string[]} labels
 * @property {boolean} completed
 * @property {string} createdAt
 * @property {string} [completedAt]
 */

/** @type {Todo[]} */
export let todos = [];

/** @type {string|null} */
export let draggingId = null;

export const state = {
    expandedTasks: {},
    pendingDeletes: {},
    modalTagsArray: [],
    editingTodoId: null,
    contextMenuTodoId: null,
    isConfirmingDelete: false
};

/**
 * Initializes state and migrates legacy data if necessary.
 */
export async function initStore() {
    todos = await api.getTodos();
    
    let migrated = false;
    
    // Migration: label -> labels
    todos = todos.map(t => {
        if (t.label !== undefined) {
            t.labels = t.label ? [t.label] : [];
            delete t.label;
            migrated = true;
        }
        if (!t.labels) t.labels = [];
        return t;
    });

    // Migration: Add createdAt if missing
    todos = todos.map(t => {
        if (!t.createdAt) {
            t.createdAt = new Date().toISOString();
            migrated = true;
        }
        return t;
    });

    if (migrated) {
        await api.saveTodos(todos);
    }
}

/**
 * Updates the global todos array and persists changes.
 * @param {Todo[]} newTodos 
 */
export async function setTodos(newTodos) {
    todos = newTodos;
    await api.saveTodos(todos);
}

/**
 * Sets the ID of the task currently being dragged.
 * @param {string|null} id 
 */
export function setDraggingId(id) {
    draggingId = id;
}
