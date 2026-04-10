const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let DATA_FILE = '';

// app.getPath works after basic initialization
try {
    const userDataPath = app.getPath('userData');
    DATA_FILE = path.join(userDataPath, 'todos.json');

    if (!fs.existsSync(DATA_FILE)) {
        const bundledTodos = path.join(__dirname, '..', '..', 'todos.json');
        if (fs.existsSync(bundledTodos)) {
            fs.copyFileSync(bundledTodos, DATA_FILE);
        } else {
            fs.writeFileSync(DATA_FILE, JSON.stringify([]));
        }
    }
} catch (error) {
    console.error("Could not set DATA_FILE:", error);
}

function createWindow() {
    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        titleBarStyle: 'hiddenInset',
        icon: iconPath,
        webPreferences: {
            // Note: renderer relies on this preload script
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(() => {
    if (process.platform === 'darwin') {
        app.dock.setIcon(path.join(__dirname, '..', '..', 'assets', 'icon.png'));
    }
    
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for Data Persistence
ipcMain.handle('get-todos', () => {
    try {
        const rawData = fs.readFileSync(DATA_FILE);
        return JSON.parse(rawData);
    } catch(err) {
        return [];
    }
});

ipcMain.handle('save-todos', (event, todos) => {
    if(!DATA_FILE) return false;
    fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
    return true;
});
