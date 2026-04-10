import { todos, state } from '../core/store.js';
import { escapeHtml, formatFullLocal, getRelativeTime } from '../core/utils.js';

// DOM Elements
export const elements = {
    todoList: document.getElementById('todo-list'),
    todoForm: document.getElementById('todo-form'),
    todoInput: document.getElementById('todo-input'),
    advancedAddBtn: document.getElementById('advanced-add-btn'),
    tagFilter: document.getElementById('tag-filter'),
    taskCount: document.getElementById('task-count'),
    modal: {
        overlay: document.getElementById('add-task-modal'),
        form: document.getElementById('detailed-todo-form'),
        title: document.getElementById('modal-title'),
        desc: document.getElementById('modal-desc'),
        tags: document.getElementById('modal-tags'),
        badges: document.getElementById('modal-tag-badges'),
        autocomplete: document.getElementById('modal-autocomplete-list'),
        heading: document.getElementById('modal-heading'),
        saveBtn: document.getElementById('modal-save-btn'),
        cancelBtn: document.getElementById('modal-cancel-btn')
    },
    contextMenu: {
        overlay: document.getElementById('context-menu'),
        edit: document.getElementById('ctx-edit'),
        toggle: document.getElementById('ctx-toggle'),
        delete: document.getElementById('ctx-delete')
    }
};

/**
 * Updates the task statistics in the header.
 */
export function updateTaskCount() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;
    
    elements.taskCount.innerHTML = `
        <span title="Total Tasks">${total} total</span> • 
        <span title="Completed Tasks" style="color: var(--success);">${completed} done</span> • 
        <span title="Pending Tasks" style="color: var(--accent-color);">${pending} pending</span>
    `;
}

/**
 * Populates the tag filter dropdown.
 */
export function populateFilters() {
    const currentFilter = elements.tagFilter.value;
    const allTags = todos.flatMap(t => t.labels || []);
    const uniqueTags = [...new Set(allTags)];
    
    elements.tagFilter.innerHTML = '<option value="all">All Tags</option>';
    uniqueTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.toLowerCase();
        option.textContent = escapeHtml(tag);
        elements.tagFilter.appendChild(option);
    });

    if (currentFilter && uniqueTags.some(t => t.toLowerCase() === currentFilter)) {
        elements.tagFilter.value = currentFilter;
    } else {
        elements.tagFilter.value = 'all';
    }
}

/**
 * Renders the todo list based on current state and filter.
 */
export function renderTodos() {
    elements.todoList.innerHTML = '';
    
    const activeFilter = elements.tagFilter.value;
    const filteredTodos = todos.filter(todo => {
        if (activeFilter === 'all') return true;
        const labels = todo.labels || [];
        return labels.some(l => l.toLowerCase() === activeFilter);
    });
    
    filteredTodos.forEach((todo, index) => {
        const isDeleting = !!state.pendingDeletes[todo.id];
        const isExpanded = !!state.expandedTasks[todo.id];
        
        const li = document.createElement('li');
        li.id = `todo-${todo.id}`;
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isDeleting ? 'deleting' : ''} ${isExpanded ? 'expanded' : ''}`;
        
        // Context menu attachment (logic in handlers.js)
        li.setAttribute('data-id', todo.id);
        
        if (activeFilter === 'all') {
            li.setAttribute('draggable', 'true');
        }

        const labels = todo.labels || [];
        const tagHtml = labels.length > 0 
            ? labels.map(l => `<div class="todo-tag" data-action="edit-tag" title="Edit Tag">${escapeHtml(l)}</div>`).join('')
            : `<div class="todo-tag empty" data-action="edit-tag" title="Add Tag">+ Tag</div>`;
        
        let actionButtonsHtml = isDeleting 
            ? `
                <div class="delete-actions">
                    <button class="confirm-btn" data-action="confirm-delete" title="Delete Confirm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button class="cancel-btn" data-action="cancel-delete" title="Cancel">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `
            : `
                <button class="edit-btn" data-action="edit-task" title="Edit Task">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="delete-btn" data-action="request-delete" title="Delete Task">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;

        li.innerHTML = `
            <div class="todo-item-header">
                <div class="todo-content">
                    <div class="checkbox ${todo.completed ? 'checked' : ''}" data-action="toggle-todo">
                        ${todo.completed ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                    </div>
                    <div class="todo-text-group">
                        <span class="todo-text ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.text)}</span>
                        <div class="inline-tag-wrapper">
                            ${tagHtml}
                        </div>
                    </div>
                </div>
                <div class="todo-actions">
                    ${actionButtonsHtml}
                    ${!isDeleting ? `
                    <button class="expand-btn" data-action="toggle-expand" title="Details">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="todo-details">
                ${todo.description ? `
                <div class="description-box" data-action="dblclick-edit">
                    ${marked.parse((todo.description || '').trim())}
                </div>
                ` : ''}
                <div class="todo-meta">
                    <div class="meta-item" title="${formatFullLocal(todo.createdAt)}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-8m0 0V4m0 8h8m-8 0H4"></path></svg>
                        <span>Created: ${getRelativeTime(todo.createdAt)}</span>
                    </div>
                    ${todo.completedAt ? `
                    <div class="meta-separator">•</div>
                    <div class="meta-item" title="${formatFullLocal(todo.completedAt)}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>Completed: ${getRelativeTime(todo.completedAt)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        elements.todoList.appendChild(li);
    });
    
    updateTaskCount();
}

/**
 * Renders the tag badges inside the modal.
 */
export function renderModalTokens() {
    elements.modal.badges.innerHTML = '';
    state.modalTagsArray.forEach((tag, index) => {
        const badge = document.createElement('div');
        badge.className = 'token-badge';
        badge.innerHTML = `
            <span>${escapeHtml(tag)}</span>
            <span class="remove-token" data-index="${index}">&times;</span>
        `;
        elements.modal.badges.appendChild(badge);
    });
}
