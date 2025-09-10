//====================================================== Configuración ======================================================

// ================= LIMITE DE MESAJES Y TIEMPO POR CHAT =====================
let MAX_MESSAGES_PER_CHAT = 50; // <--- Cambia este valor para ajustar el límite
const RESET_LIMIT_MINUTES = 30; // Tiempo en minutos para restablecer el límite
// ===========================================================================

// ================= CONFIGURACIÓN DE GENERACIÓN =============================
let TEMPERATURE = 0.2;       // Creatividad del modelo
let TOP_K = 55;              // Número de tokens candidatos
let TOP_P = 0.90;            // Probabilidad acumulada
let MAX_OUTPUT_TOKENS = 18000; // Máximo de tokens generados
// ===========================================================================

// ================= CONFIGURACIÓN DE IAs ====================================
let aiConfigs      = [];
let selectedAiId   = null;
// ===========================================================================

// ================= CONFIGURACIÓN POR DEFECTO DE IAs ========================
const DEFAULT_AI_CONFIGS = [
    {
        id: 'gemini',
        name: 'Gemini 1.5 Flash',
        url:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        apiKey: 'AIzaSyDEaA54BedMrlFWhb7u_8r-sb5-a_C_U3E'  // API key por defecto
    },
    {
        id: 'gemini-flash-8b',
        name: 'Gemini 1.5 Flash-8B',
        url:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent',
        apiKey: 'AIzaSyDx1PNtPNtB6ukShHTE-E6q6Z-Vk1izdzE'  // API key SOLO DEV
    }
];
// ===========================================================================

//====================================================== Configuración ======================================================










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
    // Solo mostrar el botón si el usuario es Justin y descripción personalizada exactamente DevCenter
    loadUserInfo();
    const container = document.getElementById('aiConfigBtnContainer');
    if (
        userInfo &&
        userInfo.name === 'Justin' &&
        typeof userInfo.custom === 'string' &&
        userInfo.custom.trim() === 'DevCenter'
    ) {
        if (container) container.style.display = '';
    } else {
        if (container) container.style.display = 'none';
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
        div.innerHTML = `
            <div class="ai-item-header">
                <span class="ai-item-title">${escapeHtml(ai.name)}</span>
                <input type="radio" name="selectedAi" class="ai-item-select" value="${ai.id}" ${ai.id === selectedAiId ? 'checked' : ''} title="Seleccionar IA">
                <button type="button" class="ai-item-remove" data-idx="${idx}" title="Eliminar IA" ${aiConfigs.length === 1 ? 'disabled' : ''}>✕</button>
            </div>
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

    // Detectar mensaje de error IA
    let isError = false;
    let retryHtml = '';
    if (
        type === 'ai' &&
        typeof content === 'string' &&
        content.trim().startsWith('Lo siento, ha ocurrido un error al generar la página web')
    ) {
        isError = true;
        // retryData: { prompt }
        const lastUserMsg = retryData && retryData.prompt
            ? retryData.prompt
            : (getCurrentChat()?.messages?.slice().reverse().find(m => m.type === 'user')?.content || '');
        retryHtml = `
            <div style="margin-top:0.5rem;">
                <button class="action-btn" onclick="window.retryGenerateMessage('${messageId}')">Volver a Generar</button>
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
"landing page",
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
"web",
"pagina",
"site",
"web app",
"web app pro",
"pagina",
"web pro",
"landing page",
"web",
"app",
"pag"























];
















    // Palabras clave técnicas
    const techKeywords = ['html', 'css', 'javascript', 'landing page', 'portfolio', 'tienda online', 'ecommerce', 'dashboard'];

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
            addMessage('ai', 'Lo siento, no pude procesar tu solicitud en este momento.');
        }

        isGenerating = false;
        handleInputChange();
    }
}

// IA y generación de código
async function generateWebpage(prompt) {
    // Siempre recarga userInfo antes de generar el prompt
    loadUserInfo();

    // Obtener IA seleccionada
    loadAiConfigs();
    const ai = aiConfigs.find(a => a.id === selectedAiId) || aiConfigs[0];
    const API_URL = ai.url;
    const API_KEY = ai.apiKey;

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
(Puedes utilizar esto: (OPCIONAL)
Contenido  usando Markdown:  
- **Negritas** → **texto**  
- *Cursivas* → *texto*  
- Listas → - o 1.  
- Encabezados → #, ##, ###  

INSTRUCCIONES:
- El USUARIO NECESITA HACER ESTE CAMBIO: ${prompt}
- TU CÓDIGO QUE GENERASTE ANTERIORMENTE: (ver abajo)
- Haz SOLO los cambios necesarios en el código HTML anterior según la nueva petición del usuario.
- Usa un diseño moderno y profesional, responsive y optimizado para dispositivos móviles (mobile-first)
- El código debe ser funcional y listo para abrir como archivo .html
- Responde primero con una frase corta (máx. 50 palabras) que resuma el cambio realizado
- Deja una línea en blanco después de la frase y pega el código HTML completo actualizado
- No expliques nada más, solo la frase corta y el código actualizado
- Todo el contenido de texto debe estar en español

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
(Puedes utilizar esto: (OPCIONAL)
Contenido  usando Markdown:  
- **Negritas** → **texto**  
- *Cursivas* → *texto*  
- Listas → - o 1.  
- Encabezados → #, ##, ###  


INSTRUCCIONES:
- Genera un código HTML completo con CSS integrado y JavaScript si es necesario.
- Usa un diseño moderno y profesional, responsive y optimizado para móviles (mobile-first)
- Todo el código debe ser funcional y listo para abrir como archivo .html
- Responde primero con una frase corta (máx. 35 palabras) que resuma la página, luego deja una línea en blanco y pega el código HTML completo
- No expliques nada más, solo la frase corta y el código
- Todo el contenido de texto debe estar en español

INFORMACIÓN DADA POR EL USUARIO (solo utilízala si se ocupa):
${userInfoText ? userInfoText : '(Sin información dada por el usuario)'}

HISTORIAL DE MENSAJES:
${historyText ? historyText : '(Sin historial previo)'}

USUARIO SOLICITA: ${prompt}

Responde con una frase corta y el archivo HTML completo:
`;

//=============================================================================================================================





















































    }

    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
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
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        const code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!code) {
            throw new Error('No se pudo generar código HTML');
        }

        const cleanCode = code.replace(/```html|```/g, '').trim();

        // Extrae la primera línea como mensaje corto, el resto como código
        const [firstLine, ...rest] = cleanCode.split('\n');
        const codeHtml = rest.join('\n').trim();

        return {
            code: codeHtml,
            message: firstLine.trim()
        };
    } catch (error) {
        console.error('Error generating webpage:', error);
        throw new Error('Error al generar la página web: ' + error.message);
    }
}

// Función para generar respuesta de chat normal
async function generateChatResponse(prompt) {
    loadUserInfo();

    loadAiConfigs();
    const ai = aiConfigs.find(a => a.id === selectedAiId) || aiConfigs[0];
    const API_URL = ai.url;
    const API_KEY = ai.apiKey;

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


(Puedes utilizar esto: (OPCIONAL)
Contenido  usando Markdown:  
- **Negritas** → **texto**  
- *Cursivas* → *texto*  
- Listas → - o 1.  
- Encabezados → #, ##, ###  





INFORMACIÓN DADA POR EL USUARIO (solo utilízala si se ocupa):
${userInfoText ? userInfoText : '(Sin información dada por el usuario)'}
HISTORIAL DE MENSAJES:
${historyText ? historyText : '(Sin historial previo)'}
USUARIO SOLICITA: ${prompt}
Responde de forma clara y concisa, sin generar código ni páginas web.


  

`;










    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
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
    } catch (error) {
        console.error('Error generating chat response:', error);
        return 'Lo siento, no pude procesar tu solicitud en este momento.';
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

// Loading
function showLoading() {
    elements.loading.classList.add('show');
}

function hideLoading() {
    elements.loading.classList.remove('show');
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
    // Escapar HTML primero para seguridad
    let html = escapeHtml(text);

    // Convertir encabezados (# ## ###)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convertir negritas (**texto**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convertir cursivas (*texto*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convertir bloques de código (```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Convertir código inline (`codigo`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convertir listas (- item)
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Convertir listas numeradas (1. item)
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');

    // Convertir saltos de línea simples a <br>
    html = html.replace(/\n/g, '<br>');

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

// --- Usa canSendMessage para bloquear el envío si se supera el límite ---
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
        // Generar respuesta de chat normal
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
            addMessage('ai', 'Lo siento, no pude procesar tu solicitud en este momento.');
        }

        isGenerating = false;
        handleInputChange();
    }
}

// IA y generación de código
async function generateWebpage(prompt) {
    // Siempre recarga userInfo antes de generar el prompt
    loadUserInfo();

    // Obtener IA seleccionada
    loadAiConfigs();
    const ai = aiConfigs.find(a => a.id === selectedAiId) || aiConfigs[0];
    const API_URL = ai.url;
    const API_KEY = ai.apiKey;

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
(Puedes utilizar esto: (OPCIONAL)
Contenido  usando Markdown:  
- **Negritas** → **texto**  
- *Cursivas* → *texto*  
- Listas → - o 1.  
- Encabezados → #, ##, ###  
INSTRUCCIONES:
- El USUARIO NECESITA HACER ESTE CAMBIO: ${prompt}
- TU CÓDIGO QUE GENERASTE ANTERIORMENTE: (ver abajo)
- Haz SOLO los cambios necesarios en el código HTML anterior según la nueva petición del usuario.
- Usa un diseño moderno y profesional, responsive y optimizado para dispositivos móviles (mobile-first)
- El código debe ser funcional y listo para abrir como archivo .html
- Responde primero con una frase corta (máx. 50 palabras) que resuma el cambio realizado
- Deja una línea en blanco después de la frase y pega el código HTML completo actualizado
- No expliques nada más, solo la frase corta y el código actualizado
- Todo el contenido de texto debe estar en español

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
(Puedes utilizar esto: (OPCIONAL)
Contenido  usando Markdown:  
- **Negritas** → **texto**  
- *Cursivas* → *texto*  
- Listas → - o 1.  
- Encabezados → #, ##, ###  

INSTRUCCIONES:
- Genera un código HTML completo con CSS integrado y JavaScript si es necesario.
- Usa un diseño moderno y profesional, responsive y optimizado para móviles (mobile-first)
- Todo el código debe ser funcional y listo para abrir como archivo .html
- Responde primero con una frase corta (máx. 35 palabras) que resuma la página, luego deja una línea en blanco y pega el código HTML completo
- No expliques nada más, solo la frase corta y el código
- Todo el contenido de texto debe estar en español

INFORMACIÓN DADA POR EL USUARIO (solo utilízala si se ocupa):
${userInfoText ? userInfoText : '(Sin información dada por el usuario)'}

HISTORIAL DE MENSAJES:
${historyText ? historyText : '(Sin historial previo)'}

USUARIO SOLICITA: ${prompt}

Responde con una frase corta y el archivo HTML completo:
`;

//=============================================================================================================================

























    }

    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
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




generationConfig: {
    temperature: TEMPERATURE,
    topK: TOP_K,
    topP: TOP_P,
    maxOutputTokens: MAX_OUTPUT_TOKENS,



                //generationConfig: {
                  //  temperature: 0.2,
                   // topK: 50,
                   // topP: 0.90,
                  //  maxOutputTokens: 18000,



                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        const code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!code) {
            throw new Error('No se pudo generar código HTML');
        }

        const cleanCode = code.replace(/```html|```/g, '').trim();

        // Extrae la primera línea como mensaje corto, el resto como código
        const [firstLine, ...rest] = cleanCode.split('\n');
        const codeHtml = rest.join('\n').trim();

        return {
            code: codeHtml,
            message: firstLine.trim()
        };
    } catch (error) {
        console.error('Error generating webpage:', error);
        throw new Error('Error al generar la página web: ' + error.message);
    }
}
