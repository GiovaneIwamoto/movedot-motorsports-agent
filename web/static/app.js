// Modern JavaScript for MoveDot Motorsports Analytics Web Interface

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
        this.currentPlaceholderIndex = 0;
        this.placeholderInterval = null;
        this.isInputFocused = false;
        
        // Loader system
        this.loaderTimeout = null;
        this.isLoading = false;
        
        // Floating Dock system - Simplified
        this.currentPage = 'dashboard';
        this.isMobile = window.innerWidth <= 768;
        this.activeSection = 'dashboard'; // Track which section is currently active
        
        this.notificationStyleInjected = false;
        
        
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
                
                // Set picture
                if (this.currentUser.picture && pictureEl) {
                    pictureEl.src = this.currentUser.picture;
                    pictureEl.style.display = 'block';
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
                    window.location.href = `${this.apiBase}/auth/login`;
                }
            });
        }
        
        // Clear chat history
        const clearHistoryBtn = document.getElementById('menu-clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete all your chat history? This action cannot be undone.')) {
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
                            if (messagesContainer) {
                                messagesContainer.innerHTML = '';
                            }
                            // Show welcome message after clearing
                            this.showWelcomeMessage();
                            // Reload conversation
                            await this.bootstrapConversation();
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
                this.showNotification('Settings coming soon', 'info');
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

    async bootstrapConversation() {
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
                // Small delay to ensure page is loaded
                setTimeout(() => {
                    this.showWelcomeModal();
                }, 500);
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
        this.setupEventListeners();
        await this.loadDataOverview();
        this.startStatusUpdater();
        this.updateConnectionStatus(true); // SSE is always available
        this.initAnimatedPlaceholder();
        
        // Only require authentication on pages that need it (not data-sources.html)
        const isDataSourcesPage = window.location.pathname.includes('data-sources.html');
        if (!isDataSourcesPage) {
            await this.ensureAuthenticated();
            this.setupAuthUI();
            await this.bootstrapConversation();
        }
        
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
            if (urlHash === '#prp-editor') {
                // Stay on data-sources page, just scroll to PRP editor
                setTimeout(() => {
                    const prpSection = document.getElementById('prp-editor-section');
                    if (prpSection) {
                        prpSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 500);
            } else if (urlHash === '#analytics') {
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
        if (urlHash === '#prp-editor') {
            setTimeout(() => {
                this.showPRPEditor();
            }, 500);
        } else if (urlHash === '#analytics') {
            setTimeout(() => {
                this.scrollToSection('analytics');
            }, 500);
        }
    }


    setupEventListeners() {
        // Chat input
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        
        if (!chatInput || !sendButton) {
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
        
        // Auto-resize chat input
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        });

        // Animated placeholder events
        chatInput.addEventListener('focus', () => {
            this.isInputFocused = true;
            this.stopPlaceholderAnimation();
        });

        chatInput.addEventListener('blur', () => {
            this.isInputFocused = false;
            if (!chatInput.value.trim()) {
                this.startPlaceholderAnimation();
            }
        });

        chatInput.addEventListener('input', () => {
            if (chatInput.value.trim()) {
                this.stopPlaceholderAnimation();
            } else if (!this.isInputFocused) {
                this.startPlaceholderAnimation();
            }
        });



        // Floating Dock event listeners
        this.setupFloatingDock();
        
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
        } else if (eventType === 'kpi') {
            // Adicione esta linha para ver o "bicho" que está chegando
            console.log("🛠️ DEBUG KPI CRU:", data); 
            console.log("🛠️ TIPO:", typeof data);

            renderizarCardKPI(data); 
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
        const welcomeMessage = document.getElementById('chat-welcome-message');
        if (welcomeMessage && welcomeMessage.style.display !== 'none') {
            welcomeMessage.classList.add('fade-out');
            setTimeout(() => {
                welcomeMessage.style.display = 'none';
            }, 300);
        }
    }
    
    showWelcomeMessage() {
        const welcomeMessage = document.getElementById('chat-welcome-message');
        const messagesContainer = document.getElementById('chat-messages');
        if (welcomeMessage && messagesContainer) {
            // Only show if there are no messages
            const hasMessages = messagesContainer.children.length > 0;
            if (!hasMessages) {
                welcomeMessage.style.display = 'flex';
                welcomeMessage.classList.remove('fade-out');
            }
        }
    }

    async addMessage(content, sender) {
        const messagesContainer = document.getElementById('chat-messages');
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
        if (placeholderText) {
            this.startPlaceholderAnimation();
        }
    }

    startPlaceholderAnimation() {
        if (this.placeholderInterval) {
            clearInterval(this.placeholderInterval);
        }

        const placeholderText = document.getElementById('placeholder-text');
        if (!placeholderText) return;

        // Show current placeholder immediately
        this.showPlaceholder();

        // Start cycling through placeholders
        this.placeholderInterval = setInterval(() => {
            if (!this.isInputFocused && !document.getElementById('chat-input').value.trim()) {
                this.cyclePlaceholder();
            }
        }, 3000); // Change every 3 seconds
    }

    stopPlaceholderAnimation() {
        if (this.placeholderInterval) {
            clearInterval(this.placeholderInterval);
            this.placeholderInterval = null;
        }
        
        const placeholderText = document.getElementById('placeholder-text');
        if (placeholderText) {
            placeholderText.style.opacity = '0';
        }
    }

    showPlaceholder() {
        const placeholderText = document.getElementById('placeholder-text');
        if (!placeholderText) return;

        placeholderText.textContent = this.placeholders[this.currentPlaceholderIndex];
        placeholderText.classList.remove('fade-out');
        placeholderText.classList.add('fade-in', 'visible');
    }

    cyclePlaceholder() {
        const placeholderText = document.getElementById('placeholder-text');
        if (!placeholderText) return;

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
        }, 300); // Wait for fade out to complete
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
        const dockItems = document.querySelectorAll('.dock-item');
        const floatingDock = document.getElementById('floating-dock');
        
        
        if (!floatingDock) {
            return;
        }
        
        // Add mobile class if needed
        if (this.isMobile) {
            floatingDock.classList.add('mobile');
        }

        dockItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Check if the item has an onclick handler (like in data-sources.html)
                if (item.hasAttribute('onclick')) {
                    // Let the onclick handler take precedence
                    return;
                }
                
                e.preventDefault();
                this.handleDockItemClick(item);
            });

            // Add hover animations
            item.addEventListener('mouseenter', () => {
                this.animateDockItem(item, 'enter');
            });

            item.addEventListener('mouseleave', () => {
                this.animateDockItem(item, 'leave');
            });
        });
    }

    handleDockItemClick(item) {
        const page = item.dataset.page;
        const href = item.dataset.href;
        
        // Don't do anything if clicking the same active page
        if (item.classList.contains('active') && this.currentPage === page) {
            return;
        }
        
        // Remove active class from all items
        document.querySelectorAll('.dock-item').forEach(dockItem => {
            dockItem.classList.remove('active');
        });
        
        // Add active class to clicked item
        item.classList.add('active');
        this.currentPage = page;
        
        // Add bounce animation
        item.classList.add('animate');
        setTimeout(() => {
            item.classList.remove('animate');
        }, 600);
        
        // Check current page context
        const currentPath = window.location.pathname;
        const isDataSourcesPage = currentPath.includes('data-sources');
        
        // Simple navigation logic
        if (page === 'home' && href && href !== '#') {
            window.location.href = href;
        } else if (page === 'data-sources') {
            // Navigate to data sources page
            if (!isDataSourcesPage) {
            window.location.href = 'data-sources.html';
            }
            return;
        } else if (page === 'prp-editor') {
            if (isDataSourcesPage) {
                // Stay on data-sources page, just scroll to PRP editor
                const prpSection = document.getElementById('prp-editor-section');
                if (prpSection) {
                    prpSection.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
            this.showPRPEditor();
            }
        } else if (page === 'analytics') {
            if (isDataSourcesPage) {
                // Stay on data-sources page, just scroll to analytics
                const analyticsSection = document.getElementById('analytics-section');
                if (analyticsSection) {
                    analyticsSection.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                this.scrollToSection('analytics');
            }
        } else if (page === 'dashboard') {
            if (isDataSourcesPage) {
                // Go back to main dashboard page
                window.location.href = 'index.html';
            } else {
                this.scrollToSection('dashboard');
            }
        }
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
        const prpSection = document.getElementById('prp-editor-section');
        const chatSection = document.querySelector('.chat-section');
        const analyticsSection = document.getElementById('analytics-section');
        
        // Always scroll to top first
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Hide PRP Editor if visible
        if (prpSection) {
            prpSection.style.display = 'none';
        }
        
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
        
        // Restore placeholder animation
        this.startPlaceholderAnimation();
        
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

    // PRP Editor Methods
    clearPRPContent() {
        const textarea = document.getElementById('prp-editor-textarea');
        if (textarea) {
            textarea.value = '';
            this.updateCharCount();
            textarea.focus();
        } else {
            console.error('Textarea not found');
        }
    }

    showPRPEditor() {
        // Hide other sections
        const chatSection = document.querySelector('.chat-section');
        const analyticsSection = document.getElementById('analytics-section');
        const prpSection = document.getElementById('prp-editor-section');
        
        if (chatSection) {
            // Preserve chat section state before hiding
            this.preserveChatSection();
            chatSection.style.display = 'none';
        }
        if (analyticsSection) {
            analyticsSection.style.display = 'none';
        }
        
        // Show PRP Editor section
        if (prpSection) {
        prpSection.style.display = 'block';
            
            // Scroll to top of page to show PRP section at the beginning
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        
        // Load current PRP content
        this.loadPRPContent();
        
        // Setup PRP Editor event listeners
        this.setupPRPEditorListeners();
        
        // Update active section
        this.activeSection = 'prp-editor';
        
        // Scroll to PRP Editor
        prpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    setupPRPEditorListeners() {
        // Save PRP button
        const saveBtn = document.getElementById('save-prp-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.savePRP());
        }
        
        // Reset PRP button
        const resetBtn = document.getElementById('reset-prp-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetPRP());
        }
        
        
        // Character count
        const textarea = document.getElementById('prp-editor-textarea');
        if (textarea) {
            textarea.addEventListener('input', () => this.updateCharCount());
        }
        
    }

    async loadPRPContent() {
        try {
            const response = await fetch('/api/prp/content');
            if (response.ok) {
                const data = await response.json();
                const textarea = document.getElementById('prp-editor-textarea');
                if (textarea) {
                    textarea.value = data.content || '';
                    this.updateCharCount();
                }
            } else {
                // Load default content if API fails
                this.loadDefaultPRPContent();
            }
        } catch (error) {
            console.error('Error loading PRP content:', error);
            this.loadDefaultPRPContent();
        }
    }

    async loadDefaultPRPContent() {
        const textarea = document.getElementById('prp-editor-textarea');
        if (!textarea) {
            return;
        }

        try {
            const response = await fetch('/api/prp/default');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const content = await response.text();
            textarea.value = content || '';
        } catch (error) {
            console.error('Error loading default PRP:', error);
            textarea.value = '';
            this.showNotification('Failed to load PRP from server. Editor is empty.', 'error');
        }

        this.updateCharCount();
    }

    async savePRP() {
        const textarea = document.getElementById('prp-editor-textarea');
        const content = textarea.value.trim();
        
        if (!content) {
            alert('Please enter some PRP content before saving.');
            return;
        }
        
        try {
            const response = await fetch('/api/prp/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: content })
            });
            
            if (response.ok) {
                // Show success message
                this.showNotification('PRP saved successfully!', 'success');
                
                // Update agent with new PRP
                await this.updateAgentPRP(content);
            } else {
                throw new Error('Failed to save PRP');
            }
        } catch (error) {
            console.error('Error saving PRP:', error);
            this.showNotification('Error saving PRP. Please try again.', 'error');
        }
    }

    async updateAgentPRP(content) {
        try {
            const response = await fetch('/api/prp/update-agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: content })
            });
            
            if (response.ok) {
                this.showNotification('Agent updated with new PRP!', 'success');
            }
        } catch (error) {
            console.error('Error updating agent:', error);
            this.showNotification('PRP saved but agent update failed.', 'warning');
        }
    }

    resetPRP() {
        if (confirm('Are you sure you want to reset the PRP to default? This will lose any customizations.')) {
            this.loadDefaultPRPContent();
            this.showNotification('PRP reset to default.', 'info');
        }
    }

    updateCharCount() {
        const textarea = document.getElementById('prp-editor-textarea');
        const charCount = document.getElementById('char-count');
        
        if (textarea && charCount) {
            charCount.textContent = textarea.value.length;
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
        
        // Add minimal styles
        notification.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            background: rgba(26, 26, 26, 0.95);
            color: white;
            border-radius: 6px;
            padding: 0.5rem 0.75rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.2s ease;
            max-width: 250px;
            font-size: 0.8rem;
            font-weight: 500;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        // Ensure notification layout styles are only injected once
        if (!this.notificationStyleInjected) {
            const style = document.createElement('style');
            style.textContent = `
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .notification-icon-wrapper {
                    width: 24px;
                    height: 24px;
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
                    font-size: 0.75rem;
                }
            `;
            document.head.appendChild(style);
            this.notificationStyleInjected = true;
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 50);
        
        // Remove after 2 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 200);
        }, 2000);
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
                        <div class="welcome-visual-background">
                            <div class="welcome-visual-layer welcome-layer-3">
                                <div class="welcome-visual-card">
                                    <div class="welcome-card-icon-small">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                            <path d="M2 17l10 5 10-5"></path>
                                            <path d="M2 12l10 5 10-5"></path>
                                        </svg>
                                    </div>
                                    <span>Data Studio</span>
                                </div>
                            </div>
                            <div class="welcome-visual-layer welcome-layer-2">
                                <div class="welcome-workflow-canvas">
                                    <div class="welcome-workflow-header">Analytics Pipeline</div>
                                    <div class="welcome-workflow-lines">
                                        <div class="welcome-workflow-line"></div>
                                        <div class="welcome-workflow-line"></div>
                                        <div class="welcome-workflow-line"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="welcome-visual-layer welcome-layer-1">
                                <div class="welcome-feature-cards">
                                    <div class="welcome-feature-card">
                                        <div class="welcome-feature-card-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                            </svg>
                                        </div>
                                        <span>Fetch Data</span>
                                        <div class="welcome-card-toggle"></div>
                                    </div>
                                    <div class="welcome-feature-card welcome-card-active">
                                        <div class="welcome-feature-card-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M9 11l3 3L22 4"></path>
                                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                            </svg>
                                        </div>
                                        <span>Analyze</span>
                                        <div class="welcome-card-toggle welcome-toggle-on"></div>
                                    </div>
                                    <div class="welcome-feature-card welcome-card-active">
                                        <div class="welcome-feature-card-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                            </svg>
                                        </div>
                                        <span>Visualize</span>
                                        <div class="welcome-card-toggle welcome-toggle-on"></div>
                                    </div>
                                    <div class="welcome-feature-card welcome-card-active">
                                        <div class="welcome-feature-card-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                                <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                                                <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                                                <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                            </svg>
                                        </div>
                                        <span>Insights</span>
                                        <div class="welcome-card-toggle welcome-toggle-on"></div>
                                    </div>
                                    <div class="welcome-feature-card">
                                        <div class="welcome-feature-card-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="7 10 12 15 17 10"></polyline>
                                                <line x1="12" y1="15" x2="12" y2="3"></line>
                                            </svg>
                                        </div>
                                        <span>Export</span>
                                        <div class="welcome-card-toggle"></div>
                                    </div>
                                </div>
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

// Global function for clear button
function clearPRPContent() {
    if (window.app) {
        window.app.clearPRPContent();
    }
}

// Initialize the application on all pages
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MotorsportsAnalytics();
});

// Global functions for HTML onclick handlers
window.selectDataSource = (datasetName) => {
    window.app.selectDataSource(datasetName);
};

window.previewDataSource = (datasetName) => {
    window.app.previewDataSource(datasetName);
};


// No final do app.js

function renderizarCardKPI(kpiData) {
    console.log("🎨 DADOS BRUTOS RECEBIDOS:", kpiData);

    const container = document.getElementById('kpi-container');
    
    if (!container) {
        console.warn("Container KPI não encontrado.");
        return;
    }

    // Remove o placeholder de boas-vindas se existir
    const welcomeMsg = document.querySelector('.dashboard-welcome');
    if (welcomeMsg && getComputedStyle(welcomeMsg).display !== 'none') {
        welcomeMsg.style.display = 'none';
    }

    // --- LÓGICA INTELIGENTE DE DETECÇÃO DE CAMPOS ---
    // Normaliza as chaves para minúsculas para facilitar a busca
    const normalizedData = {};
    Object.keys(kpiData).forEach(key => {
        normalizedData[key.toLowerCase()] = kpiData[key];
    });

    // Tenta encontrar o Título em várias variações possíveis
    const titulo = kpiData.title || kpiData.Title || normalizedData.title || 
                   normalizedData.label || normalizedData.name || "Métrica";

    // Tenta encontrar o Valor
    let valorRaw = kpiData.value || kpiData.Value || normalizedData.value || 
                   normalizedData.amount || normalizedData.number || null;
    
    // Se valor for nulo, mas "value" estiver explicitamente definido como 0, aceitamos
    const valor = (valorRaw !== null && valorRaw !== undefined) ? valorRaw : "--";

    // Tenta encontrar a Unidade
    const unidade = kpiData.unit || kpiData.Unit || normalizedData.unit || "";

    // Tenta encontrar a Cor
    const corDestaque = kpiData.color || kpiData.Color || normalizedData.color || "#1cc88a";
    // ------------------------------------------------

    // Criação do Card
    const cardDiv = document.createElement('div');
    cardDiv.className = 'kpi-card'; 
    cardDiv.style.borderLeft = `5px solid ${corDestaque}`;

    cardDiv.innerHTML = `
        <h3>${titulo}</h3>
        <div class="kpi-value">${valor}</div>
        <div class="kpi-subtext">${unidade}</div>
    `;

    cardDiv.style.opacity = "0";
    cardDiv.style.transform = "translateY(20px)";
    container.appendChild(cardDiv);

    setTimeout(() => {
        cardDiv.style.opacity = "1";
        cardDiv.style.transform = "translateY(0)";
    }, 50);
}

function appendKPICard(kpiData) {
    const container = document.querySelector('.kpi-grid-container');
    
    // Segurança: se não houver container, não faz nada para não dar erro
    if (!container) return;

    const card = document.createElement('div');
    card.classList.add('kpi-card');

    // Monta o HTML interno do card
    card.innerHTML = `
        <h3>${kpiData.title || 'Métrica'}</h3>
        <p class="kpi-value" style="${kpiData.color === 'red' ? 'color:#e74a3b' : ''}">${kpiData.value}</p>
        <p class="kpi-subtext">${kpiData.unit || ''}</p>
    `;

    container.appendChild(card);
}