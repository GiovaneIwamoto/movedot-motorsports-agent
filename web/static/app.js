// Modern JavaScript for MoveDot Motorsports Analytics Web Interface

class MotorsportsAnalytics {
    constructor() {
        this.apiBase = '/api';
        this.wsUrl = `ws://${window.location.host}/ws/chat`;
        this.sessionId = this.generateSessionId();
        this.analysisCount = 0;
        this.ws = null;
        this.queryStartTime = null;
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
        
        // Floating Dock system
        this.currentPage = 'dashboard';
        this.isMobile = window.innerWidth <= 768;
        this.activeSection = 'chat'; // Track which section is currently active
        
        // Scrollbar management
        this.scrollTimeout = null;
        this.scrollCooldown = 2000; // 2 seconds
        
        
        this.init();
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async init() {
        this.setupEventListeners();
        await this.loadDataOverview();
        this.connectWebSocket();
        this.startStatusUpdater();
        this.initAnimatedPlaceholder();
        this.checkPendingDatasetAnalysis();
        this.loadChatHistory();
        
        // Also check on DOM ready as backup
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.checkPendingDatasetAnalysis(), 100);
            });
        }
        
        // Save chat history before page unload
        window.addEventListener('beforeunload', () => {
            this.saveChatHistory();
        });
        
        // Save chat history when navigating away
        window.addEventListener('pagehide', () => {
            this.saveChatHistory();
        });
        
        // Setup scrollbar behavior
        this.setupScrollbarBehavior();
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
            console.log('Found analyze parameter in URL:', analyzeParam);
            this.addTextToChatInput(analyzeParam);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // Check if there's a pending dataset analysis from data sources page
        const pendingDataset = localStorage.getItem('pendingDatasetAnalysis');
        if (pendingDataset) {
            console.log('Found pending dataset analysis:', pendingDataset);
            
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
                console.log('Text added to chat input:', chatInput.value);
            } else {
                console.error('Chat input not found');
                // Retry after a bit more time
                setTimeout(() => {
                    const retryChatInput = document.getElementById('chat-input');
                    if (retryChatInput) {
                        retryChatInput.value = text;
                        retryChatInput.focus();
                        retryChatInput.dispatchEvent(new Event('input', { bubbles: true }));
                        console.log('Text added to chat input (retry):', retryChatInput.value);
                    }
                }, 1000);
            }
        }, 500);
    }

    saveChatHistory() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            const messages = Array.from(messagesContainer.children).map(messageEl => {
                return {
                    innerHTML: messageEl.innerHTML,
                    className: messageEl.className,
                    id: messageEl.id
                };
            });
            
            localStorage.setItem('chatHistory', JSON.stringify(messages));
            console.log('Chat history saved:', messages.length, 'messages');
        }
    }

    loadChatHistory() {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            try {
                const messages = JSON.parse(savedHistory);
                const messagesContainer = document.getElementById('chat-messages');
                
                if (messagesContainer && messages.length > 0) {
                    // Clear existing messages
                    messagesContainer.innerHTML = '';
                    
                    // Restore messages
                    messages.forEach(messageData => {
                        const messageEl = document.createElement('div');
                        messageEl.innerHTML = messageData.innerHTML;
                        messageEl.className = messageData.className;
                        if (messageData.id) {
                            messageEl.id = messageData.id;
                        }
                        messagesContainer.appendChild(messageEl);
                    });
                    
                    // Scroll to bottom
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    console.log('Chat history loaded:', messages.length, 'messages');
                }
            } catch (error) {
                console.error('Error loading chat history:', error);
                localStorage.removeItem('chatHistory');
            }
        }
    }

    clearChatHistory() {
        localStorage.removeItem('chatHistory');
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        console.log('Chat history cleared');
    }

    clearChat() {
        // Clear the chat interface
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // Clear from localStorage
        this.clearChatHistory();
        
        console.log('Chat cleared completely');
    }

    setupScrollbarBehavior() {
        // Setup for chat messages scrollbar
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.addEventListener('scroll', () => {
                this.handleScrollEvent(chatMessages);
            });
        }
        
        // Setup for page scrollbar
        window.addEventListener('scroll', () => {
            this.handlePageScrollEvent();
        });
    }

    handleScrollEvent(element) {
        // Show scrollbar immediately
        element.classList.add('scrolling');
        
        // Clear existing timeout
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        // Hide scrollbar after cooldown
        this.scrollTimeout = setTimeout(() => {
            element.classList.remove('scrolling');
        }, this.scrollCooldown);
    }

    handlePageScrollEvent() {
        // Clear existing timeout
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        // Show scrollbar immediately by adding hover effect
        document.body.style.setProperty('--scrollbar-visible', '1');
        
        // Hide scrollbar after cooldown
        this.scrollTimeout = setTimeout(() => {
            document.body.style.setProperty('--scrollbar-visible', '0');
        }, this.scrollCooldown);
    }

    setupEventListeners() {
        // Chat input
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        
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
        
        // Initialize dynamic spacing
        this.updateDynamicSpacing();
        
        // Add scroll listener to detect section visibility
        this.setupScrollListener();
        
        // Setup dynamic chat scrollbar
        this.setupChatScrollbar();
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
        
        // Update count
        if (countElement) {
            countElement.textContent = `${datasets.length} dataset${datasets.length !== 1 ? 's' : ''}`;
        }
        
        if (datasets.length === 0) {
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

    connectWebSocket() {
        try {
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus(true);
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus(false);
                // Reconnect after 3 seconds
                setTimeout(() => this.connectWebSocket(), 3000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };
            
        } catch (error) {
            console.error('Error connecting WebSocket:', error);
            this.updateConnectionStatus(false);
        }
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
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (status === 'processing') {
            queryStatus.style.display = 'flex';
            statusDot.className = 'status-dot processing';
            statusText.textContent = message || 'Processing...';
        } else if (status === 'success') {
            statusDot.className = 'status-dot success';
            statusText.textContent = message || 'Completed';
            setTimeout(() => {
                queryStatus.style.display = 'none';
            }, 2000);
        } else if (status === 'error') {
            statusDot.className = 'status-dot error';
            statusText.textContent = message || 'Error';
            setTimeout(() => {
                queryStatus.style.display = 'none';
            }, 3000);
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
        
        // Start query tracking
        this.queryStartTime = Date.now();
        this.showQueryStatus('processing', 'Sending query...');
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
        
        try {
            // Try WebSocket first, fallback to HTTP
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    message: message,
                    session_id: this.sessionId
                }));
            } else {
                // Fallback to HTTP API
                await this.sendMessageHTTP(message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('Error sending message. Please try again.', 'agent');
            this.hideTypingIndicator();
            this.showQueryStatus('error', 'Connection error');
            this.updateQueryMetrics(Date.now() - this.queryStartTime, false);
        }
    }

    async sendMessageHTTP(message) {
        try {
            const response = await fetch(`${this.apiBase}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionId
                })
            });
            
            const data = await response.json();
            this.handleChatResponse(data);
            
        } catch (error) {
            console.error('HTTP request failed:', error);
            this.addMessage('Connection error. Please check your internet.', 'agent');
        }
    }

    handleWebSocketMessage(data) {
        if (data.type === 'agent_response') {
            this.hideTypingIndicator();
            this.addMessage(data.response, 'agent');
            this.analysisCount++;
            this.updateMetrics(document.getElementById('total-datasets').textContent);
            
            // Update query status and metrics
            const responseTime = Date.now() - this.queryStartTime;
            this.showQueryStatus('success', `Completed in ${responseTime}ms`);
            this.updateQueryMetrics(responseTime, true);
            this.updateStatusIndicator(); // Update status after completion
        }
    }

    handleChatResponse(data) {
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

    addMessage(content, sender) {
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
                <div class="message-text">${this.formatMessage(content)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        
        // Save chat history after adding message
        this.saveChatHistory();
        
        // Smooth scroll to bottom with animation
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    formatMessage(content) {
        // Basic markdown-like formatting
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
            console.log('Dashboard loaded successfully');
        }, 2000);
    }

    setupFloatingDock() {
        const dockItems = document.querySelectorAll('.dock-item');
        const floatingDock = document.getElementById('floating-dock');
        
        // Add mobile class if needed
        if (this.isMobile) {
            floatingDock.classList.add('mobile');
        }

        dockItems.forEach(item => {
            item.addEventListener('click', (e) => {
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
        
        // Handle specific actions
        if (page === 'data-sources') {
            // Navigate to data sources page without loader
            window.location.href = 'data-sources.html';
        } else if (page === 'export') {
            this.handleExport();
        } else if (page === 'new-analysis') {
            this.handleNewAnalysis();
        } else if (page === 'analytics') {
            // Scroll to analytics section
            this.scrollToAnalytics();
        } else if (page === 'dashboard') {
            // Scroll to chat section
            this.scrollToChat();
        } else if (href && href !== '#') {
            // Special case: Home navigation without loader
            if (page === 'home') {
                window.location.href = href;
            } else {
                // Show loader for other navigation
                this.showLoader(`Loading ${page.charAt(0).toUpperCase() + page.slice(1)}`);
                setTimeout(() => {
                    window.location.href = href;
                }, 1500);
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

    handleExport() {
        // Export functionality
        this.showLoader('Exporting Data...');
        setTimeout(() => {
            this.hideLoader();
            console.log('Export completed');
        }, 2000);
    }

    handleNewAnalysis() {
        // New analysis functionality
        this.showLoader('Preparing Analysis...');
        setTimeout(() => {
            this.hideLoader();
            console.log('New Analysis completed');
        }, 2000);
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

    scrollToAnalytics() {
        const analyticsSection = document.getElementById('analytics-section');
        if (analyticsSection) {
            analyticsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Set active section to analytics
            this.activeSection = 'analytics';
            // Update spacing when navigating to analytics
            setTimeout(() => {
                this.updateDynamicSpacing();
                this.updateBlurEffect();
            }, 300);
        }
    }

    scrollToChat() {
        // Scroll to the very top of the page
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        // Set active section to chat
        this.activeSection = 'chat';
        this.updateDynamicSpacing();
        this.updateBlurEffect();
    }

    updateDynamicSpacing() {
        const viewportHeight = window.innerHeight;
        const dockHeight = 80; // Approximate dock height
        const headerHeight = 80; // Approximate header height
        const availableHeight = viewportHeight - headerHeight - dockHeight;
        
        // Calculate dynamic spacing based on active section and viewport height
        let spacing;
        let bottomSpacing;
        
        if (this.activeSection === 'chat') {
            // When viewing chat - dock pushes analytics down
            if (viewportHeight < 800) {
                spacing = '2rem';
                bottomSpacing = '6rem'; // More space for dock
            } else if (viewportHeight < 1000) {
                spacing = '3rem';
                bottomSpacing = '7rem';
            } else {
                spacing = '4rem';
                bottomSpacing = '8rem';
            }
        } else {
            // When viewing analytics - cards closer together
            if (viewportHeight < 800) {
                spacing = '1rem';
                bottomSpacing = '4rem';
            } else if (viewportHeight < 1000) {
                spacing = '1.5rem';
                bottomSpacing = '5rem';
            } else {
                spacing = '2rem';
                bottomSpacing = '6rem';
            }
        }
        
        // Apply dynamic spacing via CSS custom properties
        document.documentElement.style.setProperty('--dynamic-spacing', spacing);
        document.documentElement.style.setProperty('--dynamic-spacing-bottom', bottomSpacing);
        
        // Update chat section height dynamically
        const chatSection = document.querySelector('.chat-section');
        if (chatSection) {
            const chatHeight = Math.min(availableHeight * 0.7, 750); // Max 70% of available height, increased to 750px
            chatSection.style.height = `${chatHeight}px`;
        }
    }

    setupScrollListener() {
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.detectActiveSection();
            }, 100);
        });
    }

    detectActiveSection() {
        const analyticsSection = document.getElementById('analytics-section');
        const chatSection = document.querySelector('.chat-section');
        
        if (analyticsSection && chatSection) {
            const analyticsRect = analyticsSection.getBoundingClientRect();
            const chatRect = chatSection.getBoundingClientRect();
            
            // If analytics section is in view and chat is not
            if (analyticsRect.top < window.innerHeight * 0.5 && chatRect.bottom < window.innerHeight * 0.3) {
                if (this.activeSection !== 'analytics') {
                    this.activeSection = 'analytics';
                    this.updateDynamicSpacing();
                    this.updateBlurEffect();
                }
            } else if (chatRect.top < window.innerHeight * 0.5) {
                if (this.activeSection !== 'chat') {
                    this.activeSection = 'chat';
                    this.updateDynamicSpacing();
                    this.updateBlurEffect();
                }
            }
        }
    }

    updateBlurEffect() {
        const analyticsSection = document.getElementById('analytics-section');
        
        if (analyticsSection) {
            if (this.activeSection === 'chat') {
                // Add blur effect when viewing chat
                analyticsSection.classList.add('blurred');
            } else {
                // Remove blur effect when viewing analytics
                analyticsSection.classList.remove('blurred');
            }
        }
    }

    setupChatScrollbar() {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;

        let scrollTimeout;
        
        chatMessages.addEventListener('scroll', () => {
            // Add scrolling class
            chatMessages.classList.add('scrolling');
            
            // Clear existing timeout
            clearTimeout(scrollTimeout);
            
            // Remove scrolling class after 1 second of no scrolling
            scrollTimeout = setTimeout(() => {
                chatMessages.classList.remove('scrolling');
            }, 1000);
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

// Initialize the application
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

