const GITHUB_REPO = process.env.GITHUB_REPO || '3mgc/mccapes';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function getHeaders() {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MCCapes-Web/1.0'
    };
    if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }
    return headers;
}

async function getFile(path) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`GitHub API error (${res.status}): ${await res.text()}`);
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
    if (!GITHUB_TOKEN) {
        throw new Error('GITHUB_TOKEN no está configurado en las variables de entorno de Vercel');
    }
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
    const body = {
        message,
        content: contentBase64,
        branch: GITHUB_BRANCH
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
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(`Error obteniendo directorio (${res.status}): ${await res.text()}`);
    }
    return await res.json();
}

module.exports = {
    GITHUB_REPO,
    GITHUB_BRANCH,
    GITHUB_TOKEN,
    getFile,
    putFile,
    getDirectory
};
