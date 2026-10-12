function getRepo() {
    return (process.env.GITHUB_REPO || '3mgc/mccapes').trim();
}

function getBranch() {
    return (process.env.GITHUB_BRANCH || 'main').trim();
}

function getToken() {
    let token = process.env.GITHUB_TOKEN || '';
    token = token.trim();
    if (token.startsWith('"') && token.endsWith('"')) token = token.slice(1, -1);
    if (token.startsWith("'") && token.endsWith("'")) token = token.slice(1, -1);
    return token.trim();
}

function getHeaders() {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MCCapes-Web/1.0'
    };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function getFile(path) {
    const repo = getRepo();
    const branch = getBranch();
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) {
        if (res.status === 404) return null;
        const errText = await res.text();
        if (res.status === 401) {
            throw new Error(`Token de GitHub inválido o sin permisos (401 Bad Credentials): ${errText}`);
        }
        if (res.status === 403) {
            throw new Error(`Acceso denegado o límite de GitHub alcanzado (403): ${errText}`);
        }
        throw new Error(`Error en GitHub API (${res.status}): ${errText}`);
    }
    const data = await res.json();
    let text = '';
    if (data.content) {
        text = Buffer.from(data.content, 'base64').toString('utf8');
    }
    return {
        sha: data.sha,
        size: data.size,
        text,
        data
    };
}

async function putFile(path, contentBase64, message, sha = null) {
    const token = getToken();
    if (!token) {
        throw new Error('GITHUB_TOKEN no está configurado en las variables de entorno de Vercel');
    }
    const repo = getRepo();
    const branch = getBranch();
    const url = `https://api.github.com/repos/${repo}/contents/${path}`;
    const body = {
        message,
        content: contentBase64,
        branch: branch
    };
    if (sha) {
        body.sha = sha;
    }

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            ...getHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Error subiendo a GitHub (${res.status}): ${err}`);
    }
    return await res.json();
}

async function getDirectory(path = 'capes') {
    const repo = getRepo();
    const branch = getBranch();
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) {
        if (res.status === 404) return [];
        const errText = await res.text();
        if (res.status === 401) {
            throw new Error(`Token de GitHub inválido o expirado (401): ${errText}`);
        }
        if (res.status === 403) {
            throw new Error(`Límite de la API de GitHub alcanzado (403): ${errText}`);
        }
        throw new Error(`Error obteniendo directorio (${res.status}): ${errText}`);
    }
    return await res.json();
}

function sendJson(res, statusCode, data) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(statusCode).json(data);
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
}

module.exports = {
    getRepo,
    getBranch,
    getToken,
    getFile,
    putFile,
    getDirectory,
    sendJson
};
