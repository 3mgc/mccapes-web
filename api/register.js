const { getFile, putFile, sendJson } = require('./_github');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.statusCode = 200;
        return res.end();
    }

    if (req.method !== 'POST') {
        return sendJson(res, 405, { error: 'Método no permitido. Usa POST' });
    }

    try {
        const { username, cape } = req.body || {};

        if (!username || typeof username !== 'string' || !username.trim()) {
            return sendJson(res, 400, { error: 'Debes proporcionar un nombre de usuario de Minecraft' });
        }

        const cleanUser = username.trim();
        const defaultCape = (cape && typeof cape === 'string' && cape.trim()) ? cape.trim() : 'tux.png';

        const fileInfo = await getFile('capes.json');
        let capesData = { users: {}, public_capes: [], private_capes: {} };
        let sha = null;

        if (fileInfo && fileInfo.text) {
            capesData = JSON.parse(fileInfo.text);
            sha = fileInfo.sha;
        }
        if (!capesData.users) capesData.users = {};

        // Comprobar si ya existe (insensible a mayúsculas)
        for (const [k, v] of Object.entries(capesData.users)) {
            if (k.toLowerCase() === cleanUser.toLowerCase()) {
                return sendJson(res, 200, {
                    status: 'already_exists',
                    username: k,
                    cape: v,
                    message: `El usuario '${k}' ya está registrado con la capa '${v}'.`
                });
            }
        }

        // Registrar con la capa por defecto (tux.png)
        capesData.users[cleanUser] = defaultCape;

        const updatedJson = JSON.stringify(capesData, null, 2) + '\n';
        const base64Content = Buffer.from(updatedJson, 'utf8').toString('base64');
        const commitMsg = `Auto-registrar usuario ${cleanUser} con ${defaultCape} via Mod MCCape`;

        await putFile('capes.json', base64Content, commitMsg, sha);

        return sendJson(res, 201, {
            status: 'registered',
            username: cleanUser,
            cape: defaultCape,
            message: `Usuario '${cleanUser}' registrado exitosamente con '${defaultCape}'.`
        });

    } catch (error) {
        console.error("Error en /api/register:", error);
        return sendJson(res, 500, { error: error.message || 'Error registrando nuevo usuario en GitHub' });
    }
};
