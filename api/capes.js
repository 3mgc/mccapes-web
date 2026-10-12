const { getFile, getDirectory, getRepo, getBranch, sendJson } = require('./_github');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.statusCode = 200;
        return res.end();
    }

    try {
        const repo = getRepo();
        const branch = getBranch();

        // 1. Obtener capes.json
        const capesJsonFile = await getFile('capes.json');
        let capesData = { users: {}, public_capes: [], private_capes: {} };
        if (capesJsonFile && capesJsonFile.text) {
            try {
                capesData = JSON.parse(capesJsonFile.text);
                if (!capesData.users) capesData.users = {};
                if (!capesData.private_capes) capesData.private_capes = {};
                if (!capesData.public_capes) capesData.public_capes = [];
            } catch (e) {
                console.error("Error parseando capes.json:", e);
            }
        }

        // 2. Obtener lista de archivos en carpeta capes/
        const files = await getDirectory('capes');
        let totalBytes = 0;
        const allCapes = [];

        for (const file of files) {
            if (file.type === 'file') {
                const lower = file.name.toLowerCase();
                if (lower.endsWith('.png') || lower.endsWith('.gif')) {
                    totalBytes += (file.size || 0);

                    // Verificar si es privada
                    const isPrivateName = lower.startsWith('priv_');
                    const isPrivateInJson = Object.values(capesData.private_capes || {}).includes(file.name);
                    const isPrivate = isPrivateName || isPrivateInJson;

                    let owner = null;
                    if (isPrivate) {
                        for (const [u, f] of Object.entries(capesData.private_capes || {})) {
                            if (f === file.name) {
                                owner = u;
                                break;
                            }
                        }
                        if (!owner && isPrivateName) {
                            const parts = file.name.split('_');
                            if (parts.length >= 2) {
                                owner = parts[1];
                            }
                        }
                    }

                    allCapes.push({
                        filename: file.name,
                        size: file.size || 0,
                        type: lower.endsWith('.gif') ? 'gif' : 'png',
                        rawUrl: `https://raw.githubusercontent.com/${repo}/${branch}/capes/${file.name}`,
                        cdnUrl: `https://cdn.jsdelivr.net/gh/${repo}@${branch}/capes/${file.name}`,
                        isPrivate,
                        owner
                    });
                }
            }
        }

        // 3. Filtrar capas públicas y calcular límites
        const publicCapes = allCapes.filter(c => !c.isPrivate);

        // Límites técnicos de GitHub
        const MAX_REPO_RECOMMENDED_BYTES = 1024 * 1024 * 1024; // 1 GB
        const MAX_CAPES_COUNT = 200;
        const MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024;

        return sendJson(res, 200, {
            repository: repo,
            branch: branch,
            users: capesData.users || {},
            private_capes: capesData.private_capes || {},
            capes: allCapes,
            public_capes: publicCapes,
            storage: {
                totalBytes,
                totalCapes: allCapes.length,
                maxCapesCount: MAX_CAPES_COUNT,
                maxRepoBytes: MAX_REPO_RECOMMENDED_BYTES,
                maxSingleFileBytes: MAX_SINGLE_FILE_BYTES,
                usagePercent: Math.min(100, Number(((totalBytes / MAX_REPO_RECOMMENDED_BYTES) * 100).toFixed(2))),
                capesPercent: Math.min(100, Number(((allCapes.length / MAX_CAPES_COUNT) * 100).toFixed(1)))
            }
        });

    } catch (error) {
        console.error("Error en /api/capes:", error);
        return sendJson(res, 500, {
            error: error.message || 'Error cargando capas desde GitHub',
            envConfigured: {
                hasToken: !!process.env.GITHUB_TOKEN,
                repo: process.env.GITHUB_REPO || '3mgc/mccapes',
                branch: process.env.GITHUB_BRANCH || 'main'
            }
        });
    }
};
