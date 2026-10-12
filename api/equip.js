const { getFile, putFile } = require('./_github');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST' });
    }

    try {
        const { username, cape } = req.body || {};

        if (!username || typeof username !== 'string' || !username.trim()) {
            return res.status(400).json({ error: 'Debes proporcionar un nombre de usuario de Minecraft' });
        }
        if (!cape || typeof cape !== 'string' || !cape.trim()) {
            return res.status(400).json({ error: 'Debes especificar el nombre del archivo de la capa' });
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
                return res.status(403).json({
                    error: `La capa '${cleanCape}' es privada y pertenece exclusivamente al jugador '${owner}'.`
                });
            }
        }

        // 3. Actualizar la capa del usuario
        // Mantener la clave exacta o sensible si ya existía
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

        return res.status(200).json({
            success: true,
            username: foundKey,
            cape: cleanCape,
            message: `¡Capa ${cleanCape} equipada exitosamente a ${foundKey}!`
        });

    } catch (error) {
        console.error("Error en /api/equip:", error);
        return res.status(500).json({ error: error.message || 'Error equipando la capa en GitHub' });
    }
};
