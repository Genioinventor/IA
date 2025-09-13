//====================================================== Configuración ======================================================

// ================= LIMITE DE MESAJES Y TIEMPO POR CHAT =====================
let MAX_MESSAGES_PER_CHAT = 50; // <--- Cambia este valor para ajustar el límite
const RESET_LIMIT_MINUTES = 30; // Tiempo en minutos para restablecer el límite
// ===========================================================================

// ================= CONFIGURACIÓN DE GENERACIÓN =============================
let TEMPERATURE = 0.2;       // Creatividad del modelo
let TOP_K = 50;              // Número de tokens candidatos
let TOP_P = 0.90;            // Probabilidad acumulada
let MAX_OUTPUT_TOKENS = 18000; // Máximo de tokens generados
// ===========================================================================

// ================= CONFIGURACIÓN DE IAs ====================================
let aiConfigs      = [];
let selectedAiId   = null;
let currentAiIndex = 0;  // Índice para rotación automática de IAs
let failedAiIds    = new Set();  // IDs de IAs que fallaron recientemente
// ===========================================================================

// ================= CONFIGURACIÓN POR DEFECTO DE IAs ========================
const DEFAULT_AI_CONFIGS = [
    // Modelo por defecto: Gemini 2.5 Flash-Lite (Mayor cantidad de respuestas diarias)
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash-Lite',
        url:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
        apiKey: 'AIzaSyDEaA54BedMrlFWhb7u_8r-sb5-a_C_U3E',
        rpm: 15, tpm: 250000, rpd: 1000,
        description: '⚡ Modelo predeterminado optimizado y rápido con la mayor cantidad de respuestas diarias (1,000 RPD). Ideal para uso frecuente.',
        capabilities: ['⚡ 15 RPM', '🧠 250K TPM', '📅 1,000 RPD', 'Generación rápida', 'Uso frecuente']
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        url:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
        apiKey: 'AIzaSyDx1PNtPNtB6ukShHTE-E6q6Z-Vk1izdzE',
        rpm: 5, tpm: 250000, rpd: 100,
        description: '🏆 Modelo avanzado de mayor calidad para tareas complejas de razonamiento y análisis.',
        capabilities: ['⚡ 5 RPM', '🧠 250K TPM', '📅 100 RPD', 'Razonamiento complejo', 'Máxima calidad']
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        url:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        apiKey: 'AIzaSyA7YE5mC26qxlqYL0uf9FxfrWDGRjSH-y0',
        rpm: 10, tpm: 250000, rpd: 250,
        description: '⚖️ Balance perfecto entre velocidad y calidad para la mayoría de tareas.',
        capabilities: ['⚡ 10 RPM', '🧠 250K TPM', '📅 250 RPD', 'Velocidad media', 'Versátil']
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        url:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        apiKey: 'AIzaSyCW8tZHObTllGSsOwOa9oQecg01mHOnSbs',
        rpm: 15, tpm: 1000000, rpd: 200,
        description: '🚀 Modelo experimental con alta capacidad de tokens (1M TPM) para textos largos.',
        capabilities: ['⚡ 15 RPM', '🧠 1M TPM', '📅 200 RPD', 'Tokens elevados', 'Textos extensos']
    },
    {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash-Lite',
        url:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
        apiKey: 'AIzaSyDx1PNtPNtB6ukShHTE-E6q6Z-Vk1izdzE',
        rpm: 30, tpm: 1000000, rpd: 200,
        description: '💨 Versión ligera y rápida con muchas solicitudes por minuto (30 RPM).',
        capabilities: ['⚡ 30 RPM', '🧠 1M TPM', '📅 200 RPD', 'Velocidad alta', 'Muchas solicitudes']
    }
];
// ===========================================================================

//====================================================== Configuración ======================================================

// ================= SISTEMA DE FAILOVER AUTOMÁTICO =========================
function getNextAvailableAi() {
    // Filtramos las IAs que no han fallado recientemente
    const availableAis = aiConfigs.filter(ai => !failedAiIds.has(ai.id));

    // Si todas han fallado, reseteamos la lista de fallidas y usamos todas
    if (availableAis.length === 0) {
        console.log('🔄 Todas las IAs fallaron, reseteando lista de fallidas...');
        failedAiIds.clear();
        const ai = aiConfigs[currentAiIndex % aiConfigs.length];
        currentAiIndex++;
        return ai;
    }

    // En el primer intento, preferir la IA seleccionada por el usuario si está disponible
    if (currentAiIndex === 0 && selectedAiId) {
        const selectedAi = availableAis.find(ai => ai.id === selectedAiId);
        if (selectedAi) {
            currentAiIndex++;
            console.log(`👤 Usando IA seleccionada: ${selectedAi.name} (${selectedAi.id})`);
            return selectedAi;
        }
    }

    // Rotamos entre las IAs disponibles
    const nextAi = availableAis[currentAiIndex % availableAis.length];
    currentAiIndex++;

    console.log(`🔀 Cambiando a: ${nextAi.name} (${nextAi.id})`);
    return nextAi;
}

function markAiAsFailed(aiId) {
    failedAiIds.add(aiId);
    console.log(`❌ IA marcada como fallida: ${aiId}`);

    // Limpiar la lista de fallidas después de 5 minutos
    setTimeout(() => {
        failedAiIds.delete(aiId);
        console.log(`✅ IA restaurada: ${aiId}`);
    }, 5 * 60 * 1000);
}

function isRetriableError(error) {
    // Solo marcar como fallida si es un error transitorio/de red
    const message = error.message.toLowerCase();
    const isNetworkError = message.includes('network') || message.includes('fetch') || message.includes('timeout');
    const isRateLimit = message.includes('429') || message.includes('quota') || message.includes('rate limit');
    const isServerError = message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504');

    return isNetworkError || isRateLimit || isServerError;
}

async function makeApiCallWithFailover(apiCall, maxRetries = 3) {
    let lastError = null;

    // Resetear el índice para cada nueva llamada para que empiece con selectedAiId
    currentAiIndex = 0;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const ai = getNextAvailableAi();
        try {
            console.log(`🔄 Intento ${attempt + 1}/${maxRetries} con ${ai.name}`);

            const result = await apiCall(ai);

            // Si llegamos aquí, la llamada fue exitosa
            console.log(`✅ Éxito con ${ai.name}`);

            // Mostrar notificación de IA para usuarios DevCenter (solo al éxito)
            if (isDevCenterUser()) {
                showAiNotification(ai.name);
            }

            return result;

        } catch (error) {
            lastError = error;

            console.error(`❌ Error con ${ai.name}:`, error.message);

            // Solo marcar como fallida si es un error transitorio
            if (isRetriableError(error)) {
                markAiAsFailed(ai.id);
                console.log(`⚠️ Error transitorio, marcando ${ai.name} como fallida temporalmente`);
            } else {
                console.log(`🚫 Error de configuración/contenido, no rotando: ${error.message}`);
                // Para errores no transitorios, fallar inmediatamente
                throw error;
            }

            // Si es el último intento, lanzamos el error
            if (attempt === maxRetries - 1) {
                throw new Error(`Todas las IAs fallaron. Último error: ${error.message}`);
            }

            // Esperar un poco antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    throw lastError;
}
// ===========================================================================

// Estado global
let currentChatId = null;
let isGenerating = false;
let chats = [];
let userInfo = null;

// Elementos del DOM
const elements = {
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    menuBtn: document.getElementById('menuBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    sidebarContent: document.getElementById('sidebarContent'),
    messages: document.getElementById('messages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    suggestions: document.getElementById('suggestions'),
    previewModal: document.getElementById('previewModal'),
    backBtn: document.getElementById('backBtn'),
    previewFrame: document.getElementById('previewFrame'),
    downloadBtn: document.getElementById('downloadBtn'),
    shareBtn: document.getElementById('shareBtn'),
    loading: document.getElementById('loading'),
    previewSubtitle: document.getElementById('previewSubtitle')
};

// Plantillas predefinidas
const templates = {
    landing: 'Crea una landing page moderna para una startup tech con hero section, características principales, testimonios y call-to-action',
    ecommerce: 'Diseña una tienda online con catálogo de productos, carrito de compras, formulario de checkout y diseño responsive',
    portfolio: 'Genera un portfolio personal para un diseñador web con galería de proyectos, sobre mí, habilidades y contacto',
    dashboard: 'Crea un dashboard administrativo con gráficos, tablas de datos, métricas importantes y navegación lateral'
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadAiConfigs();
    loadChats();
    adjustTextareaHeight();
    handleInputChange();
    loadUserInfo();
    updateAiConfigBtnVisibility();

    // Mostrar el botón de copiar solo en escritorio
    const copyBtn = document.getElementById('copyCodeBtn');
    if (copyBtn) {
        function updateCopyBtnVisibility() {
            if (window.innerWidth >= 641) {
                copyBtn.style.display = 'flex';
            } else {
                copyBtn.style.display = 'none';
            }
        }
        updateCopyBtnVisibility();
        window.addEventListener('resize', updateCopyBtnVisibility);
    }
});

function updateAiConfigBtnVisibility() {
    // Solo mostrar herramientas si el usuario tiene descripción personalizada "DevCenter"
    loadUserInfo();
    const container = document.getElementById('aiConfigBtnContainer');

    // Verificar si el usuario es DevCenter (solo por descripción personalizada)
    if (isDevCenterUser()) {
        if (container) container.style.display = '';
        // Mostrar herramientas adicionales para usuarios DevCenter
        showDevCenterTools();
    } else {
        if (container) container.style.display = 'none';
        // Ocultar herramientas adicionales
        hideDevCenterTools();
    }
}

// Función para verificar si el usuario es DevCenter
function isDevCenterUser() {
    return userInfo && 
           typeof userInfo.custom === 'string' && 
           userInfo.custom.trim() === 'DevCenter';
}

// Mostrar herramientas adicionales para usuarios DevCenter
function showDevCenterTools() {
    const container = document.getElementById('devCenterToolsContainer');
    if (container) {
        container.style.display = '';
        setupDevCenterToolsListeners();
    }
}

// Ocultar herramientas adicionales
function hideDevCenterTools() {
    const container = document.getElementById('devCenterToolsContainer');
    if (container) {
        container.style.display = 'none';
    }
}

// Configurar event listeners para herramientas DevCenter
function setupDevCenterToolsListeners() {
    const aiStatusBtn = document.getElementById('aiStatusBtn');
    const systemStatsBtn = document.getElementById('systemStatsBtn');
    const devToolsBtn = document.getElementById('devToolsBtn');

    if (aiStatusBtn) {
        aiStatusBtn.removeEventListener('click', showAiStatus);
        aiStatusBtn.addEventListener('click', showAiStatus);
    }

    if (systemStatsBtn) {
        systemStatsBtn.removeEventListener('click', showSystemStats);
        systemStatsBtn.addEventListener('click', showSystemStats);
    }

    if (devToolsBtn) {
        devToolsBtn.removeEventListener('click', showDevTools);
        devToolsBtn.addEventListener('click', showDevTools);
    }
}

// Funciones para herramientas DevCenter
function showAiStatus() {
    loadAiConfigs();
    const currentAi = aiConfigs.find(ai => ai.id === selectedAiId) || aiConfigs[0];
    const availableAis = aiConfigs.filter(ai => !failedAiIds.has(ai.id));
    const failedCount = failedAiIds.size;

    let statusMessage = `🤖 Estado Actual de IA:\n\n`;
    statusMessage += `📍 IA Actual: ${currentAi.name}\n`;
    statusMessage += `✅ IAs Disponibles: ${availableAis.length}/${aiConfigs.length}\n`;
    statusMessage += `❌ IAs Fallidas: ${failedCount}\n\n`;

    if (failedCount > 0) {
        statusMessage += `IAs temporalmente no disponibles:\n`;
        failedAiIds.forEach(failedId => {
            const failedAi = aiConfigs.find(ai => ai.id === failedId);
            if (failedAi) {
                statusMessage += `• ${failedAi.name}\n`;
            }
        });
    }

    alert(statusMessage);
}

function showSystemStats() {
    const chatsCount = chats.length;
    const totalMessages = chats.reduce((total, chat) => total + (chat.messages ? chat.messages.length : 0), 0);
    const currentChat = getCurrentChat();
    const currentChatMessages = currentChat ? currentChat.messages.length : 0;

    let statsMessage = `📊 Estadísticas del Sistema:\n\n`;
    statsMessage += `💬 Total de Chats: ${chatsCount}\n`;
    statsMessage += `📝 Total de Mensajes: ${totalMessages}\n`;
    statsMessage += `🔄 Mensajes en Chat Actual: ${currentChatMessages}\n`;
    statsMessage += `🕒 Sesión Iniciada: ${new Date().toLocaleString('es-ES')}\n\n`;
    statsMessage += `🔧 IAs Configuradas: ${aiConfigs.length}\n`;
    statsMessage += `⚡ Modo DevCenter: Activado\n`;

    alert(statsMessage);
}

function showDevTools() {
    let devMessage = `⚡ Herramientas de Desarrollo:\n\n`;
    devMessage += `🗂️ localStorage:\n`;
    devMessage += `• Chats guardados: ${localStorage.getItem('devCenter_chats') ? 'Sí' : 'No'}\n`;
    devMessage += `• Configuración AI: ${localStorage.getItem('devCenter_aiConfigs') ? 'Sí' : 'No'}\n`;
    devMessage += `• Info Usuario: ${localStorage.getItem('devCenter_userInfo') ? 'Sí' : 'No'}\n\n`;
    devMessage += `🔍 Debug:\n`;
    devMessage += `• Console.log: F12 → Console\n`;
    devMessage += `• Logs de IA: Activos\n`;
    devMessage += `• Failover: Funcionando\n\n`;
    devMessage += `📱 Información del Navegador:\n`;
    devMessage += `• Ancho: ${window.innerWidth}px\n`;
    devMessage += `• Alto: ${window.innerHeight}px\n`;
    devMessage += `• UserAgent: ${navigator.userAgent.substring(0, 50)}...\n`;

    alert(devMessage);
}

// Funciones para notificación de IA (solo usuarios DevCenter)
function showAiNotification(aiName) {
    if (!isDevCenterUser()) return;

    const notification = document.getElementById('aiNotification');
    const notificationText = document.getElementById('aiNotificationText');

    if (notification && notificationText) {
        notificationText.textContent = `Usando: ${aiName}`;
        notification.classList.add('show');

        // Ocultar automáticamente después de 3 segundos
        setTimeout(() => {
            hideAiNotification();
        }, 3000);
    }
}

function hideAiNotification() {
    const notification = document.getElementById('aiNotification');
    if (notification) {
        notification.classList.remove('show');
    }
}

function setupEventListeners() {
    elements.menuBtn.addEventListener('click', openSidebar);
    elements.closeSidebarBtn.addEventListener('click', closeSidebar);
    elements.overlay.addEventListener('click', closeSidebar);
    elements.newChatBtn.addEventListener('click', () => createNewChat());

    elements.messageInput.addEventListener('input', () => {
        adjustTextareaHeight();
        handleInputChange();
    });
    elements.messageInput.addEventListener('keydown', handleKeyDown);
    elements.sendBtn.addEventListener('click', sendMessage);

    elements.suggestions.addEventListener('click', handleSuggestionClick);

    if (elements.backBtn) {
        elements.backBtn.addEventListener('click', closePreview);
    }
    if (elements.downloadBtn) {
        elements.downloadBtn.addEventListener('click', downloadCode);
    }
    if (elements.shareBtn) {
        elements.shareBtn.addEventListener('click', shareCode);
    }
    // --- NUEVO: Copiar código en escritorio ---
    const copyBtn = document.getElementById('copyCodeBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            if (!window.currentCode) return;
            try {
                await navigator.clipboard.writeText(window.currentCode);
                copyBtn.innerHTML = '✔️';
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>`;
                }, 1200);
            } catch (e) {
                alert('No se pudo copiar el código');
            }
        });
    }

    const userInfoBtn = document.getElementById('userInfoBtn');
    const userInfoModal = document.getElementById('userInfoModal');
    const closeUserInfoModal = document.getElementById('closeUserInfoModal');
    const userInfoForm = document.getElementById('userInfoForm');

    if (userInfoBtn) {
        userInfoBtn.addEventListener('click', () => {
            showUserInfoModal();
        });
    }
    if (closeUserInfoModal) {
        closeUserInfoModal.addEventListener('click', () => {
            hideUserInfoModal();
        });
    }
    if (userInfoForm) {
        userInfoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveUserInfo();
            hideUserInfoModal();
            updateAiConfigBtnVisibility();
        });
    }

    const aiConfigBtn = document.getElementById('aiConfigBtn');
    const aiConfigModal = document.getElementById('aiConfigModal');
    const closeAiConfigModal = document.getElementById('closeAiConfigModal');
    const aiConfigForm = document.getElementById('aiConfigForm');
    const addAiBtn = document.getElementById('addAiBtn');

    if (aiConfigBtn) {
        aiConfigBtn.addEventListener('click', () => {
            loadUserInfo();
            if (
                userInfo &&
                userInfo.name === 'Justin' &&
                typeof userInfo.custom === 'string' &&
                userInfo.custom.trim() === 'DevCenter'
            ) {
                showAiConfigModal();
            }
        });
    }
    if (closeAiConfigModal) {
        closeAiConfigModal.addEventListener('click', hideAiConfigModal);
    }
    if (aiConfigForm) {
        aiConfigForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveAiConfigsFromForm();
            hideAiConfigModal();
        });
    }
    if (addAiBtn) {
        addAiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addAiConfig();
            renderAiConfigList();
        });
    }
}

// --- IA Configuración: almacenamiento y UI ---
function loadAiConfigs() {
    try {
        const data = localStorage.getItem('devCenter_aiConfigs');
        aiConfigs = data ? JSON.parse(data) : DEFAULT_AI_CONFIGS.slice();
        if (!aiConfigs.length) aiConfigs = DEFAULT_AI_CONFIGS.slice();
        selectedAiId = localStorage.getItem('devCenter_selectedAiId') || aiConfigs[0].id;
    } catch (e) {
        aiConfigs = DEFAULT_AI_CONFIGS.slice();
        selectedAiId = aiConfigs[0].id;
    }
}

function saveAiConfigs() {
    localStorage.setItem('devCenter_aiConfigs', JSON.stringify(aiConfigs));
    localStorage.setItem('devCenter_selectedAiId', selectedAiId);
}

function showAiConfigModal() {
    renderAiConfigList();
    renderAiConfigTypeSelector();
    renderAiConfigPanelByType();
    const modal = document.getElementById('aiConfigModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.focus && modal.focus();
    }
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
}
function hideAiConfigModal() {
    const modal = document.getElementById('aiConfigModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

function renderAiConfigList() {
    const container = document.getElementById('aiListContainer');
    if (!container) return;
    container.innerHTML = '';
    aiConfigs.forEach((ai, idx) => {
        const div = document.createElement('div');
        div.className = 'ai-item' + (ai.id === selectedAiId ? ' selected' : '');
        // Mostrar la API key oculta (solo los primeros 5 caracteres)
        const maskedKey = ai.apiKey
            ? ai.apiKey.slice(0, 5) + '*'.repeat(Math.max(0, ai.apiKey.length - 5))
            : '';
        // Generar información de limites si está disponible
        const limitsInfo = (ai.rpm || ai.tpm || ai.rpd) ? 
            `<div class="ai-limits">
                <small>
                    ${ai.rpm ? `RPM: ${ai.rpm}` : ''} 
                    ${ai.tpm ? `• TPM: ${ai.tpm.toLocaleString()}` : ''} 
                    ${ai.rpd ? `• RPD: ${ai.rpd}` : ''}
                </small>
            </div>` : '';

        // Generar descripción si está disponible
        const descriptionInfo = ai.description ? 
            `<div class="ai-description">
                <small>${escapeHtml(ai.description)}</small>
            </div>` : '';

        // Generar capacidades si están disponibles
        const capabilitiesInfo = ai.capabilities && ai.capabilities.length > 0 ? 
            `<div class="ai-capabilities">
                <small><strong>Capacidades:</strong> ${ai.capabilities.map(cap => `<span class="capability-tag">${escapeHtml(cap)}</span>`).join('')}</small>
            </div>` : '';

        div.innerHTML = `
            <div class="ai-item-header">
                <span class="ai-item-title">${escapeHtml(ai.name)}</span>
                <input type="radio" name="selectedAi" class="ai-item-select" value="${ai.id}" ${ai.id === selectedAiId ? 'checked' : ''} title="Seleccionar IA">
                <button type="button" class="ai-item-remove" data-idx="${idx}" title="Eliminar IA" ${aiConfigs.length === 1 ? 'disabled' : ''}>✕</button>
            </div>
            ${limitsInfo}
            ${descriptionInfo}
            ${capabilitiesInfo}
            <label>Nombre:
                <input type="text" class="ai-name" value="${escapeHtml(ai.name)}" data-idx="${idx}" autocomplete="off">
            </label>
            <label>URL:
                <input type="text" class="ai-url" value="${escapeHtml(ai.url)}" data-idx="${idx}" autocomplete="off">
            </label>
            <label>API Key:
                <input type="text" class="ai-key" value="${maskedKey}" data-idx="${idx}" autocomplete="off" readonly style="background:var(--bg-primary);cursor:pointer;">
            </label>
        `;
        container.appendChild(div);

        // Mostrar la API key oculta SIEMPRE, incluso al editar (no mostrar el valor real nunca)
        const keyInput = div.querySelector('.ai-key');
        if (keyInput) {
            keyInput.addEventListener('focus', function () {
                // No mostrar la real, solo permitir editar (campo vacío)
                keyInput.readOnly = false;
                keyInput.value = '';
            });
            keyInput.addEventListener('blur', function () {
                keyInput.readOnly = true;
                keyInput.value = ai.apiKey
                    ? ai.apiKey.slice(0, 5) + '*'.repeat(Math.max(0, ai.apiKey.length - 5))
                    : '';
            });
            // Al editar, guardar el valor ingresado como nueva apiKey
            keyInput.addEventListener('input', function () {
                aiConfigs[idx].apiKey = keyInput.value;
            });
        }
    });

    // Selección de IA
    container.querySelectorAll('.ai-item-select').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedAiId = e.target.value;
            renderAiConfigList();
        });
    });
    // Eliminar IA
    container.querySelectorAll('.ai-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.idx, 10);
            if (aiConfigs.length > 1) {
                if (aiConfigs[idx].id === selectedAiId) {
                    aiConfigs.splice(idx, 1);
                    selectedAiId = aiConfigs[0].id;
                } else {
                    aiConfigs.splice(idx, 1);
                }
                renderAiConfigList();
            }
        });
    });
    // Edición en vivo
    container.querySelectorAll('.ai-name').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(input.dataset.idx, 10);
            aiConfigs[idx].name = input.value;
        });
    });
    container.querySelectorAll('.ai-url').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(input.dataset.idx, 10);
            aiConfigs[idx].url = input.value;
        });
    });
}

function addAiConfig() {
    const newId = generateId();
    aiConfigs.push({
        id: newId,
        name: 'Nueva IA',
        url: '',
        apiKey: ''
    });
    selectedAiId = newId;
}

function saveAiConfigsFromForm() {
    // Ya se actualizan en vivo, solo guardar
    saveAiConfigs();
}

// --- FIN configuración IA ---

function loadChats() {
    try {
        const savedChats = localStorage.getItem('devCenter_chats');
        chats = savedChats ? JSON.parse(savedChats) : [];
        if (chats.length === 0) {
            createNewChat('Nuevo Chat');
        } else {
            if (!currentChatId || !chats.some(c => c.id === currentChatId)) {
                currentChatId = chats[0].id;
            }
            renderSidebar();
            loadCurrentChat();
        }
    } catch (error) {
        console.error('Error loading chats:', error);
        chats = [];
        createNewChat('Nuevo Chat');
    }
}

function saveChats() {
    try {
        localStorage.setItem('devCenter_chats', JSON.stringify(chats));
    } catch (error) {
        console.error('Error saving chats:', error);
    }
}

function createNewChat(name = null) {
    const chatName = name || `Chat ${chats.length + 1}`;
    const newChat = {
        id: generateId(),
        name: chatName,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    chats.unshift(newChat);
    currentChatId = newChat.id;
    saveChats();
    renderSidebar();
    loadCurrentChat();
    closeSidebar();
}

function deleteChat(chatId) {
    if (chats.length <= 1) {
        alert('No puedes eliminar el último chat');
        return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este chat?')) {
        const idx = chats.findIndex(c => c.id === chatId);
        chats = chats.filter(chat => chat.id !== chatId);
        // Corrige la selección del siguiente chat
        if (currentChatId === chatId) {
            if (chats[idx]) {
                currentChatId = chats[idx].id;
            } else if (chats[0]) {
                currentChatId = chats[0].id;
            } else {
                currentChatId = null;
            }
            loadCurrentChat();
        }
        saveChats();
        renderSidebar();
    }
}

function renameChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const newName = prompt('Nuevo nombre para el chat:', chat.name);
    if (newName && newName.trim() !== '') {
        chat.name = newName.trim();
        chat.updatedAt = new Date().toISOString();
        saveChats();
        renderSidebar();
    }
}

function switchChat(chatId) {
    if (currentChatId === chatId) return;
    currentChatId = chatId;
    loadCurrentChat();
    closeSidebar();
}

function getCurrentChat() {
    return chats.find(chat => chat.id === currentChatId);
}

function updateCurrentChat(updates) {
    const chat = getCurrentChat();
    if (chat) {
        Object.assign(chat, updates);
        chat.updatedAt = new Date().toISOString();
        saveChats();
    }
}

// Renderizado
function renderSidebar() {
    if (chats.length === 0) {
        elements.sidebarContent.innerHTML = `
            <div class="no-chats">
                <p>No hay chats aún</p>
                <small>Crea un nuevo chat para empezar</small>
            </div>
        `;
        return;
    }
    const chatItems = chats.map(chat => {
        const isActive = chat.id === currentChatId;
        const date = new Date(chat.updatedAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
        return `
            <div class="chat-item ${isActive ? 'active' : ''}" data-chat-id="${chat.id}">
                <div class="chat-item-content">
                    <div class="chat-item-name">${escapeHtml(chat.name)}</div>
                    <div class="chat-item-date">${date}</div>
                </div>
                <div class="chat-item-actions">
                    <button class="chat-action-btn" onclick="renameChat('${chat.id}')" title="Renombrar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="chat-action-btn" onclick="deleteChat('${chat.id}')" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0,0,1-2,2H7a2,2 0,0,1-2-2V6m3,0V4a2,2 0,0,1,2-2h4a2,2 0,0,1,2,2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    elements.sidebarContent.innerHTML = chatItems;
    elements.sidebarContent.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-action-btn')) {
                const chatId = item.dataset.chatId;
                switchChat(chatId);
            }
        });
    });
}

function loadCurrentChat() {
    const chat = getCurrentChat();
    if (!chat) return;
    clearMessages();
    if (chat.messages.length === 0) {
        showWelcomeMessage();
    } else {
        chat.messages.forEach(message => {
            addMessage(message.type, message.content, message.generatedCode, false, message.id, message.timestamp);
        });
    }
    renderSidebar();
    scrollToBottom();
}

function clearMessages() {
    elements.messages.innerHTML = '';
}

function showWelcomeMessage() {
    elements.messages.innerHTML = `
        <div class="welcome-message fade-in">
            <div class="welcome-icon">🌐</div>
            <h3>¡Hola! Soy DevCenter</h3>
            <p>Tu asistente de IA. Puedes chatear conmigo o pedirme que genere páginas web.</p>
        </div>
    `;
}

function addMessage(type, content, generatedCode = null, save = true, messageId = null, timestamp = null, retryData = null) {
    messageId = messageId || generateId();
    const timeStr = timestamp
        ? new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type} fade-in`;

    // Detectar mensaje de error IA (ambos tipos)
    let isError = false;
    let retryHtml = '';
    if (
        type === 'ai' &&
        typeof content === 'string' &&
        (content.trim().startsWith('Lo siento, ha ocurrido un error al generar la página web') ||
         content.trim().startsWith('Lo siento, no pude procesar tu solicitud en este momento'))
    ) {
        isError = true;
        // retryData: { prompt }
        const lastUserMsg = retryData && retryData.prompt
            ? retryData.prompt
            : (getCurrentChat()?.messages?.slice().reverse().find(m => m.type === 'user')?.content || '');
        retryHtml = `
            <div style="margin-top:0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="action-btn" onclick="window.retryGenerateMessage('${messageId}')" title="Intentar nuevamente">
                    🔄 Reenviar
                </button>
            </div>
        `;
        // Guardar el prompt original en el DOM para el reintento
        messageElement.dataset.retryPrompt = lastUserMsg;
    }

    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-text">${type === 'ai' ? renderMarkdown(content) : escapeHtml(content)}</div>
            <div class="message-time">${timeStr}</div>
            ${generatedCode ? `
                <div class="message-preview">
                    <div class="preview-thumbnail">
                        <div class="preview-placeholder">
                            <div class="preview-placeholder-icon"></div>
                            <div class="preview-placeholder-text">Página Web Generada</div>
                        </div>
                    </div>
                    <div class="preview-lines">
                        <div class="preview-line"></div>
                        <div class="preview-line"></div>
                        <div class="preview-line"></div>
                    </div>
                    <button class="preview-btn" onclick="showPreview('${messageId}')">
                        Ver Vista Previa
                    </button>
                </div>
            ` : ''}
            ${isError ? retryHtml : ''}
        </div>
    `;
    elements.messages.appendChild(messageElement);
    if (save) {
        const chat = getCurrentChat();
        if (chat) {
            const message = {
                id: messageId,
                type,
                content,
                generatedCode,
                timestamp: timestamp || new Date().toISOString()
            };
            chat.messages.push(message);

            // Limitar mensajes por chat si está configurado
            const maxMsgs = getMaxMessagesPerChat();
            if (chat.messages.length > maxMsgs) {
                chat.messages = chat.messages.slice(chat.messages.length - maxMsgs);
            }

            updateCurrentChat({});
        }
    }
    scrollToBottom();
    return messageId;
}

// --- Datos de usuario ---
function loadUserInfo() {
    try {
        const data = localStorage.getItem('devCenter_userInfo');
        userInfo = data ? JSON.parse(data) : {};
    } catch (e) {
        userInfo = {};
    }
    setUserInfoForm();
}
function setUserInfoForm() {
    if (!userInfo) return;
    const name = document.getElementById('userName');
    const birth = document.getElementById('userBirth');
    const email = document.getElementById('userEmail');
    const custom = document.getElementById('userCustom');
    if (name) name.value = userInfo.name || '';
    if (birth) birth.value = userInfo.birth || '';
    if (email) email.value = userInfo.email || '';
    if (custom) custom.value = userInfo.custom || '';
}
function showUserInfoModal() {
    loadUserInfo();
    document.getElementById('userInfoModal').style.display = 'flex';
}
function hideUserInfoModal() {
    document.getElementById('userInfoModal').style.display = 'none';
}
function saveUserInfo() {
    const name = document.getElementById('userName').value.trim();
    const birth = document.getElementById('userBirth').value;
    const email = document.getElementById('userEmail').value.trim();
    const custom = document.getElementById('userCustom').value.trim();
    userInfo = { name, birth, email, custom };
    localStorage.setItem('devCenter_userInfo', JSON.stringify(userInfo));
}

// Entrada y envío

// Función para detectar si el usuario pide generar una página web
function isWebGenerationRequest(prompt) {
    const lowerPrompt = prompt.toLowerCase();





// Referencias a elementos
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');

// Event listener para enviar mensaje
sendBtn.addEventListener('click', async () => {
    const prompt = messageInput.value.trim(); // Tomar el texto del usuario
    if (prompt === '') return; // No hacer nada si está vacío

    // Limpiar el textarea inmediatamente
    messageInput.value = '';
    messageInput.style.height = 'auto'; // Opcional si usas auto-resize

    // Aquí llamas a tu función de generación de chat o página
    await generateChatResponse(prompt); 
    // o si es generación de página:
    // await generateWebpage(prompt);
});

// ======================== Palabras clave específicas para generación web ====================================
const webKeywords = 
[

/* ================= 100 frases largas/naturales ================= */
"quiero que crees una pagina web completa para mi proyecto",
"necesito que me hagas un sitio web moderno y responsive",
"ayudame a diseñar un portal profesional para mi empresa",
"puedes construir una web interactiva para mi negocio",
"deseo desarrollar una pagina web con diseño moderno",
"crea una landing page profesional para promocionar mi producto",
"genera un proyecto web completo con todas las secciones necesarias",
"haz un sitio web moderno con diseño adaptativo",
"diseña una web app interactiva para usuarios",
"construye una pagina web profesional para mi startup",
"elabora un portal web con múltiples funcionalidades",
"arma una landing page completa para captar clientes",
"prepara un sitio web moderno y responsive",
"programa una web app profesional con login y registro",
"monta un proyecto web interactivo y funcional",
"diseña una plataforma web profesional para usuarios",
"genera una pagina web con diseño innovador",
"haz un portal web moderno y fácil de usar",
"crea un sitio web completo con secciones de contacto y servicios",
"elabora un proyecto web funcional y profesional",
"arma una web app moderna y segura",
"prepara una landing page interactiva y atractiva",
"programa un sitio web con diseño responsivo",
"monta una pagina web moderna con animaciones",
"construye un portal profesional para mostrar productos",
"genera una web interactiva para promocionar servicios",
"haz un proyecto web con diseño limpio y profesional",
"crea una pagina web profesional con blog integrado",
"diseña un sitio web moderno con secciones animadas",
"elabora un portal web profesional con formulario de contacto",
"arma una landing page atractiva y responsiva",
"prepara un proyecto web con diseño creativo",
"programa una web app moderna con dashboard",
"monta un sitio web profesional con secciones informativas",
"genera una pagina web para mostrar portafolio",
"haz un portal web completo con galeria de imágenes",
"crea una web app con login, registro y perfil de usuario",
"diseña una landing page profesional para venta de productos",
"elabora un proyecto web moderno con diseño interactivo",
"arma una pagina web con secciones de contacto y servicios",
"prepara un sitio web profesional con diseño responsive",
"programa una plataforma web moderna y funcional",
"monta un proyecto web interactivo con animaciones",
"genera un portal web completo con menú y secciones",
"haz un sitio web profesional con formulario de contacto",
"crea una pagina web moderna con diseño llamativo",
"diseña una web app profesional con secciones interactivas",
"elabora un portal web moderno para empresa",
"arma una landing page profesional y responsiva",
"prepara un proyecto web completo con todas las secciones",
"programa un sitio web interactivo con diseño moderno",
"monta una pagina web profesional y atractiva",
"genera una web app moderna con funcionalidades básicas",
"haz un portal web moderno y responsive",
"crea un proyecto web con diseño limpio y profesional",
"diseña una pagina web con blog y secciones informativas",
"elabora una web app profesional con login y registro",
"arma un portal web completo con galeria y contacto",
"prepara una landing page moderna y funcional",
"programa una pagina web con diseño creativo",
"monta un sitio web interactivo y profesional",
"genera un proyecto web moderno con animaciones",
"haz una web app profesional para usuarios",
"crea un portal web completo y responsivo",
"diseña un proyecto web moderno y funcional",
"elabora una landing page profesional con secciones atractivas",
"arma una pagina web moderna con diseño responsivo",
"prepara un sitio web profesional con animaciones",
"programa un portal web moderno con funcionalidades",
"monta un proyecto web profesional con secciones interactivas",
"genera una pagina web profesional con blog integrado",
"haz un sitio web moderno con diseño responsivo",
"crea una web app profesional con dashboard",
"diseña un portal web profesional y moderno",
"elabora un proyecto web completo con secciones informativas",
"arma una landing page profesional con animaciones",
"prepara una pagina web moderna y funcional",
"programa un sitio web profesional con login y registro",
"monta un portal web moderno y atractivo",
"genera una web app profesional y responsiva",
"haz un proyecto web completo con diseño profesional",
"crea una pagina web moderna con galeria de imágenes",
"diseña un sitio web profesional con secciones interactivas",
"elabora un portal web moderno y responsivo",
"arma un proyecto web completo con diseño creativo",
"prepara una landing page profesional con todas las secciones",
"programa una web app moderna con funciones básicas",
"monta una pagina web profesional y atractiva",
"genera un portal web moderno con animaciones",
"haz un sitio web profesional y responsivo",
"crea un proyecto web moderno con diseño interactivo",
"diseña una pagina web profesional y moderna",
"elabora una web app completa con login y registro",
"arma un portal web moderno con galeria y contacto",
"prepara una landing page moderna y profesional",
"programa una pagina web interactiva y funcional",
"monta un sitio web profesional con secciones animadas",
"genera un proyecto web moderno y responsivo",
"haz una web app profesional con dashboard",
"crea un portal web completo y moderno",
"diseña un proyecto web profesional y funcional",
"elabora una landing page moderna y atractiva",
"arma una pagina web profesional y creativa",
"prepara un sitio web moderno con diseño responsivo",
"programa un portal web profesional con funcionalidades",
"monta un proyecto web completo y moderno",
"genera una pagina web moderna y profesional",
"haz un sitio web interactivo y atractivo",
"crea una web app profesional y responsiva",
"diseña un portal web moderno y funcional",
"elabora un proyecto web completo con animaciones",
"arma una landing page profesional y moderna",
"prepara una pagina web profesional con todas las secciones",
"programa un sitio web moderno con diseño creativo",
"monta un portal web profesional y interactivo",
"genera una web app moderna con secciones interactivas",
"haz un proyecto web profesional y responsivo",
"crea una pagina web completa y moderna",
"diseña un sitio web profesional y atractivo",
"elabora un portal web interactivo y moderno",
"arma un proyecto web profesional y funcional",
"prepara una landing page moderna con diseño responsivo",
"programa una pagina web profesional con animaciones",
"monta un sitio web moderno y completo",

/* ================= 100 frases mal escritas/informales ================= */
"crea pag web",
"has",
"as",
"az",
"haz pag",
"genera web",
"diseña sitio",
"arma web",
"monta pag",
"prepara web",
"programa sitio",
"crea un portal",
"haz web",
"genera pag",
"c web",
"pagina web",
"sitio web",
"web app",
"landing",
"haz portal",
"crea pagina",
"diseña web",
"arma sitio",
"monta web app",
"prepara pagina",
"programa web",
"haz pagina",
"genera sitio",
"crea web app",
"pag web",
"portal web",
"sitio moderno",
"web profesional",
"landing page",
"web app pro",
"pagina pro",
"haz landing",
"crea web pro",
"monta portal",
"arma landing",
"web interactiva",
"sitio interactivo",
"pagina interactiva",
"crea landing",
"haz web pro",
"programa landing",
"prepara portal",
"arma web",
"monta pag web",
"pagina site",
"web moderna",
"crea pag",
"haz web app",
"genera portal",
"diseña landing",
"c web app",
"web pagina",
"haz proyecto",
"arma sitio web",
"monta pagina",
"prepara web app",
"programa portal",
"crea web app pro",
"haz landing page",
"genera pag web",
"diseña web app",
"c portal",
"pagina interactiva pro",
"arma web app",
"monta sitio pro",
"prepara landing",
"programa web app",
"haz portal pro",
"crea pag interactiva",
"genera web pro",
"diseña pagina pro",
"arma portal web",
"monta landing page",
"prepara sitio web",
"programa web pro",
"haz pagina interactiva",
"crea web interactiva",
"genera portal web",
"diseña landing pro",
"arma pagina web",
"monta web interactiva",
"prepara portal pro",
"programa pag",
"haz web interactiva",
"crea landing pro",
"genera proyecto web",
"diseña web moderna",
"arma pagina interactiva",
"monta proyecto web",
"prepara pagina pro",
"programa sitio pro",
"haz portal interactiva",
"crea web pro",
"genera landing interactiva",
"diseña pagina interactiva",
"arma web moderna",
"monta sitio interactivo",
"prepara web interactiva",
"programa landing pro",
"haz pagina pro",

/* ================= 100 frases súper cortas ================= */
"web",
"pagina",
"sitio",
"portal",
"landing",
"web app",
"pag web",
"haz web",
"crea web",
"diseña web",
"arma web",
"monta web",
"prepara web",
"programa web",
"web pro",
"web interactiva",
"sitio web",
"pagina pro",
"web app pro",
"landing pro",
"pag",
"web app",
"c web",
"portal web",
"pagina",
"site",
"web moderna",
"web interactiva",
"landing",
"pro web",
"app web",
"web pagina",
"pagina web",
"haz pag",
"crea pag",
"diseña pagina",
"arma sitio",
"monta pag",
"prepara pag",
"programa sitio",
"web app pro",
"web pro",

"pag pro",
"web pro",
"pagina interactiva",
"portal",
"app",
"web app",
"pagina",
"web app pro",
"landing",
"web",
"pagina",
"sitio",
"portal",
"landing page",
"app web",
"web pro",
"web",
"pag",
"c web",
"pagina web",
"web app",
"landing",
"web app pro",
"pag web",
"web interactiva",
"pagina pro",
"web moderna",
"landing pro",
"portal",

"pagina",
"site",
"web app",
"web app pro",
"pagina",
"web pro",
"landing page",

"app"























];
















    // Palabras clave técnicas
    const techKeywords = ['html', 'css', 'javascript', 'landing page', 'portfolio', 'dashboard', 
        'aplicacion', 'app', 'formulario', 'calculadora', 'juego', 'quiz', 'encuesta', 'galeria', 'slider', 'carrusel', 
        'login', 'registro', 'chat', 'calendario', 'reloj', 'contador', 'cronometro', 'timer', 'todolist', 'lista de tareas',
        'blog', 'navbar', 'menu', 'modal', 'popup', 'accordion', 'tabs', 'cards', 'grid', 'tabla', 'chart', 'grafico',
        'mapa', 'video', 'audio', 'slideshow', 'testimonios', 'pricing', 'contacto', 'bootstrap', 'react', 'vue',
        'sistema', 'plataforma', 'herramienta', 'utilidad', 'generador', 'convertidor', 'editor', 'visualizador'];

    // Verificar si contiene frases específicas de generación web
    const hasWebPhrase = webKeywords.some(phrase => lowerPrompt.includes(phrase));

    // Verificar si contiene palabras técnicas en contexto de creación
    const hasTechKeyword = techKeywords.some(keyword => {
        const index = lowerPrompt.indexOf(keyword);
        if (index === -1) return false;

        // Verificar contexto: si está precedido por palabras de creación
        const beforeKeyword = lowerPrompt.substring(Math.max(0, index - 20), index);
        return beforeKeyword.includes('crea') || beforeKeyword.includes('haz') || beforeKeyword.includes('genera') || beforeKeyword.includes('diseña');
    });

    return hasWebPhrase || hasTechKeyword;
}

function handleInputChange() {
    const hasText = elements.messageInput.value.trim().length > 0;
    elements.sendBtn.disabled = !hasText || isGenerating;
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!elements.sendBtn.disabled) {
            sendMessage();
        }
    }
}

function adjustTextareaHeight() {
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 120) + 'px';
}

function handleSuggestionClick(e) {
    if (e.target.classList.contains('suggestion-btn')) {
        const template = e.target.dataset.template;
        if (templates[template]) {
            elements.messageInput.value = templates[template];
            handleInputChange();
            elements.messageInput.focus();
        }
    }
}

// Envío de mensajes
async function sendMessage(customPrompt) {
    // --- NUEVO: Bloquea si se alcanza el límite de mensajes y muestra tiempo restante ---
    if (!canSendMessage()) {
        // Calcular tiempo restante
        const chat = getCurrentChat();
        let timeMsg = '';
        if (chat && chat.messages && chat.messages.length > 0) {
            const firstMsgTime = new Date(chat.messages[0].timestamp || chat.messages[0].createdAt || chat.createdAt);
            const now = new Date();
            const diffMs = now - firstMsgTime;
            const diffMinutes = diffMs / (1000 * 60);
            const remaining = Math.max(0, RESET_LIMIT_MINUTES - diffMinutes);
            const min = Math.floor(remaining);
            const sec = Math.floor((remaining - min) * 60);
            timeMsg = ` Intenta de nuevo en ${min}m ${sec < 10 ? '0' : ''}${sec}s.`;
        }
        alert('Has alcanzado el límite de mensajes permitidos en esta conversación.' + timeMsg);
        return;
    }
    const content = typeof customPrompt === 'string'
        ? customPrompt
        : elements.messageInput.value.trim();
    if (!content || isGenerating) return;

    if (!customPrompt) {
        elements.messageInput.value = '';
        elements.messageInput.style.height = 'auto';
        handleInputChange();
    }

    const welcomeMessage = elements.messages.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    addMessage('user', content);

    // Verificar si el prompt es para generar una página web
    if (isWebGenerationRequest(content)) {
        // Generar página web
        showLoading();
        isGenerating = true;
        handleInputChange();

        try {
            const result = await generateWebpage(content);
            hideLoading();
            const messageId = addMessage('ai', result.message, result.code);

            // Actualizar el nombre del chat si es el primer mensaje real
            const chat = getCurrentChat();
            if (chat && chat.messages.length <= 2) {
                const newName = generateChatName(content);
                chat.name = newName;
                updateCurrentChat({});
                renderSidebar();
            }
        } catch (error) {
            hideLoading();
            console.error('Error:', error);
            // Pasar el prompt original para el botón de reintentar
            addMessage('ai', 'Lo siento, ha ocurrido un error al generar la página web. Por favor, inténtalo de nuevo.', null, true, null, null, { prompt: content });
        }

        isGenerating = false;
        handleInputChange();
    } else {
        // Generar respuesta de chat
        showLoading();
        isGenerating = true;
        handleInputChange();

        try {
            const response = await generateChatResponse(content);
            hideLoading();
            addMessage('ai', response);
        } catch (error) {
            hideLoading();
            console.error('Error:', error);
            // Pasar el prompt original para el botón de reintentar
            const errorMessage = error.message || 'Lo siento, no pude procesar tu solicitud en este momento.';
            addMessage('ai', errorMessage, null, true, null, null, { prompt: content });
        }

        isGenerating = false;
        handleInputChange();
    }
}

// IA y generación de código
async function generateWebpage(prompt) {
    // Siempre recarga userInfo antes de generar el prompt
    loadUserInfo();

    // Ya no necesitamos obtener IA específica aquí, el failover lo maneja
    loadAiConfigs();

    // Obtener historial de mensajes del chat current (solo texto, sin código generado)
    const chat = getCurrentChat();
    let historyText = '';
    if (chat && chat.messages && chat.messages.length > 0) {
        historyText = chat.messages
            .filter(m => m.type === 'user' || m.type === 'ai')
            .map(m => {
                if (m.type === 'user') {
                    return `Usuario: ${m.content}`;
                } else if (m.type === 'ai') {
                    // Solo incluir el mensaje, no el código generado
                    return `DevCenter: ${m.content}`;
                }
                return '';
            })
            .join('\n');
    }

    // Información del usuario para IA
    let userInfoText = '';
    if (userInfo && (userInfo.name || userInfo.birth || userInfo.email || userInfo.custom)) {
        userInfoText = [
            userInfo.name ? `Nombre: ${userInfo.name}` : '',
            userInfo.birth ? `Fecha de nacimiento: ${userInfo.birth}` : '',
            userInfo.email ? `Correo: ${userInfo.email}` : '',
            userInfo.custom ? `Información personalizada: ${userInfo.custom}` : ''
        ].filter(Boolean).join('\n');
    }

    // PROMPT especial si es el segundo mensaje o más
    let systemPrompt = '';
    const userMessagesCount = chat && chat.messages
        ? chat.messages.filter(m => m.type === 'user').length
        : 0;

    if (userMessagesCount >= 2) {
        // Busca el último código generado por la IA
        const lastAICode = chat.messages
            .slice()
            .reverse()
            .find(m => m.type === 'ai' && m.generatedCode)?.generatedCode || '';
























































      //================================================ Segunda peticion ==========================================
systemPrompt = `

INSTRUCCIONES AVANZADAS PARA MODIFICACIÓN:
- El USUARIO NECESITA HACER ESTE CAMBIO: ${prompt}
- TU CÓDIGO QUE GENERASTE ANTERIORMENTE: (ver abajo)
- Modifica el código anterior agregando funcionalidad avanzada según la petición
- Implementa características interactivas, validaciones, animaciones cuando sea apropiado
- Mantén diseño moderno, responsive y mobile-first con mejoras visuales
- El código debe ser completamente funcional y probado
- Responde con una frase corta (máx. 50 palabras) que resuma la mejora, luego deja una línea en blanco y pega el código HTML completo actualizado
- Todo el contenido debe estar en español

NAVEGACIÓN AVANZADA OBLIGATORIA:
- SIEMPRE implementa scroll suave para todos los enlaces internos con fragmentos (#section)
- Usa behavior: 'smooth' en JavaScript para navegación fluida
- Previene comportamiento defectuoso de enlaces con event.preventDefault() cuando sea necesario
- Implementa navegación robusta que funcione correctamente en dominios como Replit
- Asegura que los enlaces #features, #about, etc. naveguen suavemente a las secciones correspondientes
- Incluye JavaScript para manejar clics en enlaces de navegación interna de forma profesional
- NO uses simplemente href="#section" sin JavaScript de soporte - siempre agrega lógica de scroll suave

NUEVAS CAPACIDADES QUE PUEDES AGREGAR:
- Validaciones de formularios en tiempo real
- Efectos visuales y animaciones suaves
- Funcionalidad de búsqueda y filtros
- Modals, tooltips, notificaciones
- Persistencia con localStorage
- Interactividad avanzada con JavaScript
- Componentes dinámicos y responsivos
- Integración de librerías externas vía CDN (Bootstrap, Chart.js, etc)
- IMPORTANTE: Solo usar librerías que funcionen en archivos HTML únicos
- Evitar frameworks complejos, usar JavaScript vanilla o librerías simples
- VALIDACIÓN OBLIGATORIA: El código HTML debe ser completamente funcional y sin errores
- Incluir todas las dependencias necesarias vía CDN cuando sea requerido
- Probar funcionalidad JavaScript para asegurar que funcione perfectamente
- Agregar comentarios explicativos en código JavaScript complejo

IMÁGENES EN RESPUESTAS - USO OBLIGATORIO DE URLS REALES:
- SIEMPRE usa URLs reales para imágenes, NUNCA texto de ejemplo como "URL de la imagen"
- Sintaxis correcta: ![Descripción](https://picsum.photos/400/300)
- URLs recomendadas: https://picsum.photos/ancho/alto o https://via.placeholder.com/300x200
- PROHIBIDO escribir texto placeholder como "URL de la imagen" o "enlace-aquí"
- SIEMPRE verifica que las URLs funcionen y sean accesibles
- Ejemplo CORRECTO: ![Producto](https://picsum.photos/300/200)
- Ejemplo INCORRECTO: ![Producto](URL de la imagen)



NAVEGACIÓN ESPECIALIZADA REQUERIDA:
- Implementa scroll suave OBLIGATORIO para todos los enlaces de navegación interna
- Usa scrollIntoView({behavior: 'smooth'}) para navegación fluida entre secciones
- Maneja eventos de clic en menús para prevenir comportamiento defectuoso
- Incluye offset para headers fijos cuando sea necesario
- Asegura navegación funcional en entornos como Replit con dominios complejos
- Implementa indicadores visuales de sección activa en la navegación
- Código ejemplo requerido para navegación: document.querySelectorAll('a[href^="#"]').forEach(anchor => {...})

CÓDIGO ANTERIOR:
${lastAICode ? lastAICode : '(No hay código anterior)'}

INFORMACIÓN DADA POR EL USUARIO (solo utilízala si se ocupa):
${userInfoText ? userInfoText : '(Sin información dada por el usuario)'}

HISTORIAL DE MENSAJES:
${historyText ? historyText : '(Sin historial previo)'}
`;

//=============================================================================================================================

} else {

//============================================== Primer mensaje: prompt normal ===============================================
systemPrompt = `


INSTRUCCIONES AVANZADAS PARA IA DE DESARROLLO WEB:
- Genera un código HTML completo con CSS integrado y JavaScript avanzado cuando sea necesario
- Usa diseño moderno, profesional, responsive y mobile-first con animaciones suaves
- Implementa funcionalidad interactiva completa según lo solicitado
- Todo el código debe ser funcional, probado y listo para usar
- Responde con una frase corta (máx. 35 palabras) que resuma la funcionalidad, luego deja una línea en blanco y pega el código HTML completo
- Todo el contenido debe estar en español

NAVEGACIÓN AVANZADA OBLIGATORIA:
- SIEMPRE implementa navegación suave para enlaces internos (#section)
- Incluye JavaScript para scroll suave usando scrollIntoView({behavior: 'smooth'})
- Maneja eventos de navegación correctamente para evitar bugs en dominios Replit
- Implementa offset automático para headers fijos
- Previene comportamiento defectuoso con event.preventDefault() en navegación interna
- Asegura que menús de navegación funcionen perfectamente sin "bugear" la página
- NO uses enlaces simples href="#section" - SIEMPRE agrega lógica JavaScript de soporte

CAPACIDADES AVANZADAS QUE PUEDES USAR:
- Formularios con validación en tiempo real y envío
- Aplicaciones interactivas (calculadoras, juegos, quizzes)
- Sistemas de login/registro con localStorage
- Carruseles, galerías, modals y componentes dinámicos
- Charts y gráficos usando Chart.js o Canvas
- Mapas interactivos, calendarios, cronómetros
- Sistemas CRUD (crear, leer, actualizar, eliminar)
- APIs externas, geolocalización, cámara
- Animaciones CSS/JS, efectos visuales
- Bootstrap, Tailwind o CSS Grid/Flexbox avanzado
- Funciones de búsqueda, filtros, ordenamiento
- Modo oscuro/claro, temas personalizables
- Drag & drop, gestos táctiles
- Notificaciones, alerts personalizados
- Sistemas de puntuación, progreso
- Generadores, convertidores, herramientas



NAVEGACIÓN PROFESIONAL ESPECIALIZADA:
- Scroll suave automático para todos los enlaces de navegación interna
- Manejo inteligente de fragmentos URL (#features, #about, etc.)
- JavaScript robusto para navegación que funciona en cualquier dominio
- Indicadores visuales de sección activa (highlight en menú)
- Navegación sin errores que previene "bugs" de redirección
- Código estándar: document.querySelector('a[href="#section"]').addEventListener('click', smoothScroll)
- Offset automático para headers pegajosos (sticky headers)
- Navegación completamente funcional y profesional sin glitches

INFORMACIÓN DADA POR EL USUARIO (solo utilízala si se ocupa):
${userInfoText ? userInfoText : '(Sin información dada por el usuario)'}

HISTORIAL DE MENSAJES:
${historyText ? historyText : '(Sin historial previo)'}

USUARIO SOLICITA: ${prompt}

Responde con una frase corta y el archivo HTML completo:
`;

//=============================================================================================================================





















































    }

    // Usamos el sistema de failover para hacer la llamada a la API
    const apiCall = async (ai) => {
        console.log(`🌐 Llamando a API generateWebpage: ${ai.name}`);

        const response = await fetch(`${ai.url}?key=${ai.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: systemPrompt,
                            },
                        ],
                    },
                ],











              //  generationConfig: {
                //    temperature: 0.2,
                //    topK: 50,
                  //  topP: 0.9,
                   // maxOutputTokens: 8000,



                   generationConfig: {
    temperature: TEMPERATURE,
    topK: TOP_K,
    topP: TOP_P,
    maxOutputTokens: MAX_OUTPUT_TOKENS,








                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!code) {
            throw new Error('No se pudo generar código HTML');
        }

        const cleanCode = code.replace(/```html|```/g, '').trim();

        // Validación mejorada para HTML funcional
        if (cleanCode.length < 100) {
            throw new Error(`Respuesta muy corta (${cleanCode.length} caracteres). La IA debe generar más contenido.`);
        }

        if (!cleanCode.toLowerCase().includes('<html')) {
            throw new Error('HTML inválido: Falta etiqueta <html> en la respuesta.');
        }

        if (!cleanCode.toLowerCase().includes('<head') || !cleanCode.toLowerCase().includes('<body')) {
            throw new Error('HTML incompleto: Faltan etiquetas <head> y/o <body> necesarias.');
        }

        // Verificar que tenga contenido real en el body
        const bodyMatch = cleanCode.match(/<body[^>]*>(.*?)<\/body>/is);
        if (!bodyMatch || bodyMatch[1].trim().length < 30) {
            throw new Error('HTML sin contenido: El <body> está vacío o tiene muy poco contenido.');
        }

        // Extrae la primera línea como mensaje corto, el resto como código
        const lines = cleanCode.split('\n');
        let firstLine = lines[0] || 'Página web generada';
        let codeHtml = '';

        if (lines.length > 1) {
            // Respuesta multilínea: primera línea = mensaje, resto = código
            codeHtml = lines.slice(1).join('\n').trim();
        } else {
            // Respuesta de una sola línea: verificar si es solo código HTML
            if (cleanCode.toLowerCase().includes('<html')) {
                firstLine = 'Página web generada';
                codeHtml = cleanCode;
            } else {
                throw new Error(`Respuesta inválida: no se pudo extraer código HTML válido`);
            }
        }

        // Verificar que el código extraído sea funcional
        if (!codeHtml || codeHtml.length < 50) {
            throw new Error('Código HTML extraído insuficiente: Necesita más contenido para ser funcional.');
        }

        // Verificar estructura HTML básica
        if (!codeHtml.toLowerCase().includes('<html') || !codeHtml.toLowerCase().includes('</html>')) {
            throw new Error('Estructura HTML incompleta: Faltan etiquetas de apertura/cierre <html>.');
        }

        return {
            code: codeHtml,
            message: firstLine.trim()
        };
    };

    // Llamar al sistema de failover
    return await makeApiCallWithFailover(apiCall, 3);
}

// Función para generar respuesta de chat normal
async function generateChatResponse(prompt) {
    loadUserInfo();

    loadAiConfigs();

    const chat = getCurrentChat();
    let historyText = '';
    if (chat && chat.messages && chat.messages.length > 0) {
        historyText = chat.messages
            .filter(m => m.type === 'user' || m.type === 'ai')
            .map(m => {
                if (m.type === 'user') {
                    return `Usuario: ${m.content}`;
                } else if (m.type === 'ai') {
                    return `DevCenter: ${m.content}`;
                }
                return '';
            })
            .join('\n');
    }

    let userInfoText = '';
    if (userInfo && (userInfo.name || userInfo.birth || userInfo.email || userInfo.custom)) {
        userInfoText = [
            userInfo.name ? `Nombre: ${userInfo.name}` : '',
            userInfo.birth ? `Fecha de nacimiento: ${userInfo.birth}` : '',
            userInfo.email ? `Correo: ${userInfo.email}` : '',
            userInfo.custom ? `Información personalizada: ${userInfo.custom}` : ''
        ].filter(Boolean).join('\n');
    }







// No menciones nada sobre generar páginas web o aplicaciones web a menos que el usuario lo pida explícitamente.

    const systemPrompt = `
Eres un asistente de IA TU NOMBRE ES DevCenterIA que responde normalmente a las preguntas del usuario. Responde de forma clara y concisa a cualquier pregunta o conversación general.


MARKDOWN COMPLETO - USALO ACTIVAMENTE EN TUS RESPUESTAS:
Tienes acceso completo a Markdown. USALO para hacer respuestas mas atractivas y organizadas:

TEXTO Y FORMATO:
- **Texto en negrita** para conceptos importantes
- *Texto en cursiva* para enfasis
- ***Texto en negrita y cursiva*** para muy importante
- ~~Texto tachado~~ para contenido eliminado
- Codigo inline entre backticks para terminos tecnicos
- Texto normal sin formato

LISTAS Y ORGANIZACION:
- Listas sin orden con guiones
  - Elemento 1
  - Elemento 2
    - Sub-elemento A
    - Sub-elemento B
- Listas numeradas:
  1. Primer punto
  2. Segundo punto
     1. Sub-punto 2.1
     2. Sub-punto 2.2

LISTAS DE TAREAS:
- [x] Tarea completada
- [ ] Tarea pendiente
- [x] Otra tarea terminada
- [ ] Por hacer

TITULOS Y SECCIONES:
# Titulo Principal (H1)
## Titulo Secundario (H2)  
### Subtitulo (H3)
#### Seccion menor (H4)

ENLACES:
- [Texto del enlace](https://ejemplo.com)
- [Google](https://google.com)
- Enlaces automaticos: https://github.com


CODIGO:
- Codigo inline: backticks con const variable = "valor"
- Bloques de codigo con triple backticks:
  - javascript, html, css, python, etc.
  - function ejemplo() { return "Hola mundo"; }

TABLAS:
| Columna 1 | Columna 2 | Columna 3 |
|-----------|-----------|-----------|
| Dato A    | Dato B    | Dato C    |
| Valor 1   | Valor 2   | Valor 3   |

CITAS Y DESTACADOS:
> Esta es una cita importante
> que puede ocupar multiples lineas

LINEAS HORIZONTALES:
Usa --- para separar secciones

INSTRUCCIONES OBLIGATORIAS:
- SIEMPRE usa Markdown para organizar respuestas largas
- Usa titulos ## y ### para estructurar informacion
- Aplica **negritas** para conceptos importantes
- Usa listas para enumerar caracteristicas o pasos
- Incluye codigo inline para terminos tecnicos
- Agrega enlaces utiles cuando sea relevante
- Aplica > citas para destacar informacion clave
- Usa tablas para comparar datos o caracteristicas



IMAGENES (USA URLS REALES):
![Imagen Grande](https://picsum.photos/400/300)
![Imgen Chica](https://picsum.photos/100/100)


INFORMACIÓN DADA POR EL USUARIO (solo utilízala si se ocupa):
${userInfoText ? userInfoText : '(Sin información dada por el usuario)'}
HISTORIAL DE MENSAJES:
${historyText ? historyText : '(Sin historial previo)'}
USUARIO SOLICITA: ${prompt}
Responde de forma clara y concisa, sin generar código ni páginas web.




`;










    // Usamos el sistema de failover para hacer la llamada a la API
    const apiCall = async (ai) => {
        console.log(`🌐 Llamando a API generateChatResponse: ${ai.name}`);

        const response = await fetch(`${ai.url}?key=${ai.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: systemPrompt,
                            },
                        ],
                    },
                ],



             //   generationConfig: {
               //     temperature: 0.7,
               //    topK: 50,
               //     topP: 0.9,
               //     maxOutputTokens: 18000,







generationConfig: {
    temperature: TEMPERATURE,
    topK: TOP_K,
    topP: TOP_P,
    maxOutputTokens: MAX_OUTPUT_TOKENS,










                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return text.trim();
    };

    // Llamar al sistema de failover
    try {
        return await makeApiCallWithFailover(apiCall, 3);
    } catch (error) {
        console.error('Error generating chat response:', error);
        // Lanzar error para que sendMessage lo maneje en el catch con retryData
        throw new Error('Lo siento, no pude procesar tu solicitud en este momento.');
    }
}

// Preview
function showPreview(messageId) {
    const chat = getCurrentChat();
    if (!chat) return;
    const message = chat.messages.find(m => m.id === messageId);
    if (!message || !message.generatedCode) return;
    if (!elements.previewModal || !elements.previewFrame || !elements.previewSubtitle) return;
    elements.previewModal.classList.add('show');
    elements.previewSubtitle.textContent = 'Página Generada';
    const iframe = elements.previewFrame;
    iframe.srcdoc = message.generatedCode;
    window.currentCode = message.generatedCode;
}

function closePreview() {
    elements.previewModal.classList.remove('show');
}

function downloadCode() {
    if (!window.currentCode) return;
    const blob = new Blob([window.currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pagina-generada.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function shareCode() {
    if (!window.currentCode) return;
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Página Web Generada por DevCenter',
                text: 'Mira esta página web que creé con DevCenter AI',
                files: [new File([window.currentCode], 'dev.html', { type: 'text/html' })]
            });
        } else {
            await navigator.clipboard.writeText(window.currentCode);
            alert('Código copiado al portapapeles');
        }
    } catch (error) {
        console.error('Error sharing:', error);
        try {
            await navigator.clipboard.writeText(window.currentCode);
            alert('Código copiado al portapapeles');
        } catch (clipboardError) {
            console.error('Error copying to clipboard:', clipboardError);
        }
    }
}

// Sidebar
function openSidebar() {
    elements.sidebar.classList.add('open');
    elements.overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    elements.sidebar.classList.remove('open');
    elements.overlay.classList.remove('show');
    document.body.style.overflow = '';
}









// Loading Mejorado
// Variables para animación de loading
let loadingInterval = null;
let dotInterval = null;
const loadingTexts = [
  "Cargando",
  "Pensando",
  "Procesando",
  "Analizando",
  "Calculando",
  "Evaluando",
  "Revisando",
  "Comprobando",
  "Estudiando",
  "Respondiendo"
];
























function showLoading() {
    elements.loading.classList.add('show');

    // Inicializar texto animado
    const loadingTextEl = document.getElementById('loadingText');
    let textIndex = 0;
    let dotCount = 0;

    if (loadingTextEl) {
        // Función para actualizar puntos
        const updateDots = () => {
            if (!elements.loading.classList.contains('show')) {
                return;
            }

            dotCount = (dotCount + 1) % 4;
            let dots;
            if (dotCount === 0) dots = '.';
            else if (dotCount === 1) dots = '..';
            else if (dotCount === 2) dots = '...';
            else dots = '';

            const baseText = loadingTexts[textIndex];
            loadingTextEl.textContent = baseText + dots;
        };

        // Inicializar con primer texto
        updateDots();

        // Cambiar texto base cada 3 segundos
        loadingInterval = setInterval(() => {
            textIndex = (textIndex + 1) % loadingTexts.length;
            dotCount = 0; // Reset dots
            updateDots();
        }, 3000);

        // Animar puntos cada 400ms
        dotInterval = setInterval(updateDots, 400);
    }
}

function hideLoading() {
    elements.loading.classList.remove('show');

    // Limpiar intervalos
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
    if (dotInterval) {
        clearInterval(dotInterval);
        dotInterval = null;
    }
}

// Utilidades
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMarkdown(text) {
    if (!text) return '';
    
    let html = text.toString();

    // PASO 1: Procesar código (sin protección compleja)
    // Bloques de código ```
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // Código inline ` (simple y directo)
    html = html.replace(/`([^`]+)`/g, (match, code) => {
        return `<code>${escapeHtml(code)}</code>`;
    });

    // Paso temporal: marcar URLs de imagen para procesamiento posterior
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'svg', 'eps', 'pdf', 'ico', 'apng', 'jfif', 'pjpeg'];
    
    imageExtensions.forEach(ext => {
        const imageUrlPattern = new RegExp(`(https://[^\\s<>"'\\[\\]()\\n\\r]+\\.${ext})`, 'gi');
        html = html.replace(imageUrlPattern, (match) => {
            return `__IMAGEN_AUTO_${Buffer.from(match).toString('base64')}_IMAGEN_AUTO__`;
        });
    });

    // PASO 2: Escapar HTML restante (después del código)
    const tempDiv = document.createElement('div');
    const parts = html.split(/(<pre><code>[\s\S]*?<\/code><\/pre>|<code>.*?<\/code>|__IMAGEN_AUTO_[A-Za-z0-9+/=]+_IMAGEN_AUTO__)/);
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part.startsWith('<pre><code>') && !part.startsWith('<code>') && !part.startsWith('__IMAGEN_AUTO_')) {
            tempDiv.textContent = part;
            parts[i] = tempDiv.innerHTML;
        }
    }
    html = parts.join('');

    // PASO 3: Procesar elementos de Markdown
    
    // Líneas horizontales PRIMERO
    html = html.replace(/^(---|___)\s*$/gim, '<hr>');
    html = html.replace(/^\*\*\*\s*$/gim, '<hr>');

    // (URLs de imagen ya procesadas antes del escape HTML)

    // Enlaces e imágenes de Markdown  
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');
    html = html.replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Encabezados
    html = html.replace(/^######\s+(.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.*$)/gim, '<h1>$1</h1>');

    // Formato de texto (orden específico)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Citas
    html = html.replace(/^>\s+(.*$)/gim, '<blockquote>$1</blockquote>');

    // PASO 4: Listas simplificadas pero robustas
    const lines = html.split('\n');
    const result = [];
    let listStack = []; // Seguir el estado de las listas

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (/^[\-\*]\s+/.test(line)) {
            // Lista desordenada
            if (listStack.length === 0 || listStack[listStack.length - 1] !== 'ul') {
                // Cerrar lista ordenada si existe
                if (listStack.length > 0 && listStack[listStack.length - 1] === 'ol') {
                    result.push('</ol>');
                    listStack.pop();
                }
                result.push('<ul>');
                listStack.push('ul');
            }
            result.push('<li>' + line.replace(/^[\-\*]\s+/, '') + '</li>');
        }
        else if (/^\d+\.\s+/.test(line)) {
            // Lista ordenada
            if (listStack.length === 0 || listStack[listStack.length - 1] !== 'ol') {
                // Cerrar lista desordenada si existe
                if (listStack.length > 0 && listStack[listStack.length - 1] === 'ul') {
                    result.push('</ul>');
                    listStack.pop();
                }
                result.push('<ol>');
                listStack.push('ol');
            }
            result.push('<li>' + line.replace(/^\d+\.\s+/, '') + '</li>');
        }
        else {
            // Cerrar cualquier lista abierta
            while (listStack.length > 0) {
                const listType = listStack.pop();
                result.push(`</${listType}>`);
            }
            result.push(line);
        }
    }

    // Cerrar listas restantes
    while (listStack.length > 0) {
        const listType = listStack.pop();
        result.push(`</${listType}>`);
    }

    html = result.join('\n');

    // PASO 5: Párrafos
    const blocks = html.split(/\n\s*\n/);
    const finalBlocks = blocks.map(block => {
        block = block.trim();
        if (!block) return '';
        
        // No envolver elementos de bloque
        if (/^<(h[1-6]|blockquote|ul|ol|pre|hr|div)/.test(block)) {
            return block.replace(/\n/g, '<br>');
        }
        
        // Envolver texto en párrafos
        return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
    });

    html = finalBlocks.filter(block => block).join('\n\n');

    // PASO FINAL: Convertir marcadores de imagen de vuelta a elementos HTML
    html = html.replace(/__IMAGEN_AUTO_([A-Za-z0-9+/=]+)_IMAGEN_AUTO__/g, (match, base64Url) => {
        try {
            const url = Buffer.from(base64Url, 'base64').toString('utf-8');
            return `<img src="${url}" alt="Imagen" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block;">`;
        } catch (e) {
            return match; // Si hay error, devolver el marcador original
        }
    });

    // Limpieza final
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
}

function generateChatName(prompt) {
    const words = prompt.split(' ').slice(0, 3);
    return words.map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
}

function scrollToBottom() {
    setTimeout(() => {
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }, 100);
}

// --- NUEVO: Tipos de configuración en el panel 🔧 ---
let aiConfigType = 'APIs'; // Valor por defecto

function renderAiConfigTypeSelector() {
    // Elimina el selector de tipo de configuración del panel 🔧 (no hace nada)
    const modalContent = document.querySelector('.ai-config-modal-content');
    if (!modalContent) return;
    // Si existe el selector, elimínalo
    const oldSelectorDiv = modalContent.querySelector('#aiConfigTypeSelector')?.parentElement;
    if (oldSelectorDiv) oldSelectorDiv.remove();
    // No agregues ningún selector ni input aquí
}

function renderAiConfigPanelByType() {
    // Mostrar/ocultar APIs
    const aiListContainer = document.getElementById('aiListContainer');
    const addAiBtn = document.getElementById('addAiBtn');
    let mensajesPanel = document.getElementById('mensajesConfigPanel');

    if (aiConfigType === 'APIs') {
        if (aiListContainer) aiListContainer.style.display = '';
        if (addAiBtn) addAiBtn.style.display = '';
        if (mensajesPanel) mensajesPanel.style.display = 'none';
        // Sincronizar input de mensajes con el valor real
        const maxInput = document.getElementById('maxMessagesInput');
        if (maxInput) maxInput.value = getMaxMessagesPerChat();
    } else {
        if (aiListContainer) aiListContainer.style.display = 'none';
        if (addAiBtn) addAiBtn.style.display = 'none';
        // Panel de mensajes por chat
        if (!mensajesPanel) {
            mensajesPanel = document.createElement('div');
            mensajesPanel.id = 'mensajesConfigPanel';
            mensajesPanel.style.background = 'linear-gradient(135deg, #1a237e 0%, #0ff1ce 100%)';
            mensajesPanel.style.border = '2px solid var(--accent)';
            mensajesPanel.style.borderRadius = '12px';
            mensajesPanel.style.padding = '1.2rem 1rem 1rem 1rem';
            mensajesPanel.style.marginBottom = '1.2rem';
            mensajesPanel.style.color = '#fff';
            mensajesPanel.style.boxShadow = '0 2px 16px 0 rgba(59,130,246,0.13)';
            mensajesPanel.innerHTML = `
                <h4 style="margin-bottom:0.7rem;color:#fff;font-size:1.12em;text-shadow:0 0 8px #0ff1ce;">💬 Configuración de mensajes por chat</h4>
                <div style="display:flex;align-items:center;gap:0.7em;">
                    <label style="color:#e0e0e0;font-size:1em;font-weight:500;">
                        Máximo de mensajes por chat:
                    </label>
                    <input type="number" id="maxMessagesPerChat" min="1" max="1000" value="${getMaxMessagesPerChat()}" style="border-radius:8px;border:1.5px solid #0ff1ce;padding:0.4em 0.8em;width:90px;font-size:1em;background:#101c2c;color:#0ff1ce;font-weight:bold;box-shadow:0 0 8px #0ff1ce44;">
                </div>
                <div id="mensajesConfigInfo" style="margin-top:0.7em;font-size:0.97em;color:#e0e0e0;opacity:0.85;">
                    Limita la cantidad de mensajes visibles por chat. Los mensajes más antiguos se ocultarán automáticamente.
                </div>
            `;
            const modalContent = document.querySelector('.ai-config-modal-content');
            modalContent.insertBefore(mensajesPanel, document.getElementById('aiListContainer'));
            mensajesPanel.querySelector('#maxMessagesPerChat').addEventListener('input', function () {
                setMaxMessagesPerChat(this.value);
                // Sincronizar input de mensajes en APIs panel si existe
                const maxInput = document.getElementById('maxMessagesInput');
                if (maxInput) maxInput.value = this.value;
            });
        } else {
            mensajesPanel.style.display = '';
            mensajesPanel.querySelector('#maxMessagesPerChat').value = getMaxMessagesPerChat();
        }
    }
}

// --- Sincronizar input de mensajes en el panel de APIs (index.html) ---
document.addEventListener('DOMContentLoaded', () => {
    // Sincronizar input de mensajes por chat en el panel de APIs
    const maxInput = document.getElementById('maxMessagesInput');
    if (maxInput) {
        maxInput.value = getMaxMessagesPerChat();
        maxInput.addEventListener('input', function () {
            setMaxMessagesPerChat(this.value);
            // Si está abierto el panel de mensajes, sincroniza también
            const mensajesInput = document.getElementById('maxMessagesPerChat');
            if (mensajesInput) mensajesInput.value = this.value;
        });
    }
});

// Utilidades para mensajes por chat
function getMaxMessagesPerChat() {
    return MAX_MESSAGES_PER_CHAT;
}
function setMaxMessagesPerChat(val) {
    MAX_MESSAGES_PER_CHAT = parseInt(val, 10) || 20;
}

// --- APLICAR LÍMITE DE MENSAJES POR CHAT Y BLOQUEO DE ENVÍO ---
function canSendMessage() {
    const chat = getCurrentChat();
    if (!chat) return true;

    // --- NUEVO: Restablecer límite si han pasado más de 30 minutos desde el primer mensaje ---
    if (chat.messages && chat.messages.length > 0) {
        const firstMsgTime = new Date(chat.messages[0].timestamp || chat.messages[0].createdAt || chat.createdAt);
        const now = new Date();
        const diffMinutes = (now - firstMsgTime) / (1000 * 60);
        if (diffMinutes >= RESET_LIMIT_MINUTES) {
            chat.messages = [];
            updateCurrentChat({});
            saveChats();
            return true;
        }
    }

    const maxMsgs = getMaxMessagesPerChat();
    const realMsgs = chat.messages.filter(m => m.type === 'user' || m.type === 'ai');
    return realMsgs.length < maxMsgs;
}

window.retryGenerateMessage = async function (messageId) {
    const chat = getCurrentChat();
    if (!chat) return;
    const msg = chat.messages.find(m => m.id === messageId);
    if (!msg) return;
    // Recupera el prompt original del mensaje de error
    const prompt = document.querySelector(`[data-retry-prompt]`)?.dataset?.retryPrompt || '';
    if (prompt) {
        await sendMessage(prompt);
    }
};


// --- Corrige la sincronización del input de mensajes por chat (el input no existe en el HTML) ---
// Puedes eliminar el bloque que sincroniza el input 'maxMessagesInput' o agregar el input en el HTML si lo necesitas.
// Si decides eliminarlo, borra este bloque:
/*
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    // Sincronizar input de mensajes por chat en el panel de APIs
    const maxInput = document.getElementById('maxMessagesInput');
    if (maxInput) {
        maxInput.value = getMaxMessagesPerChat();
        maxInput.addEventListener('input', function () {
            setMaxMessagesPerChat(this.value);
            // Si está abierto el panel de mensajes, sincroniza también
            const mensajesInput = document.getElementById('maxMessagesPerChat');
            if (mensajesInput) mensajesInput.value = this.value;
        });
    }
});
*/

// --- Corrige posible bug en deleteChat ---
function deleteChat(chatId) {
    if (chats.length <= 1) {
        alert('No puedes eliminar el último chat');
        return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este chat?')) {
        const idx = chats.findIndex(c => c.id === chatId);
        chats = chats.filter(chat => chat.id !== chatId);
        // Corrige la selección del siguiente chat
        if (currentChatId === chatId) {
            if (chats[idx]) {
                currentChatId = chats[idx].id;
            } else if (chats[0]) {
                currentChatId = chats[0].id;
            } else {
                currentChatId = null;
            }
            loadCurrentChat();
        }
        saveChats();
        renderSidebar();
    }
}

// --- Corrige setUserInfoForm para evitar errores si los elementos no existen ---
function setUserInfoForm() {
    if (!userInfo) return;
    const name = document.getElementById('userName');
    const birth = document.getElementById('userBirth');
    const email = document.getElementById('userEmail');
    const custom = document.getElementById('userCustom');
    if (name) name.value = userInfo.name || '';
    if (birth) birth.value = userInfo.birth || '';
    if (email) email.value = userInfo.email || '';
    if (custom) custom.value = userInfo.custom || '';
}

// --- Corrige showPreview para evitar errores si el iframe no existe ---
function showPreview(messageId) {
    const chat = getCurrentChat();
    if (!chat) return;
    const message = chat.messages.find(m => m.id === messageId);
    if (!message || !message.generatedCode) return;
    if (!elements.previewModal || !elements.previewFrame || !elements.previewSubtitle) return;
    elements.previewModal.classList.add('show');
    elements.previewSubtitle.textContent = 'Página Generada';
    const iframe = elements.previewFrame;
    iframe.srcdoc = message.generatedCode;
    window.currentCode = message.generatedCode;
}

// Función duplicada eliminada - funcionalidad movida a sendMessage principal

