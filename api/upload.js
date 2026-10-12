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
        const { username, capeName, isPrivate, fileData, fileExtension } = req.body || {};

        if (!username || typeof username !== 'string' || !username.trim()) {
            return res.status(400).json({ error: 'Debes proporcionar tu nombre de usuario de Minecraft' });
        }
        if (!fileData || typeof fileData !== 'string') {
            return res.status(400).json({ error: 'No se recibieron datos de la imagen/archivo' });
        }

        const ext = (fileExtension || 'png').toLowerCase().replace('.', '');
        if (ext !== 'png' && ext !== 'gif') {
            return res.status(400).json({ error: 'Formato no soportado. Solo se admiten archivos .png y .gif' });
        }

        // Extraer base64 si viene con prefijo Data URL
        let base64Clean = fileData;
        if (base64Clean.includes('base64,')) {
            base64Clean = base64Clean.split('base64,')[1];
        }

        const buffer = Buffer.from(base64Clean, 'base64');
        const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
        if (buffer.length > MAX_SIZE) {
            return res.status(400).json({ error: `El archivo supera el límite permitido de 5 MB (${(buffer.length / 1024 / 1024).toFixed(2)} MB)` });
        }

        const cleanUser = username.trim();
        let safeName = (capeName || 'capa')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_-]/g, '_')
            .replace(/^_+|_+$/g, '');
        if (!safeName) safeName = 'capa_' + Date.now();

        // Determinar nombre de archivo final
        let filename;
        if (isPrivate) {
            filename = `priv_${cleanUser.toLowerCase()}_${safeName}.${ext}`;
        } else {
            filename = `${safeName}.${ext}`;
        }

        // 1. Verificar si el archivo ya existe en GitHub para obtener su SHA
        const existingFile = await getFile(`capes/${filename}`);
        const fileSha = existingFile ? existingFile.sha : null;

        // 2. Subir la textura a capes/ en GitHub
        const uploadCommitMsg = `Subir capa ${filename} (${isPrivate ? 'Privada de ' + cleanUser : 'Global'}) via MCCapes Web`;
        await putFile(`capes/${filename}`, base64Clean, uploadCommitMsg, fileSha);

        // 3. Actualizar capes.json para equipársela automáticamente
        const capesJsonFile = await getFile('capes.json');
        let capesData = { users: {}, public_capes: [], private_capes: {} };
        let jsonSha = null;

        if (capesJsonFile && capesJsonFile.text) {
            capesData = JSON.parse(capesJsonFile.text);
            jsonSha = capesJsonFile.sha;
        }
        if (!capesData.users) capesData.users = {};
        if (!capesData.private_capes) capesData.private_capes = {};
        if (!capesData.public_capes) capesData.public_capes = [];

        // Asignar al usuario
        let foundKey = cleanUser;
        for (const k of Object.keys(capesData.users)) {
            if (k.toLowerCase() === cleanUser.toLowerCase()) {
                foundKey = k;
                break;
            }
        }
        capesData.users[foundKey] = filename;

        if (isPrivate) {
            capesData.private_capes[foundKey] = filename;
            // Si estaba en públicas, retirarla
            capesData.public_capes = capesData.public_capes.filter(c => c !== filename);
        } else {
            if (!capesData.public_capes.includes(filename)) {
                capesData.public_capes.push(filename);
            }
        }

        // Guardar capes.json
        const updatedJson = JSON.stringify(capesData, null, 2) + '\n';
        const jsonBase64 = Buffer.from(updatedJson, 'utf8').toString('base64');
        const updateJsonMsg = `Actualizar capes.json tras subir ${filename} para ${foundKey} via MCCapes Web`;

        await putFile('capes.json', jsonBase64, updateJsonMsg, jsonSha);

        return res.status(200).json({
            success: true,
            filename,
            username: foundKey,
            isPrivate: !!isPrivate,
            message: `¡Capa '${filename}' subida y equipada con éxito a ${foundKey}!`
        });

    } catch (error) {
        console.error("Error en /api/upload:", error);
        return res.status(500).json({ error: error.message || 'Error procesando la subida en GitHub' });
    }
};
