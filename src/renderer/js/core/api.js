/**
 * API module for communicating with the Electron main process.
 */
export const api = {
    /**
     * Fetches todos from local storage.
     * @returns {Promise<Array>}
     */
    async getTodos() {
        try {
            return await window.api.getTodos();
        } catch (error) {
            console.error('Failed to fetch todos:', error);
            return [];
        }
    },

    /**
     * Saves todos to local storage.
     * @param {Array} todos 
     * @returns {Promise<boolean>}
     */
    async saveTodos(todos) {
        try {
            return await window.api.saveTodos(todos);
        } catch (error) {
            console.error('Failed to save todos:', error);
            return false;
        }
    }
};
