const { app, BrowserWindow, dialog } = require('electron');
const { createReadStream } = require('node:fs');
const { stat } = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..', 'dist');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webm': 'video/webm',
};

let server;
let localOrigin;

function isWithinAppRoot(filePath) {
  const relativePath = path.relative(appRoot, filePath);
  return relativePath === '' || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));
}

function createLocalServer() {
  return http.createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(new URL(request.url, localOrigin).pathname);
    } catch {
      response.writeHead(400).end('Invalid request path');
      return;
    }

    const requestPath = decodedPath === '/' ? '/index.html' : decodedPath;
    const filePath = path.resolve(appRoot, `.${requestPath}`);
    if (!isWithinAppRoot(filePath)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    let fileInfo;
    try {
      fileInfo = await stat(filePath);
      if (!fileInfo.isFile()) throw new Error('Not a file');
    } catch {
      response.writeHead(404).end('Not found');
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': fileInfo.size,
      'Content-Security-Policy': [
        "default-src 'self' data: blob:",
        "script-src 'self' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "connect-src 'self' ws: wss: https://fonts.googleapis.com https://fonts.gstatic.com",
      ].join('; '),
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    createReadStream(filePath)
      .on('error', (error) => {
        console.error(`Could not read app asset ${filePath}:`, error);
        if (!response.headersSent) response.writeHead(500);
        response.end('Could not read app asset');
      })
      .pipe(response);
  });
}

async function openWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 360,
    minHeight: 640,
    backgroundColor: '#17231f',
    title: 'Openboard Chess',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(localOrigin)) event.preventDefault();
  });
  await window.loadURL(localOrigin);
}

app.whenReady().then(async () => {
  server = createLocalServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  localOrigin = `http://127.0.0.1:${server.address().port}/`;
  await openWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow().catch((error) => {
      console.error('Could not reopen the Openboard window:', error);
      dialog.showErrorBox('Openboard could not start', error.message);
    });
  });
}).catch((error) => {
  console.error('Could not start Openboard:', error);
  dialog.showErrorBox('Openboard could not start', error.message);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  server?.close();
});
