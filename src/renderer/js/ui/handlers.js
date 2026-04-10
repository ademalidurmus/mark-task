import { todos, state, setTodos, setDraggingId } from '../core/store.js';
import { elements, renderTodos, populateFilters, renderModalTokens } from '../ui/ui.js';
import { api } from '../core/api.js';
import { escapeHtml } from '../core/utils.js';

let placeholder = document.createElement('li');
placeholder.className = 'placeholder-item';

/**
 * Handle Drag Start
 */
export function handleDragStart(e) {
    const li = e.target.closest('.todo-item');
    if (!li) return;
    
    setDraggingId(li.getAttribute('data-id'));
    e.dataTransfer.effectAllowed = 'move';
    li.classList.add('dragging');
    
    setTimeout(() => {
        li.style.display = 'none';
    }, 0);
}

/**
 * Handle Drag Over
 */
export function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const targetElement = e.target.closest('.todo-item:not(.dragging)');
    
    if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
            targetElement.parentNode.insertBefore(placeholder, targetElement);
        } else {
            targetElement.parentNode.insertBefore(placeholder, targetElement.nextSibling);
        }
    } else if (e.target === elements.todoList) {
        elements.todoList.appendChild(placeholder);
    }
}

/**
 * Handle Drop
 */
export async function handleDrop(e) {
    e.preventDefault();
    const draggingId = document.querySelector('.todo-item.dragging')?.getAttribute('data-id');
    
    if (draggingId && placeholder.parentNode) {
        const draggedNode = document.querySelector('.dragging');
        const visibleItems = Array.from(elements.todoList.children).filter(el => 
            el !== draggedNode && (el.classList.contains('todo-item') || el.classList.contains('placeholder-item'))
        );
        
        const newIndex = visibleItems.indexOf(placeholder);
        const draggedIndex = todos.findIndex(t => t.id === draggingId);
        
        if (newIndex !== -1 && draggedIndex !== -1) {
            const newTodos = [...todos];
            const [draggedItem] = newTodos.splice(draggedIndex, 1);
            newTodos.splice(newIndex, 0, draggedItem);
            await setTodos(newTodos);
        }
    }

    if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }

    resetDragStates();
    renderTodos();
}

/**
 * Handle Drag End
 */
export function handleDragEnd(e) {
    if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
    resetDragStates();
}

function resetDragStates() {
    document.querySelectorAll('.todo-item').forEach(el => {
        el.classList.remove('dragging');
        el.style.display = '';
    });
    setDraggingId(null);
}

/**
 * Markdown Insertion Logic
 */
export function insertMarkdown(type) {
    const textarea = elements.modal.desc;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    let replacement = '';
    let cursorOffset = 0;

    switch (type) {
        case 'bold':
            replacement = `**${selectedText || 'bold text'}**`;
            cursorOffset = selectedText ? replacement.length : 2;
            break;
        case 'italic':
            replacement = `*${selectedText || 'italic text'}*`;
            cursorOffset = selectedText ? replacement.length : 1;
            break;
        case 'h1':
            replacement = `\n# ${selectedText || 'Heading 1'}`;
            cursorOffset = replacement.length;
            break;
        case 'h2':
            replacement = `\n## ${selectedText || 'Heading 2'}`;
            cursorOffset = replacement.length;
            break;
        case 'list':
            replacement = `\n- ${selectedText || 'list item'}`;
            cursorOffset = replacement.length;
            break;
        case 'tasklist':
            replacement = `\n- [ ] ${selectedText || 'task item'}`;
            cursorOffset = replacement.length;
            break;
        case 'link':
            replacement = `[${selectedText || 'link text'}](https://)`;
            cursorOffset = selectedText ? replacement.length : 1;
            break;
        case 'code':
            if (selectedText.includes('\n')) {
                replacement = `\n\`\`\`\n${selectedText}\n\`\`\`\n`;
            } else {
                replacement = `\`${selectedText || 'code'}\``;
            }
            cursorOffset = selectedText ? replacement.length : 1;
            break;
    }

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();
    
    if (!selectedText && ['bold', 'italic', 'link', 'code'].includes(type)) {
        const innerOffsets = { bold: 2, italic: 1, link: 1, code: 1 };
        const innerLengths = { bold: 9, italic: 11, link: 9, code: 4 };
        textarea.setSelectionRange(start + innerOffsets[type], start + innerOffsets[type] + innerLengths[type]);
    } else {
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }
}

/**
 * Context Menu Logic
 */
export function showContextMenu(e, id) {
    e.preventDefault();
    e.stopPropagation();
    
    state.contextMenuTodoId = id;
    state.isConfirmingDelete = false;
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    elements.contextMenu.delete.classList.remove('confirm-state');
    elements.contextMenu.delete.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Delete
    `;

    const toggleSpan = elements.contextMenu.toggle.querySelector('span');
    toggleSpan.textContent = todo.completed ? 'Mark as Undone' : 'Mark as Done';

    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 180;
    const menuHeight = 150;

    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;

    elements.contextMenu.overlay.style.left = `${x}px`;
    elements.contextMenu.overlay.style.top = `${y}px`;
    elements.contextMenu.overlay.classList.remove('hidden');
}

export function hideContextMenu() {
    elements.contextMenu.overlay.classList.add('hidden');
    state.contextMenuTodoId = null;
}

/**
 * Autocomplete Logic
 */
export function showAutocomplete(inputElement, listElement, val, isTokenized = false) {
    const allTags = todos.flatMap(t => t.labels || []);
    const uniqueTags = [...new Set(allTags)];
    listElement.innerHTML = '';
    
    let lastSegment = val;
    let existingTags = [];

    if (!isTokenized) {
        const segments = val.split(',').map(s => s.trim());
        lastSegment = segments[segments.length - 1];
        existingTags = segments.slice(0, -1).map(s => s.toLowerCase());
    } else {
        existingTags = state.modalTagsArray.map(t => t.toLowerCase());
    }
    
    let filteredTags = uniqueTags.filter(tag => tag.toLowerCase().includes(lastSegment.toLowerCase()));
    filteredTags = filteredTags.filter(tag => !existingTags.includes(tag.toLowerCase()));
    
    if (filteredTags.length === 0) {
        listElement.style.display = 'none';
        return;
    }
    
    filteredTags.forEach(tag => {
        const item = document.createElement('div');
        item.textContent = tag;
        item.onclick = (e) => {
            e.stopPropagation();
            if (isTokenized) {
                if (!state.modalTagsArray.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
                    state.modalTagsArray.push(tag);
                    renderModalTokens();
                }
                inputElement.value = '';
            } else {
                const segments = val.split(',').map(s => s.trim());
                segments[segments.length - 1] = tag;
                inputElement.value = segments.join(', ') + ', ';
            }
            listElement.style.display = 'none';
            inputElement.focus();
        };
        listElement.appendChild(item);
    });
    
    listElement.style.display = 'block';
}

/**
 * Inline Tag Editor logic
 */
export async function editTag(event, id) {
    event.stopPropagation();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const targetEl = event.target;
    if (targetEl.tagName === 'INPUT' || targetEl.closest('.token-container')) return;

    const todoItem = targetEl.closest('.todo-item');
    todoItem.classList.add('editing-tags');

    const wrapper = targetEl.closest('.inline-tag-wrapper');
    const container = document.createElement('div');
    container.className = 'token-container inline-token-container';
    
    const badgesArea = document.createElement('div');
    badgesArea.className = 'token-badges';
    
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'token-input inline-token-input';
    inputEl.placeholder = 'Add tag...';
    
    const autocompleteList = document.createElement('div');
    autocompleteList.className = 'autocomplete-items inline-autocomplete-items';

    const renderInlineTokens = () => {
        badgesArea.innerHTML = '';
        (todo.labels || []).forEach((tag, index) => {
            const badge = document.createElement('div');
            badge.className = 'token-badge';
            badge.innerHTML = `
                <span>${escapeHtml(tag)}</span>
                <span class="remove-token">&times;</span>
            `;
            badge.querySelector('.remove-token').onclick = async (e) => {
                e.stopPropagation();
                todo.labels.splice(index, 1);
                renderInlineTokens();
                populateFilters();
                await api.saveTodos(todos);
            };
            badgesArea.appendChild(badge);
        });
    };

    const addInlineToken = async (tag) => {
        if (!todo.labels) todo.labels = [];
        if (!todo.labels.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
            todo.labels.push(tag);
            renderInlineTokens();
            populateFilters();
            await api.saveTodos(todos);
        }
    };

    renderInlineTokens();
    
    container.appendChild(badgesArea);
    container.appendChild(inputEl);
    container.appendChild(autocompleteList);
    
    const updateInlineAutocomplete = () => {
        const allTags = todos.flatMap(t => t.labels || []);
        const uniqueTags = [...new Set(allTags)];
        autocompleteList.innerHTML = '';
        const val = inputEl.value.trim();
        const existingTags = (todo.labels || []).map(t => t.toLowerCase());
        
        const filteredTags = uniqueTags.filter(tag => 
            tag.toLowerCase().includes(val.toLowerCase()) && !existingTags.includes(tag.toLowerCase())
        );

        if (filteredTags.length === 0) {
            autocompleteList.style.display = 'none';
            return;
        }

        filteredTags.forEach(tag => {
            const item = document.createElement('div');
            item.textContent = tag;
            item.onclick = async (e) => {
                e.stopPropagation();
                await addInlineToken(tag);
                inputEl.value = '';
                autocompleteList.style.display = 'none';
                inputEl.focus();
            };
            autocompleteList.appendChild(item);
        });
        autocompleteList.style.display = 'block';
    };

    inputEl.addEventListener('input', updateInlineAutocomplete);
    inputEl.addEventListener('focus', updateInlineAutocomplete);

    wrapper.innerHTML = '';
    wrapper.appendChild(container);
    inputEl.focus();
    updateInlineAutocomplete();

    inputEl.onclick = (e) => e.stopPropagation();

    inputEl.addEventListener('keydown', async function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = this.value.trim().replace(/,$/, '');
            if (val) {
                await addInlineToken(val);
                this.value = '';
                autocompleteList.style.display = 'none';
            }
        } else if (e.key === 'Backspace' && this.value === '' && (todo.labels || []).length > 0) {
            todo.labels.pop();
            renderInlineTokens();
            populateFilters();
            await api.saveTodos(todos);
            updateInlineAutocomplete();
        } else if (e.key === 'Escape') {
            todoItem.classList.remove('editing-tags');
            renderTodos();
        }
    });

    inputEl.addEventListener('blur', () => {
        setTimeout(() => {
            if (container.contains(document.activeElement)) return;
            todoItem.classList.remove('editing-tags');
            renderTodos();
        }, 200);
    });
}
