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
        if (!cape || typeof cape !== 'string' || !cape.trim()) {
            return sendJson(res, 400, { error: 'Debes especificar el nombre del archivo de la capa' });
        }

        const cleanUser = username.trim();
        const cleanCape = cape.trim();

        // 1. Obtener capes.json actual
        const fileInfo = await getFile('capes.json');
        let capesData = { users: {}, public_capes: [], private_capes: {} };
        let sha = null;

        if (fileInfo && fileInfo.text) {
            capesData = JSON.parse(fileInfo.text);
            sha = fileInfo.sha;
        }
        if (!capesData.users) capesData.users = {};
        if (!capesData.private_capes) capesData.private_capes = {};

        // 2. Verificar si la capa es privada de otro jugador
        const isPrivate = cleanCape.toLowerCase().startsWith('priv_') || Object.values(capesData.private_capes).includes(cleanCape);
        if (isPrivate) {
            let owner = null;
            for (const [u, f] of Object.entries(capesData.private_capes)) {
                if (f === cleanCape) {
                    owner = u;
                    break;
                }
            }
            if (!owner && cleanCape.toLowerCase().startsWith('priv_')) {
                const parts = cleanCape.split('_');
                if (parts.length >= 2) owner = parts[1];
            }

            if (owner && owner.toLowerCase() !== cleanUser.toLowerCase()) {
                return sendJson(res, 403, {
                    error: `La capa '${cleanCape}' es privada y pertenece exclusivamente al jugador '${owner}'.`
                });
            }
        }

        // 3. Actualizar la capa del usuario
        let foundKey = cleanUser;
        for (const k of Object.keys(capesData.users)) {
            if (k.toLowerCase() === cleanUser.toLowerCase()) {
                foundKey = k;
                break;
            }
        }
        capesData.users[foundKey] = cleanCape;

        // 4. Guardar y comitear en GitHub
        const updatedJson = JSON.stringify(capesData, null, 2) + '\n';
        const base64Content = Buffer.from(updatedJson, 'utf8').toString('base64');
        const commitMsg = `Equipar capa ${cleanCape} a ${cleanUser} via MCCapes Web`;

        await putFile('capes.json', base64Content, commitMsg, sha);

        return sendJson(res, 200, {
            success: true,
            username: foundKey,
            cape: cleanCape,
            message: `¡Capa ${cleanCape} equipada exitosamente a ${foundKey}!`
        });

    } catch (error) {
        console.error("Error en /api/equip:", error);
        return sendJson(res, 500, { error: error.message || 'Error equipando la capa en GitHub' });
    }
};
