const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, '..', '..', 'todos.json');

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

function createWindow() {
    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        titleBarStyle: 'hiddenInset',
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(() => {
    // Set dock icon for macOS
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
    const rawData = fs.readFileSync(DATA_FILE);
    return JSON.parse(rawData);
});

ipcMain.handle('save-todos', (event, todos) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
    return true;
});
