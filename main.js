import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,       // Убирает стандартную рамку окна и верхнюю панель
    transparent: true,  // Делает фон прозрачным
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Проверяем: если мы запустили собранный .exe, грузим index.html из папки dist.
  // Если через npm run dev, то грузим с локального сервера.
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});