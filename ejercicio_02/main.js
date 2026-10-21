const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 840,
    minHeight: 620,
    title: 'CineScope - Catálogo de Películas y Series',
    icon: path.join(__dirname, 'assets/icon.png'),
    backgroundColor: '#070a10',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.setMenuBarVisibility(false);

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  win.once('ready-to-show', () => {
    win.show();
    if (process.env.TEST_RUN === '1') {
      console.log('ELECTRON_TEST_OK: CineScope se inicializó correctamente.');
      setTimeout(() => app.quit(), 3000);
    }
  });

  win.loadFile(path.join(__dirname, 'src/index.html'));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
