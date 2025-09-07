// DevCenter - AI Web Generator
const API_KEY = 'AIzaSyDx1PNtPNtB6ukShHTE-E6q6Z-Vk1izdzE';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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
    loadChats();
    adjustTextareaHeight();
    handleInputChange();
    loadUserInfo();
});

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

    elements.backBtn.addEventListener('click', closePreview);
    elements.downloadBtn.addEventListener('click', downloadCode);
    elements.shareBtn.addEventListener('click', shareCode);

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
        });
    }
}

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
        if (currentChatId === chatId) {
            if (chats[idx]) {
                currentChatId = chats[idx].id;
            } else if (chats[idx - 1]) {
                currentChatId = chats[idx - 1].id;
            } else {
                currentChatId = chats[0].id;
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
            <p>Tu asistente de IA para generar páginas web. Describe lo que necesitas y crearé el código por ti.</p>
        </div>
    `;
}

function addMessage(type, content, generatedCode = null, save = true, messageId = null, timestamp = null) {
    messageId = messageId || generateId();
    const timeStr = timestamp
        ? new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type} fade-in`;
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-text">${escapeHtml(content)}</div>
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
async function sendMessage() {
    const content = elements.messageInput.value.trim();
    if (!content || isGenerating) return;

    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    handleInputChange();

    const welcomeMessage = elements.messages.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    addMessage('user', content);

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
        addMessage('ai', 'Lo siento, ha ocurrido un error al generar la página web. Por favor, inténtalo de nuevo.', null);
    }

    isGenerating = false;
    handleInputChange();
}

// IA y generación de código
async function generateWebpage(prompt) {
    // Siempre recarga userInfo antes de generar el prompt
    loadUserInfo();

    // Obtener historial de mensajes del chat actual (solo texto, sin código generado)
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

    const systemPrompt = `Tu Eres DevCenter IA, un asistente de IA especializado en generar páginas web completas y funcionales.

INSTRUCCIONES:
- Genera código HTML completo con CSS integrado y JavaScript si es necesario
- Usa diseños moderno estilo neon responsive y optimizado para dispositivos móviles
- El código debe ser funcional y listo para usar
- Responde SOLO con el código HTML, sin explicaciones adicionales
- Asegúrate de que el diseño sea atractivo y profesional
- Incluye meta tags apropiados y estructura semántica correcta
- Diseño optimizado para pantallas pequeñas y touch
- Usa español para todo el contenido de texto


INFORMACIÓN DADA POR EL USUARIO:
${userInfoText ? userInfoText : '(Sin información dada por el usuario)'}

HISTORIAL DE MENSAJES:
${historyText ? historyText : '(Sin historial previo)'}

USUARIO SOLICITA: ${prompt}

Genera el código HTML completo:`;

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
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
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

        return {
            code: cleanCode,
            message: 'He creado una página web basada en tu solicitud. Puedes ver la vista previa a continuación.'
        };
    } catch (error) {
        console.error('Error generating webpage:', error);
        throw new Error('Error al generar la página web: ' + error.message);
    }
}

// Preview
function showPreview(messageId) {
    const chat = getCurrentChat();
    if (!chat) return;
    const message = chat.messages.find(m => m.id === messageId);
    if (!message || !message.generatedCode) return;
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

// Exponer funciones globales necesarias
window.deleteChat = deleteChat;
window.renameChat = renameChat;
window.showPreview = showPreview;
