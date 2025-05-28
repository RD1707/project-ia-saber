document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SABER Chat inicializando...');
    
    const welcomeScreen = document.getElementById('welcomeScreen');
    const welcomeForm = document.getElementById('welcome-form');
    const welcomeInput = document.getElementById('welcome-input');
    const appContainer = document.getElementById('appContainer');
    
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const thinkingIndicator = document.getElementById('thinking');
    
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const newChatBtn = document.getElementById('newChatBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const headerMenuBtn = document.getElementById('headerMenuBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    const settingsModalOverlay = document.getElementById('settingsModalOverlay');
    const settingsModal = document.getElementById('settingsModal');
    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsPanels = document.querySelectorAll('.settings-panel');
    
    let currentConversationId = null;
    let abortController = null;
    let chatHistory = [];
    let currentUser = null;
    let userSettings = {
        ai: {
            temperature: 0.5,
            maxTokens: 300,
            personality: 'balanced',
            contextMemory: 10
        },
        interface: {
            theme: 'light',
            fontSize: 'medium',
            typingEffect: true,
            soundNotifications: false,
            compactMode: false
        },
        chat: {
            autoSave: true,
            confirmDelete: true,
            enterToSend: true,
            showTimestamps: false
        }
    };
    
    initializeApp();

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.reload();
    });

    function initializeApp() {
        const token = localStorage.getItem('token');
        if (!token) {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'none';
            return;
        }
    
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUser = { id: payload.id, email: payload.email };
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('welcomeScreen').style.display = 'flex';
        } catch (err) {
            console.error('Token inválido ou expirado');
            localStorage.removeItem('token');
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'none';
            return;
        }
    
        setupEventListeners();
        setupSidebar();
        setupAuth();
        loadUserSettings();
        applySettings();
        carregarHistorico();
        updateAboutStats();
    }
    
    
    function setupAuth() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTabs = document.querySelectorAll('.login-tab');

    loginTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.login-tab.active').classList.remove('active');
            document.querySelector('.login-form.active').classList.remove('active');
            
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
        });
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            document.getElementById('loginScreen').style.display = 'none';
            welcomeScreen.style.display = 'flex';
        } else {
            alert(data.error || 'Erro ao fazer login');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;
        
        if (password !== confirm) {
            alert('As senhas não coincidem');
            return;
        }
        
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await res.json();
        if (res.status === 201) {
            alert('Conta criada com sucesso! Faça login');
            document.querySelector('[data-tab="login"]').click();
        } else {
            alert(data.error || 'Erro ao registrar');
        }
    });
}
    
    function setupEventListeners() {
        if (welcomeForm) {
            welcomeForm.addEventListener('submit', handleWelcomeSubmit);
        }
        if (messageForm) {
            messageForm.addEventListener('submit', handleSubmit);
        }
        
        if (messageInput) {
            messageInput.addEventListener('input', autoResizeTextarea);
            messageInput.addEventListener('keydown', handleKeyDown);
        }
        
        if (newChatBtn) {
            newChatBtn.addEventListener('click', criarNovaConversa);
        }
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleSidebar);
        }
        if (headerMenuBtn) {
            headerMenuBtn.addEventListener('click', toggleSidebar);
        }
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', openSettingsModal);
        }
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebar);
        }
        
        setupSettingsModal();
    }
    
    function setupSettingsModal() {
        if (settingsCloseBtn) {
            settingsCloseBtn.addEventListener('click', closeSettingsModal);
        }
        
        if (settingsModalOverlay) {
            settingsModalOverlay.addEventListener('click', (e) => {
                if (e.target === settingsModalOverlay) {
                    closeSettingsModal();
                }
            });
        }
        
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                switchSettingsTab(tab.dataset.tab);
            });
        });
        
        setupSettingsControls();
        
        const saveSettingsBtn = document.getElementById('saveSettings');
        const resetSettingsBtn = document.getElementById('resetSettings');
        
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveUserSettings);
        }
        
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', resetUserSettings);
        }
        
        setupSpecialControls();
    }
    
    function openSettingsModal() {
        if (settingsModalOverlay) {
            settingsModalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateSettingsUI();
            updateAboutStats();
        }
    }
    
    function closeSettingsModal() {
        if (settingsModalOverlay) {
            settingsModalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    document.getElementById('loginScreen').style.display = 'none';
} else {
    alert(data.error);
  }
});

    
    function switchSettingsTab(tabName) {
        settingsTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        settingsPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });
    }
    
    function setupSettingsControls() {
        const temperatureSlider = document.getElementById('temperature');
        if (temperatureSlider) {
            temperatureSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                userSettings.ai.temperature = value;
                document.querySelector('[for="temperature"]').nextElementSibling.querySelector('.setting-value').textContent = value.toFixed(1);
            });
        }
        
        const maxTokensSelect = document.getElementById('maxTokens');
        if (maxTokensSelect) {
            maxTokensSelect.addEventListener('change', (e) => {
                userSettings.ai.maxTokens = parseInt(e.target.value);
            });
        }
        
        const personalitySelect = document.getElementById('aiPersonality');
        if (personalitySelect) {
            personalitySelect.addEventListener('change', (e) => {
                userSettings.ai.personality = e.target.value;
            });
        }
        
        const contextMemorySelect = document.getElementById('contextMemory');
        if (contextMemorySelect) {
            contextMemorySelect.addEventListener('change', (e) => {
                userSettings.chat.contextMemory = parseInt(e.target.value);
            });
        }
        
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                userSettings.interface.theme = e.target.value;
                applyTheme();
            });
        }
        
        const fontSizeSelect = document.getElementById('fontSize');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                userSettings.interface.fontSize = e.target.value;
                applyFontSize();
            });
        }
        
        const typingEffectToggle = document.getElementById('typingEffect');
        if (typingEffectToggle) {
            typingEffectToggle.addEventListener('change', (e) => {
                userSettings.interface.typingEffect = e.target.checked;
            });
        }
        
        const soundNotificationsToggle = document.getElementById('soundNotifications');
        if (soundNotificationsToggle) {
            soundNotificationsToggle.addEventListener('change', (e) => {
                userSettings.interface.soundNotifications = e.target.checked;
            });
        }
        
        const compactModeToggle = document.getElementById('compactMode');
        if (compactModeToggle) {
            compactModeToggle.addEventListener('change', (e) => {
                userSettings.interface.compactMode = e.target.checked;
                applyCompactMode();
            });
        }
        
        const autoSaveToggle = document.getElementById('autoSave');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', (e) => {
                userSettings.chat.autoSave = e.target.checked;
            });
        }
        
        const confirmDeleteToggle = document.getElementById('confirmDelete');
        if (confirmDeleteToggle) {
            confirmDeleteToggle.addEventListener('change', (e) => {
                userSettings.chat.confirmDelete = e.target.checked;
            });
        }
        
        const enterToSendToggle = document.getElementById('enterToSend');
        if (enterToSendToggle) {
            enterToSendToggle.addEventListener('change', (e) => {
                userSettings.chat.enterToSend = e.target.checked;
            });
        }
        
        const showTimestampsToggle = document.getElementById('showTimestamps');
        if (showTimestampsToggle) {
            showTimestampsToggle.addEventListener('change', (e) => {
                userSettings.chat.showTimestamps = e.target.checked;
                applyTimestampDisplay();
            });
        }
    }
    
    function setupSpecialControls() {
        const exportChatsBtn = document.getElementById('exportChats');
        if (exportChatsBtn) {
            exportChatsBtn.addEventListener('click', exportConversations);
        }
        
        const clearHistoryBtn = document.getElementById('clearHistory');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', clearAllHistory);
        }
    }
    
    function loadUserSettings() {
        try {
            const savedSettings = localStorage.getItem('saber_settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                userSettings = { ...userSettings, ...parsed };
                console.log('Configurações carregadas');
            }
        } catch (error) {
            console.warn('Erro ao carregar configurações:', error);
        }
    }
    
    function saveUserSettings() {
        try {
            localStorage.setItem('saber_settings', JSON.stringify(userSettings));
            console.log('Configurações salvas');
            
            applySettings();
            
            const saveBtn = document.getElementById('saveSettings');
            if (saveBtn) {
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
                saveBtn.style.background = 'hsl(120, 60%, 50%)';
                
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.style.background = '';
                }, 2000);
            }
            
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            alert('Erro ao salvar configurações. Tente novamente.');
        }
    }
    
    function resetUserSettings() {
        if (!confirm('Tem certeza que deseja restaurar todas as configurações padrão?')) {
            return;
        }
        
        userSettings = {
            ai: {
                temperature: 0.5,
                maxTokens: 300,
                personality: 'balanced',
                contextMemory: 10
            },
            interface: {
                theme: 'light',
                fontSize: 'medium',
                typingEffect: true,
                soundNotifications: false,
                compactMode: false
            },
            chat: {
                autoSave: true,
                confirmDelete: true,
                enterToSend: true,
                showTimestamps: false
            }
        };
        
        updateSettingsUI();
        applySettings();
        saveUserSettings();
        
        console.log('🔄 Configurações resetadas');
    }
    
    function updateSettingsUI() {
        const temperatureSlider = document.getElementById('temperature');
        if (temperatureSlider) {
            temperatureSlider.value = userSettings.ai.temperature;
            document.querySelector('[for="temperature"]').nextElementSibling.querySelector('.setting-value').textContent = userSettings.ai.temperature.toFixed(1);
        }
        
        const maxTokensSelect = document.getElementById('maxTokens');
        if (maxTokensSelect) {
            maxTokensSelect.value = userSettings.ai.maxTokens;
        }
        
        const personalitySelect = document.getElementById('aiPersonality');
        if (personalitySelect) {
            personalitySelect.value = userSettings.ai.personality;
        }
        
        const contextMemorySelect = document.getElementById('contextMemory');
        if (contextMemorySelect) {
            contextMemorySelect.value = userSettings.chat.contextMemory;
        }
        
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.value = userSettings.interface.theme;
        }
        
        const fontSizeSelect = document.getElementById('fontSize');
        if (fontSizeSelect) {
            fontSizeSelect.value = userSettings.interface.fontSize;
        }
        
        const toggles = [
            ['typingEffect', userSettings.interface.typingEffect],
            ['soundNotifications', userSettings.interface.soundNotifications],
            ['compactMode', userSettings.interface.compactMode],
            ['autoSave', userSettings.chat.autoSave],
            ['confirmDelete', userSettings.chat.confirmDelete],
            ['enterToSend', userSettings.chat.enterToSend],
            ['showTimestamps', userSettings.chat.showTimestamps]
        ];
        
        toggles.forEach(([id, value]) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.checked = value;
            }
        });
    }
    
    function applySettings() {
        applyTheme();
        applyFontSize();
        applyCompactMode();
        applyTimestampDisplay();
    }
    
    function applyTheme() {
        const theme = userSettings.interface.theme;
        
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        } else if (theme === 'light') {
            document.body.removeAttribute('data-theme');
        } else if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.setAttribute('data-theme', 'dark');
            } else {
                document.body.removeAttribute('data-theme');
            }
        }
    }
    
    function applyFontSize() {
        const fontSize = userSettings.interface.fontSize;
        document.body.classList.remove('font-small', 'font-medium', 'font-large');
        document.body.classList.add(`font-${fontSize}`);
    }
    
    function applyCompactMode() {
        const compact = userSettings.interface.compactMode;
        document.body.classList.toggle('compact-mode', compact);
    }
    
    function applyTimestampDisplay() {
        const showTimestamps = userSettings.chat.showTimestamps;
        document.body.classList.toggle('show-timestamps', showTimestamps);
    }
    
    async function exportConversations() {
        try {
            const response = await fetch('/api/history');
            if (!response.ok) {
                throw new Error('Erro ao buscar conversas');
            }
            
            const data = await response.json();
            const allConversations = [
                ...data.today,
                ...data.yesterday,
                ...data.week,
                ...data.older
            ];
            
            const fullConversations = await Promise.all(
                allConversations.map(async (conv) => {
                    const messagesResponse = await fetch(`/api/conversation/${conv.id}`);
                    const messagesData = await messagesResponse.json();
                    return {
                        ...conv,
                        messages: messagesData.messages
                    };
                })
            );
            
            const exportData = {
                exportDate: new Date().toISOString(),
                totalConversations: fullConversations.length,
                conversations: fullConversations
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `saber_conversas_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Conversas exportadas');
            
        } catch (error) {
            console.error('Erro ao exportar conversas:', error);
            alert('Erro ao exportar conversas. Tente novamente.');
        }
    }
    
    async function clearAllHistory() {
        const message = userSettings.chat.confirmDelete ? 
            'Tem certeza que deseja deletar TODAS as conversas? Esta ação não pode ser desfeita.' :
            'Deletar todas as conversas?';
            
        if (!confirm(message)) {
            return;
        }
        
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            const allConversations = [
                ...data.today,
                ...data.yesterday,
                ...data.week,
                ...data.older
            ];
            
            for (const conv of allConversations) {
                await fetch(`/api/conversation/${conv.id}`, { method: 'DELETE' });
            }
            
            limparInterface();
            currentConversationId = null;
            
            if (welcomeScreen) welcomeScreen.style.display = 'flex';
            if (appContainer) appContainer.style.display = 'none';
            
            await carregarHistorico();
            
            console.log('Histórico limpo');
            alert('Todas as conversas foram deletadas.');
            
        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            alert('Erro ao limpar histórico. Tente novamente.');
        }
    }
    
    function updateAboutStats() {
        const totalConversations = chatHistory.today?.length + chatHistory.yesterday?.length + 
                                  chatHistory.week?.length + chatHistory.older?.length || 0;
        
        let totalMessages = 0;
        [chatHistory.today, chatHistory.yesterday, chatHistory.week, chatHistory.older].forEach(section => {
            if (section) {
                totalMessages += section.reduce((sum, conv) => sum + (conv.message_count || 0), 0);
            }
        });
        
        let daysUsing = 0;
        const allConversations = [
            ...(chatHistory.today || []),
            ...(chatHistory.yesterday || []),
            ...(chatHistory.week || []),
            ...(chatHistory.older || [])
        ];
        
        if (allConversations.length > 0) {
            const oldestConv = allConversations.reduce((oldest, conv) => {
                return new Date(conv.created_at) < new Date(oldest.created_at) ? conv : oldest;
            });
            
            const firstUse = new Date(oldestConv.created_at);
            const now = new Date();
            daysUsing = Math.ceil((now - firstUse) / (1000 * 60 * 60 * 24));
        }
        
        const totalConversationsEl = document.getElementById('totalConversations');
        const totalMessagesEl = document.getElementById('totalMessages');
        const daysUsingEl = document.getElementById('daysUsing');
        
        if (totalConversationsEl) totalConversationsEl.textContent = totalConversations;
        if (totalMessagesEl) totalMessagesEl.textContent = totalMessages;
        if (daysUsingEl) daysUsingEl.textContent = daysUsing;
    }
    
    function setupSidebar() {
        if (window.innerWidth > 1024) {
            if (sidebar) sidebar.classList.remove('hidden');
        }
        
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024) {
                closeSidebar();
            }
        });
    }
    
    function toggleSidebar() {
        if (!sidebar || !sidebarOverlay) return;
        
        const isActive = sidebar.classList.contains('active');
        
        if (isActive) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
    
    function openSidebar() {
        if (sidebar) sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }
    
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
    
    async function handleWelcomeSubmit(e) {
        e.preventDefault();
        
        const firstMessage = welcomeInput.value.trim();
        if (!firstMessage) return;
        
        console.log('💭 Primeira mensagem:', firstMessage);
        
        welcomeScreen.classList.add('fade-out');
        
        setTimeout(async () => {
            welcomeScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            
            await sendMessage(firstMessage);
        }, 500);
    }
    
    async function sendMessage(message) {
        if (!message.trim()) return;
        
        console.log('📤 Enviando mensagem:', message.substring(0, 50) + '...');
        
        addMessageToChat('user', message);
        
        if (messageInput && messageInput.value === message) {
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
        
        showThinking();
        
        abortController = new AbortController();
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message: message,
                    conversationId: currentConversationId,
                    settings: userSettings.ai
                }),
                signal: abortController.signal
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            hideThinking();
            
            const useTypingEffect = userSettings.interface.typingEffect;
            addMessageToChat('ai', data.response, useTypingEffect);
            
            if (userSettings.interface.soundNotifications) {
                playNotificationSound();
            }
            
            currentConversationId = data.conversationId;
            
            if (data.isFirstMessage) {
                console.log('🆕 Primeira mensagem - recarregando histórico');
                await carregarHistorico();
            }
            
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
            hideThinking();
            
            if (error.name === 'AbortError') {
                addMessageToChat('ai', 'Resposta cancelada pelo usuário.');
            } else {
                addMessageToChat('ai', 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
            }
        } finally {
            sendButton.disabled = false;
            abortController = null;
        }
        
        scrollToBottom();
    }
    
    async function handleSubmit(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        await sendMessage(message);
    }
    
    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey && userSettings.chat.enterToSend) {
            e.preventDefault();
            handleSubmit(e);
        }
    }
    
    async function criarNovaConversa() {
        try {
            console.log('🆕 Criando nova conversa...');
            
            const response = await fetch('/api/new-conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const newConversation = await response.json();
            
            if (!newConversation || !newConversation.id) {
                throw new Error("Erro ao obter ID da nova conversa");
            }
            
            currentConversationId = newConversation.id;
            limparInterface();
            
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            if (appContainer) appContainer.style.display = 'flex';
            
            if (messageInput) messageInput.focus();
            
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
            
            await carregarHistorico();
            
            console.log('Nova conversa criada:', newConversation.id);
            
        } catch (error) {
            console.error('Erro ao criar nova conversa:', error);
            alert('Erro ao criar nova conversa. Tente novamente.');
        }
    }
    
    async function carregarHistorico() {
        try {
            console.log('Carregando histórico...');
            
            const response = await fetch('/api/history');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            chatHistory = data;
            
            preencherSecao('todayChats', data.today, 'Hoje');
            preencherSecao('yesterdayChats', data.yesterday, 'Ontem');
            preencherSecao('weekChats', data.week, 'Últimos 7 dias');
            preencherSecao('olderChats', data.older, 'Conversas antigas');
            
            console.log('Histórico carregado:', {
                hoje: data.today.length,
                ontem: data.yesterday.length,
                semana: data.week.length,
                antigas: data.older.length
            });
            
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }
    
    function preencherSecao(containerId, conversas, sectionName) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!conversas || conversas.length === 0) {
            return; 
        }
        
        conversas.forEach((conv, index) => {
            const chatItem = createChatHistoryItem(conv);
            container.appendChild(chatItem);
            
            setTimeout(() => {
                chatItem.style.opacity = '1';
                chatItem.style.transform = 'translateX(0)';
            }, index * 50);
        });
        
        console.log(`📋 ${sectionName}: ${conversas.length} conversas`);
    }
    
    function createChatHistoryItem(conv) {
        const div = document.createElement('div');
        div.className = 'chat-history-item';
        div.style.opacity = '0';
        div.style.transform = 'translateX(-10px)';
        div.style.transition = 'all 0.3s ease';
        
        if (conv.id === currentConversationId) {
            div.classList.add('active');
        }
        
        div.innerHTML = `
            <div class="chat-item-main">
                <div class="chat-item-icon">
                    <i class="fas fa-message"></i>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-title">${escapeHtml(conv.title)}</div>
                    </div>
                </div>
            </div>
            <div class="chat-item-actions">
                <button class="chat-action-btn delete" title="Deletar conversa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        const mainContent = div.querySelector('.chat-item-main');
        const deleteBtn = div.querySelector('.chat-action-btn.delete');
        
        mainContent.addEventListener('click', () => carregarConversa(conv.id));
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletarConversa(conv.id, div);
        });
        
        return div;
    }
    
    async function carregarConversa(conversationId) {
        try {
            console.log('Carregando conversa:', conversationId);
            
            const response = await fetch(`/api/conversation/${conversationId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            limparInterface();
            
            data.messages.forEach(msg => {
                addMessageToChat(msg.role, msg.content);
            });
            
            currentConversationId = data.conversationId;
            
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            if (appContainer) appContainer.style.display = 'flex';

            await carregarHistorico();
   
            if (messageInput) messageInput.focus();

            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
            
            console.log('Conversa carregada:', conversationId);
            
        } catch (error) {
            console.error('Erro ao carregar conversa:', error);
            alert('Erro ao carregar conversa. Tente novamente.');
        }
    }

    async function deletarConversa(conversationId, itemElement) {
        const shouldConfirm = userSettings.chat.confirmDelete;
        
        if (shouldConfirm && !confirm('Tem certeza que deseja deletar esta conversa?')) {
            return;
        }
        
        try {
            console.log('Deletando conversa:', conversationId);
            
            const response = await fetch(`/api/conversation/${conversationId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (itemElement) {
                itemElement.style.transform = 'translateX(-100%)';
                itemElement.style.opacity = '0';
                setTimeout(() => {
                    if (itemElement.parentNode) {
                        itemElement.parentNode.removeChild(itemElement);
                    }
                }, 300);
            }

            if (conversationId === currentConversationId) {
                await criarNovaConversa();
            }
            
            console.log('Conversa deletada:', conversationId);
            
        } catch (error) {
            console.error('Erro ao deletar conversa:', error);
            alert('Erro ao deletar conversa. Tente novamente.');
        }
    }
    
    function limparInterface() {
        if (chatMessages) chatMessages.innerHTML = '';
        chatHistory = [];
        hideThinking();
        if (messageInput) {
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }

        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('active');
        });
    }
    
    function autoResizeTextarea() {
        this.style.height = 'auto';
        let newHeight = this.scrollHeight;
        if (newHeight > 150) newHeight = 150; 
        this.style.height = `${newHeight}px`;
    }

    function showThinking() {
        if (thinkingIndicator) thinkingIndicator.style.display = 'flex';
        if (sendButton) sendButton.disabled = true;
    }

    function hideThinking() {
        if (thinkingIndicator) thinkingIndicator.style.display = 'none';
        if (sendButton) sendButton.disabled = false;
    }

    function addMessageToChat(sender, text, useTypingEffect = false) {
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        const showTimestamps = userSettings.chat.showTimestamps;
        const timestamp = showTimestamps ? `<div class="message-time">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>` : '';
        
        const formattedText = formatMessage(text);
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-avatar">
                    <div class="avatar-circle">${sender === 'user' ? 'U' : '<div class="logo-img" style="transform: scale(30%);"><img src="logo.png" alt="Logo"></div>'}</div>
                </div>
                <div class="message-bubble">
                    <div class="message-text" data-full-text="${formattedText}"></div>
                    ${timestamp}
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        
        const messageTextElement = messageDiv.querySelector('.message-text');
        
        if (sender === 'ai' && useTypingEffect) {
            typeWriter(messageTextElement, formattedText);
        } else {
            messageTextElement.innerHTML = formattedText;
        }
        
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 10);
        
        scrollToBottom();
    }

    function typeWriter(element, text, speed = 15) {
        element.innerHTML = '';
        let i = 0;

        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        element.appendChild(cursor);
        
        function type() {
            if (i < text.length) {
                const char = text.charAt(i);
                const textNode = document.createTextNode(char);
                element.insertBefore(textNode, cursor);
                i++;
                setTimeout(type, speed);
                scrollToBottom();
            } else {
                cursor.remove();
                element.innerHTML = text;
            }
        }
        
        type();
    }

    function playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUQwKTKXh8bhlHgg2jdXzzn0vBSF0xe/eizEIHWq+8OKZTgwNUarm7q9bFgpFnt/wuWkiCCaKz/LNeSsFJHfH8N+QQAoUXrTp66hVFApGn+DwuGoiByeM0fPSfiwGK4PK7+CVSA0PVKzn77BdGAg=');
            audio.volume = 0.2;
            audio.play().catch(e => console.log('Som não pôde ser reproduzido:', e));
        } catch (error) {
            console.log('Erro ao reproduzir som:', error);
        }
    }
    
    // Formatação de mensagens
    function formatMessage(text) {
        let formatted = text.replace(/\n/g, '<br>');
        formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        return formatted;
    }

    function scrollToBottom(force = false) {
        if (chatMessages) {
            if (force || isScrolledToBottom()) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    }

    function isScrolledToBottom() {
        if (!chatMessages) return true;
        return chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 50;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTime(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'agora';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'recente';
        }
    }

    if (messageInput) {
        messageInput.addEventListener('input', () => {
            messageInput.placeholder = messageInput.value.trim() ? '' : 'Digite sua mensagem...';
        });
    }

    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addListener(() => {
            if (userSettings.interface.theme === 'auto') {
                applyTheme();
            }
        });
    }
    });
