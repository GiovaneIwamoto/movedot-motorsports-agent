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
    }

    startStatusUpdater() {
        // Update status indicator every second
        setInterval(() => {
            this.updateStatusIndicator();
        }, 1000);
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

        // Data sources sidebar toggle
        const dataSourcesToggle = document.getElementById('data-sources-toggle');
        const dataSourcesSidebar = document.getElementById('data-sources-sidebar');
        const closeDataSources = document.getElementById('close-data-sources');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        if (dataSourcesToggle) {
            dataSourcesToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDataSourcesSidebar();
            });
        }

        if (closeDataSources) {
            closeDataSources.addEventListener('click', () => {
                this.closeDataSourcesSidebar();
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                this.closeDataSourcesSidebar();
            });
        }

        // Close sidebar on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dataSourcesSidebar.classList.contains('open')) {
                this.closeDataSourcesSidebar();
            }
        });
    }

    async loadDataOverview() {
        try {
            const response = await fetch(`${this.apiBase}/data/overview`);
            const data = await response.json();
            
            this.updateDataSources(data.available_datasets);
            this.updateMetrics(data.total_datasets);
            
        } catch (error) {
            console.error('Error loading data overview:', error);
            this.showError('Erro ao carregar dados');
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
        
        if (connected) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Online';
        } else {
            statusIndicator.className = 'status-indicator';
            statusText.textContent = 'Connecting...';
        }
    }

    showQueryStatus(status, message) {
        const queryStatus = document.getElementById('query-status');
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        const progressBar = document.getElementById('query-progress');
        
        if (status === 'processing') {
            queryStatus.style.display = 'flex';
            statusDot.className = 'status-dot processing';
            statusText.textContent = message || 'Processing...';
            progressBar.style.display = 'block';
        } else if (status === 'success') {
            statusDot.className = 'status-dot success';
            statusText.textContent = message || 'Completed';
            progressBar.style.display = 'none';
            setTimeout(() => {
                queryStatus.style.display = 'none';
            }, 2000);
        } else if (status === 'error') {
            statusDot.className = 'status-dot error';
            statusText.textContent = message || 'Error';
            progressBar.style.display = 'none';
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

