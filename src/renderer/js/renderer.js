import { initStore, todos, state, setTodos } from './core/store.js';
import { elements, renderTodos, populateFilters, renderModalTokens } from './ui/ui.js';
import { 
    handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    insertMarkdown, showContextMenu, hideContextMenu, showAutocomplete, editTag
} from './ui/handlers.js';
import { api } from './core/api.js';

/**
 * Main Application Entry Point
 */
async function initApp() {
    // 1. Initialize State & Migrations
    await initStore();

    // 2. Initial Render
    populateFilters();
    renderTodos();

    // 3. Mount Event Listeners
    mountEventListeners();
}

/**
 * Orchestrates all application event listeners.
 */
function mountEventListeners() {
    // Quick Add Form
    elements.todoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = elements.todoInput.value.trim();
        if (text) {
            const newTodo = {
                id: Date.now().toString(),
                text: text,
                description: null,
                labels: [],
                completed: false,
                createdAt: new Date().toISOString()
            };
            const newTodos = [...todos, newTodo];
            await setTodos(newTodos);
            elements.todoInput.value = '';
            populateFilters();
            renderTodos();
        }
    });

    // Tag Filter
    elements.tagFilter.addEventListener('change', () => renderTodos());

    // Detailed Modal Triggers
    elements.advancedAddBtn.addEventListener('click', () => {
        state.editingTodoId = null;
        elements.modal.heading.textContent = 'Add Detailed Task';
        elements.modal.saveBtn.textContent = 'Save';
        elements.modal.form.reset();
        state.modalTagsArray = [];
        renderModalTokens();
        elements.modal.overlay.classList.remove('hidden');
        elements.modal.title.focus();
    });

    elements.modal.cancelBtn.addEventListener('click', () => {
        elements.modal.overlay.classList.add('hidden');
        elements.modal.form.reset();
    });

    // Modal Form Submit
    elements.modal.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleText = elements.modal.title.value.trim();
        const descText = elements.modal.desc.value.trim();
        
        if (titleText) {
            let newTodos = [...todos];
            if (state.editingTodoId) {
                const index = newTodos.findIndex(t => t.id === state.editingTodoId);
                if (index !== -1) {
                    newTodos[index] = {
                        ...newTodos[index],
                        text: titleText,
                        description: descText !== '' ? descText : null,
                        labels: [...state.modalTagsArray]
                    };
                }
            } else {
                newTodos.push({
                    id: Date.now().toString(),
                    text: titleText,
                    description: descText !== '' ? descText : null,
                    labels: [...state.modalTagsArray],
                    completed: false,
                    createdAt: new Date().toISOString()
                });
            }
            
            await setTodos(newTodos);
            state.editingTodoId = null;
            elements.modal.overlay.classList.add('hidden');
            populateFilters();
            renderTodos();
        }
    });

    // Modal Tags Autocomplete
    elements.modal.tags.addEventListener('input', function() {
        showAutocomplete(this, elements.modal.autocomplete, this.value, true);
    });
    elements.modal.tags.addEventListener('focus', function() {
        showAutocomplete(this, elements.modal.autocomplete, this.value, true);
    });

    elements.modal.tags.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = this.value.trim().replace(/,$/, '');
            if (val) {
                if (!state.modalTagsArray.map(t => t.toLowerCase()).includes(val.toLowerCase())) {
                    state.modalTagsArray.push(val);
                    renderModalTokens();
                }
                this.value = '';
                elements.modal.autocomplete.style.display = 'none';
            }
        } else if (e.key === 'Backspace' && this.value === '' && state.modalTagsArray.length > 0) {
            state.modalTagsArray.pop();
            renderModalTokens();
        }
    });

    // Global click for hiding tooltips/menus
    document.addEventListener('click', (e) => {
        if (e.target !== elements.modal.tags && e.target !== elements.modal.autocomplete) {
            elements.modal.autocomplete.style.display = 'none';
        }
        hideContextMenu();
    });

    // Markdown Toolbar
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => insertMarkdown(btn.getAttribute('data-type')));
    });

    // Event Delegation for List Items
    elements.todoList.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');
        const id = actionBtn.closest('.todo-item').getAttribute('data-id');
        const todo = todos.find(t => t.id === id);

        switch (action) {
            case 'toggle-todo':
                if (todo) {
                    todo.completed = !todo.completed;
                    todo.completedAt = todo.completed ? new Date().toISOString() : undefined;
                    await api.saveTodos(todos);
                    renderTodos();
                }
                break;
            case 'toggle-expand':
                state.expandedTasks[id] = !state.expandedTasks[id];
                renderTodos();
                break;
            case 'edit-task':
                openEditModal(id);
                break;
            case 'request-delete':
                state.pendingDeletes[id] = setTimeout(async () => {
                    await setTodos(todos.filter(t => t.id !== id));
                    renderTodos();
                }, 5000);
                renderTodos();
                break;
            case 'confirm-delete':
                clearTimeout(state.pendingDeletes[id]);
                delete state.pendingDeletes[id];
                await setTodos(todos.filter(t => t.id !== id));
                renderTodos();
                break;
            case 'cancel-delete':
                clearTimeout(state.pendingDeletes[id]);
                delete state.pendingDeletes[id];
                renderTodos();
                break;
            case 'edit-tag':
                editTag(e, id);
                break;
        }
    });

    elements.todoList.addEventListener('dblclick', (e) => {
        const box = e.target.closest('[data-action="dblclick-edit"]');
        if (box) {
            const id = box.closest('.todo-item').getAttribute('data-id');
            openEditModal(id);
        }
    });

    // Context Menu Mounting
    elements.contextMenu.edit.onclick = () => {
        if (state.contextMenuTodoId) openEditModal(state.contextMenuTodoId);
    };
    elements.contextMenu.toggle.onclick = async () => {
        const todo = todos.find(t => t.id === state.contextMenuTodoId);
        if (todo) {
            todo.completed = !todo.completed;
            todo.completedAt = todo.completed ? new Date().toISOString() : undefined;
            await api.saveTodos(todos);
            renderTodos();
        }
    };
    elements.contextMenu.delete.onclick = async (e) => {
        e.stopPropagation();
        if (!state.isConfirmingDelete) {
            state.isConfirmingDelete = true;
            elements.contextMenu.delete.classList.add('confirm-state');
            elements.contextMenu.delete.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Confirm?';
        } else {
            await setTodos(todos.filter(t => t.id !== state.contextMenuTodoId));
            hideContextMenu();
            renderTodos();
        }
    };

    // Drag & Drop
    elements.todoList.addEventListener('dragstart', handleDragStart);
    elements.todoList.addEventListener('dragover', handleDragOver);
    elements.todoList.addEventListener('drop', handleDrop);
    elements.todoList.addEventListener('dragend', handleDragEnd);

    // Right-click context menu
    elements.todoList.addEventListener('contextmenu', (e) => {
        const item = e.target.closest('.todo-item');
        if (item) {
            showContextMenu(e, item.getAttribute('data-id'));
        }
    });
}

/**
 * Opens the edit modal for a specific todo.
 * @param {string} id 
 */
function openEditModal(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        state.editingTodoId = id;
        elements.modal.heading.textContent = 'Edit Task';
        elements.modal.saveBtn.textContent = 'Update';
        elements.modal.title.value = todo.text;
        elements.modal.desc.value = todo.description || '';
        state.modalTagsArray = [...(todo.labels || [])];
        renderModalTokens();
        elements.modal.overlay.classList.remove('hidden');
        elements.modal.title.focus();
    }
}

// Global functions for window objects (backward compatibility for some inline events)
window.removeModalToken = (index) => {
    state.modalTagsArray.splice(index, 1);
    renderModalTokens();
};

initApp();
