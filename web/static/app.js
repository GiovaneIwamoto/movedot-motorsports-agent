// Modern JavaScript for MoveDot Motorsports Analytics Web Interface

// Global navigation function - works on all pages (must be defined early)
if (typeof window.navigateTo === 'undefined') {
    window.navigateTo = function(url) {
        if (url && url !== '#') {
            window.location.href = url;
        }
    };
}

class MotorsportsAnalytics {
    constructor() {
        this.apiBase = '/api';
        this.sessionId = this.generateSessionId();
        this.analysisCount = 0;
        this.queryStartTime = null;
        this.isProcessingQuery = false; // Prevent multiple simultaneous queries
        this.conversationId = null;
        this.queryMetrics = {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            averageResponseTime: 0
        };
        
        // Animated placeholder system
        this.placeholders = [
            "Analyze driver performance trends...",
            "Show me the fastest lap times...",
            "Compare team strategies...",
            "What's the weather impact on lap times?",
            "Find the most consistent drivers...",
            "Analyze tire degradation patterns...",
            "Show pit stop strategy analysis...",
            "Compare qualifying vs race performance...",
            "Analyze fuel consumption patterns...",
            "Find the best overtaking opportunities..."
        ];
        // Decorative typing placeholders for when no messages
        this.decorativePlaceholders = [
            "Ask me anything",
            "What can I help you with?",
            "Ask me anything",
            "How can I assist you?",
            "Ask me anything"
        ];
        this.currentPlaceholderIndex = 0;
        this.currentDecorativeIndex = 0;
        this.placeholderInterval = null;
        this.typingAnimation = null;
        this.isTyping = false;
        this.isInputFocused = false;
        
        // Loader system
        this.loaderTimeout = null;
        this.isLoading = false;
        
        // Floating Dock system - Simplified
        this.currentPage = 'dashboard';
        this.isMobile = window.innerWidth <= 768;
        this.activeSection = 'dashboard'; // Track which section is currently active
        
        this.notificationStyleInjected = false;
        
        // Rotating text for welcome message
        this.rotatingTextInterval = null;
        
        this.init();
    }

    // -----------------
    // Auth & Conversations
    // -----------------
    async ensureAuthenticated() {
        try {
            const res = await fetch(`${this.apiBase}/auth/me`, { credentials: 'include' });
            if (!res.ok) throw new Error('Not authenticated');
            this.currentUser = await res.json();
            console.log('Current user data:', this.currentUser); // Debug log
        } catch (e) {
            window.location.href = `${this.apiBase}/auth/login`;
            throw e;
        }
    }

    setupAuthUI() {
        // Populate user name and setup user menu
        try {
            const nameEl = document.getElementById('user-name');
            const pictureEl = document.getElementById('user-picture');
            const menuTrigger = document.getElementById('user-menu-trigger');
            const menuDropdown = document.getElementById('user-menu-dropdown');
            
            if (this.currentUser) {
                // Set name
                if (nameEl && this.currentUser.name) {
                    nameEl.textContent = this.currentUser.name;
                }
                
                // Set welcome message user name
                const welcomeUserName = document.getElementById('welcome-user-name');
                if (welcomeUserName && this.currentUser.name) {
                    welcomeUserName.textContent = this.currentUser.name;
                }
                
                // Set picture
                if (this.currentUser.picture && pictureEl) {
                    pictureEl.src = this.currentUser.picture;
                    pictureEl.style.display = 'block';
                    pictureEl.style.width = '24px';
                    pictureEl.style.height = '24px';
                    pictureEl.style.borderRadius = '50%';
                    pictureEl.style.objectFit = 'cover';
                    pictureEl.onerror = () => {
                        console.warn('Failed to load user picture:', this.currentUser.picture);
                        pictureEl.style.display = 'none';
                    };
                }
            }
            
            // Setup menu toggle
            if (menuTrigger && menuDropdown) {
                menuTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = menuDropdown.style.display === 'flex';
                    menuDropdown.style.display = isOpen ? 'none' : 'flex';
                });
                
                // Close menu when clicking outside
                document.addEventListener('click', (e) => {
                    if (!menuTrigger.contains(e.target) && !menuDropdown.contains(e.target)) {
                        menuDropdown.style.display = 'none';
                    }
                });
            }
            
            // Setup menu items
            this.setupUserMenuActions();
        } catch (e) {
            console.warn('Auth UI setup error', e);
        }
    }
    
    setupUserMenuActions() {
        // Logout
        const logoutBtn = document.getElementById('menu-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await fetch(`${this.apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
                } finally {
                    // Redirect to home page after logout
                    window.location.href = '/home.html';
                }
            });
        }
        
        // Clear chat history
        const clearHistoryBtn = document.getElementById('menu-clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                // Show custom dialog
                const dialog = document.getElementById('clear-history-dialog');
                if (dialog) {
                    dialog.style.display = 'flex';
                    
                    // Handle cancel
                    const cancelBtn = document.getElementById('dialog-cancel');
                    const confirmBtn = document.getElementById('dialog-confirm');
                    
                    const closeDialog = () => {
                        dialog.style.display = 'none';
                    };
                    
                    // Close on overlay click
                    dialog.addEventListener('click', (e) => {
                        if (e.target === dialog) {
                            closeDialog();
                        }
                    });
                    
                    cancelBtn.onclick = closeDialog;
                    
                    confirmBtn.onclick = async () => {
                        closeDialog();
                        try {
                        const res = await fetch(`${this.apiBase}/chat/conversations/clear`, {
                            method: 'DELETE',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (res.ok) {
                            this.showNotification('Chat history cleared successfully', 'success');
                            // Clear chat messages
                            const messagesContainer = document.getElementById('chat-messages');
                            const centeredBlock = document.getElementById('chat-centered-block');
                            if (messagesContainer) {
                                messagesContainer.innerHTML = '';
                            }
                            // Ensure smooth transition by waiting for DOM update
                            requestAnimationFrame(() => {
                                // Show welcome message after clearing with smooth animation
                                this.showWelcomeMessage();
                            });
                            // Small delay to ensure DOM is updated before reloading
                            await new Promise(resolve => setTimeout(resolve, 100));
                            // Reload conversation without showing welcome modal
                            await this.bootstrapConversation(false);
                            // Close menu
                            const menuDropdown = document.getElementById('user-menu-dropdown');
                            if (menuDropdown) {
                                menuDropdown.style.display = 'none';
                            }
                        } else {
                            const errorText = await res.text();
                            console.error('Failed to clear history:', res.status, errorText);
                            throw new Error(`Failed to clear history: ${res.status}`);
                        }
                        } catch (e) {
                            this.showNotification('Failed to clear chat history. Please try again.', 'error');
                            console.error('Error clearing history:', e);
                        }
                    };
                }
            });
        }
        
        // Manage conversations
        const manageConvBtn = document.getElementById('menu-manage-conversations');
        if (manageConvBtn) {
            manageConvBtn.addEventListener('click', () => {
                this.showNotification('Conversation management coming soon', 'info');
            });
        }
        
        // Export data
        const exportBtn = document.getElementById('menu-export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showNotification('Data export coming soon', 'info');
            });
        }
        
        // Settings
        const settingsBtn = document.getElementById('menu-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                // Close menu first
                const menuDropdown = document.getElementById('user-menu-dropdown');
                if (menuDropdown) {
                    menuDropdown.style.display = 'none';
                }
                // Show settings modal
                this.showSettingsModal();
            });
        }
        
        // About
        const aboutBtn = document.getElementById('menu-about');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => {
                // Close menu first
                const menuDropdown = document.getElementById('user-menu-dropdown');
                if (menuDropdown) {
                    menuDropdown.style.display = 'none';
                }
                // Show welcome modal (about info)
                this.showWelcomeModal(true);
            });
        }
    }

    async bootstrapConversation(showWelcomeIfNew = true) {
        try {
            const res = await fetch(`${this.apiBase}/chat/conversations`, { credentials: 'include' });
            let isNewUser = false;
            
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list) && list.length > 0) {
                    this.conversationId = list[0].id;
                    await this.loadConversationMessages(this.conversationId);
                    return;
                } else {
                    // No conversations exist - this is a new user
                    isNewUser = true;
                }
            } else {
                // Error fetching - might be new user
                isNewUser = true;
            }
            
            // Show welcome message for new users
            if (isNewUser) {
                this.showWelcomeMessage();
                // Only show modal if requested (not when clearing history)
                if (showWelcomeIfNew) {
                    // Small delay to ensure page is loaded
                    setTimeout(() => {
                        this.showWelcomeModal();
                    }, 500);
                }
            }
            
            const createRes = await fetch(`${this.apiBase}/chat/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title: 'Conversation' })
            });
            if (createRes.ok) {
                const data = await createRes.json();
                this.conversationId = data.id;
            }
        } catch (e) {
            console.error('Error bootstrapping conversation', e);
        }
    }

    async loadConversationMessages(conversationId) {
        try {
            const res = await fetch(`${this.apiBase}/chat/conversations/${conversationId}`, { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            const messages = data.messages || [];
            const messagesContainer = document.getElementById('chat-messages');
            if (!messagesContainer) return;
            messagesContainer.innerHTML = '';
            
            if (messages.length > 0) {
                // Hide welcome message if there are messages
                this.hideWelcomeMessage();
                for (const m of messages) {
                    await this.addMessage(m.content, m.role === 'user' ? 'user' : 'agent');
                }
            } else {
                // Show welcome message if no messages
                this.showWelcomeMessage();
            }
        } catch (e) {
            console.error('Error loading conversation messages', e);
        }
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async init() {
        // Detect current page from URL
        const currentPath = window.location.pathname;
        if (currentPath.includes('data-sources')) {
            this.currentPage = 'data-sources';
        } else if (currentPath.includes('mcp-servers')) {
            this.currentPage = 'mcp-servers';
        } else if (currentPath.includes('home')) {
            this.currentPage = 'home';
        }
        
        this.setupEventListeners();
        
        // Only load data and setup chat features on dashboard page
        const isDataSourcesPage = currentPath.includes('data-sources.html');
        const isMCPServersPage = currentPath.includes('mcp-servers.html');
        const isHomePage = currentPath.includes('home.html');
        
        if (!isDataSourcesPage && !isMCPServersPage && !isHomePage) {
            await this.loadDataOverview();
            this.startStatusUpdater();
            this.updateConnectionStatus(true); // SSE is always available
            this.initAnimatedPlaceholder();
            await this.ensureAuthenticated();
            this.setupAuthUI();
            await this.bootstrapConversation();
        }
        
        this.setupBgGridPattern();
        
        this.checkPendingDatasetAnalysis();
        this.checkNavigationContext();
        
        // Also check on DOM ready as backup
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.checkPendingDatasetAnalysis(), 100);
            });
        }
        // Server-side history persistence; no unload handlers needed
    }

    startStatusUpdater() {
        // Update status indicator every second
        setInterval(() => {
            this.updateStatusIndicator();
        }, 1000);
    }

    checkPendingDatasetAnalysis() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const analyzeParam = urlParams.get('analyze');
        
        if (analyzeParam) {
            this.addTextToChatInput(analyzeParam);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // Check if there's a pending dataset analysis from data sources page
        const pendingDataset = localStorage.getItem('pendingDatasetAnalysis');
        if (pendingDataset) {
            // Clear the pending analysis
            localStorage.removeItem('pendingDatasetAnalysis');
            
            this.addTextToChatInput(`Analyze the dataset ${pendingDataset}`);
        }
    }
    
    addTextToChatInput(text) {
        setTimeout(() => {
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.value = text;
                chatInput.focus();
                // Trigger input event to update UI if needed
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                console.error('Chat input not found');
                // Retry after a bit more time
                setTimeout(() => {
                    const retryChatInput = document.getElementById('chat-input');
                    if (retryChatInput) {
                        retryChatInput.value = text;
                        retryChatInput.focus();
                        retryChatInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }, 1000);
            }
        }, 500);
    }

    // Client-side chat history methods removed; history is persisted via API

    clearChat() {
        // Clear the chat interface
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // Note: Server-side history persists; this only clears the UI
    }

    checkNavigationContext() {
        // Check if we're on data-sources page
        const currentPath = window.location.pathname;
        const urlHash = window.location.hash;
        
        if (currentPath.includes('data-sources')) {
            // If on data-sources page, handle hash navigation
            if (urlHash === '#analytics') {
                // Stay on data-sources page, just scroll to analytics
                setTimeout(() => {
                    const analyticsSection = document.getElementById('analytics-section');
                    if (analyticsSection) {
                        analyticsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 500);
            }
            // Don't redirect to dashboard if on data-sources page
            return;
        }
        
        // Only handle hash navigation on main dashboard page
        if (urlHash === '#analytics') {
            setTimeout(() => {
                this.scrollToSection('analytics');
            }, 500);
        }
    }


    setupEventListeners() {
        // Floating Dock event listeners - setup first so it works on all pages
        this.setupFloatingDock();
        
        // Chat input - only setup if elements exist
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        
        if (!chatInput || !sendButton) {
            // Still setup tab system and other non-chat features
            this.setupTabSystem();
            return;
        }
        
        // Store references for later use
        this.chatInput = chatInput;
        this.sendButton = sendButton;
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        sendButton.addEventListener('click', () => this.sendMessage());
        
        // Suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const query = chip.dataset.query;
                chatInput.value = query;
                this.sendMessage();
            });
        });
        
        // Initialize suggestion carousel
        this.initSuggestionCarousel();
        
        // Auto-resize chat input
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        });

        // Animated placeholder events
        chatInput.addEventListener('focus', () => {
            this.isInputFocused = true;
            this.stopPlaceholderAnimation();
            const vanishPlaceholder = document.getElementById('vanish-placeholder');
            if (vanishPlaceholder) {
                vanishPlaceholder.classList.add('hidden');
            }
        });

        chatInput.addEventListener('blur', () => {
            this.isInputFocused = false;
            const vanishPlaceholder = document.getElementById('vanish-placeholder');
            if (!chatInput.value.trim()) {
                if (vanishPlaceholder) {
                    vanishPlaceholder.classList.remove('hidden');
                }
                this.startPlaceholderAnimation();
            } else {
                if (vanishPlaceholder) {
                    vanishPlaceholder.classList.add('hidden');
                }
            }
        });

        chatInput.addEventListener('input', () => {
            const vanishPlaceholder = document.getElementById('vanish-placeholder');
            if (chatInput.value.trim()) {
                this.stopPlaceholderAnimation();
                if (vanishPlaceholder) {
                    vanishPlaceholder.classList.add('hidden');
                }
            } else {
                if (vanishPlaceholder) {
                    vanishPlaceholder.classList.remove('hidden');
                }
                if (!this.isInputFocused) {
                    // Small delay to ensure input is cleared
                    setTimeout(() => {
                        if (!chatInput.value.trim()) {
                            this.startPlaceholderAnimation();
                        }
                    }, 100);
                }
            }
        });

        // Tab system
        this.setupTabSystem();
        
        // Handle window resize for dock
        window.addEventListener('resize', () => {
            this.handleDockResize();
            this.updateDynamicSpacing();
        });
        
        // Initialize magnetic dock system (gentle)
        this.updateDynamicSpacing();
        
        // Add scroll listener to detect section visibility and magnetic alignment
        this.setupScrollListener();
        
        // Gentle initial alignment - only after page is fully loaded
        setTimeout(() => {
            this.calculateMagneticAlignment();
        }, 2000); // Reasonable delay
        
    }

    async loadDataOverview() {
        try {
            const response = await fetch(`${this.apiBase}/data/overview`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.updateDataSources(data.available_datasets);
            this.updateMetrics(data.total_datasets);
            
        } catch (error) {
            console.error('Error loading data overview:', error);
            // Don't show error message immediately, try again after a delay
            setTimeout(() => {
                this.retryLoadDataOverview();
            }, 2000);
        }
    }

    async retryLoadDataOverview() {
        try {
            const response = await fetch(`${this.apiBase}/data/overview`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.updateDataSources(data.available_datasets);
            this.updateMetrics(data.total_datasets);
            
        } catch (error) {
            console.error('Error loading data overview (retry):', error);
            // Don't show error in chat, just log it
            console.warn('Data overview could not be loaded, continuing without it');
        }
    }

    updateDataSources(datasets) {
        const container = document.getElementById('data-sources');
        const countElement = document.getElementById('data-count');

        // If not on data-sources page, safely skip
        if (!container) {
            console.warn('Data sources container not found; skipping update');
            return;
        }
        
        // Update count
        if (countElement) {
            countElement.textContent = `${datasets.length} dataset${datasets.length !== 1 ? 's' : ''}`;
        }
        
        if (!Array.isArray(datasets) || datasets.length === 0) {
            container.innerHTML = '<div class="loading">No datasets available</div>';
            return;
        }
        
        container.innerHTML = datasets.map(dataset => `
            <div class="data-source" onclick="window.selectDataSource('${dataset.name}')" title="Click to analyze ${dataset.name}">
                <div class="data-source-icon">
                    <i class="fas fa-file-csv"></i>
                </div>
                <div class="data-source-name">${this.truncateName(dataset.name, 30)}</div>
                <div class="data-source-meta">
                    <span class="data-source-size">${this.formatFileSize(dataset.size)}</span>
                </div>
            </div>
        `).join('');
    }

    updateMetrics(totalDatasets) {
        document.getElementById('total-datasets').textContent = totalDatasets;
        document.getElementById('analysis-count').textContent = this.queryMetrics.totalQueries;
        
        // Update status indicator
        this.updateStatusIndicator();
        
        // Update additional metrics if elements exist
        const successRate = this.queryMetrics.totalQueries > 0 
            ? Math.round((this.queryMetrics.successfulQueries / this.queryMetrics.totalQueries) * 100)
            : 0;
        
        // Add success rate to dashboard if element exists
        const successRateElement = document.getElementById('success-rate');
        if (successRateElement) {
            successRateElement.textContent = `${successRate}%`;
        }
        
        // Add average response time if element exists
        const avgTimeElement = document.getElementById('avg-response-time');
        if (avgTimeElement) {
            avgTimeElement.textContent = `${Math.round(this.queryMetrics.averageResponseTime)}ms`;
        }
    }

    updateStatusIndicator() {
        const statusDot = document.getElementById('update-status');
        const statusText = document.getElementById('last-update');
        
        if (statusDot && statusText) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            
            // Update status based on recent activity
            const timeSinceLastQuery = Date.now() - (this.queryStartTime || 0);
            
            if (timeSinceLastQuery < 5000) { // Less than 5 seconds
                statusDot.className = 'status-dot processing';
                statusText.textContent = 'Processing...';
            } else if (this.queryMetrics.totalQueries > 0) {
                statusDot.className = 'status-dot online';
                statusText.textContent = `Last: ${timeString}`;
            } else {
                statusDot.className = 'status-dot online';
                statusText.textContent = `Ready ${timeString}`;
            }
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    truncateName(name, maxLength = 25) {
        if (name.length <= maxLength) return name;
        const extension = name.split('.').pop();
        const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
        const truncated = nameWithoutExt.substring(0, maxLength - extension.length - 4);
        return `${truncated}...${extension ? '.' + extension : ''}`;
    }


    updateConnectionStatus(connected) {
        const statusIndicator = document.getElementById('connection-status');
        const statusText = document.getElementById('connection-text');
        const dashboardStatusIndicator = document.getElementById('dashboard-connection-status');
        const dashboardStatusText = document.getElementById('dashboard-connection-text');
        const analyticsStatusIndicator = document.getElementById('analytics-connection-status');
        const analyticsStatusText = document.getElementById('analytics-connection-text');
        
        if (connected) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Online';
            
            if (dashboardStatusIndicator && dashboardStatusText) {
                dashboardStatusIndicator.className = 'status-indicator online';
                dashboardStatusText.textContent = 'Ready for analysis';
            }
            
            if (analyticsStatusIndicator && analyticsStatusText) {
                analyticsStatusIndicator.className = 'status-indicator online';
                analyticsStatusText.textContent = 'Ready for analysis';
            }
        } else {
            statusIndicator.className = 'status-indicator';
            statusText.textContent = 'Connecting...';
            
            if (dashboardStatusIndicator && dashboardStatusText) {
                dashboardStatusIndicator.className = 'status-indicator';
                dashboardStatusText.textContent = 'Connecting...';
            }
            
            if (analyticsStatusIndicator && analyticsStatusText) {
                analyticsStatusIndicator.className = 'status-indicator';
                analyticsStatusText.textContent = 'Connecting...';
            }
        }
    }

    showQueryStatus(status, message) {
        const queryStatus = document.getElementById('query-status');
        const connectionStatusContainer = document.getElementById('connection-status-container');
        const statusText = document.getElementById('status-text');
        
        if (status === 'processing') {
            // Hide connection status, show query progress
            if (connectionStatusContainer) {
                connectionStatusContainer.style.display = 'none';
            }
            queryStatus.style.display = 'flex';
            statusText.textContent = message || 'Processing...';
        } else if (status === 'success') {
            statusText.textContent = message || 'Completed';
            setTimeout(() => {
                queryStatus.style.display = 'none';
                if (connectionStatusContainer) {
                    connectionStatusContainer.style.display = 'flex';
                }
            }, 1500);
        } else if (status === 'error') {
            statusText.textContent = message || 'Error';
            setTimeout(() => {
                queryStatus.style.display = 'none';
                if (connectionStatusContainer) {
                    connectionStatusContainer.style.display = 'flex';
                }
            }, 2000);
        }
    }

    updateQueryMetrics(responseTime, success = true) {
        this.queryMetrics.totalQueries++;
        if (success) {
            this.queryMetrics.successfulQueries++;
        } else {
            this.queryMetrics.failedQueries++;
        }
        
        // Update average response time
        const totalTime = this.queryMetrics.averageResponseTime * (this.queryMetrics.totalQueries - 1) + responseTime;
        this.queryMetrics.averageResponseTime = totalTime / this.queryMetrics.totalQueries;
        
        // Update dashboard metrics
        this.updateMetrics(document.getElementById('total-datasets').textContent);
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        // Check if user has configured API key
        try {
            const configRes = await fetch(`${this.apiBase}/user/api-config`, { credentials: 'include' });
            if (!configRes.ok || !await configRes.json()) {
                this.showNotification('Please configure your API key and model in Settings first', 'warning');
                // Open settings modal
                setTimeout(() => {
                    const settingsBtn = document.getElementById('menu-settings');
                    if (settingsBtn) {
                        settingsBtn.click();
                    }
                }, 500);
                return;
            }
        } catch (e) {
            console.error('Error checking API config:', e);
        }
        
        // Hide welcome message on first message
        this.hideWelcomeMessage();
        
        // Prevent multiple simultaneous queries
        if (this.isProcessingQuery) {
            this.showNotification('Please wait for the current query to complete.', 'warning');
            return;
        }
        
        // Set processing flag
        this.isProcessingQuery = true;
        
        // Start query tracking
        this.queryStartTime = Date.now();
        this.showQueryStatus('processing', 'Preparing response...');
        this.updateStatusIndicator(); // Update status immediately
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        // Restart placeholder animation
        this.startPlaceholderAnimation();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // No timeout - let the agent take as long as needed
        // The typing indicator will be cleared when response arrives
        
        try {
            // Use SSE for streaming response
            await this.sendMessageSSE(message);
        } catch (error) {
            console.error('Error sending message:', error);
            this.isProcessingQuery = false; // Reset processing flag
            this.addMessage('Error sending message. Please try again.', 'agent');
            this.hideTypingIndicator();
            this.showQueryStatus('error', 'Connection error');
            this.updateQueryMetrics(Date.now() - this.queryStartTime, false);
        }
    }

    cleanupStreamingState() {
        // Clear streaming markdown renderer
        if (this.streamingMarkdownRenderer) {
            this.streamingMarkdownRenderer.clear();
            this.streamingMarkdownRenderer = null;
        }
        
        // Remove only the streaming message container (not individual text elements)
        const existingStreamingMessage = document.getElementById('streaming-message');
        if (existingStreamingMessage) {
            existingStreamingMessage.remove();
        }
        
        // Hide any typing indicator
        this.hideTypingIndicator();
    }

    // Using MarkdownRenderer for streaming markdown

    async sendMessageSSE(message) {
        try {
            // Clean up any previous streaming state
            this.cleanupStreamingState();
            
            // Create new agent message element for streaming
            const messagesContainer = document.getElementById('chat-messages');
            
            const messageElement = document.createElement('div');
            messageElement.className = 'message agent-message framer-fade-in';
            messageElement.id = 'streaming-message';
            
            const time = new Date().toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            messageElement.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-text" id="streaming-text"></div>
                    <div class="message-time">${time}</div>
                </div>
            `;
            
            // Initialize renderer for streaming
            const streamingTextElement = messageElement.querySelector('#streaming-text');
            if (window.MarkdownRenderer && streamingTextElement) {
                // Ensure message-text class is preserved
                if (!streamingTextElement.classList.contains('message-text')) {
                    streamingTextElement.classList.add('message-text');
                }
                this.streamingMarkdownRenderer = new window.MarkdownRenderer(streamingTextElement, {
                    parseIncompleteMarkdown: false,
                    className: 'minimalist-markdown',
                    enableSyntaxHighlighting: false,
                    streamingSpeed: 8
                });
                // Ensure message-text class is preserved after renderer init
                streamingTextElement.classList.add('message-text');
            }
            
            messagesContainer.appendChild(messageElement);
            
            // Scroll to bottom
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Create EventSource for SSE
            const url = `${this.apiBase}/chat/stream`;
            const requestBody = JSON.stringify({
                message: message,
                session_id: this.sessionId,
                conversation_id: this.conversationId
            });
            
            // Stream with fetch/ReadableStream to support authenticated POST requests
            await this.streamWithFetch(url, requestBody);
            
        } catch (error) {
            console.error('Error in SSE:', error);
            throw error;
        }
    }
    
    async streamWithFetch(url, requestBody) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: requestBody
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentEventType = '';
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete events
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer
                
                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEventType = line.substring(7).trim();
                        continue;
                    }
                    
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data.trim()) {
                            try {
                                const parsedData = JSON.parse(data);
                                await this.handleSSEEvent(currentEventType, parsedData);
                            } catch (e) {
                                console.error('Error parsing SSE data:', e);
                            }
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('Error in fetch streaming:', error);
            throw error;
        }
    }
    
    async handleSSEEvent(eventType, data) {
        const streamingText = document.getElementById('streaming-text');
        
        if (eventType === 'token' && streamingText) {
            if (this.streamingMarkdownRenderer) {
                this.streamingMarkdownRenderer.appendToken(data.content);
            } else {
                streamingText.textContent += data.content;
            }
            
            // Only auto-scroll if user is already near the bottom (within 150px)
            // This prevents forcing the user to watch the streaming if they scrolled up
            const messagesContainer = document.getElementById('chat-messages');
            const scrollThreshold = 150;
            const isNearBottom = (messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight) <= scrollThreshold;
            
            if (isNearBottom) {
                messagesContainer.scrollTo({
                    top: messagesContainer.scrollHeight,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' for less intrusive scrolling
                });
            }
            
        } else if (eventType === 'complete') {
            // Finish streaming markdown
            if (this.streamingMarkdownRenderer) {
                this.streamingMarkdownRenderer.finishStreaming();
                this.streamingMarkdownRenderer = null;
            }
            
            // Mark streaming as complete
            this.isProcessingQuery = false;
            this.analysisCount++;
            this.updateMetrics(document.getElementById('total-datasets').textContent);
            
            // Update query status and metrics
            const responseTime = Date.now() - this.queryStartTime;
            this.showQueryStatus('success', `Completed in ${responseTime}ms`);
            this.updateQueryMetrics(responseTime, true);
            this.updateStatusIndicator();
            
            // Remove streaming ID to prevent future conflicts, but keep the message
            const streamingMessage = document.getElementById('streaming-message');
            if (streamingMessage) {
                streamingMessage.removeAttribute('id');
                // Also remove the streaming-text ID to prevent conflicts
                const streamingText = streamingMessage.querySelector('#streaming-text');
                if (streamingText) {
                    streamingText.removeAttribute('id');
                }
            }
            
            // Optional scroll to bottom when complete, only if user is near bottom
            const messagesContainer = document.getElementById('chat-messages');
            const scrollThreshold = 150;
            const isNearBottom = (messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight) <= scrollThreshold;
            
            if (isNearBottom) {
                setTimeout(() => {
                    messagesContainer.scrollTo({
                        top: messagesContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                }, 100);
            }
            
            // Server persists chat history
            
        } else if (eventType === 'error') {
            // Handle error
            this.isProcessingQuery = false;
            this.hideTypingIndicator();
            
            // Clear streaming markdown renderer
            if (this.streamingMarkdownRenderer) {
                this.streamingMarkdownRenderer.clear();
                this.streamingMarkdownRenderer = null;
            }
            
            if (streamingText) {
                streamingText.textContent = 'Error: ' + data.error;
            }
            
            // Remove streaming ID to prevent future conflicts, but keep the message
            const streamingMessage = document.getElementById('streaming-message');
            if (streamingMessage) {
                streamingMessage.removeAttribute('id');
                // Also remove the streaming-text ID to prevent conflicts
                const streamingText = streamingMessage.querySelector('#streaming-text');
                if (streamingText) {
                    streamingText.removeAttribute('id');
                }
            }
            
            this.showQueryStatus('error', 'Streaming error');
            this.updateQueryMetrics(Date.now() - this.queryStartTime, false);
        }
    }


    handleChatResponse(data) {
        this.isProcessingQuery = false; // Reset processing flag
        this.hideTypingIndicator();
        this.addMessage(data.response, 'agent');
        this.analysisCount++;
        this.updateMetrics(document.getElementById('total-datasets').textContent);
        
        // Update query status and metrics
        const responseTime = Date.now() - this.queryStartTime;
        this.showQueryStatus('success', `Completed in ${responseTime}ms`);
        this.updateQueryMetrics(responseTime, true);
        this.updateStatusIndicator(); // Update status after completion
        
        // Handle plots if any
        if (data.plots && data.plots.length > 0) {
            this.updateCharts(data.plots);
        }
    }

    hideWelcomeMessage() {
        const centeredBlock = document.getElementById('chat-centered-block');
        const chatContainer = document.querySelector('.chat-container');
        if (centeredBlock) {
            // Stop typing animation immediately before transition
            this.stopTypingAnimation();
            // Clear any partial typing text
            const placeholderText = document.getElementById('placeholder-text');
            if (placeholderText) {
                placeholderText.textContent = '';
            }
            // Use requestAnimationFrame to ensure smooth transition
            requestAnimationFrame(() => {
                // Add class to trigger transition to bottom
                centeredBlock.classList.add('has-messages');
                // Add class to container for padding-bottom on messages
                if (chatContainer) {
                    chatContainer.classList.add('has-messages-active');
                }
                // Stop rotating text
                this.stopRotatingText();
            });
        }
    }
    
    showWelcomeMessage() {
        const centeredBlock = document.getElementById('chat-centered-block');
        const messagesContainer = document.getElementById('chat-messages');
        if (centeredBlock && messagesContainer) {
            // Only show centered if there are no messages
            const hasMessages = messagesContainer.children.length > 0;
            if (!hasMessages) {
                // Update user name in welcome message
                const welcomeUserName = document.getElementById('welcome-user-name');
                if (welcomeUserName && this.currentUser && this.currentUser.name) {
                    welcomeUserName.textContent = this.currentUser.name;
                } else if (welcomeUserName) {
                    welcomeUserName.textContent = 'there';
                }
                // Use requestAnimationFrame to ensure smooth transition back to center
                requestAnimationFrame(() => {
                    // Remove has-messages class to center the block
                    centeredBlock.classList.remove('has-messages');
                    // Remove class from container to remove padding-bottom
                    const chatContainer = document.querySelector('.chat-container');
                    if (chatContainer) {
                        chatContainer.classList.remove('has-messages-active');
                    }
                });
                // Start rotating text
                this.startRotatingText();
                // Reset decorative placeholder index and start typing animation
                this.currentDecorativeIndex = 0;
                const placeholderText = document.getElementById('placeholder-text');
                if (placeholderText) {
                    placeholderText.textContent = '';
                    placeholderText.classList.remove('fade-out');
                    placeholderText.classList.add('fade-in', 'visible');
                }
                // Stop any existing placeholder animation first
                this.stopPlaceholderAnimation();
                // Start typing animation for "Ask me anything" when no messages
                setTimeout(() => {
                    this.startTypingAnimation();
                }, 300);
            } else {
                // Has messages, ensure it's at bottom
                requestAnimationFrame(() => {
                    centeredBlock.classList.add('has-messages');
                    // Add class to container for padding-bottom on messages
                    const chatContainer = document.querySelector('.chat-container');
                    if (chatContainer) {
                        chatContainer.classList.add('has-messages-active');
                    }
                });
                this.stopRotatingText();
                // Stop typing animation immediately when there are messages
                this.stopTypingAnimation();
                // Clear any partial typing text
                const placeholderText = document.getElementById('placeholder-text');
                if (placeholderText) {
                    placeholderText.textContent = '';
                }
                // Update placeholder to show cycling placeholders
                this.showPlaceholder();
                this.startPlaceholderAnimation();
            }
        }
    }

    startRotatingText() {
        // Stop any existing rotation
        this.stopRotatingText();
        
        const rotatingTextEl = document.getElementById('rotating-text');
        if (!rotatingTextEl) return;

        const phrases = [
            'How can I help you today?',
            'Which data do you want to analyze?',
            'What insights are you looking for?',
            'Ready to explore motorsports data?',
            'What would you like to discover?',
            'Let\'s analyze some race data!'
        ];

        let currentIndex = 0;
        
        // Set initial text and animate in
        rotatingTextEl.textContent = phrases[currentIndex];
        // Remove any existing classes
        rotatingTextEl.classList.remove('slide-out', 'slide-in');
        // Force reflow to restart animation
        void rotatingTextEl.offsetWidth;
        rotatingTextEl.classList.add('slide-in');
        
        const rotate = () => {
            // Fade out current text completely
            rotatingTextEl.classList.remove('slide-in');
            rotatingTextEl.classList.add('slide-out');
            
            // Wait for complete fade out before showing next text
            setTimeout(() => {
                // Change text only after previous text has completely disappeared
                currentIndex = (currentIndex + 1) % phrases.length;
                rotatingTextEl.textContent = phrases[currentIndex];
                
                // Remove slide-out and add slide-in
                rotatingTextEl.classList.remove('slide-out');
                // Force reflow to restart animation
                void rotatingTextEl.offsetWidth;
                rotatingTextEl.classList.add('slide-in');
            }, 500); // Wait for slide-out animation to complete (0.5s)
        };

        // Start rotation after initial delay (first change after 3 seconds)
        this.rotatingTextInterval = setInterval(rotate, 3000);
    }

    stopRotatingText() {
        if (this.rotatingTextInterval) {
            clearInterval(this.rotatingTextInterval);
            this.rotatingTextInterval = null;
        }
    }

    initSuggestionCarousel() {
        const suggestionsContainer = document.getElementById('input-suggestions');
        const leftArrow = document.getElementById('suggestion-arrow-left');
        const rightArrow = document.getElementById('suggestion-arrow-right');
        
        if (!suggestionsContainer || !leftArrow || !rightArrow) {
            return;
        }
        
        const scrollAmount = 200; // pixels to scroll
        
        // Left arrow click
        leftArrow.addEventListener('click', () => {
            suggestionsContainer.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        });
        
        // Right arrow click
        rightArrow.addEventListener('click', () => {
            suggestionsContainer.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
        
        // Update arrow visibility based on scroll position
        const updateArrowVisibility = () => {
            const { scrollLeft, scrollWidth, clientWidth } = suggestionsContainer;
            const wrapper = suggestionsContainer.closest('.input-suggestions-wrapper');
            
            // Check if content overflows
            const needsScroll = scrollWidth > clientWidth;
            
            if (!needsScroll) {
                // Hide both arrows if content doesn't overflow
                leftArrow.classList.add('disabled');
                rightArrow.classList.add('disabled');
                if (wrapper) {
                    wrapper.classList.remove('has-scroll-left', 'has-scroll-right');
                }
                return;
            }
            
            // Update left arrow and fade
            if (scrollLeft <= 10) {
                leftArrow.classList.add('disabled');
                if (wrapper) wrapper.classList.remove('has-scroll-left');
            } else {
                leftArrow.classList.remove('disabled');
                if (wrapper) wrapper.classList.add('has-scroll-left');
            }
            
            // Update right arrow and fade
            if (scrollLeft >= scrollWidth - clientWidth - 10) {
                rightArrow.classList.add('disabled');
                if (wrapper) wrapper.classList.remove('has-scroll-right');
            } else {
                rightArrow.classList.remove('disabled');
                if (wrapper) wrapper.classList.add('has-scroll-right');
            }
        };
        
        // Initial check
        updateArrowVisibility();
        
        // Update on scroll
        suggestionsContainer.addEventListener('scroll', updateArrowVisibility);
        
        // Update on resize
        window.addEventListener('resize', updateArrowVisibility);
        
        // Check if arrows are needed initially (with delay to ensure layout is complete)
        setTimeout(() => {
            updateArrowVisibility();
        }, 100);
        
        // Also check after a longer delay to catch any dynamic content
        setTimeout(() => {
            updateArrowVisibility();
        }, 500);
    }

    async addMessage(content, sender) {
        const messagesContainer = document.getElementById('chat-messages');
        const centeredBlock = document.getElementById('chat-centered-block');
        
        // Check if this is the first message (before adding)
        const isFirstMessage = messagesContainer.children.length === 0;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}-message framer-fade-in`;
        
        const avatar = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        const time = new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="${avatar}"></i>
            </div>
            <div class="message-content">
                <div class="message-text"></div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        
        // If this is the first message, trigger the transition smoothly
        if (isFirstMessage && centeredBlock) {
            // Stop typing animation immediately
            this.stopTypingAnimation();
            // Clear any partial typing text
            const placeholderText = document.getElementById('placeholder-text');
            if (placeholderText) {
                placeholderText.textContent = '';
            }
            // Use requestAnimationFrame to ensure smooth transition
            requestAnimationFrame(() => {
                centeredBlock.classList.add('has-messages');
                // Add class to container for padding-bottom on messages
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer) {
                    chatContainer.classList.add('has-messages-active');
                }
            });
        }
        
        // Render markdown using MarkdownRenderer if available
        const messageTextEl = messageElement.querySelector('.message-text');
        if (window.MarkdownRenderer && messageTextEl) {
            // Ensure message-text class is preserved
            if (!messageTextEl.classList.contains('message-text')) {
                messageTextEl.classList.add('message-text');
            }
            const tempRenderer = new window.MarkdownRenderer(messageTextEl, {
                enableSyntaxHighlighting: false,
                className: 'minimalist-markdown'
            });
            await tempRenderer.setContent(content);
            // Ensure styles are preserved after markdown render
            messageTextEl.classList.add('message-text');
        } else if (messageTextEl) {
            messageTextEl.innerHTML = this.basicFormatFallback(content);
        }
        
        // Server persists chat history
        
        // Smooth scroll to bottom with animation
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    basicFormatFallback(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const typingElement = document.createElement('div');
        typingElement.id = 'typing-indicator';
        typingElement.className = 'message agent-message';
        typingElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingElement = document.getElementById('typing-indicator');
        if (typingElement) {
            typingElement.remove();
        }
    }

    updateCharts(plots) {
        const chartsGrid = document.getElementById('charts-grid');
        
        // Clear placeholder if exists
        const placeholder = chartsGrid.querySelector('.chart-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Add new charts with staggered animation
        plots.forEach((plotPath, index) => {
            const chartElement = document.createElement('div');
            chartElement.className = 'chart-item framer-fade-in';
            chartElement.style.animationDelay = `${index * 0.1}s`;
            chartElement.innerHTML = `
                <img src="${plotPath}" alt="Chart ${index + 1}" loading="lazy">
                <h4>Visualização ${index + 1}</h4>
            `;
            chartsGrid.appendChild(chartElement);
        });
    }

    showError(message) {
        this.addMessage(message, 'agent');
    }

    selectDataSource(datasetName) {
        const message = `Analise o dataset ${datasetName}`;
        document.getElementById('chat-input').value = message;
        this.sendMessage();
    }

    previewDataSource(datasetName) {
        const message = `Mostre uma prévia do dataset ${datasetName}`;
        document.getElementById('chat-input').value = message;
        this.sendMessage();
    }

    toggleDataSourcesSidebar() {
        const sidebar = document.getElementById('data-sources-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sidebar.classList.contains('open')) {
            this.closeDataSourcesSidebar();
        } else {
            this.openDataSourcesSidebar();
        }
    }

    openDataSourcesSidebar() {
        const sidebar = document.getElementById('data-sources-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeDataSourcesSidebar() {
        const sidebar = document.getElementById('data-sources-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    initAnimatedPlaceholder() {
        const placeholderText = document.getElementById('placeholder-text');
        const vanishPlaceholder = document.getElementById('vanish-placeholder');
        const chatInput = document.getElementById('chat-input');
        
        if (placeholderText && vanishPlaceholder) {
            // Ensure placeholder is visible initially if input is empty
            if (!chatInput || !chatInput.value.trim()) {
                vanishPlaceholder.classList.remove('hidden');
                vanishPlaceholder.style.opacity = '1';
            }
            placeholderText.style.opacity = '1';
            this.startPlaceholderAnimation();
        } else {
            console.warn('placeholder elements not found during initialization', {
                placeholderText: !!placeholderText,
                vanishPlaceholder: !!vanishPlaceholder
            });
        }
    }

    startPlaceholderAnimation() {
        if (this.placeholderInterval) {
            clearInterval(this.placeholderInterval);
        }
        this.stopTypingAnimation();

        const placeholderText = document.getElementById('placeholder-text');
        if (!placeholderText) return;

        // Check if there are messages
        const centeredBlock = document.getElementById('chat-centered-block');
        const messagesContainer = document.getElementById('chat-messages');
        const hasMessages = centeredBlock && centeredBlock.classList.contains('has-messages') || 
                          (messagesContainer && messagesContainer.children.length > 0);

        if (!hasMessages) {
            // Start typing animation when no messages - ensure it starts properly
            // Clear any static placeholder first
            placeholderText.textContent = '';
            this.currentDecorativeIndex = 0;
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.startTypingAnimation();
            }, 100);
        } else {
            // Show current placeholder immediately and cycle when there are messages
            this.showPlaceholder();
            this.placeholderInterval = setInterval(() => {
                if (!this.isInputFocused && !document.getElementById('chat-input').value.trim()) {
                    this.cyclePlaceholder();
                }
            }, 3000); // Change every 3 seconds
        }
    }

    stopPlaceholderAnimation() {
        if (this.placeholderInterval) {
            clearInterval(this.placeholderInterval);
            this.placeholderInterval = null;
        }
        this.stopTypingAnimation();
        
        const placeholderText = document.getElementById('placeholder-text');
        if (placeholderText) {
            placeholderText.style.opacity = '0';
        }
    }

    startTypingAnimation() {
        this.stopTypingAnimation();
        
        const placeholderText = document.getElementById('placeholder-text');
        if (!placeholderText) {
            console.warn('placeholder-text element not found');
            return;
        }

        const centeredBlock = document.getElementById('chat-centered-block');
        const messagesContainer = document.getElementById('chat-messages');
        const hasMessages = centeredBlock && centeredBlock.classList.contains('has-messages') || 
                          (messagesContainer && messagesContainer.children.length > 0);

        if (hasMessages || this.isInputFocused) {
            this.stopTypingAnimation();
            // Clear any partial typing text when there are messages
            if (hasMessages) {
                placeholderText.textContent = '';
            }
            return;
        }

        this.isTyping = true;

        // Ensure placeholder is visible
        const vanishPlaceholder = document.getElementById('vanish-placeholder');
        if (vanishPlaceholder) {
            vanishPlaceholder.style.opacity = '1';
        }
        placeholderText.style.opacity = '1';
        placeholderText.textContent = '';

        // Start typing animation cycle
        this.typeText();
    }

    stopTypingAnimation() {
        if (this.typingAnimation) {
            clearTimeout(this.typingAnimation);
            this.typingAnimation = null;
        }
        this.isTyping = false;
        
        // Clear any partial typing text when stopping
        const placeholderText = document.getElementById('placeholder-text');
        const centeredBlock = document.getElementById('chat-centered-block');
        const messagesContainer = document.getElementById('chat-messages');
        const hasMessages = centeredBlock && centeredBlock.classList.contains('has-messages') || 
                          (messagesContainer && messagesContainer.children.length > 0);
        
        if (hasMessages && placeholderText) {
            // Don't clear if we're showing a placeholder (not typing animation)
            // Only clear if it's a single character (likely from typing animation)
            if (placeholderText.textContent.length <= 1 && placeholderText.textContent !== '') {
                placeholderText.textContent = '';
            }
        }
    }

    typeText() {
        const placeholderText = document.getElementById('placeholder-text');
        if (!placeholderText) {
            console.warn('placeholder-text element not found in typeText');
            return;
        }

        // Check if we should continue
        const centeredBlock = document.getElementById('chat-centered-block');
        const messagesContainer = document.getElementById('chat-messages');
        const hasMessages = centeredBlock && centeredBlock.classList.contains('has-messages') || 
                          (messagesContainer && messagesContainer.children.length > 0);
        const chatInput = document.getElementById('chat-input');

        if (hasMessages || this.isInputFocused || (chatInput && chatInput.value.trim())) {
            this.stopTypingAnimation();
            return;
        }

        // Ensure placeholder is visible
        placeholderText.style.opacity = '1';
        const vanishPlaceholder = document.getElementById('vanish-placeholder');
        if (vanishPlaceholder) {
            vanishPlaceholder.style.opacity = '1';
        }

        const currentText = this.decorativePlaceholders[this.currentDecorativeIndex];
        let currentIndex = 0;
        const typingSpeed = 80; // milliseconds per character
        const pauseAfterTyping = 2000; // pause after typing complete
        const deletingSpeed = 40; // milliseconds per character when deleting
        const pauseAfterDeleting = 500; // pause after deleting complete

        // Typing phase
        const typeChar = () => {
            // Re-check conditions before each character
            const centeredBlock = document.getElementById('chat-centered-block');
            const messagesContainer = document.getElementById('chat-messages');
            const hasMessages = centeredBlock && centeredBlock.classList.contains('has-messages') || 
                              (messagesContainer && messagesContainer.children.length > 0);
            const chatInput = document.getElementById('chat-input');

            if (hasMessages || this.isInputFocused || (chatInput && chatInput.value.trim())) {
                this.stopTypingAnimation();
                return;
            }

            if (currentIndex < currentText.length) {
                placeholderText.textContent = currentText.substring(0, currentIndex + 1);
                currentIndex++;
                this.typingAnimation = setTimeout(typeChar, typingSpeed);
            } else {
                // Finished typing, wait then start deleting
                this.typingAnimation = setTimeout(() => {
                    // Deleting phase
                    const deleteChar = () => {
                        // Re-check conditions before each deletion
                        const centeredBlock = document.getElementById('chat-centered-block');
                        const messagesContainer = document.getElementById('chat-messages');
                        const hasMessages = centeredBlock && centeredBlock.classList.contains('has-messages') || 
                                          (messagesContainer && messagesContainer.children.length > 0);
                        const chatInput = document.getElementById('chat-input');

                        if (hasMessages || this.isInputFocused || (chatInput && chatInput.value.trim())) {
                            this.stopTypingAnimation();
                            return;
                        }

                        if (currentIndex > 0) {
                            placeholderText.textContent = currentText.substring(0, currentIndex - 1);
                            currentIndex--;
                            this.typingAnimation = setTimeout(deleteChar, deletingSpeed);
                        } else {
                            // Finished deleting, move to next text
                            this.currentDecorativeIndex = (this.currentDecorativeIndex + 1) % this.decorativePlaceholders.length;
                            this.typingAnimation = setTimeout(() => {
                                this.typeText();
                            }, pauseAfterDeleting);
                        }
                    };
                    deleteChar();
                }, pauseAfterTyping);
            }
        };

        typeChar();
    }

    showPlaceholder() {
        const placeholderText = document.getElementById('placeholder-text');
        if (!placeholderText) return;

        // Check if there are messages
        const centeredBlock = document.getElementById('chat-centered-block');
        const messagesContainer = document.getElementById('chat-messages');
        const hasMessages = centeredBlock && centeredBlock.classList.contains('has-messages') || 
                          (messagesContainer && messagesContainer.children.length > 0);

        if (!hasMessages) {
            // Don't set text here when no messages - let typing animation handle it
            // Just ensure it's visible
            placeholderText.classList.remove('fade-out');
            placeholderText.classList.add('fade-in', 'visible');
        } else {
            // Stop typing animation first to prevent any partial text
            this.stopTypingAnimation();
            // Show cycling placeholders when there are messages
            placeholderText.textContent = this.placeholders[this.currentPlaceholderIndex];
            placeholderText.classList.remove('fade-out');
            placeholderText.classList.add('fade-in', 'visible');
        }
    }

    cyclePlaceholder() {
        const placeholderText = document.getElementById('placeholder-text');
        if (!placeholderText) return;

        // Check if there are messages - only cycle if there are messages
        const centeredBlock = document.getElementById('chat-centered-block');
        const messagesContainer = document.getElementById('chat-messages');
        const hasMessages = centeredBlock && centeredBlock.classList.contains('has-messages') || 
                          (messagesContainer && messagesContainer.children.length > 0);

        if (!hasMessages) {
            // Don't cycle, keep "Ask me anything"
            return;
        }

        // Fade out current placeholder
        placeholderText.classList.remove('fade-in');
        placeholderText.classList.add('fade-out');

        setTimeout(() => {
            // Move to next placeholder
            this.currentPlaceholderIndex = (this.currentPlaceholderIndex + 1) % this.placeholders.length;
            placeholderText.textContent = this.placeholders[this.currentPlaceholderIndex];
            
            // Fade in new placeholder
            placeholderText.classList.remove('fade-out');
            placeholderText.classList.add('fade-in');
        }, 150); // Wait for fade out to complete - reduced from 300ms
    }

    showLoader(text = 'Loading...') {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const loaderOverlay = document.getElementById('loader-overlay');
        const loaderText = loaderOverlay.querySelector('.loader-text');
        
        if (loaderText) {
            loaderText.textContent = text;
        }
        
        loaderOverlay.classList.add('active');
        
        // Auto hide after 3 seconds if not manually hidden
        this.loaderTimeout = setTimeout(() => {
            this.hideLoader();
        }, 3000);
    }

    hideLoader() {
        if (!this.isLoading) return;
        
        this.isLoading = false;
        const loaderOverlay = document.getElementById('loader-overlay');
        
        loaderOverlay.classList.remove('active');
        
        if (this.loaderTimeout) {
            clearTimeout(this.loaderTimeout);
            this.loaderTimeout = null;
        }
    }

    showDashboardLoader() {
        this.showLoader('Loading Dashboard');
        
        // Simulate dashboard loading
        setTimeout(() => {
            this.hideLoader();
        }, 2000);
    }

    setupFloatingDock() {
        const floatingDock = document.getElementById('floating-dock');
        
        if (!floatingDock) {
            return;
        }
        
        // Add mobile class if needed
        if (this.isMobile) {
            floatingDock.classList.add('mobile');
        }

        // Just add hover animations, navigation is handled by onclick handlers
        const dockItems = document.querySelectorAll('.dock-item');
        dockItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                this.animateDockItem(item, 'enter');
            });

            item.addEventListener('mouseleave', () => {
                this.animateDockItem(item, 'leave');
            });
        });
    }

    animateDockItem(item, action) {
        if (action === 'enter') {
            // Add subtle glow effect
            item.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.1)';
        } else if (action === 'leave') {
            // Remove glow effect
            item.style.boxShadow = 'none';
        }
    }


    handleDockResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        const floatingDock = document.getElementById('floating-dock');
        
        if (wasMobile !== this.isMobile) {
            if (this.isMobile) {
                floatingDock.classList.add('mobile');
            } else {
                floatingDock.classList.remove('mobile');
            }
        }
    }

    setupTabSystem() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        if (tabButtons.length === 0) {
            return;
        }
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all buttons and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding pane
                button.classList.add('active');
                const targetPane = document.getElementById(`${targetTab}-tab`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    }

    scrollToSection(section) {
        const chatSection = document.querySelector('.chat-section');
        const analyticsSection = document.getElementById('analytics-section');
        
        // Always scroll to top first
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Show both chat and analytics sections
        if (chatSection) {
            chatSection.style.display = 'block';
            // Restore chat section state with a small delay to ensure DOM is ready
            setTimeout(() => {
                this.restoreChatSection();
            }, 100);
        }
        if (analyticsSection) {
            analyticsSection.style.display = 'block';
        }
        
        // Navigate to specific section with magnetic alignment
        if (section === 'analytics') {
            // Scroll to analytics and trigger magnetic alignment
            analyticsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            this.activeSection = 'analytics';
            
            // Trigger magnetic alignment after scroll
            setTimeout(() => {
                this.alignDockWithCard('analytics');
            }, 500);
            
        } else if (section === 'dashboard') {
            // Dashboard section (chat is at top)
            this.activeSection = 'dashboard';
            
            // Trigger magnetic alignment after scroll
            setTimeout(() => {
                this.alignDockWithCard('chat');
            }, 500);
        }
        
        // Update effects
        setTimeout(() => {
                this.updateBlurEffect();
            }, 300);
    }

    updateDynamicSpacing() {
        // Magnetic dock system - calculate optimal heights and positioning
        this.calculateMagneticAlignment();
    }

    calculateMagneticAlignment() {
        const chatSection = document.querySelector('.chat-section');
        const analyticsSection = document.getElementById('analytics-section');
        const dock = document.getElementById('floating-dock');
        
        if (!chatSection || !analyticsSection || !dock) {
            return;
        }

        const chatRect = chatSection.getBoundingClientRect();
        const analyticsRect = analyticsSection.getBoundingClientRect();
        
        // Calculate which card is more visible
        const chatVisibility = this.calculateCardVisibility(chatRect);
        const analyticsVisibility = this.calculateCardVisibility(analyticsRect);
        
        let activeCard = null;
        if (chatVisibility > analyticsVisibility && chatVisibility > 0.4) {
            activeCard = 'chat';
        } else if (analyticsVisibility > 0.4) {
            activeCard = 'analytics';
        }
        
        // Align center of dock with bottom of active card
        if (activeCard) {
            this.alignDockWithCard(activeCard);
        }
    }

    calculateCardVisibility(rect) {
        const viewportHeight = window.innerHeight;
        const cardTop = Math.max(0, rect.top);
        const cardBottom = Math.min(viewportHeight, rect.bottom);
        const visibleHeight = Math.max(0, cardBottom - cardTop);
        return visibleHeight / rect.height;
    }

    alignDockWithCard(activeCard) {
        const chatSection = document.querySelector('.chat-section');
        const analyticsSection = document.getElementById('analytics-section');
        const dock = document.getElementById('floating-dock');
        
        if (!dock) return;
        
        const dockRect = dock.getBoundingClientRect();
        const dockCenterY = dockRect.top + (dockRect.height / 2);
        
        let cardBottomY;
        if (activeCard === 'chat') {
            const chatRect = chatSection.getBoundingClientRect();
            cardBottomY = chatRect.bottom;
        } else if (activeCard === 'analytics') {
            const analyticsRect = analyticsSection.getBoundingClientRect();
            cardBottomY = analyticsRect.bottom;
        }
        
        if (cardBottomY) {
            // Calculate how much we need to scroll to align dock center with card bottom
            const scrollAdjustment = cardBottomY - dockCenterY;
            
            // Only make small adjustments to avoid jarring movements
            if (Math.abs(scrollAdjustment) > 10 && Math.abs(scrollAdjustment) < 100) {
                window.scrollBy({
                    top: scrollAdjustment,
                    behavior: 'smooth'
                });
            }
        }
        
        // Activate dock magnetic state
        dock.classList.add('magnetic-active');
    }

    smoothAlignToCard(cardElement) {
        const dock = document.getElementById('floating-dock');
        if (!dock) return;
        
        const dockRect = dock.getBoundingClientRect();
        const cardRect = cardElement.getBoundingClientRect();
        
        // Calculate the scroll position needed to align card bottom with dock center
        const dockCenterY = dockRect.top + (dockRect.height / 2);
        const cardBottomY = cardRect.bottom;
        
        // Calculate target scroll position
        const currentScrollY = window.scrollY;
        const targetScrollY = currentScrollY + (cardBottomY - dockCenterY);
        
        // Smooth scroll to alignment
        window.scrollTo({
            top: targetScrollY,
            behavior: 'smooth'
        });
    }

    setupScrollListener() {
        let scrollTimeout;
        let magneticTimeout;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            clearTimeout(magneticTimeout);
            
            // Only detect active section on scroll
            scrollTimeout = setTimeout(() => {
                this.detectActiveSection();
            }, 100);
            
            // Magnetic alignment with reasonable delay
            magneticTimeout = setTimeout(() => {
                this.updateDynamicSpacing();
            }, 800); // Balanced delay for responsiveness
        });
    }

    detectActiveSection() {
        const analyticsSection = document.getElementById('analytics-section');
        const chatSection = document.querySelector('.chat-section');
        
        if (!analyticsSection || !chatSection) {
            return;
        }
        
            const analyticsRect = analyticsSection.getBoundingClientRect();
            const chatRect = chatSection.getBoundingClientRect();
            
        // Simple detection: if analytics is mostly in view, it's active
        if (analyticsRect.top < window.innerHeight * 0.3) {
                if (this.activeSection !== 'analytics') {
                    this.activeSection = 'analytics';
                    this.updateBlurEffect();
                }
            } else if (chatRect.top < window.innerHeight * 0.5) {
            if (this.activeSection !== 'dashboard') {
                this.activeSection = 'dashboard';
                    this.updateBlurEffect();
            }
        }
    }

    updateBlurEffect() {
        const analyticsSection = document.getElementById('analytics-section');
        
        if (!analyticsSection) {
            return;
        }
        
        if (this.activeSection === 'dashboard') {
            // Add blur effect when viewing dashboard (chat section)
                analyticsSection.classList.add('blurred');
            } else {
                // Remove blur effect when viewing analytics
                analyticsSection.classList.remove('blurred');
            }
        }

    restoreChatSection() {
        // Restore chat input functionality
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        const messagesContainer = document.getElementById('chat-messages');
        const chatSection = document.querySelector('.chat-section');
        const inputContainer = document.querySelector('.chat-input-container-minimal');
        const vanishContainer = document.querySelector('.vanish-input-container');
        
        // Reset any inline styles that might be causing positioning issues
        if (chatSection) {
            chatSection.style.position = '';
            chatSection.style.top = '';
            chatSection.style.left = '';
            chatSection.style.transform = '';
            chatSection.style.display = '';
            chatSection.style.visibility = '';
        }
        
        if (inputContainer) {
            inputContainer.style.position = '';
            inputContainer.style.top = '';
            inputContainer.style.left = '';
            inputContainer.style.transform = '';
            inputContainer.style.display = '';
            inputContainer.style.visibility = '';
            inputContainer.style.opacity = '';
        }
        
        if (vanishContainer) {
            vanishContainer.style.position = '';
            vanishContainer.style.top = '';
            vanishContainer.style.left = '';
            vanishContainer.style.transform = '';
            vanishContainer.style.display = '';
            vanishContainer.style.visibility = '';
        }
        
        if (sendButton) {
            sendButton.style.position = '';
            sendButton.style.top = '';
            sendButton.style.left = '';
            sendButton.style.transform = '';
            sendButton.style.display = '';
            sendButton.style.visibility = '';
        }
        
        // Restore preserved state
        if (this.preservedChatInput && chatInput) {
            chatInput.value = this.preservedChatInput;
        }
        
        if (this.preservedChatMessages && messagesContainer) {
            messagesContainer.innerHTML = this.preservedChatMessages;
            
            // Hide welcome message if messages were restored
            if (messagesContainer.children.length > 0) {
                this.hideWelcomeMessage();
            } else {
                this.showWelcomeMessage();
            }
            
            // Restore scroll position to bottom after messages are restored
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        } else {
            // Show welcome message if no messages
            this.showWelcomeMessage();
        }
        
        // Reinitialize all chat listeners
        this.reinitializeChatListeners();
        
        // Only restore placeholder animation if there are messages
        // If no messages, showWelcomeMessage already started the typing animation
        const hasMessages = messagesContainer && messagesContainer.children.length > 0;
        if (hasMessages) {
            this.startPlaceholderAnimation();
        }
        
        // Ensure WebSocket is connected
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.connectWebSocket();
        }
        
        // Force re-render of chat section
        this.forceChatSectionRerender();
        
        // Ensure scroll is enabled and working
        if (messagesContainer) {
            messagesContainer.style.overflow = 'auto';
            messagesContainer.style.overflowY = 'auto';
            
            // Scroll to bottom after a short delay to ensure DOM is updated
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 200);
        }
    }

    forceChatSectionRerender() {
        const chatSection = document.querySelector('.chat-section');
        if (chatSection) {
            // Force a reflow to ensure proper positioning
            const originalDisplay = chatSection.style.display;
            chatSection.style.display = 'none';
            chatSection.offsetHeight; // Trigger reflow
            chatSection.style.display = originalDisplay || 'flex';
            
            // Ensure proper flex layout
            chatSection.style.flexDirection = 'column';
            chatSection.style.position = 'relative';
            chatSection.style.height = 'calc(100vh - 90px)';
            chatSection.style.minHeight = '600px';
            chatSection.style.overflow = 'hidden';
        }
        
        // Ensure input container is properly positioned and visible
        const inputContainer = document.querySelector('.chat-input-container-minimal');
        if (inputContainer) {
            inputContainer.style.position = 'relative';
            inputContainer.style.bottom = '0';
            inputContainer.style.padding = '1rem';
            inputContainer.style.display = 'block';
            inputContainer.style.visibility = 'visible';
            inputContainer.style.opacity = '1';
        }
        
        // Ensure vanish container maintains proper layout
        const vanishContainer = document.querySelector('.vanish-input-container');
        if (vanishContainer) {
            vanishContainer.style.display = 'flex';
            vanishContainer.style.alignItems = 'center';
            vanishContainer.style.gap = '0.75rem';
            vanishContainer.style.position = 'relative';
            vanishContainer.style.visibility = 'visible';
        }
        
        // Ensure send button is properly positioned
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.style.position = 'relative';
            sendButton.style.display = 'flex';
            sendButton.style.alignItems = 'center';
            sendButton.style.visibility = 'visible';
            sendButton.style.justifyContent = 'center';
        }
    }

    reinitializeChatListeners() {
        // Re-setup all chat event listeners
        if (this.chatInput && this.sendButton) {
            // Remove existing listeners
            this.chatInput.removeEventListener('keypress', this.handleKeyPress);
            this.sendButton.removeEventListener('click', this.handleSendClick);
            
            // Add new listeners
            this.handleKeyPress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            };
            
            this.handleSendClick = () => this.sendMessage();
            
            this.chatInput.addEventListener('keypress', this.handleKeyPress);
            this.sendButton.addEventListener('click', this.handleSendClick);
            
            // Auto-resize
            this.handleInputResize = () => {
                this.chatInput.style.height = 'auto';
                this.chatInput.style.height = this.chatInput.scrollHeight + 'px';
            };
            
            this.chatInput.addEventListener('input', this.handleInputResize);
        }
        
        // Re-setup suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.removeEventListener('click', this.handleChipClick);
            this.handleChipClick = () => {
                const query = chip.dataset.query;
                this.chatInput.value = query;
                this.sendMessage();
            };
            chip.addEventListener('click', this.handleChipClick);
        });
    }

    preserveChatSection() {
        // Store current chat state
        const chatInput = document.getElementById('chat-input');
        const messagesContainer = document.getElementById('chat-messages');
        
        if (chatInput) {
            this.preservedChatInput = chatInput.value;
        }
        
        if (messagesContainer) {
            this.preservedChatMessages = messagesContainer.innerHTML;
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications to prevent overlap
        const existingNotifications = document.querySelectorAll('.minimal-notification');
        existingNotifications.forEach(notif => notif.remove());
        
        // Create minimal notification element
        const notification = document.createElement('div');
        notification.className = `minimal-notification minimal-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon-wrapper">
                    <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                </div>
                <span>${message}</span>
            </div>
        `;
        
        // Add card styles - positioned at bottom right
        notification.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(20, 20, 20, 0.98);
            color: white;
            border-radius: 12px;
            padding: 1rem 1.25rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            transform: translateY(120%);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            max-width: 320px;
            min-width: 280px;
            font-size: 0.875rem;
            font-weight: 500;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            opacity: 0;
        `;
        
        // Ensure notification layout styles are only injected once
        if (!this.notificationStyleInjected) {
            const style = document.createElement('style');
            style.textContent = `
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                }
                .notification-icon-wrapper {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .minimal-notification-info .notification-icon-wrapper {
                    background: rgba(59, 130, 246, 0.15);
                    color: #3b82f6;
                }
                .minimal-notification-success .notification-icon-wrapper {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                }
                .minimal-notification-error .notification-icon-wrapper {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                }
                .minimal-notification-warning .notification-icon-wrapper {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                }
                .notification-content i {
                    font-size: 0.875rem;
                }
                .notification-content span {
                    line-height: 1.4;
                }
            `;
            document.head.appendChild(style);
            this.notificationStyleInjected = true;
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in from bottom
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        }, 50);
        
        // Remove after 3 seconds with slide down animation
        setTimeout(() => {
            notification.style.transform = 'translateY(120%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, 3000);
    }
    
    showWelcomeModal(forceShow = false) {
        // Check if already shown (using localStorage) - unless forced (About button)
        if (!forceShow) {
            const welcomeShown = localStorage.getItem('welcomeModalShown');
            if (welcomeShown === 'true') {
                return;
            }
        }
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'welcome-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="welcome-modal">
                <div class="welcome-modal-content-wrapper">
                    <div class="welcome-text-section">
                        <div class="welcome-header-content">
                            <h2>${forceShow ? 'How Our Agents Work' : 'Welcome to MoveDot Motorsports Analytics'}</h2>
                            <p class="welcome-description">AI-powered analytics platform for analysts. Transform data into insights through natural language. Autonomous agents connect, navigate, and analyze data efficiently by executing code and strategically sourcing from multiple tools.</p>
                        </div>
                        
                        <div class="welcome-features-carousel-wrapper">
                            <div class="welcome-features-carousel">
                                <div class="welcome-feature-slide active">
                                    <h3>Autonomous Data Strategy</h3>
                                    <p>Our AI agents autonomously determine where to source data from available tools. They strategically navigate data sources, making intelligent decisions about which tools and endpoints to access for comprehensive analysis.</p>
                                </div>
                                <div class="welcome-feature-slide">
                                    <h3>Natural Language Analytics</h3>
                                    <p>Transform data into insights through natural language conversations. Designed for analysts, our platform lets you explore data and generate analysis using simple questions - no technical barriers.</p>
                                </div>
                                <div class="welcome-feature-slide">
                                    <h3>Intelligent Data Navigation</h3>
                                    <p>AI agents connect and traverse through complex data structures. They understand relationships, dependencies, and can efficiently navigate across multiple data sources to find exactly what you need.</p>
                                </div>
                                <div class="welcome-feature-slide">
                                    <h3>Code Execution Agents</h3>
                                    <p>Agents execute Python code to analyze data efficiently. Complex pandas operations, statistical analysis, and visualizations are generated automatically - agents handle the technical execution while you focus on insights.</p>
                                </div>
                                <div class="welcome-feature-slide">
                                    <h3>Context-Aware Analysis</h3>
                                    <p>Maintains full conversation history across sessions. Build on previous analyses, ask follow-up questions, and refine insights - agents remember your entire analytical journey and adapt accordingly.</p>
                                </div>
                                <div class="welcome-feature-slide">
                                    <h3>Secure Execution Environment</h3>
                                    <p>All code execution happens in isolated E2B sandboxes. Your system stays safe while agents analyze data with full Python capabilities - enterprise-grade security without compromising functionality.</p>
                                </div>
                            </div>
                            <div class="welcome-carousel-bottom">
                                <div class="welcome-features-dots"></div>
                                <button class="welcome-carousel-arrow welcome-carousel-next" id="welcome-carousel-next">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        
                        <button class="welcome-button-primary" id="welcome-get-started">
                            ${forceShow ? 'Close' : 'Get Started'}
                        </button>
                    </div>
                    
                    <div class="welcome-visual-section">
                        <div class="display-cards-container">
                            <!-- Card 1: DISCOVER -->
                            <div class="display-card display-card-1">
                                <div class="display-card-header">
                                    <span class="display-card-icon-wrapper">
                                        <svg class="display-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="11" cy="11" r="8"/>
                                            <path d="m21 21-4.35-4.35"/>
                                        </svg>
                                    </span>
                                    <p class="display-card-title">DISCOVER</p>
                                </div>
                                <p class="display-card-description">Explore data sources</p>
                                <p class="display-card-date">Real-time</p>
                            </div>
                            <!-- Card 2: QUERY -->
                            <div class="display-card display-card-2">
                                <div class="display-card-header">
                                    <span class="display-card-icon-wrapper">
                                        <svg class="display-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                        </svg>
                                    </span>
                                    <p class="display-card-title">QUERY</p>
                                </div>
                                <p class="display-card-description">Analyze datasets</p>
                                <p class="display-card-date">Active</p>
                            </div>
                            <!-- Card 3: PROCESS -->
                            <div class="display-card display-card-3">
                                <div class="display-card-header">
                                    <span class="display-card-icon-wrapper">
                                        <svg class="display-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <path d="M12 2v4M12 18v4"/>
                                            <path d="m4.93 4.93 2.83 2.83m8.48 8.48 2.83 2.83"/>
                                            <path d="M2 12h4M18 12h4"/>
                                            <path d="m4.93 19.07 2.83-2.83m8.48-8.48 2.83-2.83"/>
                                        </svg>
                                    </span>
                                    <p class="display-card-title">PROCESS</p>
                                </div>
                                <p class="display-card-description">Transform data</p>
                                <p class="display-card-date">Processing</p>
                            </div>
                            <!-- Card 4: INSIGHTS -->
                            <div class="display-card display-card-4">
                                <div class="display-card-header">
                                    <span class="display-card-icon-wrapper">
                                        <svg class="display-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                                        </svg>
                                    </span>
                                    <p class="display-card-title">INSIGHTS</p>
                                </div>
                                <p class="display-card-description">Get key insights</p>
                                <p class="display-card-date">Live</p>
                            </div>
                            <!-- Card 5: EXPORT -->
                            <div class="display-card display-card-5">
                                <div class="display-card-header">
                                    <span class="display-card-icon-wrapper">
                                        <svg class="display-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                    </span>
                                    <p class="display-card-title">EXPORT</p>
                                </div>
                                <p class="display-card-description">Download results</p>
                                <p class="display-card-date">Ready</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // Initialize features carousel
        this.initWelcomeFeaturesCarousel(modalOverlay);
        
        // Close on button click
        const getStartedBtn = document.getElementById('welcome-get-started');
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', () => {
                modalOverlay.remove();
            });
        }
        
        // Close on overlay click (outside modal)
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    async showSettingsModal() {
        // Load current config
        let currentConfig = null;
        try {
            const res = await fetch(`${this.apiBase}/user/api-config`, { credentials: 'include' });
            if (res.ok) {
                currentConfig = await res.json();
            }
        } catch (e) {
            console.error('Error loading API config:', e);
        }
        
        // Create minimal modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'settings-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="settings-modal">
                <div class="settings-header">
                    <h2>AI Configuration</h2>
                    <button class="settings-close-btn" id="settings-close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="settings-content">
                    <div class="settings-row">
                        <label class="settings-label">Provider</label>
                        <div class="provider-options-minimal">
                            <button class="provider-btn ${currentConfig?.provider === 'openai' ? 'active' : ''}" data-provider="openai">
                                <span>OpenAI</span>
                            </button>
                            <button class="provider-btn ${currentConfig?.provider === 'anthropic' ? 'active' : ''}" data-provider="anthropic">
                                <span>Anthropic</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="settings-row">
                        <label class="settings-label">API Key</label>
                        <div class="input-wrapper-minimal">
                            <input 
                                type="password" 
                                id="settings-api-key" 
                                class="input-minimal" 
                                placeholder="sk-..."
                                value="${currentConfig?.has_api_key ? '••••••••••••••••' : ''}"
                            >
                        </div>
                    </div>
                    
                    <div class="settings-row">
                        <label class="settings-label">Model</label>
                        <div class="input-wrapper-minimal">
                            <select id="settings-model" class="input-minimal" disabled>
                                <option value="">Enter API key to load models...</option>
                                ${currentConfig?.model ? `<option value="${currentConfig.model}" selected>${currentConfig.model}</option>` : ''}
                            </select>
                        </div>
                        <div id="settings-loading-indicator" class="loading-minimal" style="display: none;">
                            <span>Loading...</span>
                        </div>
                    </div>
                    
                    <div class="settings-actions-minimal">
                        ${currentConfig ? `
                        <button id="settings-delete-btn" class="btn-minimal btn-secondary">
                            Remove
                        </button>
                        ` : ''}
                        <button id="settings-save-btn" class="btn-minimal btn-primary">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // Setup event listeners
        this.setupSettingsModalListeners(modalOverlay, currentConfig);
    }
    
    setupSettingsModalListeners(modalOverlay, currentConfig) {
        const closeBtn = document.getElementById('settings-close-btn');
        const saveBtn = document.getElementById('settings-save-btn');
        const deleteBtn = document.getElementById('settings-delete-btn');
        const providerCards = modalOverlay.querySelectorAll('.provider-card');
        const apiKeyInput = document.getElementById('settings-api-key');
        const modelSelect = document.getElementById('settings-model');
        const loadingIndicator = document.getElementById('settings-loading-indicator');
        const timelineSteps = modalOverlay.querySelectorAll('.timeline-step');
        
        let loadModelsTimeout = null;
        
        // Handle provider button selection
        const providerButtons = modalOverlay.querySelectorAll('.provider-btn');
        providerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                providerButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Clear models and reload if API key exists
                if (loadModelsTimeout) {
                    clearTimeout(loadModelsTimeout);
                }
                loadModelsTimeout = setTimeout(loadModels, 300);
            });
        });
        
        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modalOverlay.remove();
            });
        }
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
        
        // Close on Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Auto-load models when API key is entered
        const loadModels = async () => {
            const provider = getCurrentProvider();
            let apiKey = apiKeyInput.value.trim();
            
            // Check if the value is the placeholder (bullet points)
            const isPlaceholder = apiKey === '••••••••••••••••' || apiKey.match(/^[•\u2022\u25CF]+$/);
            
            // If it's a placeholder, treat as empty
            if (isPlaceholder) {
                apiKey = '';
            }
            
            // If no API key entered but we have saved config, use saved one
            const useSavedKey = !apiKey && currentConfig?.has_api_key && currentConfig.provider === provider;
            
            if (!apiKey && !useSavedKey) {
                modelSelect.innerHTML = '<option value="">Enter API key to load models...</option>';
                modelSelect.disabled = true;
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                return;
            }
            
            // Show loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'flex';
            modelSelect.disabled = true;
            modelSelect.innerHTML = '<option value="">Loading models...</option>';
            
            try {
                // Load models - if using saved key, don't pass api_key param
                let url = `${this.apiBase}/models/list?provider=${provider}`;
                if (apiKey && !isPlaceholder) {
                    url += `&api_key=${encodeURIComponent(apiKey)}`;
                }
                
                const modelsRes = await fetch(url, {
                    credentials: 'include'
                });
                
                if (!modelsRes.ok) {
                    const error = await modelsRes.json();
                    throw new Error(error.detail || 'Failed to load models. Please check your API key.');
                }
                
                const data = await modelsRes.json();
                modelSelect.innerHTML = '<option value="">Select a model...</option>';
                
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.display_name || model.id;
                    if (currentConfig && currentConfig.model === model.id) {
                        option.selected = true;
                    }
                    modelSelect.appendChild(option);
                });
                
                modelSelect.disabled = false;
            } catch (e) {
                modelSelect.innerHTML = '<option value="">Error loading models</option>';
                this.showNotification(`Error loading models: ${e.message}`, 'error');
                console.error('Error loading models:', e);
            } finally {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        };
        
        // Get current provider from selected button
        const getCurrentProvider = () => {
            const selected = modalOverlay.querySelector('.provider-btn.active');
            return selected ? selected.dataset.provider : (currentConfig?.provider || 'openai');
        };
        
        // API key input change - auto-validate and load models
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', () => {
                // Clear previous timeout
                if (loadModelsTimeout) {
                    clearTimeout(loadModelsTimeout);
                }
                // Debounce: wait 800ms after user stops typing
                loadModelsTimeout = setTimeout(loadModels, 800);
            });
            
            // Also trigger on paste
            apiKeyInput.addEventListener('paste', () => {
                setTimeout(() => {
                    if (loadModelsTimeout) {
                        clearTimeout(loadModelsTimeout);
                    }
                    loadModelsTimeout = setTimeout(loadModels, 800);
                }, 100);
            });
        }
        
        // Load models on initial load if we have saved config
        if (currentConfig?.has_api_key) {
            setTimeout(loadModels, 500);
        }
        
        // Save button
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const provider = getCurrentProvider();
                let apiKey = apiKeyInput.value.trim();
                const model = modelSelect.value;
                
                // If API key field shows placeholder (••••), use saved key
                if (!apiKey && currentConfig?.has_api_key && apiKeyInput.value === '••••••••••••••••') {
                    // Don't send the placeholder, we'll use saved key
                    // But we need to get it from backend - actually, we should require new key entry
                    this.showNotification('Please enter your API key (or leave empty to keep current)', 'warning');
                    return;
                }
                
                // If no API key entered but we have saved config, we can keep using saved one
                // But for security, we should require re-entry or explicitly allow keeping
                if (!apiKey && !currentConfig?.has_api_key) {
                    this.showNotification('Please enter your API key', 'warning');
                    return;
                }
                
                if (!model) {
                    this.showNotification('Please select a model', 'warning');
                    return;
                }
                
                // If API key is placeholder, send empty string to keep current
                if (apiKey === '••••••••••••••••') {
                    apiKey = ''; // Empty string will trigger using saved key on backend
                }
                
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                
                try {
                    const res = await fetch(`${this.apiBase}/user/api-config`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            provider: provider,
                            api_key: apiKey,
                            model: model,
                            temperature: 0.0  // Always use lowest temperature
                        })
                    });
                    
                    if (!res.ok) {
                        const error = await res.json();
                        throw new Error(error.detail || 'Failed to save configuration');
                    }
                    
                    this.showNotification('Configuration saved successfully', 'success');
                    modalOverlay.remove();
                } catch (e) {
                    this.showNotification(`Error saving configuration: ${e.message}`, 'error');
                    console.error('Error saving config:', e);
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Configuration';
                }
            });
        }
        
        // Delete button
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (!confirm('Are you sure you want to remove your API configuration? You will need to configure it again to use the agent.')) {
                    return;
                }
                
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
                
                try {
                    const res = await fetch(`${this.apiBase}/user/api-config`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    
                    if (!res.ok) {
                        throw new Error('Failed to delete configuration');
                    }
                    
                    this.showNotification('Configuration removed successfully', 'success');
                    modalOverlay.remove();
                } catch (e) {
                    this.showNotification(`Error removing configuration: ${e.message}`, 'error');
                    console.error('Error deleting config:', e);
                } finally {
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Remove Configuration';
                }
            });
        }
    }
    
    initWelcomeFeaturesCarousel(modalOverlay) {
        const slides = modalOverlay.querySelectorAll('.welcome-feature-slide');
        const dotsContainer = modalOverlay.querySelector('.welcome-features-dots');
        const nextBtn = modalOverlay.querySelector('.welcome-carousel-next');
        
        if (!slides.length || !dotsContainer) return;
        
        let currentIndex = 0;
        let autoAdvanceInterval;
        let isTransitioning = false;
        
        // Create dots
        slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = `welcome-feature-dot ${index === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                if (!isTransitioning) {
                    currentIndex = index;
                    updateCarousel();
                    resetAutoAdvance();
                }
            });
            dotsContainer.appendChild(dot);
        });
        
        const updateCarousel = () => {
            if (isTransitioning) return;
            isTransitioning = true;
            
            // Fade out current slide
            slides.forEach((slide, index) => {
                if (index === currentIndex) {
                    slide.classList.remove('active');
                    slide.classList.add('fade-out');
                } else {
                    slide.classList.remove('active', 'fade-out', 'fade-in');
                }
            });
            
            // After fade out, change content and fade in
            setTimeout(() => {
                slides.forEach((slide, index) => {
                    if (index === currentIndex) {
                        slide.classList.remove('fade-out');
                        slide.classList.add('fade-in');
                        setTimeout(() => {
                            slide.classList.add('active');
                            slide.classList.remove('fade-in');
                            isTransitioning = false;
                        }, 50);
                    }
                });
                
                // Update dots
                const dots = dotsContainer.querySelectorAll('.welcome-feature-dot');
                dots.forEach((dot, index) => {
                    dot.classList.toggle('active', index === currentIndex);
                });
            }, 300);
        };
        
        const nextSlide = () => {
            if (!isTransitioning) {
                currentIndex = (currentIndex + 1) % slides.length;
                updateCarousel();
            }
        };
        
        const resetAutoAdvance = () => {
            if (autoAdvanceInterval) {
                clearInterval(autoAdvanceInterval);
            }
            autoAdvanceInterval = setInterval(nextSlide, 5000);
        };
        
        // Arrow control
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                nextSlide();
                resetAutoAdvance();
            });
        }
        
        // Start auto-advance
        resetAutoAdvance();
        
        // Pause on hover
        const carouselWrapper = modalOverlay.querySelector('.welcome-features-carousel-wrapper');
        if (carouselWrapper) {
            carouselWrapper.addEventListener('mouseenter', () => {
                if (autoAdvanceInterval) {
                    clearInterval(autoAdvanceInterval);
                }
            });
            carouselWrapper.addEventListener('mouseleave', () => {
                resetAutoAdvance();
            });
        }
    }

    setupBgGridPattern() {
        const bgContainer = document.querySelector('.hero-grid-pattern');
        const squaresContainer = document.querySelector('.hero-grid-squares');
        
        if (!bgContainer || !squaresContainer) {
            console.log('Grid pattern elements not found:', { bgContainer, squaresContainer });
            return;
        }
        
        console.log('Setting up grid pattern animation...');

        const gridSize = 40;
        const numSquares = 50;
        let squares = [];

        // Get random position within viewport
        function getRandomPos() {
            const maxX = Math.max(1, Math.floor(window.innerWidth / gridSize));
            const maxY = Math.max(1, Math.floor(window.innerHeight / gridSize));
            return [
                Math.floor(Math.random() * maxX),
                Math.floor(Math.random() * maxY)
            ];
        }

        // Generate initial squares
        function generateSquares() {
            squares = Array.from({ length: numSquares }, (_, i) => ({
                id: i,
                pos: getRandomPos()
            }));
        }

        // Update square position
        function updateSquarePosition(id) {
            const newPos = getRandomPos();
            squares = squares.map(sq =>
                sq.id === id ? { ...sq, pos: newPos } : sq
            );
            return newPos;
        }

        // Create and animate squares
        function createSquares() {
            squaresContainer.innerHTML = '';
            
            squares.forEach(({ pos: [x, y], id }, index) => {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('class', 'hero-grid-square');
                rect.setAttribute('width', gridSize - 1);
                rect.setAttribute('height', gridSize - 1);
                rect.setAttribute('x', x * gridSize + 1);
                rect.setAttribute('y', y * gridSize + 1);
                rect.style.animationDelay = `${index * 0.1}s`;
                
                // Update position when animation completes
                let animationCount = 0;
                rect.addEventListener('animationiteration', () => {
                    animationCount++;
                    if (animationCount % 2 === 0) {
                        const newPos = updateSquarePosition(id);
                        rect.setAttribute('x', newPos[0] * gridSize + 1);
                        rect.setAttribute('y', newPos[1] * gridSize + 1);
                    }
                });
                
                squaresContainer.appendChild(rect);
            });
        }

        // Initialize
        setTimeout(() => {
            generateSquares();
            createSquares();
        }, 100);

        // Update on resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                generateSquares();
                createSquares();
            }, 200);
        });
    }
    

}

// Add typing animation CSS
const style = document.createElement('style');
style.textContent = `
    .typing-dots {
        display: flex;
        gap: 4px;
        align-items: center;
    }
    
    .typing-dots span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--text-muted);
        animation: typing 1.4s infinite ease-in-out;
    }
    
    .typing-dots span:nth-child(1) {
        animation-delay: -0.32s;
    }
    
    .typing-dots span:nth-child(2) {
        animation-delay: -0.16s;
    }
    
    @keyframes typing {
        0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application on all pages
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MotorsportsAnalytics();
});

// Global functions for HTML onclick handlers
window.selectDataSource = (datasetName) => {
    if (window.app && window.app.selectDataSource) {
        window.app.selectDataSource(datasetName);
    }
};

window.previewDataSource = (datasetName) => {
    window.app.previewDataSource(datasetName);
};

