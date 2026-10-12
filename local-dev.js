const http = require('http');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env si existe
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            process.env[key] = value.trim();
        }
    }
}

const PORT = process.env.PORT || 3000;

const apiHandlers = {
    '/api/capes': require('./api/capes'),
    '/api/equip': require('./api/equip'),
    '/api/upload': require('./api/upload'),
    '/api/register': require('./api/register')
};

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Rutas de API
    const apiHandler = apiHandlers[pathname];
    if (apiHandler) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            if (body) {
                try {
                    req.body = JSON.parse(body);
                } catch (e) {
                    req.body = body;
                }
            } else {
                req.body = {};
            }

            // Mock de res para compatibilidad con Vercel handlers
            res.status = (code) => {
                res.statusCode = code;
                return res;
            };
            res.json = (data) => {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(data));
            };

            try {
                await apiHandler(req, res);
            } catch (err) {
                console.error("Error en API:", err);
                if (!res.writableEnded) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: err.message }));
                }
            }
        });
        return;
    }

    // Servir archivos estáticos desde la raíz o public/
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    }
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`\n===========================================`);
    console.log(`  🌐 Servidor MCCapes Web iniciado:`);
    console.log(`  👉 http://localhost:${PORT}`);
    console.log(`===========================================\n`);
});
