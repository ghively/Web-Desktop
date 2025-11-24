class MarketplaceApp {
    constructor() {
        this.apps = [];
        this.categories = [];
        this.installedApps = [];
        this.currentView = 'browse';
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.currentSort = 'name';
        this.installationJobs = new Map();
        this.isModalOpen = false;

        // Sample apps data for demonstration
        this.sampleApps = [
            {
                id: 'code-editor-pro',
                name: 'Code Editor Pro',
                description: 'Advanced code editor with syntax highlighting, IntelliSense, and Git integration',
                category: 'development',
                icon: '📝',
                rating: 4.8,
                downloadCount: 15420,
                size: '15.2 MB',
                developer: 'DevTools Inc.',
                screenshots: ['screenshot1.png', 'screenshot2.png'],
                requirements: ['Node.js 16+', '2GB RAM', '500MB Storage'],
                permissions: ['File System Access', 'Network Access'],
                tags: ['editor', 'development', 'git'],
                featured: true,
                installUrl: 'https://example.com/code-editor-pro.zip'
            },
            {
                id: 'media-center',
                name: 'Media Center',
                description: 'Organize and stream your media collection with this comprehensive media center',
                category: 'multimedia',
                icon: '🎬',
                rating: 4.6,
                downloadCount: 8750,
                size: '42.8 MB',
                developer: 'MediaSoft',
                screenshots: ['media1.png', 'media2.png'],
                requirements: ['4GB RAM', '2GB Storage'],
                permissions: ['Media Library Access', 'Network Streaming'],
                tags: ['media', 'streaming', 'organizer'],
                featured: true,
                installUrl: 'https://example.com/media-center.zip'
            },
            {
                id: 'file-explorer',
                name: 'File Explorer Plus',
                description: 'Enhanced file manager with cloud sync and advanced search capabilities',
                category: 'utilities',
                icon: '📁',
                rating: 4.5,
                downloadCount: 12300,
                size: '8.4 MB',
                developer: 'UtilityWorks',
                screenshots: ['files1.png'],
                requirements: ['1GB RAM', '100MB Storage'],
                permissions: ['File System Access', 'Cloud Storage'],
                tags: ['files', 'cloud', 'search'],
                featured: false,
                installUrl: 'https://example.com/file-explorer.zip'
            },
            {
                id: 'task-manager',
                name: 'Task Manager Pro',
                description: 'Comprehensive task and project management tool with team collaboration features',
                category: 'productivity',
                icon: '✅',
                rating: 4.7,
                downloadCount: 9200,
                size: '12.1 MB',
                developer: 'ProductiveApps',
                screenshots: ['task1.png', 'task2.png'],
                requirements: ['2GB RAM', '200MB Storage'],
                permissions: ['Local Storage', 'Network Sync'],
                tags: ['tasks', 'projects', 'collaboration'],
                featured: true,
                installUrl: 'https://example.com/task-manager.zip'
            },
            {
                id: 'system-monitor',
                name: 'System Monitor',
                description: 'Real-time system monitoring with advanced analytics and alerting',
                category: 'system',
                icon: '📊',
                rating: 4.4,
                downloadCount: 6800,
                size: '6.7 MB',
                developer: 'SysTools',
                screenshots: ['monitor1.png'],
                requirements: ['1GB RAM', '50MB Storage'],
                permissions: ['System Information', 'Performance Data'],
                tags: ['monitoring', 'analytics', 'system'],
                featured: false,
                installUrl: 'https://example.com/system-monitor.zip'
            },
            {
                id: 'puzzle-mania',
                name: 'Puzzle Mania',
                description: 'Collection of brain-teasing puzzles and logic games',
                category: 'games',
                icon: '🎮',
                rating: 4.3,
                downloadCount: 5400,
                size: '25.6 MB',
                developer: 'GameStudio',
                screenshots: ['game1.png', 'game2.png'],
                requirements: ['2GB RAM', '500MB Storage'],
                permissions: ['Local Storage', 'Audio'],
                tags: ['puzzle', 'games', 'brain'],
                featured: false,
                installUrl: 'https://example.com/puzzle-mania.zip'
            },
            {
                id: 'photo-editor',
                name: 'Photo Editor',
                description: 'Professional photo editing tool with filters and advanced effects',
                category: 'graphics',
                icon: '🎨',
                rating: 4.6,
                downloadCount: 7890,
                size: '38.9 MB',
                developer: 'CreativeSoft',
                screenshots: ['photo1.png', 'photo2.png'],
                requirements: ['4GB RAM', '1GB Storage'],
                permissions: ['File System Access', 'Image Processing'],
                tags: ['photo', 'editing', 'graphics'],
                featured: true,
                installUrl: 'https://example.com/photo-editor.zip'
            },
            {
                id: 'network-tools',
                name: 'Network Tools',
                description: 'Comprehensive network analysis and diagnostic tools',
                category: 'network',
                icon: '🌐',
                rating: 4.2,
                downloadCount: 4200,
                size: '4.3 MB',
                developer: 'NetPro',
                screenshots: ['net1.png'],
                requirements: ['512MB RAM', '50MB Storage'],
                permissions: ['Network Access', 'System Information'],
                tags: ['network', 'diagnostics', 'tools'],
                featured: false,
                installUrl: 'https://example.com/network-tools.zip'
            },
            {
                id: 'office-suite',
                name: 'Office Suite',
                description: 'Complete office productivity suite with documents, spreadsheets, and presentations',
                category: 'office',
                icon: '📄',
                rating: 4.5,
                downloadCount: 11200,
                size: '156.2 MB',
                developer: 'OfficePro',
                screenshots: ['office1.png', 'office2.png'],
                requirements: ['4GB RAM', '2GB Storage'],
                permissions: ['File System Access', 'Document Processing'],
                tags: ['office', 'documents', 'productivity'],
                featured: true,
                installUrl: 'https://example.com/office-suite.zip'
            },
            {
                id: 'learn-python',
                name: 'Learn Python',
                description: 'Interactive Python learning environment with tutorials and exercises',
                category: 'education',
                icon: '🐍',
                rating: 4.7,
                downloadCount: 8650,
                size: '18.4 MB',
                developer: 'EduTech',
                screenshots: ['learn1.png'],
                requirements: ['2GB RAM', '200MB Storage'],
                permissions: ['Code Execution', 'Local Storage'],
                tags: ['python', 'programming', 'education'],
                featured: false,
                installUrl: 'https://example.com/learn-python.zip'
            }
        ];

        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadInstalledApps();
        this.setupEventListeners();
        this.loadApps();
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('marketplace-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.renderApps();
            });
        }

        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                const category = e.currentTarget.dataset.category;

                if (view) {
                    this.switchView(view);
                } else if (category) {
                    this.filterByCategory(category);
                }

                this.updateNavigation(e.currentTarget);
            });
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sort = e.currentTarget.dataset.sort;
                if (sort) {
                    this.currentSort = sort;
                    this.updateFilterButtons(e.currentTarget);
                    this.renderApps();
                }
            });
        });

        // Close modal
        const closeBtn = document.querySelector('.close-marketplace');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeMarketplace());
        }

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen) {
                this.closeMarketplace();
            }
        });

        // Close on background click
        const modal = document.getElementById('marketplace-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeMarketplace();
                }
            });
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/marketplace/categories');
            if (response.ok) {
                this.categories = await response.json();
            } else {
                // Use default categories
                this.categories = [
                    { id: 'productivity', name: 'Productivity', icon: '📋' },
                    { id: 'development', name: 'Development', icon: '💻' },
                    { id: 'multimedia', name: 'Multimedia', icon: '🎵' },
                    { id: 'games', name: 'Games', icon: '🎮' },
                    { id: 'education', name: 'Education', icon: '📚' },
                    { id: 'utilities', name: 'Utilities', icon: '🔧' },
                    { id: 'system', name: 'System', icon: '⚙️' },
                    { id: 'graphics', name: 'Graphics', icon: '🎨' },
                    { id: 'network', name: 'Network', icon: '🌐' },
                    { id: 'office', name: 'Office', icon: '📄' }
                ];
            }
        } catch (error) {
            console.warn('Failed to load categories, using defaults:', error);
            this.categories = [
                { id: 'productivity', name: 'Productivity', icon: '📋' },
                { id: 'development', name: 'Development', icon: '💻' },
                { id: 'multimedia', name: 'Multimedia', icon: '🎵' },
                { id: 'games', name: 'Games', icon: '🎮' },
                { id: 'education', name: 'Education', icon: '📚' },
                { id: 'utilities', name: 'Utilities', icon: '🔧' }
            ];
        }
    }

    async loadInstalledApps() {
        try {
            const response = await fetch('/api/marketplace/installed');
            if (response.ok) {
                const data = await response.json();
                this.installedApps = data.apps || [];
            }
        } catch (error) {
            console.warn('Failed to load installed apps:', error);
            this.installedApps = [];
        }
    }

    async loadApps() {
        this.showLoading();
        try {
            const params = new URLSearchParams({
                category: this.currentCategory !== 'all' ? this.currentCategory : '',
                search: this.searchTerm,
                sort: this.currentSort,
                page: 1,
                limit: 50
            });

            const response = await fetch(`/api/marketplace/apps?${params}`);
            if (response.ok) {
                const data = await response.json();
                this.apps = data.apps || [];
            } else {
                // Use sample data for demonstration
                this.apps = this.sampleApps;
            }
        } catch (error) {
            console.warn('Failed to load apps from server, using sample data:', error);
            this.apps = this.sampleApps;
        }

        this.renderApps();
    }

    renderApps() {
        const appsContainer = document.querySelector('.marketplace-apps');
        if (!appsContainer) return;

        let filteredApps = [...this.apps];

        // Apply search filter
        if (this.searchTerm) {
            filteredApps = filteredApps.filter(app =>
                app.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                app.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                app.tags.some(tag => tag.toLowerCase().includes(this.searchTerm.toLowerCase()))
            );
        }

        // Apply category filter
        if (this.currentCategory !== 'all') {
            filteredApps = filteredApps.filter(app => app.category === this.currentCategory);
        }

        // Apply sorting
        filteredApps.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'rating':
                    return b.rating - a.rating;
                case 'downloads':
                    return b.downloadCount - a.downloadCount;
                case 'updated':
                    return 0; // Would need actual update dates
                default:
                    return 0;
            }
        });

        // Show featured apps section only for browse view
        const featuredApps = filteredApps.filter(app => app.featured);
        const regularApps = filteredApps.filter(app => !app.featured);

        let html = '';

        if (this.currentView === 'browse' && featuredApps.length > 0) {
            html += this.renderFeaturedSection(featuredApps);
        }

        if (regularApps.length === 0 && featuredApps.length === 0) {
            html += this.renderEmptyState();
        } else {
            html += `
                <div class="apps-grid">
                    ${regularApps.map(app => this.renderAppCard(app)).join('')}
                </div>
            `;
        }

        appsContainer.innerHTML = html;

        // Setup app card event listeners
        this.setupAppCardListeners();
    }

    renderFeaturedSection(featuredApps) {
        return `
            <div class="featured-section">
                <div class="featured-header">
                    <h2 class="featured-title">Featured Apps</h2>
                </div>
                <div class="featured-carousel">
                    ${featuredApps.map(app => this.renderFeaturedApp(app)).join('')}
                </div>
            </div>
            <div class="content-header">
                <h2>All Apps</h2>
                <p>Browse our complete collection of applications</p>
            </div>
        `;
    }

    renderFeaturedApp(app) {
        const isInstalled = this.isAppInstalled(app.id);

        return `
            <div class="featured-app" data-app-id="${app.id}">
                <div class="app-card-header">
                    <span class="featured-badge">⭐ Featured</span>
                    <span class="app-icon">${app.icon}</span>
                    <span class="app-category">${this.getCategoryName(app.category)}</span>
                </div>
                <div class="app-card-body">
                    <h3 class="app-name">${app.name}</h3>
                    <p class="app-description">${app.description}</p>
                    <div class="app-meta">
                        <div class="app-rating">
                            ${this.renderStars(app.rating)}
                            <span class="rating-text">${app.rating}</span>
                        </div>
                        <span class="app-size">${app.size}</span>
                    </div>
                    <div class="app-actions">
                        <button class="btn-install ${isInstalled ? 'installed' : ''}" data-app-id="${app.id}">
                            ${isInstalled ? '✓ Installed' : 'Install'}
                        </button>
                        <button class="btn-details" data-app-id="${app.id}">ℹ️</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderAppCard(app) {
        const isInstalled = this.isAppInstalled(app.id);

        return `
            <div class="app-card" data-app-id="${app.id}">
                <div class="app-card-header">
                    <span class="app-icon">${app.icon}</span>
                    <span class="app-category">${this.getCategoryName(app.category)}</span>
                </div>
                <div class="app-card-body">
                    <h3 class="app-name">${app.name}</h3>
                    <p class="app-description">${app.description}</p>
                    <div class="app-meta">
                        <div class="app-rating">
                            ${this.renderStars(app.rating)}
                            <span class="rating-text">${app.rating}</span>
                        </div>
                        <span class="app-size">${app.size}</span>
                    </div>
                    <div class="app-actions">
                        <button class="btn-install ${isInstalled ? 'installed' : ''}" data-app-id="${app.id}">
                            ${isInstalled ? '✓ Installed' : 'Install'}
                        </button>
                        <button class="btn-details" data-app-id="${app.id}">ℹ️</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<span class="star">★</span>';
        }
        if (hasHalfStar) {
            stars += '<span class="star">★</span>'; // Using full star for simplicity
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<span class="star empty">★</span>';
        }

        return stars;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No apps found</h3>
                <p>Try adjusting your search terms or browse different categories to find what you're looking for.</p>
            </div>
        `;
    }

    showLoading() {
        const appsContainer = document.querySelector('.marketplace-apps');
        if (appsContainer) {
            appsContainer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <h3>Loading apps...</h3>
                    <p>Fetching the latest applications from the marketplace</p>
                </div>
            `;
        }
    }

    setupAppCardListeners() {
        // Install buttons
        document.querySelectorAll('.btn-install').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const appId = btn.dataset.appId;
                if (!btn.classList.contains('installed')) {
                    this.installApp(appId);
                }
            });
        });

        // Details buttons
        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const appId = btn.dataset.appId;
                this.showAppDetails(appId);
            });
        });

        // App cards
        document.querySelectorAll('.app-card, .featured-app').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-install') && !e.target.classList.contains('btn-details')) {
                    const appId = card.dataset.appId;
                    this.showAppDetails(appId);
                }
            });
        });
    }

    async installApp(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        try {
            const response = await fetch('/api/marketplace/install', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: app.installUrl,
                    scanLevel: 'standard'
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.installationJobs.set(result.sessionId, {
                        appId: appId,
                        appName: app.name,
                        status: 'pending'
                    });

                    this.showInstallationProgress(result.sessionId, app);
                    this.monitorInstallation(result.sessionId);
                } else {
                    this.showError(`Failed to start installation: ${result.error}`);
                }
            } else {
                // Simulate installation for demo
                this.simulateInstallation(appId, app);
            }
        } catch (error) {
            console.warn('Installation failed, simulating for demo:', error);
            this.simulateInstallation(appId, app);
        }
    }

    simulateInstallation(appId, app) {
        const sessionId = 'demo-' + Date.now();
        this.installationJobs.set(sessionId, {
            appId: appId,
            appName: app.name,
            status: 'pending'
        });

        this.showInstallationProgress(sessionId, app);
        this.simulateInstallationProgress(sessionId);
    }

    simulateInstallationProgress(sessionId) {
        const job = this.installationJobs.get(sessionId);
        if (!job) return;

        const progressSteps = [
            { progress: 15, status: 'downloading', message: 'Downloading application...' },
            { progress: 35, status: 'extracting', message: 'Extracting files...' },
            { progress: 55, status: 'validating', message: 'Validating manifest...' },
            { progress: 75, status: 'scanning', message: 'Scanning for security threats...' },
            { progress: 90, status: 'installing', message: 'Installing application...' },
            { progress: 100, status: 'completed', message: 'Installation completed!' }
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep >= progressSteps.length) {
                clearInterval(interval);
                this.completeInstallation(sessionId);
                return;
            }

            const step = progressSteps[currentStep];
            this.updateInstallationProgress(sessionId, step);
            currentStep++;
        }, 1500);
    }

    async monitorInstallation(sessionId) {
        const checkProgress = async () => {
            try {
                const response = await fetch(`/api/marketplace/install/${sessionId}/progress`);
                if (response.ok) {
                    const progress = await response.json();
                    this.updateInstallationProgress(sessionId, progress);

                    if (progress.status === 'completed') {
                        this.completeInstallation(sessionId);
                    } else if (progress.status === 'failed') {
                        this.installationFailed(sessionId, progress.error);
                    } else {
                        setTimeout(checkProgress, 1000);
                    }
                }
            } catch (error) {
                console.warn('Failed to check installation progress:', error);
            }
        };

        setTimeout(checkProgress, 1000);
    }

    showInstallationProgress(sessionId, app) {
        const existingProgress = document.querySelector('.installation-progress');
        if (!existingProgress) {
            const progressHtml = `
                <div class="installation-progress" data-session-id="${sessionId}">
                    <div class="installation-header">
                        <h3>Installing ${app.name}</h3>
                        <span class="installation-status">Starting...</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar"></div>
                    </div>
                    <div class="installation-details">
                        <div class="installation-step">
                            <span class="icon">⏳</span>
                            <span class="step-text">Initializing installation...</span>
                        </div>
                        <span class="progress-percent">0%</span>
                    </div>
                    <div class="installation-actions">
                        <button class="btn-cancel" data-session-id="${sessionId}">Cancel</button>
                    </div>
                </div>
            `;

            const appsContainer = document.querySelector('.marketplace-apps');
            if (appsContainer) {
                appsContainer.insertAdjacentHTML('afterbegin', progressHtml);
            }
        }

        // Setup cancel button
        const cancelBtn = document.querySelector(`.btn-cancel[data-session-id="${sessionId}"]`);
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelInstallation(sessionId));
        }
    }

    updateInstallationProgress(sessionId, progress) {
        const progressElement = document.querySelector(`.installation-progress[data-session-id="${sessionId}"]`);
        if (!progressElement) return;

        const progressBar = progressElement.querySelector('.progress-bar');
        const statusText = progressElement.querySelector('.installation-status');
        const stepText = progressElement.querySelector('.step-text');
        const progressPercent = progressElement.querySelector('.progress-percent');

        progressBar.style.width = `${progress.progress || 0}%`;
        statusText.textContent = this.formatStatus(progress.status);
        stepText.textContent = progress.message || 'Processing...';
        progressPercent.textContent = `${Math.round(progress.progress || 0)}%`;
    }

    formatStatus(status) {
        const statusMap = {
            'pending': 'Starting...',
            'downloading': 'Downloading...',
            'extracting': 'Extracting...',
            'validating': 'Validating...',
            'scanning': 'Scanning...',
            'installing': 'Installing...',
            'completed': 'Completed!',
            'failed': 'Failed'
        };
        return statusMap[status] || status;
    }

    async completeInstallation(sessionId) {
        const job = this.installationJobs.get(sessionId);
        if (!job) return;

        // Update installed apps list
        await this.loadInstalledApps();

        // Update UI
        const progressElement = document.querySelector(`.installation-progress[data-session-id="${sessionId}"]`);
        if (progressElement) {
            setTimeout(() => {
                progressElement.remove();
            }, 2000);
        }

        // Update app cards
        this.renderApps();

        this.installationJobs.delete(sessionId);
    }

    installationFailed(sessionId, error) {
        const progressElement = document.querySelector(`.installation-progress[data-session-id="${sessionId}"]`);
        if (progressElement) {
            const statusText = progressElement.querySelector('.installation-status');
            statusText.textContent = `Failed: ${error}`;
            statusText.style.color = 'var(--red)';
        }

        this.installationJobs.delete(sessionId);
    }

    async cancelInstallation(sessionId) {
        try {
            const response = await fetch(`/api/marketplace/install/${sessionId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const progressElement = document.querySelector(`.installation-progress[data-session-id="${sessionId}"]`);
                if (progressElement) {
                    progressElement.remove();
                }
                this.installationJobs.delete(sessionId);
            }
        } catch (error) {
            console.warn('Failed to cancel installation:', error);
        }
    }

    showAppDetails(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        const isInstalled = this.isAppInstalled(appId);
        const detailHtml = `
            <div class="app-detail-modal" id="app-detail-modal">
                <div class="app-detail-container">
                    <div class="app-detail-header">
                        <div class="app-detail-icon">${app.icon}</div>
                        <div class="app-detail-info">
                            <h1>${app.name}</h1>
                            <div class="developer">by ${app.developer}</div>
                            <div class="app-detail-meta">
                                <div class="app-rating">
                                    ${this.renderStars(app.rating)}
                                    <span class="rating-text">${app.rating} (${app.downloadCount.toLocaleString()} downloads)</span>
                                </div>
                                <span class="app-size">${app.size}</span>
                            </div>
                        </div>
                        <div class="app-detail-actions">
                            <button class="btn-install ${isInstalled ? 'installed' : ''}" data-app-id="${app.id}">
                                ${isInstalled ? '✓ Installed' : 'Install'}
                            </button>
                            <button class="close-detail">×</button>
                        </div>
                    </div>
                    <div class="app-detail-body">
                        <div class="detail-section">
                            <h3>Description</h3>
                            <p>${app.description}</p>
                        </div>

                        <div class="detail-section">
                            <h3>Screenshots</h3>
                            <div class="screenshots">
                                ${app.screenshots.map(screenshot => `
                                    <div class="screenshot">📸 ${screenshot}</div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="detail-section">
                            <h3>Requirements</h3>
                            <ul class="requirements-list">
                                ${app.requirements.map(req => `
                                    <li><span class="icon">✓</span> ${req}</li>
                                `).join('')}
                            </ul>
                        </div>

                        <div class="detail-section">
                            <h3>Permissions</h3>
                            <ul class="permissions-list">
                                ${app.permissions.map(perm => `
                                    <li><span class="icon">🔒</span> ${perm}</li>
                                `).join('')}
                            </ul>
                        </div>

                        <div class="detail-section">
                            <h3>Reviews</h3>
                            <div class="reviews">
                                ${this.renderSampleReviews()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', detailHtml);

        // Setup detail modal event listeners
        const modal = document.getElementById('app-detail-modal');
        const closeBtn = modal.querySelector('.close-detail');
        const installBtn = modal.querySelector('.btn-install');

        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        if (!isInstalled) {
            installBtn.addEventListener('click', () => {
                modal.remove();
                this.installApp(appId);
            });
        }
    }

    renderSampleReviews() {
        const reviews = [
            {
                author: 'John Doe',
                rating: 5,
                date: '2 days ago',
                content: 'Excellent application! Exactly what I was looking for. Highly recommend.'
            },
            {
                author: 'Jane Smith',
                rating: 4,
                date: '1 week ago',
                content: 'Great app with lots of features. The interface could be a bit more intuitive though.'
            },
            {
                author: 'Mike Johnson',
                rating: 5,
                date: '2 weeks ago',
                content: 'Perfect for my workflow. Saves me so much time every day.'
            }
        ];

        return reviews.map(review => `
            <div class="review">
                <div class="review-header">
                    <div class="review-author">
                        <div class="review-avatar">${review.author.charAt(0)}</div>
                        <div>
                            <div class="review-name">${review.author}</div>
                            <div class="review-date">${review.date}</div>
                        </div>
                    </div>
                    <div class="review-rating">
                        ${this.renderStars(review.rating)}
                    </div>
                </div>
                <div class="review-content">${review.content}</div>
            </div>
        `).join('');
    }

    isAppInstalled(appId) {
        return this.installedApps.some(app => app.id === appId);
    }

    getCategoryName(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? category.name : categoryId;
    }

    switchView(view) {
        this.currentView = view;

        // Update content header
        const contentHeader = document.querySelector('.content-header');
        if (contentHeader) {
            let title = 'Browse Apps';
            let description = 'Discover and install new applications';

            switch (view) {
                case 'installed':
                    title = 'My Apps';
                    description = 'Manage your installed applications';
                    break;
                case 'updates':
                    title = 'Updates';
                    description = 'Check for available updates';
                    break;
                case 'recent':
                    title = 'Recently Used';
                    description = 'Apps you have used recently';
                    break;
            }

            contentHeader.innerHTML = `
                <h2>${title}</h2>
                <p>${description}</p>
            `;
        }

        this.loadApps();
    }

    filterByCategory(category) {
        this.currentCategory = category;
        this.currentView = 'browse';
        this.loadApps();
    }

    updateNavigation(activeItem) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    updateFilterButtons(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    showError(message) {
        alert(`Error: ${message}`);
    }

    openMarketplace() {
        this.isModalOpen = true;
        const modal = document.getElementById('marketplace-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
        this.loadApps();
    }

    closeMarketplace() {
        this.isModalOpen = false;
        const modal = document.getElementById('marketplace-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Remove any detail modal
        const detailModal = document.getElementById('app-detail-modal');
        if (detailModal) {
            detailModal.remove();
        }
    }
}

// Initialize marketplace when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.marketplaceApp = new MarketplaceApp();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarketplaceApp;
}