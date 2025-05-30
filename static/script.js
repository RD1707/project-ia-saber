document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SABER Chat inicializando...');

    // Elementos da interface
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTabs = document.querySelectorAll('.login-tab');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const welcomeForm = document.getElementById('welcome-form');
    const appContainer = document.getElementById('appContainer');
    const welcomeInput = document.getElementById('welcome-input');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const thinkingIndicator = document.getElementById('thinking');

    // Elementos da Sidebar (adicione os que faltam se necessário)
    const newChatBtn = document.getElementById('newChatBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const headerMenuBtn = document.getElementById('headerMenuBtn'); // Para mobile
    const sidebarToggle = document.getElementById('sidebarToggle'); // Botão de configurações na sidebar

    // Elementos do Modal de Configurações (adicione os que faltam se necessário)
    const settingsModalOverlay = document.getElementById('settingsModalOverlay');
    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsPanels = document.querySelectorAll('.settings-panel');


    // Inicialize estas variáveis
    let currentConversationId = null;
    let chatHistory = {
        today: [],
        yesterday: [],
        week: [],
        older: []
    };
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


    // Configurar abas de login/registro
    if (loginTabs && loginTabs.length > 0) {
        loginTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const activeLoginTab = document.querySelector('.login-tab.active');
                if (activeLoginTab) activeLoginTab.classList.remove('active');

                const activeLoginForm = document.querySelector('.login-form.active');
                if (activeLoginForm) activeLoginForm.classList.remove('active');

                tab.classList.add('active');
                const targetForm = document.getElementById(`${tab.dataset.tab}-form`);
                if (targetForm) targetForm.classList.add('active');
            });
        });
    } else {
        console.warn('Abas de login não encontradas.');
    }


    // Função para mostrar tela de boas-vindas/chat após login/verificação
    const showWelcomeOrChatInterface = (user) => {
        currentUser = user; // Armazena dados do usuário
        if (loginScreen) loginScreen.style.display = 'none';
        if (welcomeScreen) welcomeScreen.style.display = 'flex'; // Sempre mostra welcome screen primeiro
        if (appContainer) appContainer.style.display = 'none'; // Garante que o chat não apareça ainda

        const userNameEl = document.querySelector('.user-name');
        const userPlanEl = document.querySelector('.user-plan');
        if (userNameEl) userNameEl.textContent = user.name || 'Usuário';
        if (userPlanEl) userPlanEl.textContent = 'Versão Gratuita'; // Ou o plano real do usuário

        carregarHistorico(); // Carrega o histórico após saber quem é o usuário
    };

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (!emailInput || !passwordInput) return;

            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    showWelcomeOrChatInterface(data.user);
                } else {
                    alert(data.error || 'Erro ao fazer login');
                }
            } catch (error) {
                console.error("Erro no login:", error);
                alert('Erro de conexão com o servidor durante o login.');
            }
        });
    }

    // Registro
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('reg-name');
            const emailInput = document.getElementById('reg-email');
            const passwordInput = document.getElementById('reg-password');
            const confirmInput = document.getElementById('reg-confirm');

            if (!nameInput || !emailInput || !passwordInput || !confirmInput) return;

            const name = nameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;
            const confirm = confirmInput.value;

            if (password !== confirm) {
                alert('As senhas não coincidem');
                return;
            }

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await res.json();
                if (res.status === 201) {
                    alert('Conta criada com sucesso! Faça login.');
                    const loginTab = document.querySelector('[data-tab="login"]');
                    if (loginTab) loginTab.click();
                } else {
                    alert(data.error || 'Erro ao registrar');
                }
            } catch (error) {
                console.error("Erro no registro:", error);
                alert('Erro de conexão com o servidor durante o registro.');
            }
        });
    }


    // Função de inicialização principal da aplicação
    async function initializeApp() {
        const token = localStorage.getItem('token');

        if (!token) {
            if (loginScreen) loginScreen.style.display = 'flex';
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            if (appContainer) appContainer.style.display = 'none';
            setupEventListeners(); // Configura listeners mesmo sem token (para login/registro)
            return;
        }

        try {
            const res = await fetch('/api/verify-token', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('Token inválido ou expirado:', errorData.error || res.status);
                throw new Error('Token inválido');
            }

            const userData = await res.json();
            showWelcomeOrChatInterface(userData); // Mostra welcome screen, carrega histórico

        } catch (err) {
            console.error('Falha na verificação do token:', err);
            localStorage.removeItem('token');
            if (loginScreen) loginScreen.style.display = 'flex';
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            if (appContainer) appContainer.style.display = 'none';
        }

        // Configura todos os event listeners e UI restante
        setupEventListeners();
        setupSidebar();
        // setupAuth(); // A função setupAuth não está definida no script original, remover ou implementar.
        loadUserSettings();
        applySettings();
        // carregarHistorico(); // Movido para showWelcomeOrChatInterface
        updateAboutStats(); // Pode precisar ser chamado após o histórico ser carregado
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
            newChatBtn.addEventListener('click', async () => { // Tornar anônima async
                await criarNovaConversa();
                 // Após criar a nova conversa, garantir que a tela de chat seja exibida
                if (currentConversationId) { // Só muda de tela se a conversa foi criada
                    if (welcomeScreen) welcomeScreen.style.display = 'none';
                    if (appContainer) appContainer.style.display = 'flex';
                }
            });
        }

        if (headerMenuBtn) { // Para mobile
            headerMenuBtn.addEventListener('click', toggleSidebar);
        }
        if (sidebarToggle) { // Botão de configurações na sidebar
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

        if (settingsTabs && settingsTabs.length > 0 && settingsPanels && settingsPanels.length > 0) {
            settingsTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    switchSettingsTab(tab.dataset.tab);
                });
            });
        } else {
            console.warn("Elementos do modal de configurações (abas ou painéis) não encontrados.");
        }


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

    function switchSettingsTab(tabName) {
        if (!settingsTabs || !settingsPanels) return;
        settingsTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        settingsPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });
    }

    function setupSettingsControls() {
        const temperatureSlider = document.getElementById('temperature');
        const temperatureValueDisplay = document.querySelector('[for="temperature"]')?.nextElementSibling?.querySelector('.setting-value');

        if (temperatureSlider && temperatureValueDisplay) {
            temperatureSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                userSettings.ai.temperature = value;
                temperatureValueDisplay.textContent = value.toFixed(1);
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

        const contextMemorySelect = document.getElementById('contextMemory'); //Presumi que o ID é 'contextMemory'
        if (contextMemorySelect) {
            contextMemorySelect.addEventListener('change', (e) => {
                // Presumi que o nome da configuração é userSettings.ai.contextMemory ou userSettings.chat.contextMemory
                // Vou usar userSettings.ai.contextMemory conforme o objeto userSettings original
                userSettings.ai.contextMemory = parseInt(e.target.value);
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
                const parsedSettings = JSON.parse(savedSettings);
                // Merge de forma inteligente para não sobrescrever toda a estrutura se chaves faltarem
                userSettings.ai = { ...userSettings.ai, ...parsedSettings.ai };
                userSettings.interface = { ...userSettings.interface, ...parsedSettings.interface };
                userSettings.chat = { ...userSettings.chat, ...parsedSettings.chat };
                console.log('Configurações carregadas:', userSettings);
            }
        } catch (error) {
            console.warn('Erro ao carregar configurações:', error);
            // Mantém as configurações padrão se houver erro
        }
    }


    function saveUserSettings() {
        try {
            localStorage.setItem('saber_settings', JSON.stringify(userSettings));
            console.log('Configurações salvas');

            applySettings(); // Re-aplica para garantir consistência

            const saveBtn = document.getElementById('saveSettings');
            if (saveBtn) {
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
                saveBtn.disabled = true; // Desabilita temporariamente
                saveBtn.style.background = 'hsl(120, 60%, 50%)'; // Verde sucesso

                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.style.background = ''; // Volta ao normal
                    saveBtn.disabled = false;
                }, 2000);
            }

        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            alert('Erro ao salvar configurações. Tente novamente.');
        }
    }

    function resetUserSettings() {
        if (!confirm('Tem certeza que deseja restaurar todas as configurações padrão? Esta ação não pode ser desfeita.')) {
            return;
        }

        // Redefine para os valores padrão
        userSettings = {
            ai: { temperature: 0.5, maxTokens: 300, personality: 'balanced', contextMemory: 10 },
            interface: { theme: 'light', fontSize: 'medium', typingEffect: true, soundNotifications: false, compactMode: false },
            chat: { autoSave: true, confirmDelete: true, enterToSend: true, showTimestamps: false }
        };

        updateSettingsUI(); // Atualiza a UI para refletir os padrões
        applySettings();    // Aplica visualmente os padrões
        saveUserSettings(); // Salva os padrões no localStorage

        console.log('🔄 Configurações resetadas para o padrão.');
        alert('Configurações restauradas para o padrão.');
    }


    function updateSettingsUI() {
        const temperatureSlider = document.getElementById('temperature');
        const temperatureValueDisplay = document.querySelector('[for="temperature"]')?.nextElementSibling?.querySelector('.setting-value');
        if (temperatureSlider && temperatureValueDisplay) {
            temperatureSlider.value = userSettings.ai.temperature;
            temperatureValueDisplay.textContent = userSettings.ai.temperature.toFixed(1);
        }

        const maxTokensSelect = document.getElementById('maxTokens');
        if (maxTokensSelect) maxTokensSelect.value = userSettings.ai.maxTokens;

        const personalitySelect = document.getElementById('aiPersonality');
        if (personalitySelect) personalitySelect.value = userSettings.ai.personality;

        const contextMemorySelect = document.getElementById('contextMemory');
        if (contextMemorySelect) contextMemorySelect.value = userSettings.ai.contextMemory;


        const themeSelect = document.getElementById('theme');
        if (themeSelect) themeSelect.value = userSettings.interface.theme;

        const fontSizeSelect = document.getElementById('fontSize');
        if (fontSizeSelect) fontSizeSelect.value = userSettings.interface.fontSize;

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
        document.body.removeAttribute('data-theme'); // Limpa tema anterior

        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        } else if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.setAttribute('data-theme', 'dark');
            }
            // Se for 'light' ou 'auto' e o sistema for light, nenhum atributo é necessário (usa o padrão CSS)
        }
    }


    function applyFontSize() {
        const fontSize = userSettings.interface.fontSize;
        document.body.classList.remove('font-small', 'font-medium', 'font-large'); // Limpa classes de tamanho anteriores
        if (fontSize === 'small' || fontSize === 'medium' || fontSize === 'large') {
            document.body.classList.add(`font-${fontSize}`);
        } else {
            document.body.classList.add('font-medium'); // Padrão
        }
    }


    function applyCompactMode() {
        const compact = userSettings.interface.compactMode;
        document.body.classList.toggle('compact-mode', compact);
    }

    function applyTimestampDisplay() {
        // Esta função pode precisar de lógica adicional para mostrar/esconder timestamps em mensagens existentes
        // Por enquanto, ela apenas prepara o terreno para quando novas mensagens forem adicionadas
        // ou para quando o histórico for recarregado.
        const showTimestamps = userSettings.chat.showTimestamps;
        document.body.classList.toggle('show-timestamps', showTimestamps); // Classe no body para CSS global
        // Para atualizar mensagens existentes, seria preciso iterar sobre elas e mostrar/esconder .message-time
        if (chatMessages) {
            const messageTimes = chatMessages.querySelectorAll('.message-time');
            messageTimes.forEach(timeEl => {
                timeEl.style.display = showTimestamps ? 'block' : 'none';
            });
        }
    }


    async function exportConversations() {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            alert("Autenticação necessária para exportar.");
            return;
        }
        try {
            const response = await fetch('/api/export', { // Rota já corrigida para usar authenticateToken
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (!response.ok) {
                throw new Error(`Erro ao buscar conversas para exportar (${response.status})`);
            }

            const exportData = await response.json(); // O backend já deve retornar os dados formatados

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
            alert('Conversas exportadas com sucesso!');

        } catch (error) {
            console.error('Erro ao exportar conversas:', error);
            alert('Erro ao exportar conversas. Tente novamente.');
        }
    }


    async function clearAllHistory() {
        const message = userSettings.chat.confirmDelete ?
            'Tem certeza que deseja deletar TODAS as suas conversas? Esta ação não pode ser desfeita.' :
            'Deletar todas as suas conversas?';

        if (!confirm(message)) {
            return;
        }

        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            alert("Autenticação necessária para limpar o histórico.");
            return;
        }

        try {
            // O backend /api/clear-all (se for para o usuário logado) precisa ser ajustado
            // para deletar apenas as conversas do usuário logado, não todas.
            // Assumindo que /api/clear-all foi ajustado no backend para isso:
            const response = await fetch('/api/clear-all', { // Rota já corrigida para usar authenticateToken
                method: 'DELETE', // Importante: Usar o método DELETE
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro ao limpar histórico (${response.status})`);
            }

            limparInterface();
            currentConversationId = null;

            // Após limpar, a tela de boas-vindas é mostrada
            if (welcomeScreen) welcomeScreen.style.display = 'flex';
            if (appContainer) appContainer.style.display = 'none';

            await carregarHistorico(); // Vai mostrar histórico vazio

            console.log('Histórico limpo');
            alert('Todas as suas conversas foram deletadas.');

        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            alert(`Erro ao limpar histórico: ${error.message}`);
        }
    }


    function updateAboutStats() {
        // Calcula o total de conversas do objeto chatHistory local
        const totalConversations = (chatHistory.today?.length || 0) +
            (chatHistory.yesterday?.length || 0) +
            (chatHistory.week?.length || 0) +
            (chatHistory.older?.length || 0);

        let totalMessages = 0;
        [chatHistory.today, chatHistory.yesterday, chatHistory.week, chatHistory.older].forEach(section => {
            if (section) {
                totalMessages += section.reduce((sum, conv) => sum + (conv.message_count || 0), 0);
            }
        });

        let daysUsing = 0;
        const allLocalConversations = [
            ...(chatHistory.today || []),
            ...(chatHistory.yesterday || []),
            ...(chatHistory.week || []),
            ...(chatHistory.older || [])
        ];

        if (allLocalConversations.length > 0) {
            // Encontra a data da conversa mais antiga no histórico local
            const oldestConv = allLocalConversations.reduce((oldest, conv) => {
                return new Date(conv.created_at) < new Date(oldest.created_at) ? conv : oldest;
            });
            const firstUseDate = new Date(oldestConv.created_at);
            const now = new Date();
            daysUsing = Math.max(1, Math.ceil((now - firstUseDate) / (1000 * 60 * 60 * 24))); // Garante pelo menos 1 dia
        }

        // IDs conforme o HTML do modal de "Sobre"
        const totalConversationsEl = document.getElementById('stat-total-conversations');
        const totalMessagesEl = document.getElementById('stat-total-messages');
        const daysUsingEl = document.getElementById('stat-days-using');

        // Atualiza os elementos se eles existirem
        if (totalConversationsEl) totalConversationsEl.textContent = totalConversations;
        if (totalMessagesEl) totalMessagesEl.textContent = totalMessages;
        if (daysUsingEl) daysUsingEl.textContent = daysUsing;

        // Atualiza também os placeholders no HTML para as estatísticas que não temos aqui (do servidor)
        // Estes seriam os IDs que você teria no seu HTML para popular com dados do `/api/stats`
        // Ex: document.getElementById('stat-overall-users').textContent = serverStats.overallUsers;
        // Por enquanto, vamos focar nas estatísticas locais.
    }


    function setupSidebar() {
        if (window.innerWidth > 1024 && sidebar) { // Verifica se sidebar existe
            sidebar.classList.remove('hidden'); // 'hidden' não é uma classe padrão sua, mas ok
            sidebar.classList.add('active');    // Se 'active' é o que mostra no desktop
        } else if (sidebar) {
            sidebar.classList.remove('active'); // Garante que está fechada em mobile por padrão
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024 && sidebar) {
                sidebar.classList.add('active'); // Mantém aberta em desktop
                if (sidebarOverlay) sidebarOverlay.classList.remove('active'); // Fecha overlay
            } else if (sidebar) {
                sidebar.classList.remove('active'); // Fecha em mobile
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
        if (!welcomeInput) return;

        const firstMessage = welcomeInput.value.trim();
        if (!firstMessage) return;

        console.log('💭 Primeira mensagem da Welcome Screen:', firstMessage);

        if (welcomeScreen) welcomeScreen.classList.add('fade-out');

        // Desabilita o input e botão para evitar envios múltiplos
        welcomeInput.disabled = true;
        const welcomeSubmitBtn = document.getElementById('welcome-submit');
        if (welcomeSubmitBtn) welcomeSubmitBtn.disabled = true;


        try {
            await criarNovaConversa(); // Espera a conversa ser criada

            if (currentConversationId) { // Procede somente se a conversa foi criada com sucesso
                await sendMessage(firstMessage); // Envia a primeira mensagem para esta nova conversa

                // Transição de tela APÓS sucesso
                if (welcomeScreen) welcomeScreen.style.display = 'none';
                if (appContainer) appContainer.style.display = 'flex';
                if (welcomeInput) welcomeInput.value = ''; // Limpa o input da welcome screen

            } else {
                // Se criarNovaConversa falhou (e mostrou um alerta), reabilita os botões
                // e não transiciona a tela, mantendo o usuário na welcome screen.
                console.error("Não foi possível criar uma nova conversa. Mantendo na Welcome Screen.");
                if (welcomeScreen) welcomeScreen.classList.remove('fade-out'); // Remove o fade se falhou
            }
        } catch (error) {
            // Este catch é para erros inesperados não tratados dentro de criarNovaConversa/sendMessage
            console.error("Erro crítico no fluxo de handleWelcomeSubmit:", error);
            alert("Ocorreu um erro inesperado. Tente novamente.");
            if (welcomeScreen) welcomeScreen.classList.remove('fade-out');
        } finally {
            // Reabilita o input e botão da welcome screen em caso de falha ou para novo uso
            if (welcomeInput) welcomeInput.disabled = false;
            if (welcomeSubmitBtn) welcomeSubmitBtn.disabled = false;
        }
    }


    async function sendMessage(message) {
        if (!message.trim()) return;
        if (!currentConversationId) {
            alert("Nenhuma conversa ativa para enviar a mensagem. Por favor, inicie uma nova conversa.");
            // Poderia tentar chamar criarNovaConversa() aqui como fallback, mas pode levar a loops
            // Melhor garantir que currentConversationId esteja setado antes.
            console.error("sendMessage chamada sem currentConversationId");
            return;
        }


        console.log('📤 Enviando mensagem:', message.substring(0, 50) + '...');

        addMessageToChat('user', message); // Mostra a mensagem do usuário na UI

        if (messageInput && messageInput.value === message) { // Limpa o input principal do chat se a mensagem veio dele
            messageInput.value = '';
            messageInput.style.height = 'auto'; // Auto resize
        }

        showThinking();

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error("Token de autenticação não encontrado. Faça login novamente.");
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: message,
                    conversationId: currentConversationId,
                    settings: userSettings.ai
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                 if (response.status === 401 || response.status === 403) {
                    alert(`Erro de autenticação (${response.status}): ${errorData.error || 'Token inválido ou expirado. Faça login novamente.'}`);
                    localStorage.removeItem('token');
                    loginScreen.style.display = 'flex';
                    welcomeScreen.style.display = 'none';
                    appContainer.style.display = 'none';
                } else {
                    alert(`Erro do servidor (${response.status}): ${errorData.error || 'Tente novamente.'}`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            hideThinking();

            const useTypingEffect = userSettings.interface.typingEffect;
            addMessageToChat('ai', data.response, useTypingEffect);

            if (userSettings.interface.soundNotifications) {
                playNotificationSound();
            }

            // currentConversationId já deve ser o correto, mas a API retorna para confirmação
            // Se a API retornar um NOVO ID (improvável neste fluxo, mas possível em outros), atualize.
            if (data.conversationId && data.conversationId !== currentConversationId) {
                 console.warn(`ID da conversa mudou de ${currentConversationId} para ${data.conversationId}`);
                 currentConversationId = data.conversationId;
            }


            // Se foi a primeira mensagem da conversa (isFirstMessage vem do backend)
            // E se o título foi atualizado, recarregar o histórico para refletir.
            if (data.isFirstMessage) {
                console.log('💬 Mensagem processada, era a primeira. Recarregando histórico para possível novo título.');
                await carregarHistorico(); // Para atualizar o título na lista
            }

        } catch (error) {
            console.error('Erro ao processar mensagem:', error.message);
            hideThinking();
            addMessageToChat('ai', 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
        }

        scrollToBottom();
    }

    async function handleSubmit(e) { // Submit do formulário principal de chat
        e.preventDefault();
        if (!messageInput) return;

        const message = messageInput.value.trim();
        if (!message) return;

        await sendMessage(message);
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey && userSettings.chat.enterToSend) {
            e.preventDefault();
            if (messageForm) messageForm.requestSubmit(); // Usa requestSubmit para acionar o listener do form
        }
    }

    async function criarNovaConversa() {
        // Esta função é chamada pelo botão "Nova Conversa" e pelo handleWelcomeSubmit
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            alert('Erro de autenticação. Por favor, faça login novamente.');
            if(loginScreen) loginScreen.style.display = 'flex';
            if(welcomeScreen) welcomeScreen.style.display = 'none';
            if(appContainer) appContainer.style.display = 'none';
            return; // Retorna undefined se falhar
        }

        console.log('🆕 Tentando criar nova conversa via API...');
        try {
            const response = await fetch('/api/new-conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido do servidor' }));
                if (response.status === 401 || response.status === 403) {
                     alert(`Erro de autenticação (${response.status}): ${errorData.error || 'Token inválido ou expirado. Faça login novamente.'}`);
                    localStorage.removeItem('token');
                    if(loginScreen) loginScreen.style.display = 'flex';
                    if(welcomeScreen) welcomeScreen.style.display = 'none';
                    if(appContainer) appContainer.style.display = 'none';
                } else {
                    alert(`Erro ao criar nova conversa no servidor (${response.status}): ${errorData.error}`);
                }
                currentConversationId = null; // Garante que não há ID de conversa se falhar
                return; // Retorna undefined se falhar
            }

            const newConversation = await response.json();
            if (!newConversation || !newConversation.id) {
                console.error("Resposta da API /api/new-conversation não continha ID válido:", newConversation);
                alert("Erro ao obter dados da nova conversa do servidor.");
                currentConversationId = null;
                return; // Retorna undefined se falhar
            }

            currentConversationId = newConversation.id;
            console.log('✅ Nova conversa criada com ID:', currentConversationId);
            limparInterface(); // Limpa a área de mensagens para a nova conversa

            // Atualiza a UI da sidebar para destacar a nova conversa (se aplicável)
            await carregarHistorico(); // Recarrega o histórico para mostrar a nova conversa
            
            // A transição de tela (welcome->app) é feita por quem chama esta função (handleWelcomeSubmit ou listener do botão)
            // Se for o botão de nova conversa, e já estivermos no appContainer, apenas limpa e foca.
            if (appContainer && appContainer.style.display === 'flex' && messageInput) {
                messageInput.focus();
            }
            
            if (window.innerWidth <= 1024) { // Fecha a sidebar em mobile após criar nova conversa
                closeSidebar();
            }

            return newConversation.id; // Retorna o ID em caso de sucesso

        } catch (error) {
            console.error('Falha crítica em criarNovaConversa (catch):', error);
            alert('Falha crítica ao tentar criar nova conversa. Verifique o console.');
            currentConversationId = null;
            return; // Retorna undefined se falhar
        }
    }


    async function carregarHistorico() {
        const currentToken = localStorage.getItem('token');
        if (!currentToken || !currentUser) { // Precisa de currentUser para associar o histórico
            console.log("Usuário não autenticado ou dados do usuário não disponíveis, não carregando histórico.");
            // Limpa seções do histórico se não estiver autenticado
            preencherSecao('todayChats', [], 'Hoje');
            preencherSecao('yesterdayChats', [], 'Ontem');
            preencherSecao('weekChats', [], 'Últimos 7 dias');
            preencherSecao('olderChats', [], 'Conversas antigas');
            return;
        }

        console.log('Carregando histórico para o usuário:', currentUser.id);
        try {
            const response = await fetch('/api/history', {
                 headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Erro ao carregar histórico (${response.status}):`, errorData.error);
                if (response.status === 401 || response.status === 403){
                    // Tratar falha de autenticação silenciosamente aqui para não incomodar o usuário a toda hora
                    localStorage.removeItem('token');
                    // Poderia redirecionar para login, mas vamos apenas não carregar o histórico
                }
                return;
            }

            const data = await response.json();
            chatHistory = data; // Armazena o histórico carregado

            preencherSecao('todayChats', data.today || [], 'Hoje');
            preencherSecao('yesterdayChats', data.yesterday || [], 'Ontem');
            preencherSecao('weekChats', data.week || [], 'Últimos 7 dias');
            preencherSecao('olderChats', data.older || [], 'Conversas antigas');

            console.log('Histórico carregado:', {
                hoje: (data.today || []).length,
                ontem: (data.yesterday || []).length,
                semana: (data.week || []).length,
                antigas: (data.older || []).length
            });

            updateAboutStats(); // Atualiza estatísticas baseadas no novo histórico

        } catch (error) {
            console.error('Erro crítico ao carregar histórico (catch):', error);
        }
    }


    function preencherSecao(containerId, conversas, sectionName) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container do histórico "${containerId}" não encontrado.`);
            return;
        }

        container.innerHTML = ''; // Limpa antes de preencher

        if (!conversas || conversas.length === 0) {
            // Opcional: Mostrar mensagem de "Nenhuma conversa" na seção
            // container.innerHTML = `<p class="chat-history-empty">Nenhuma conversa ${sectionName.toLowerCase()}.</p>`;
            return;
        }

        conversas.forEach((conv, index) => {
            const chatItem = createChatHistoryItem(conv);
            container.appendChild(chatItem);

            // Animação de entrada suave
            setTimeout(() => {
                chatItem.style.opacity = '1';
                chatItem.style.transform = 'translateX(0)';
            }, index * 30); // Atraso menor para carregamento mais rápido
        });

        // console.log(`📋 ${sectionName}: ${conversas.length} conversas renderizadas.`);
    }


    function createChatHistoryItem(conv) {
        const div = document.createElement('div');
        div.className = 'chat-history-item';
        // Estilos de animação já estão no CSS com .chat-history-item e @keyframes slideInLeft
        // Apenas garantimos que eles serão aplicados ao adicionar o item.

        if (conv.id === currentConversationId) {
            div.classList.add('active');
        }
        // Usa o título da conversa, ou um placeholder se não houver título (improvável)
        const title = conv.title || 'Conversa sem título';
        // Opcional: Adicionar preview da primeira mensagem se disponível no objeto `conv`
        // const preview = conv.first_message ? `<div class="chat-item-preview">${escapeHtml(conv.first_message.substring(0,30))}...</div>` : '';

        div.innerHTML = `
            <div class="chat-item-main">
                <div class="chat-item-icon">
                    <i class="fas fa-comments"></i> </div>
                <div class="chat-item-content">
                    <div class="chat-item-title">${escapeHtml(title)}</div>
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

        if (mainContent) {
            mainContent.addEventListener('click', async () => { // Tornar async
                await carregarConversa(conv.id);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => { // Tornar async
                e.stopPropagation(); // Previne que o click carregue a conversa
                await deletarConversa(conv.id, div);
            });
        }

        return div;
    }


    async function carregarConversa(conversationIdToLoad) {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            alert("Autenticação necessária para carregar a conversa.");
            return;
        }
        console.log('Carregando conversa ID:', conversationIdToLoad);
        try {
            const response = await fetch(`/api/conversation/${conversationIdToLoad}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro ao carregar conversa (${response.status})`);
            }

            const data = await response.json();

            if (!data.messages) { // O backend deve retornar { messages: [...] }
                console.error("Dados da conversa inválidos recebidos do servidor:", data);
                throw new Error("Formato de dados da conversa inesperado.");
            }


            limparInterface(); // Limpa a UI atual antes de carregar a nova conversa
            currentConversationId = conversationIdToLoad; // Define o ID da conversa ativa


            data.messages.forEach(msg => {
                // Garante que msg.content exista. Se não, usa uma string vazia ou um placeholder.
                addMessageToChat(msg.role, msg.content || '(mensagem vazia)', false); // Não usar typing effect para histórico
            });

            if (welcomeScreen) welcomeScreen.style.display = 'none';
            if (appContainer) appContainer.style.display = 'flex';

            await carregarHistorico(); // Reativa o item correto na sidebar

            if (messageInput) messageInput.focus();
            scrollToBottom(true); // Força scroll para o final

            if (window.innerWidth <= 1024) {
                closeSidebar();
            }

            console.log('Conversa carregada com sucesso:', conversationIdToLoad);

        } catch (error) {
            console.error('Erro ao carregar conversa:', error);
            alert(`Erro ao carregar conversa: ${error.message}`);
            // Pode ser útil resetar currentConversationId se o carregamento falhar
            // currentConversationId = null;
        }
    }


    async function deletarConversa(conversationIdToDelete, itemElement) {
        const shouldConfirm = userSettings.chat.confirmDelete;
        if (shouldConfirm && !confirm('Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita.')) {
            return;
        }

        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            alert("Autenticação necessária para deletar a conversa.");
            return;
        }

        console.log('Deletando conversa ID:', conversationIdToDelete);
        try {
            const response = await fetch(`/api/conversation/${conversationIdToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro ao deletar conversa (${response.status})`);
            }

            // Remove visualmente o item da lista com animação
            if (itemElement) {
                itemElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                itemElement.style.transform = 'translateX(-100%)';
                itemElement.style.opacity = '0';
                setTimeout(() => {
                    itemElement.remove(); // Remove do DOM após a animação
                    updateAboutStats(); // Recalcula estatísticas após remoção
                }, 300);
            } else {
                // Se o elemento não foi passado, apenas recarrega o histórico para refletir a mudança
                await carregarHistorico();
                updateAboutStats();
            }


            // Se a conversa deletada era a ativa, cria uma nova ou vai para a tela de boas-vindas
            if (conversationIdToDelete === currentConversationId) {
                console.log('Conversa ativa deletada. Iniciando nova conversa ou mostrando welcome screen.');
                currentConversationId = null; // Reseta o ID ativo
                // Verifica se há outras conversas, se não, mostra welcome screen
                const allConvSections = [
                    ...(chatHistory.today || []),
                    ...(chatHistory.yesterday || []),
                    ...(chatHistory.week || []),
                    ...(chatHistory.older || [])
                ];
                const remainingConversations = allConvSections.filter(c => c.id !== conversationIdToDelete);

                if (remainingConversations.length === 0) {
                    if (welcomeScreen) welcomeScreen.style.display = 'flex';
                    if (appContainer) appContainer.style.display = 'none';
                    limparInterface(); // Limpa o chat
                } else {
                    // Opcional: carregar a conversa mais recente ou apenas limpar
                    await criarNovaConversa(); // Cria uma nova conversa vazia
                    if (currentConversationId) { // Se a nova conversa foi criada
                         if (welcomeScreen) welcomeScreen.style.display = 'none';
                         if (appContainer) appContainer.style.display = 'flex';
                    }
                }
            }
             console.log('Conversa deletada com sucesso:', conversationIdToDelete);

        } catch (error) {
            console.error('Erro ao deletar conversa:', error);
            alert(`Erro ao deletar conversa: ${error.message}`);
        }
    }


    function limparInterface() { // Limpa a área de chat, mas não o histórico
        if (chatMessages) chatMessages.innerHTML = '';
        // chatHistory não é resetado aqui, pois é o histórico geral.
        hideThinking();
        if (messageInput) {
            messageInput.value = '';
            messageInput.style.height = 'auto'; // Reset altura
        }

        // Remove a classe 'active' de todos os itens do histórico na sidebar
        document.querySelectorAll('.chat-history-item.active').forEach(item => {
            item.classList.remove('active');
        });
        // O currentConversationId é tipicamente setado para null ou um novo ID *antes* de chamar limparInterface
        // ou logo após, dependendo do fluxo.
    }


    function autoResizeTextarea() {
        if (!this) return;
        this.style.height = 'auto'; // Reseta para calcular scrollHeight corretamente
        let newHeight = this.scrollHeight;
        const maxHeight = 120; // Max height em pixels (do seu CSS original: max-height: 120px;)
        if (newHeight > maxHeight) newHeight = maxHeight;
        this.style.height = `${newHeight}px`;
    }


    function showThinking() {
        if (thinkingIndicator) thinkingIndicator.style.display = 'flex';
        if (sendButton) sendButton.disabled = true;
        if (messageInput) messageInput.disabled = true; // Desabilita input enquanto pensa
    }

    function hideThinking() {
        if (thinkingIndicator) thinkingIndicator.style.display = 'none';
        if (sendButton) sendButton.disabled = false;
        if (messageInput) messageInput.disabled = false; // Reabilita input
    }


    function addMessageToChat(sender, text, useTypingEffect = false) {
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        // Animação de entrada já está no CSS para .message

        const showTimestampsSetting = userSettings.chat.showTimestamps;
        // O timestamp é adicionado apenas se a configuração estiver ativa E se a classe .show-timestamps estiver no body
        // A classe no body é mais para CSS global, aqui controlamos a inserção do HTML.
        const timestampHTML = showTimestampsSetting ? `<div class="message-time" style="display: block;">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>` : `<div class="message-time" style="display: none;">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>`;


        const avatarContent = sender === 'user' ?
            (currentUser && currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U') :
            '<div class="logo-img" style="transform: scale(0.6); width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><img src="logo.png" alt="Logo" style="width:18px; height:18px;"></div>';


        const formattedText = formatMessage(text); // Assume que formatMessage lida com HTML de forma segura

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-avatar">
                    <div class="avatar-circle">${avatarContent}</div>
                </div>
                <div class="message-bubble">
                    <div class="message-text"></div> ${timestampHTML}
                </div>
            </div>
        `;

        const messageTextElement = messageDiv.querySelector('.message-text');
        if (!messageTextElement) return; // Segurança

        // Adiciona a mensagem ao DOM antes de iniciar o typeWriter ou setar o innerHTML
        chatMessages.appendChild(messageDiv);


        if (sender === 'ai' && useTypingEffect && userSettings.interface.typingEffect) {
            typeWriter(messageTextElement, formattedText);
        } else {
            messageTextElement.innerHTML = formattedText; // Cuidado com XSS se formattedText não for sanitizado
        }

        // A animação CSS .message fará o slide-in.
        // O opacity e transform eram para animação JS, mas o CSS já cuida.

        scrollToBottom();
    }


    function typeWriter(element, text, speed = 10) { // Aumentei um pouco a velocidade padrão
        element.innerHTML = ''; // Limpa o elemento
        let i = 0;
        const originalText = text; // Guarda o texto original formatado para setar no final

        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        // Não adiciona o cursor ainda se o texto for vazio
        
        let currentHtml = '';

        function type() {
            if (i < originalText.length) {
                // Para lidar com tags HTML no meio do texto
                if (originalText[i] === '<') {
                    let tagEnd = originalText.indexOf('>', i);
                    if (tagEnd !== -1) {
                        currentHtml += originalText.substring(i, tagEnd + 1);
                        i = tagEnd; // Avança o índice para depois da tag
                    } else { // Tag não fechada, trata como texto normal (improvável com formatMessage)
                        currentHtml += originalText[i];
                    }
                } else {
                    currentHtml += originalText[i];
                }
                
                element.innerHTML = currentHtml; // Atualiza com o conteúdo parcial
                if (i === 0 && originalText.length > 0) element.appendChild(cursor); // Adiciona cursor após o primeiro caractere
                else if (originalText.length > 0) element.appendChild(cursor); // Mantém cursor no final

                i++;
                scrollToBottom(); // Scroll enquanto digita
                setTimeout(type, speed);
            } else {
                if (cursor.parentNode) cursor.remove(); // Remove o cursor ao final
                element.innerHTML = originalText; // Garante que o HTML completo seja renderizado
                scrollToBottom();
            }
        }
        if (originalText.length > 0) { // Só inicia se houver texto
           element.appendChild(cursor); // Adiciona o cursor no início
           type();
        } else {
            element.innerHTML = originalText; // Seta texto vazio se for o caso
        }
    }


    function playNotificationSound() {
        try {
            // O áudio em base64 é longo, mantive o original.
            // Considere hospedar um pequeno arquivo .mp3 ou .wav se o base64 for problemático.
            const audio = new Audio('data:audio/wav;base64,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');
            audio.volume = 0.3; // Aumentei um pouco o volume
            audio.play().catch(e => console.warn('Som de notificação não pôde ser reproduzido:', e)); // Usar warn para não ser tão intrusivo
        } catch (error) {
            console.warn('Erro ao tentar reproduzir som de notificação:', error);
        }
    }

    function formatMessage(text) {
        if (typeof text !== 'string') {
            console.warn("formatMessage recebeu algo que não é string:", text);
            return ''; // Retorna string vazia para evitar erros
        }
        // Sanitize basic HTML to prevent XSS - very basic, consider a library for robust sanitization
        let_safe_text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Aplicar formatação Markdown APÓS sanitização
        let formatted = _safe_text.replace(/\n/g, '<br>'); // Quebras de linha
        // Negrito: **texto**
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Itálico: *texto* (cuidado para não confundir com listas Markdown se usar só *)
        // Para itálico, é mais seguro usar _texto_ ou garantir que * não esteja no início de uma linha seguido de espaço
        formatted = formatted.replace(/(?<!\*)\*([^* \n][^*]*?[^* \n])\*(?!\*)/g, '<em>$1</em>'); // *itálico*
         formatted = formatted.replace(/__([^ _][^_]*?[^ _])__/g, '<strong>$1</strong>'); // __negrito__
        formatted = formatted.replace(/_([^ _][^_]*?[^ _])_/g, '<em>$1</em>'); // _itálico_


        // Código inline: `codigo`
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Blocos de código: ```linguagem\n codigo ``` ou ```\n codigo ```
        formatted = formatted.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, (match, codeContent) => {
            // Para blocos de código, não escapamos o HTML interno, pois é código.
            // Mas o conteúdo do código já foi sanitizado antes (text -> _safe_text)
            // Se precisar de syntax highlighting, uma biblioteca como highlight.js seria usada aqui.
            return `<pre><code>${codeContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
        });
        return formatted;
    }


    function scrollToBottom(force = false) {
        if (chatMessages) {
            // Rola suavemente se o usuário não estiver scrollado para cima para ler mensagens antigas
            // Ou força o scroll se 'force' for true (ex: ao carregar uma conversa)
            if (force || isScrolledToBottom()) {
                chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
            }
        }
    }

    function isScrolledToBottom() {
        if (!chatMessages) return true; // Se não há área de mensagens, considera "no fundo"
        // Tolerância para considerar "no fundo", útil se houver padding ou margens
        const scrollThreshold = 50; // pixels
        return chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + scrollThreshold;
    }

    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            currentUser = null; // Limpa dados do usuário
            currentConversationId = null; // Limpa ID da conversa ativa
            // Mostra tela de login
            if (loginScreen) loginScreen.style.display = 'flex';
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            if (appContainer) appContainer.style.display = 'none';
            // Limpa histórico da UI
            preencherSecao('todayChats', [], 'Hoje');
            preencherSecao('yesterdayChats', [], 'Ontem');
            preencherSecao('weekChats', [], 'Últimos 7 dias');
            preencherSecao('olderChats', [], 'Conversas antigas');
            console.log("Usuário deslogado.");
        });
    }


    function formatTime(timestamp) { // Não usada no código atual, mas pode ser útil
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now.getTime() - date.getTime(); // Diferença em milissegundos

            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 1) return date.toLocaleDateString('pt-BR');
            if (days === 1) return 'ontem';
            if (hours >= 1) return `${hours}h atrás`;
            if (minutes >= 1) return `${minutes}min atrás`;
            if (seconds < 5) return 'agora'; // Para mensagens muito recentes
            return `${seconds}s atrás`;

        } catch (error) {
            console.warn("Erro ao formatar timestamp:", timestamp, error);
            return 'data inválida';
        }
    }


    if (messageInput) {
        messageInput.addEventListener('input', () => {
            // Placeholder não é mais necessário aqui se você está usando o CSS :placeholder-shown
            // Mas se quiser lógica JS:
            // messageInput.placeholder = messageInput.value.trim() ? '' : 'Digite sua mensagem...';
        });
    }

    // Listener para tema automático do sistema
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => { // Usar addEventListener em vez de addListener (deprecado)
            if (userSettings.interface.theme === 'auto') {
                applyTheme(); // Reaplica o tema se for 'auto' e o sistema mudar
            }
        });
    }

    // Inicia a aplicação
    initializeApp();
});