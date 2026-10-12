// MCCapes Web Client Logic
(function() {
    let appState = {
        username: localStorage.getItem('mccape_username') || '',
        users: {},
        capes: [],
        publicCapes: [],
        privateCapes: {},
        storage: null,
        selectedFile: null,
        selectedFileDataUrl: '',
        selectedFileExt: ''
    };

    // Elementos DOM
    const usernameInput = document.getElementById('usernameInput');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const playerHeadImg = document.getElementById('playerHeadImg');
    const currentCapeBadge = document.getElementById('currentCapeBadge');
    const storageStatsText = document.getElementById('storageStatsText');
    const storageProgressFill = document.getElementById('storageProgressFill');
    const publicCapesCount = document.getElementById('publicCapesCount');
    const playersCount = document.getElementById('playersCount');

    const publicCapesGrid = document.getElementById('publicCapesGrid');
    const privateCapesSection = document.getElementById('privateCapesSection');
    const privateCapesGrid = document.getElementById('privateCapesGrid');
    const playersTableBody = document.getElementById('playersTableBody');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadPreviewImg = document.getElementById('uploadPreviewImg');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const previewMeta = document.getElementById('previewMeta');
    const badgeResolution = document.getElementById('badgeResolution');
    const badgeRatio = document.getElementById('badgeRatio');
    const badgeFileSize = document.getElementById('badgeFileSize');
    const capeNameInput = document.getElementById('capeNameInput');
    const privateCapeCheckbox = document.getElementById('privateCapeCheckbox');
    const privacyTagText = document.getElementById('privacyTagText');
    const privacyHelpText = document.getElementById('privacyHelpText');
    const submitUploadBtn = document.getElementById('submitUploadBtn');
    const uploadForm = document.getElementById('uploadForm');

    // Modal
    const previewModal = document.getElementById('previewModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCloseBtn2 = document.getElementById('modalCloseBtn2');
    const modalTitle = document.getElementById('modalTitle');
    const modalImg = document.getElementById('modalImg');
    const modalInfo = document.getElementById('modalInfo');
    const modalEquipBtn = document.getElementById('modalEquipBtn');
    let modalSelectedCape = null;

    // Toast
    const toastContainer = document.getElementById('toastContainer');

    function init() {
        if (appState.username) {
            usernameInput.value = appState.username;
            updateUserDisplay();
        }

        setupEventListeners();
        fetchData();
    }

    function setupEventListeners() {
        // Guardar Nick
        saveUserBtn.addEventListener('click', () => {
            const val = usernameInput.value.trim();
            if (!val) {
                showToast('Por favor introduce tu Nick de Minecraft', 'error');
                return;
            }
            appState.username = val;
            localStorage.setItem('mccape_username', val);
            updateUserDisplay();
            renderPrivateCapes();
            renderPublicCapes();
            showToast(`Nick fijado: ${val}`, 'success');
        });

        usernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveUserBtn.click();
        });

        // Tabs
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${target}`).classList.add('active');
            });
        });

        // Dropzone & File upload
        browseBtn.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('click', (e) => {
            if (e.target !== browseBtn) fileInput.click();
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length > 0) {
                handleFileSelection(fileInput.files[0]);
            }
        });

        // Switch Privada
        privateCapeCheckbox.addEventListener('change', () => {
            const isPriv = privateCapeCheckbox.checked;
            privacyTagText.textContent = isPriv ? 'Activada (Privada)' : 'Desactivada (Pública)';
            privacyTagText.style.color = isPriv ? 'var(--orange-500)' : 'var(--text-muted)';
            updatePrivacyHelpText();
        });

        // Submit Upload
        uploadForm.addEventListener('submit', handleUploadSubmit);

        // Modal
        const closeModal = () => previewModal.classList.add('hidden');
        modalCloseBtn.addEventListener('click', closeModal);
        modalCloseBtn2.addEventListener('click', closeModal);
        modalBackdrop.addEventListener('click', closeModal);

        modalEquipBtn.addEventListener('click', () => {
            if (modalSelectedCape) {
                equipCape(modalSelectedCape.filename);
                closeModal();
            }
        });
    }

    function updateUserDisplay() {
        const user = appState.username || 'Steve';
        playerHeadImg.src = `https://mc-heads.net/avatar/${encodeURIComponent(user)}/64`;

        // Capa actual
        let current = 'Ninguna';
        for (const [u, cape] of Object.entries(appState.users || {})) {
            if (u.toLowerCase() === user.toLowerCase()) {
                current = cape;
                break;
            }
        }
        currentCapeBadge.textContent = current;

        // Actualizar placeholders en el formulario
        document.querySelectorAll('.active-user-placeholder').forEach(el => {
            el.textContent = user;
        });
    }

    function updatePrivacyHelpText() {
        const user = appState.username || 'tu usuario';
        if (privateCapeCheckbox.checked) {
            privacyHelpText.innerHTML = `🔒 <strong>Capa Privada:</strong> Solo <strong>${user}</strong> podrá ver y equipar esta capa. No aparecerá en el catálogo para tus amigos.`;
        } else {
            privacyHelpText.innerHTML = `🌐 <strong>Capa Global:</strong> La capa se subirá al catálogo general y cualquier amigo podrá equipársela cuando quiera.`;
        }
    }

    async function fetchData() {
        try {
            const res = await fetch('/api/capes');
            if (!res.ok) throw new Error('Error al obtener datos de la API');
            const data = await res.json();

            appState.users = data.users || {};
            appState.capes = data.capes || [];
            appState.publicCapes = data.public_capes || [];
            appState.privateCapes = data.private_capes || {};
            appState.storage = data.storage || null;

            updateStorageWidget();
            updateUserDisplay();
            renderPublicCapes();
            renderPrivateCapes();
            renderPlayersTable();

        } catch (e) {
            console.error(e);
            publicCapesGrid.innerHTML = `
                <div class="loading-state">
                    <p style="color: var(--red-500)">❌ Error conectando con la API de capas: ${e.message}</p>
                    <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-muted)">Si estás en Vercel, asegúrate de configurar GITHUB_TOKEN en las variables de entorno.</p>
                </div>
            `;
        }
    }

    function updateStorageWidget() {
        if (!appState.storage) return;
        const s = appState.storage;
        const totalMb = (s.totalBytes / (1024 * 1024)).toFixed(2);
        const maxMb = (s.maxRepoBytes / (1024 * 1024)).toFixed(0);

        storageStatsText.textContent = `${totalMb} MB / ${maxMb} MB (${s.totalCapes} / ${s.maxCapesCount} Capas)`;
        publicCapesCount.textContent = appState.publicCapes.length;
        playersCount.textContent = Object.keys(appState.users).length;

        const percent = Math.max(2, Math.min(100, s.usagePercent));
        storageProgressFill.style.width = `${percent}%`;
    }

    function renderPublicCapes() {
        if (!appState.publicCapes.length) {
            publicCapesGrid.innerHTML = `
                <div class="loading-state">
                    <p>No hay capas públicas disponibles en el catálogo.</p>
                </div>
            `;
            return;
        }

        const user = (appState.username || '').toLowerCase();
        let currentCape = '';
        for (const [u, c] of Object.entries(appState.users)) {
            if (u.toLowerCase() === user) currentCape = c;
        }

        publicCapesGrid.innerHTML = appState.publicCapes.map(cape => {
            const isEquipped = currentCape && currentCape.toLowerCase() === cape.filename.toLowerCase();
            const sizeKb = (cape.size / 1024).toFixed(1);
            const isGif = cape.type === 'gif';

            return `
                <div class="cape-card ${isEquipped ? 'is-equipped' : ''}">
                    <div class="cape-preview-box">
                        <span class="cape-tag-type ${cape.type}">${cape.type}</span>
                        <img src="${cape.rawUrl}" alt="${cape.filename}" class="cape-img" loading="lazy">
                    </div>
                    <div class="cape-info">
                        <h4 class="cape-name">${escapeHtml(cape.filename)}</h4>
                        <span class="cape-subinfo">${sizeKb} KB • ${isGif ? 'Animada' : 'Estática'}</span>
                        <div class="cape-actions">
                            <button class="btn btn-secondary btn-details" data-file="${escapeHtml(cape.filename)}">Detalles</button>
                            <button class="btn ${isEquipped ? 'btn-outline' : 'btn-primary'} btn-equip" data-file="${escapeHtml(cape.filename)}">
                                ${isEquipped ? '✓ Equipada' : 'Equipar'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Eventos en tarjetas
        publicCapesGrid.querySelectorAll('.btn-equip').forEach(btn => {
            btn.addEventListener('click', () => equipCape(btn.getAttribute('data-file')));
        });
        publicCapesGrid.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', () => openCapeModal(btn.getAttribute('data-file')));
        });
    }

    function renderPrivateCapes() {
        const user = (appState.username || '').toLowerCase();
        if (!user) {
            privateCapesSection.classList.add('hidden');
            return;
        }

        // Buscar capas privadas que le pertenezcan a este usuario
        const myPrivates = appState.capes.filter(c => {
            if (!c.isPrivate) return false;
            if (c.owner && c.owner.toLowerCase() === user) return true;
            if (c.filename.toLowerCase().startsWith(`priv_${user}_`)) return true;
            return false;
        });

        if (!myPrivates.length) {
            privateCapesSection.classList.add('hidden');
            return;
        }

        privateCapesSection.classList.remove('hidden');

        let currentCape = '';
        for (const [u, c] of Object.entries(appState.users)) {
            if (u.toLowerCase() === user) currentCape = c;
        }

        privateCapesGrid.innerHTML = myPrivates.map(cape => {
            const isEquipped = currentCape && currentCape.toLowerCase() === cape.filename.toLowerCase();
            const sizeKb = (cape.size / 1024).toFixed(1);

            return `
                <div class="cape-card ${isEquipped ? 'is-equipped' : ''}">
                    <div class="cape-preview-box">
                        <span class="cape-tag-private">🔒 Privada</span>
                        <span class="cape-tag-type ${cape.type}">${cape.type}</span>
                        <img src="${cape.rawUrl}" alt="${cape.filename}" class="cape-img" loading="lazy">
                    </div>
                    <div class="cape-info">
                        <h4 class="cape-name">${escapeHtml(cape.filename)}</h4>
                        <span class="cape-subinfo">${sizeKb} KB • Exclusiva para ${escapeHtml(appState.username)}</span>
                        <div class="cape-actions">
                            <button class="btn btn-secondary btn-details" data-file="${escapeHtml(cape.filename)}">Detalles</button>
                            <button class="btn ${isEquipped ? 'btn-outline' : 'btn-primary'} btn-equip" data-file="${escapeHtml(cape.filename)}">
                                ${isEquipped ? '✓ Equipada' : 'Equipar'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        privateCapesGrid.querySelectorAll('.btn-equip').forEach(btn => {
            btn.addEventListener('click', () => equipCape(btn.getAttribute('data-file')));
        });
        privateCapesGrid.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', () => openCapeModal(btn.getAttribute('data-file')));
        });
    }

    function renderPlayersTable() {
        const entries = Object.entries(appState.users || {});
        if (!entries.length) {
            playersTableBody.innerHTML = `<tr><td colspan="4" class="text-center">No hay jugadores registrados en capes.json</td></tr>`;
            return;
        }

        playersTableBody.innerHTML = entries.map(([user, cape]) => {
            const isMe = appState.username && appState.username.toLowerCase() === user.toLowerCase();
            const isGif = cape.toLowerCase().endsWith('.gif');
            const isPrivate = cape.toLowerCase().startsWith('priv_') || Object.values(appState.privateCapes).includes(cape);

            return `
                <tr>
                    <td>
                        <div class="player-row-user">
                            <img src="https://mc-heads.net/avatar/${encodeURIComponent(user)}/28" class="player-row-avatar" alt="${user}">
                            <span>${escapeHtml(user)} ${isMe ? '<strong style="color:var(--cyan-500)">(Tú)</strong>' : ''}</span>
                        </div>
                    </td>
                    <td>
                        <code>${escapeHtml(cape)}</code>
                    </td>
                    <td>
                        <span class="badge" style="${isPrivate ? 'color:var(--orange-500);border-color:var(--orange-500)' : ''}">
                            ${isPrivate ? '🔒 Privada' : (isGif ? '🎬 GIF Animada' : '🖼️ PNG')}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;" onclick="window.viewCapeDetails('${escapeHtml(cape)}')">
                            Ver Capa
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.viewCapeDetails = function(filename) {
        openCapeModal(filename);
    };

    function openCapeModal(filename) {
        const cape = appState.capes.find(c => c.filename.toLowerCase() === filename.toLowerCase());
        if (!cape) return;

        modalSelectedCape = cape;
        modalTitle.textContent = cape.filename;
        modalImg.src = cape.rawUrl;

        const sizeKb = (cape.size / 1024).toFixed(1);
        modalInfo.innerHTML = `
            <p><strong>Archivo:</strong> ${escapeHtml(cape.filename)}</p>
            <p><strong>Tipo:</strong> ${cape.type.toUpperCase()}</p>
            <p><strong>Tamaño:</strong> ${sizeKb} KB</p>
            <p><strong>Visibilidad:</strong> ${cape.isPrivate ? '<span style="color:var(--orange-500)">🔒 Privada (Solo su dueño)</span>' : '<span style="color:var(--cyan-500)">🌐 Pública (Global)</span>'}</p>
            ${cape.owner ? `<p><strong>Dueño:</strong> ${escapeHtml(cape.owner)}</p>` : ''}
            <p><strong>Enlace GitHub Raw:</strong> <a href="${cape.rawUrl}" target="_blank" style="color:var(--cyan-500)">Abrir textura directa</a></p>
        `;

        previewModal.classList.remove('hidden');
    }

    async function equipCape(capeFilename) {
        if (!appState.username) {
            showToast('Primero escribe tu Nick de Minecraft arriba y haz clic en "Fijar Nick"', 'error');
            usernameInput.focus();
            return;
        }

        showToast(`Equipando ${capeFilename} para ${appState.username}...`, 'info');

        try {
            const res = await fetch('/api/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: appState.username,
                    cape: capeFilename
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al equipar capa');
            }

            showToast(data.message || `¡Capa equipada con éxito!`, 'success');
            await fetchData();

        } catch (e) {
            showToast(e.message, 'error');
        }
    }

    function handleFileSelection(file) {
        const name = file.name.toLowerCase();
        if (!name.endsWith('.png') && !name.endsWith('.gif')) {
            showToast('Formato inválido. Solo se admiten archivos .png o .gif', 'error');
            return;
        }

        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            showToast(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Límite: 5 MB`, 'error');
            return;
        }

        appState.selectedFile = file;
        appState.selectedFileExt = name.endsWith('.gif') ? 'gif' : 'png';

        // Autocompletar nombre si está vacío
        const base = file.name.substring(0, file.name.lastIndexOf('.'));
        if (!capeNameInput.value) {
            capeNameInput.value = base.replace(/[^a-zA-Z0-9_-]/g, '_');
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            appState.selectedFileDataUrl = e.target.result;
            uploadPreviewImg.src = appState.selectedFileDataUrl;
            uploadPreviewImg.classList.remove('hidden');
            previewPlaceholder.classList.add('hidden');
            previewMeta.classList.remove('hidden');

            const sizeKb = (file.size / 1024).toFixed(1);
            badgeFileSize.textContent = `${sizeKb} KB`;

            // Verificar resolución con Image
            const img = new Image();
            img.onload = () => {
                const w = img.width;
                const h = img.height;
                badgeResolution.textContent = `${w} x ${h} px`;

                if (w === 2 * h) {
                    badgeRatio.textContent = '✓ Proporción 2:1 Correcta';
                    badgeRatio.style.color = 'var(--green-500)';
                } else {
                    badgeRatio.textContent = `⚠️ Proporción ${(w/h).toFixed(2)}:1 (Se recomienda 2:1)`;
                    badgeRatio.style.color = 'var(--orange-500)';
                }
            };
            img.src = appState.selectedFileDataUrl;

            submitUploadBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    async function handleUploadSubmit(e) {
        e.preventDefault();

        if (!appState.username) {
            showToast('Debes ingresar tu Nick de Minecraft antes de subir una capa', 'error');
            usernameInput.focus();
            return;
        }

        if (!appState.selectedFileDataUrl) {
            showToast('Selecciona un archivo de capa (.png o .gif)', 'error');
            return;
        }

        const capeName = capeNameInput.value.trim();
        if (!capeName) {
            showToast('Ingresa un nombre para la capa', 'error');
            return;
        }

        const isPrivate = privateCapeCheckbox.checked;

        submitUploadBtn.disabled = true;
        submitUploadBtn.textContent = '⏳ Subiendo y comiteando a GitHub...';
        showToast('Subiendo capa a GitHub...', 'info');

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: appState.username,
                    capeName: capeName,
                    isPrivate: isPrivate,
                    fileData: appState.selectedFileDataUrl,
                    fileExtension: appState.selectedFileExt
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al subir la capa');
            }

            showToast(data.message || `¡Capa subida y equipada con éxito!`, 'success');

            // Reset form
            capeNameInput.value = '';
            appState.selectedFile = null;
            appState.selectedFileDataUrl = '';
            uploadPreviewImg.classList.add('hidden');
            previewPlaceholder.classList.remove('hidden');
            previewMeta.classList.add('hidden');
            submitUploadBtn.disabled = true;
            submitUploadBtn.textContent = '🚀 Subir a GitHub y Equipar';

            // Cambiar a pestaña de catálogo y refrescar
            document.querySelector('.tab-btn[data-tab="catalog"]').click();
            await fetchData();

        } catch (err) {
            showToast(err.message, 'error');
            submitUploadBtn.disabled = false;
            submitUploadBtn.textContent = '🚀 Subir a GitHub y Equipar';
        }
    }

    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escapeHtml(msg)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    init();
})();
