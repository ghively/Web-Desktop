class ThemeCustomizer {
    constructor() {
        this.isOpen = false;
        this.currentTheme = 'mocha';
        this.customThemes = {};
        this.wallpapers = [];
        this.webFonts = [
            'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
            'Poppins', 'Raleway', 'Ubuntu', 'Playfair Display', 'Merriweather',
            'Fira Code', 'JetBrains Mono', 'Source Code Pro', 'IBM Plex Mono', 'Space Mono'
        ];

        this.catppuccinThemes = {
            mocha: {
                name: 'Catppuccin Mocha',
                colors: {
                    base: '#1e1e2e',
                    mantle: '#181825',
                    crust: '#11111b',
                    text: '#cdd6f4',
                    subtext0: '#a6adc8',
                    subtext1: '#bac2de',
                    surface0: '#313244',
                    surface1: '#45475a',
                    surface2: '#585b70',
                    overlay0: '#6c7086',
                    blue: '#89b4fa',
                    green: '#a6e3a1',
                    red: '#f38ba8',
                    yellow: '#f9e2af',
                    peach: '#fab387',
                    pink: '#f2cdcd',
                    teal: '#94e2d5',
                    sky: '#89dceb'
                }
            },
            latte: {
                name: 'Catppuccin Latte',
                colors: {
                    base: '#eff1f5',
                    mantle: '#e6e9ef',
                    crust: '#dce0e8',
                    text: '#4c4f69',
                    subtext0: '#6c6f85',
                    subtext1: '#5c5f77',
                    surface0: '#ccd0da',
                    surface1: '#bcc0cc',
                    surface2: '#acb0be',
                    overlay0: '#9ca0b0',
                    blue: '#1e66f5',
                    green: '#40a02b',
                    red: '#d20f39',
                    yellow: '#df8e1d',
                    peach: '#fe640b',
                    pink: '#e64553',
                    teal: '#179299',
                    sky: '#04a5e5'
                }
            },
            frappe: {
                name: 'Catppuccin Frappé',
                colors: {
                    base: '#303446',
                    mantle: '#292c3c',
                    crust: '#232634',
                    text: '#c6d0f5',
                    subtext0: '#838ba7',
                    subtext1: '#a5adce',
                    surface0: '#414559',
                    surface1: '#51576d',
                    surface2: '#626880',
                    overlay0: '#737994',
                    blue: '#8caaee',
                    green: '#a6d189',
                    red: '#e78284',
                    yellow: '#e5c890',
                    peach: '#ef9f76',
                    pink: '#f4b8e4',
                    teal: '#81c8be',
                    sky: '#99d1db'
                }
            },
            macchiato: {
                name: 'Catppuccin Macchiato',
                colors: {
                    base: '#24273a',
                    mantle: '#1e2030',
                    crust: '#181926',
                    text: '#cad3f5',
                    subtext0: '#8087a2',
                    subtext1: '#939ab7',
                    surface0: '#363a4f',
                    surface1: '#494d64',
                    surface2: '#5b6078',
                    overlay0: '#6e738d',
                    blue: '#8aadf4',
                    green: '#a6da95',
                    red: '#ed8796',
                    yellow: '#eed49f',
                    peach: '#f5a97f',
                    pink: '#f0c6c6',
                    teal: '#8bd5ca',
                    sky: '#91d7e3'
                }
            }
        };

        this.defaultWallpapers = [
            { name: 'Abstract Waves', url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&h=1080&fit=crop' },
            { name: 'Mountain Lake', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop' },
            { name: 'City Lights', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&h=1080&fit=crop' },
            { name: 'Forest Path', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop' },
            { name: 'Ocean Sunset', url: 'https://images.unsplash.com/photo-1509721434272-b79147e0e708?w=1920&h=1080&fit=crop' },
            { name: 'Desert Dunes', url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&h=1080&fit=crop' },
            { name: 'Northern Lights', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&h=1080&fit=crop' },
            { name: 'Starry Night', url: 'https://images.unsplash.com/photo-1444703686981-a3abbc410ed2?w=1920&h=1080&fit=crop' }
        ];

        this.init();
    }

    init() {
        this.loadSavedThemes();
        this.setupWebFonts();
        this.checkSystemTheme();
    }

    loadSavedThemes() {
        const saved = localStorage.getItem('customThemes');
        if (saved) {
            this.customThemes = JSON.parse(saved);
        }

        const savedWallpapers = localStorage.getItem('customWallpapers');
        if (savedWallpapers) {
            this.wallpapers = JSON.parse(savedWallpapers);
        } else {
            this.wallpapers = [...this.defaultWallpapers];
        }

        const currentTheme = localStorage.getItem('selectedTheme');
        if (currentTheme) {
            this.applyTheme(currentTheme);
        }
    }

    setupWebFonts() {
        const fontFamilies = this.webFonts.join('|');
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
        document.head.appendChild(fontLink);
    }

    checkSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            if (!localStorage.getItem('selectedTheme')) {
                this.applyTheme('mocha');
            }
        }

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (localStorage.getItem('followSystemTheme') === 'true') {
                    this.applyTheme(e.matches ? 'mocha' : 'latte');
                }
            });
        }
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.createModal();
        this.populateThemeList();
        this.populateWallpaperGallery();
        this.setupEventListeners();
        this.updatePreview();
    }

    close() {
        if (!this.isOpen) return;

        const modal = document.getElementById('theme-customizer-modal');
        if (modal) {
            modal.remove();
        }
        this.isOpen = false;
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'theme-customizer-modal';
        modal.className = 'theme-modal-overlay';
        modal.innerHTML = `
            <div class="theme-modal-content">
                <div class="theme-modal-header">
                    <h2>🎨 Theme Customizer</h2>
                    <button class="theme-modal-close" onclick="themeCustomizer.close()">×</button>
                </div>

                <div class="theme-modal-body">
                    <div class="theme-tabs">
                        <button class="theme-tab active" data-tab="themes">Themes</button>
                        <button class="theme-tab" data-tab="colors">Colors</button>
                        <button class="theme-tab" data-tab="wallpapers">Wallpapers</button>
                        <button class="theme-tab" data-tab="typography">Typography</button>
                        <button class="theme-tab" data-tab="windows">Windows</button>
                        <button class="theme-tab" data-tab="advanced">Advanced</button>
                    </div>

                    <div class="theme-tab-content">
                        <!-- Themes Tab -->
                        <div class="theme-panel active" id="themes-panel">
                            <div class="theme-section">
                                <h3>Preset Themes</h3>
                                <div class="theme-grid" id="preset-themes"></div>
                            </div>
                            <div class="theme-section">
                                <h3>Custom Themes</h3>
                                <div class="theme-actions">
                                    <button class="btn btn-primary" onclick="themeCustomizer.createCustomTheme()">+ Create New Theme</button>
                                    <button class="btn btn-secondary" onclick="themeCustomizer.importTheme()">📥 Import Theme</button>
                                </div>
                                <div class="theme-grid" id="custom-themes"></div>
                            </div>
                        </div>

                        <!-- Colors Tab -->
                        <div class="theme-panel" id="colors-panel">
                            <div class="color-editor">
                                <div class="color-section">
                                    <h4>Primary Colors</h4>
                                    <div class="color-controls">
                                        <div class="color-control">
                                            <label>Base</label>
                                            <input type="color" id="color-base" data-property="base">
                                            <input type="text" class="color-hex" data-property="base">
                                        </div>
                                        <div class="color-control">
                                            <label>Mantle</label>
                                            <input type="color" id="color-mantle" data-property="mantle">
                                            <input type="text" class="color-hex" data-property="mantle">
                                        </div>
                                        <div class="color-control">
                                            <label>Crust</label>
                                            <input type="color" id="color-crust" data-property="crust">
                                            <input type="text" class="color-hex" data-property="crust">
                                        </div>
                                    </div>
                                </div>
                                <div class="color-section">
                                    <h4>Text Colors</h4>
                                    <div class="color-controls">
                                        <div class="color-control">
                                            <label>Text</label>
                                            <input type="color" id="color-text" data-property="text">
                                            <input type="text" class="color-hex" data-property="text">
                                        </div>
                                        <div class="color-control">
                                            <label>Subtext 0</label>
                                            <input type="color" id="color-subtext0" data-property="subtext0">
                                            <input type="text" class="color-hex" data-property="subtext0">
                                        </div>
                                        <div class="color-control">
                                            <label>Subtext 1</label>
                                            <input type="color" id="color-subtext1" data-property="subtext1">
                                            <input type="text" class="color-hex" data-property="subtext1">
                                        </div>
                                    </div>
                                </div>
                                <div class="color-section">
                                    <h4>Accent Colors</h4>
                                    <div class="color-controls">
                                        <div class="color-control">
                                            <label>Blue</label>
                                            <input type="color" id="color-blue" data-property="blue">
                                            <input type="text" class="color-hex" data-property="blue">
                                        </div>
                                        <div class="color-control">
                                            <label>Green</label>
                                            <input type="color" id="color-green" data-property="green">
                                            <input type="text" class="color-hex" data-property="green">
                                        </div>
                                        <div class="color-control">
                                            <label>Red</label>
                                            <input type="color" id="color-red" data-property="red">
                                            <input type="text" class="color-hex" data-property="red">
                                        </div>
                                        <div class="color-control">
                                            <label>Yellow</label>
                                            <input type="color" id="color-yellow" data-property="yellow">
                                            <input type="text" class="color-hex" data-property="yellow">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Wallpapers Tab -->
                        <div class="theme-panel" id="wallpapers-panel">
                            <div class="wallpaper-section">
                                <h3>Wallpaper Gallery</h3>
                                <div class="wallpaper-grid" id="wallpaper-gallery"></div>
                            </div>
                            <div class="wallpaper-section">
                                <h3>Custom Wallpaper</h3>
                                <div class="wallpaper-upload">
                                    <input type="file" id="wallpaper-input" accept="image/*" style="display: none;">
                                    <button class="btn btn-primary" onclick="document.getElementById('wallpaper-input').click()">
                                        📁 Upload Wallpaper
                                    </button>
                                    <button class="btn btn-secondary" onclick="themeCustomizer.useGradient()">
                                        🌈 Use Gradient Background
                                    </button>
                                </div>
                                <div class="wallpaper-url">
                                    <input type="text" id="wallpaper-url" placeholder="Or enter image URL...">
                                    <button class="btn btn-primary" onclick="themeCustomizer.setWallpaperUrl()">Set Wallpaper</button>
                                </div>
                            </div>
                        </div>

                        <!-- Typography Tab -->
                        <div class="theme-panel" id="typography-panel">
                            <div class="typography-section">
                                <h3>Font Family</h3>
                                <select id="font-family">
                                    ${this.webFonts.map(font => `<option value="${font}">${font}</option>`).join('')}
                                </select>
                            </div>
                            <div class="typography-section">
                                <h3>Font Size</h3>
                                <div class="slider-control">
                                    <input type="range" id="font-size" min="12" max="20" value="14">
                                    <span id="font-size-value">14px</span>
                                </div>
                            </div>
                            <div class="typography-section">
                                <h3>Font Weight</h3>
                                <select id="font-weight">
                                    <option value="300">Light</option>
                                    <option value="400" selected>Regular</option>
                                    <option value="500">Medium</option>
                                    <option value="600">Semibold</option>
                                    <option value="700">Bold</option>
                                </select>
                            </div>
                        </div>

                        <!-- Windows Tab -->
                        <div class="theme-panel" id="windows-panel">
                            <div class="window-section">
                                <h3>Window Appearance</h3>
                                <div class="slider-control">
                                    <label>Opacity</label>
                                    <input type="range" id="window-opacity" min="0.5" max="1" step="0.05" value="0.95">
                                    <span id="window-opacity-value">95%</span>
                                </div>
                                <div class="slider-control">
                                    <label>Border Radius</label>
                                    <input type="range" id="border-radius" min="0" max="20" value="8">
                                    <span id="border-radius-value">8px</span>
                                </div>
                                <div class="slider-control">
                                    <label>Border Width</label>
                                    <input type="range" id="border-width" min="0" max="4" value="1">
                                    <span id="border-width-value">1px</span>
                                </div>
                                <div class="checkbox-control">
                                    <input type="checkbox" id="enable-shadows" checked>
                                    <label for="enable-shadows">Enable Window Shadows</label>
                                </div>
                                <div class="checkbox-control">
                                    <input type="checkbox" id="enable-blur" checked>
                                    <label for="enable-blur">Enable Blur Effects</label>
                                </div>
                            </div>
                        </div>

                        <!-- Advanced Tab -->
                        <div class="theme-panel" id="advanced-panel">
                            <div class="advanced-section">
                                <h3>Animations</h3>
                                <div class="slider-control">
                                    <label>Animation Speed</label>
                                    <input type="range" id="animation-speed" min="0" max="1" step="0.1" value="0.2">
                                    <span id="animation-speed-value">0.2s</span>
                                </div>
                                <div class="checkbox-control">
                                    <input type="checkbox" id="enable-animations" checked>
                                    <label for="enable-animations">Enable Animations</label>
                                </div>
                            </div>
                            <div class="advanced-section">
                                <h3>System Integration</h3>
                                <div class="checkbox-control">
                                    <input type="checkbox" id="follow-system-theme">
                                    <label for="follow-system-theme">Follow System Theme</label>
                                </div>
                                <div class="checkbox-control">
                                    <input type="checkbox" id="theme-scheduling">
                                    <label for="theme-scheduling">Enable Theme Scheduling</label>
                                </div>
                            </div>
                            <div class="advanced-section">
                                <h3>Theme Management</h3>
                                <div class="theme-actions">
                                    <button class="btn btn-primary" onclick="themeCustomizer.saveCurrentTheme()">💾 Save Current Theme</button>
                                    <button class="btn btn-secondary" onclick="themeCustomizer.exportTheme()">📤 Export Theme</button>
                                    <button class="btn btn-danger" onclick="themeCustomizer.resetToDefault()">🔄 Reset to Default</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="theme-preview">
                        <div class="preview-header">
                            <h3>🔍 Preview</h3>
                        </div>
                        <div class="preview-content">
                            <div class="preview-window">
                                <div class="preview-window-header">
                                    <div class="preview-window-controls">
                                        <span class="control close"></span>
                                        <span class="control minimize"></span>
                                        <span class="control maximize"></span>
                                    </div>
                                    <span class="preview-title">Sample Window</span>
                                </div>
                                <div class="preview-window-body">
                                    <p>This is how your themed interface will look.</p>
                                    <button class="preview-button">Sample Button</button>
                                    <div class="preview-input-group">
                                        <input type="text" placeholder="Sample input..." class="preview-input">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="theme-modal-footer">
                    <button class="btn btn-primary" onclick="themeCustomizer.applyCurrentTheme()">Apply Theme</button>
                    <button class="btn btn-secondary" onclick="themeCustomizer.close()">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.theme-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.theme-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.theme-panel').forEach(p => p.classList.remove('active'));

                e.target.classList.add('active');
                const panelId = e.target.dataset.tab + '-panel';
                document.getElementById(panelId).classList.add('active');
            });
        });

        // Color controls
        document.querySelectorAll('input[type="color"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const property = e.target.dataset.property;
                const hexInput = document.querySelector(`.color-hex[data-property="${property}"]`);
                if (hexInput) {
                    hexInput.value = e.target.value;
                }
                this.updatePreviewColor(property, e.target.value);
            });
        });

        document.querySelectorAll('.color-hex').forEach(input => {
            input.addEventListener('input', (e) => {
                const property = e.target.dataset.property;
                const colorInput = document.getElementById(`color-${property}`);
                if (colorInput && /^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    colorInput.value = e.target.value;
                    this.updatePreviewColor(property, e.target.value);
                }
            });
        });

        // Sliders
        document.getElementById('font-size')?.addEventListener('input', (e) => {
            document.getElementById('font-size-value').textContent = e.target.value + 'px';
            this.updatePreview();
        });

        document.getElementById('window-opacity')?.addEventListener('input', (e) => {
            document.getElementById('window-opacity-value').textContent = Math.round(e.target.value * 100) + '%';
            this.updatePreview();
        });

        document.getElementById('border-radius')?.addEventListener('input', (e) => {
            document.getElementById('border-radius-value').textContent = e.target.value + 'px';
            this.updatePreview();
        });

        document.getElementById('border-width')?.addEventListener('input', (e) => {
            document.getElementById('border-width-value').textContent = e.target.value + 'px';
            this.updatePreview();
        });

        document.getElementById('animation-speed')?.addEventListener('input', (e) => {
            document.getElementById('animation-speed-value').textContent = e.target.value + 's';
            this.updatePreview();
        });

        // Typography
        document.getElementById('font-family')?.addEventListener('change', () => this.updatePreview());
        document.getElementById('font-weight')?.addEventListener('change', () => this.updatePreview());

        // Checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updatePreview());
        });

        // Wallpaper upload
        document.getElementById('wallpaper-input')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const wallpaper = {
                        name: file.name,
                        url: event.target.result,
                        custom: true
                    };
                    this.wallpapers.push(wallpaper);
                    this.saveWallpapers();
                    this.populateWallpaperGallery();
                    this.setWallpaper(wallpaper.url);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    populateThemeList() {
        const presetContainer = document.getElementById('preset-themes');
        const customContainer = document.getElementById('custom-themes');

        // Populate preset themes
        presetContainer.innerHTML = Object.entries(this.catppuccinThemes).map(([key, theme]) => `
            <div class="theme-card ${this.currentTheme === key ? 'active' : ''}" onclick="themeCustomizer.applyTheme('${key}')">
                <div class="theme-preview-colors">
                    <span style="background: ${theme.colors.base}"></span>
                    <span style="background: ${theme.colors.mantle}"></span>
                    <span style="background: ${theme.colors.text}"></span>
                    <span style="background: ${theme.colors.blue}"></span>
                    <span style="background: ${theme.colors.green}"></span>
                </div>
                <div class="theme-name">${theme.name}</div>
            </div>
        `).join('');

        // Populate custom themes
        customContainer.innerHTML = Object.entries(this.customThemes).map(([key, theme]) => `
            <div class="theme-card ${this.currentTheme === key ? 'active' : ''}">
                <div class="theme-preview-colors">
                    <span style="background: ${theme.colors.base}"></span>
                    <span style="background: ${theme.colors.mantle}"></span>
                    <span style="background: ${theme.colors.text}"></span>
                    <span style="background: ${theme.colors.blue}"></span>
                    <span style="background: ${theme.colors.green}"></span>
                </div>
                <div class="theme-name">${theme.name}</div>
                <div class="theme-actions">
                    <button class="btn-small" onclick="themeCustomizer.applyTheme('${key}')">Apply</button>
                    <button class="btn-small btn-danger" onclick="themeCustomizer.deleteTheme('${key}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    populateWallpaperGallery() {
        const gallery = document.getElementById('wallpaper-gallery');
        gallery.innerHTML = this.wallpapers.map((wallpaper, index) => `
            <div class="wallpaper-item ${localStorage.getItem('currentWallpaper') === wallpaper.url ? 'active' : ''}"
                 onclick="themeCustomizer.setWallpaper('${wallpaper.url}')">
                <img src="${wallpaper.url}" alt="${wallpaper.name}">
                <div class="wallpaper-name">${wallpaper.name}</div>
                ${wallpaper.custom ? `<button class="wallpaper-delete" onclick="event.stopPropagation(); themeCustomizer.deleteWallpaper(${index})">×</button>` : ''}
            </div>
        `).join('');
    }

    applyTheme(themeId) {
        let theme;

        if (this.catppuccinThemes[themeId]) {
            theme = this.catppuccinThemes[themeId];
        } else if (this.customThemes[themeId]) {
            theme = this.customThemes[themeId];
        } else {
            console.error('Theme not found:', themeId);
            return;
        }

        this.currentTheme = themeId;
        localStorage.setItem('selectedTheme', themeId);

        Object.entries(theme.colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}`, value);
        });

        this.updateColorControls();
        this.populateThemeList();
        this.updatePreview();
    }

    updateColorControls() {
        const currentColors = this.getCurrentThemeColors();
        Object.entries(currentColors).forEach(([key, value]) => {
            const colorInput = document.getElementById(`color-${key}`);
            const hexInput = document.querySelector(`.color-hex[data-property="${key}"]`);

            if (colorInput) colorInput.value = value;
            if (hexInput) hexInput.value = value;
        });
    }

    getCurrentThemeColors() {
        let theme;

        if (this.catppuccinThemes[this.currentTheme]) {
            theme = this.catppuccinThemes[this.currentTheme];
        } else if (this.customThemes[this.currentTheme]) {
            theme = this.customThemes[this.currentTheme];
        } else {
            theme = this.catppuccinThemes.mocha;
        }

        return theme.colors;
    }

    updatePreviewColor(property, value) {
        document.documentElement.style.setProperty(`--${property}`, value);
        this.updatePreview();
    }

    updatePreview() {
        const preview = document.querySelector('.theme-preview .preview-window');
        if (!preview) return;

        // Get current theme colors
        const colors = this.getCurrentThemeColors();

        // Apply current settings to preview
        const fontFamily = document.getElementById('font-family')?.value || 'Inter';
        const fontSize = document.getElementById('font-size')?.value || '14';
        const fontWeight = document.getElementById('font-weight')?.value || '400';
        const windowOpacity = document.getElementById('window-opacity')?.value || '0.95';
        const borderRadius = document.getElementById('border-radius')?.value || '8';
        const borderWidth = document.getElementById('border-width')?.value || '1';
        const animationSpeed = document.getElementById('animation-speed')?.value || '0.2';
        const enableAnimations = document.getElementById('enable-animations')?.checked !== false;
        const enableShadows = document.getElementById('enable-shadows')?.checked !== false;
        const enableBlur = document.getElementById('enable-blur')?.checked !== false;

        preview.style.fontFamily = fontFamily;
        preview.style.fontSize = fontSize + 'px';
        preview.style.fontWeight = fontWeight;
        preview.style.opacity = windowOpacity;
        preview.style.borderRadius = borderRadius + 'px';
        preview.style.borderWidth = borderWidth + 'px';
        preview.style.transition = enableAnimations ? `all ${animationSpeed}s ease` : 'none';
        preview.style.boxShadow = enableShadows ? '0 10px 30px rgba(0, 0, 0, 0.3)' : 'none';
        preview.style.backdropFilter = enableBlur ? 'blur(10px)' : 'none';

        // Update preview content colors
        preview.style.background = colors.surface0;
        preview.style.borderColor = colors.overlay0;
        preview.style.color = colors.text;

        const header = preview.querySelector('.preview-window-header');
        if (header) {
            header.style.background = colors.surface1;
            header.style.borderBottomColor = colors.overlay0;
        }

        const body = preview.querySelector('.preview-window-body');
        if (body) {
            body.style.background = colors.base;
        }

        const button = preview.querySelector('.preview-button');
        if (button) {
            button.style.background = colors.blue;
            button.style.color = colors.base;
        }

        const input = preview.querySelector('.preview-input');
        if (input) {
            input.style.background = colors.surface0;
            input.style.borderColor = colors.overlay0;
            input.style.color = colors.text;
        }
    }

    createCustomTheme() {
        const name = prompt('Enter theme name:');
        if (!name) return;

        const id = name.toLowerCase().replace(/\s+/g, '-');
        const colors = this.getCurrentThemeColors();

        this.customThemes[id] = {
            name,
            colors: { ...colors }
        };

        this.saveThemes();
        this.populateThemeList();
    }

    deleteTheme(themeId) {
        if (confirm('Delete this theme?')) {
            delete this.customThemes[themeId];
            this.saveThemes();
            this.populateThemeList();

            if (this.currentTheme === themeId) {
                this.applyTheme('mocha');
            }
        }
    }

    saveThemes() {
        localStorage.setItem('customThemes', JSON.stringify(this.customThemes));
    }

    saveWallpapers() {
        localStorage.setItem('customWallpapers', JSON.stringify(this.wallpapers));
    }

    setWallpaper(url) {
        document.documentElement.style.setProperty('--wallpaper', `url(${url})`);
        localStorage.setItem('currentWallpaper', url);
        localStorage.setItem('useGradient', 'false');
        this.populateWallpaperGallery();
    }

    setWallpaperUrl() {
        const url = document.getElementById('wallpaper-url').value.trim();
        if (url) {
            this.setWallpaper(url);
        }
    }

    useGradient() {
        const colors = this.getCurrentThemeColors();
        const gradient = `linear-gradient(135deg, ${colors.base} 0%, ${colors.mantle} 50%, ${colors.crust} 100%)`;
        document.documentElement.style.setProperty('--wallpaper', gradient);
        localStorage.setItem('useGradient', 'true');
        localStorage.removeItem('currentWallpaper');
    }

    deleteWallpaper(index) {
        if (confirm('Delete this wallpaper?')) {
            this.wallpapers.splice(index, 1);
            this.saveWallpapers();
            this.populateWallpaperGallery();
        }
    }

    saveCurrentTheme() {
        const name = prompt('Enter theme name:');
        if (!name) return;

        const id = name.toLowerCase().replace(/\s+/g, '-');
        const colors = {};

        document.querySelectorAll('[id^="color-"]').forEach(input => {
            const property = input.dataset.property;
            colors[property] = input.value;
        });

        this.customThemes[id] = {
            name,
            colors,
            settings: {
                fontFamily: document.getElementById('font-family').value,
                fontSize: document.getElementById('font-size').value,
                fontWeight: document.getElementById('font-weight').value,
                windowOpacity: document.getElementById('window-opacity').value,
                borderRadius: document.getElementById('border-radius').value,
                borderWidth: document.getElementById('border-width').value,
                animationSpeed: document.getElementById('animation-speed').value,
                enableAnimations: document.getElementById('enable-animations').checked,
                enableShadows: document.getElementById('enable-shadows').checked,
                enableBlur: document.getElementById('enable-blur').checked
            }
        };

        this.saveThemes();
        this.populateThemeList();
        alert('Theme saved successfully!');
    }

    exportTheme() {
        const themeData = {
            name: 'Custom Theme',
            colors: this.getCurrentThemeColors(),
            settings: {
                fontFamily: document.getElementById('font-family').value,
                fontSize: document.getElementById('font-size').value,
                fontWeight: document.getElementById('font-weight').value,
                windowOpacity: document.getElementById('window-opacity').value,
                borderRadius: document.getElementById('border-radius').value,
                borderWidth: document.getElementById('border-width').value,
                animationSpeed: document.getElementById('animation-speed').value,
                enableAnimations: document.getElementById('enable-animations').checked,
                enableShadows: document.getElementById('enable-shadows').checked,
                enableBlur: document.getElementById('enable-blur').checked
            }
        };

        const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'theme.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importTheme() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const themeData = JSON.parse(event.target.result);
                        const id = themeData.name.toLowerCase().replace(/\s+/g, '-');
                        this.customThemes[id] = themeData;
                        this.saveThemes();
                        this.populateThemeList();
                        alert('Theme imported successfully!');
                    } catch (error) {
                        alert('Invalid theme file!');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    applyCurrentTheme() {
        // Apply all current customizations
        document.querySelectorAll('[id^="color-"]').forEach(input => {
            const property = input.dataset.property;
            document.documentElement.style.setProperty(`--${property}`, input.value);
        });

        const fontFamily = document.getElementById('font-family').value;
        const fontSize = document.getElementById('font-size').value;
        const fontWeight = document.getElementById('font-weight').value;
        const windowOpacity = document.getElementById('window-opacity').value;
        const borderRadius = document.getElementById('border-radius').value;
        const borderWidth = document.getElementById('border-width').value;
        const animationSpeed = document.getElementById('animation-speed').value;
        const enableAnimations = document.getElementById('enable-animations').checked;
        const followSystem = document.getElementById('follow-system-theme').checked;

        document.documentElement.style.setProperty('--font-family', fontFamily);
        document.documentElement.style.setProperty('--font-size', fontSize + 'px');
        document.documentElement.style.setProperty('--font-weight', fontWeight);
        document.documentElement.style.setProperty('--window-opacity', windowOpacity);
        document.documentElement.style.setProperty('--border-radius', borderRadius + 'px');
        document.documentElement.style.setProperty('--border-width', borderWidth + 'px');
        document.documentElement.style.setProperty('--animation-speed', animationSpeed + 's');

        document.body.style.fontFamily = fontFamily;
        document.body.style.fontSize = fontSize + 'px';
        document.body.style.fontWeight = fontWeight;

        localStorage.setItem('fontFamily', fontFamily);
        localStorage.setItem('fontSize', fontSize);
        localStorage.setItem('fontWeight', fontWeight);
        localStorage.setItem('windowOpacity', windowOpacity);
        localStorage.setItem('borderRadius', borderRadius);
        localStorage.setItem('borderWidth', borderWidth);
        localStorage.setItem('animationSpeed', animationSpeed);
        localStorage.setItem('enableAnimations', enableAnimations);
        localStorage.setItem('followSystemTheme', followSystem);

        this.close();
        alert('Theme applied successfully!');
    }

    resetToDefault() {
        if (confirm('Reset all theme settings to default?')) {
            this.applyTheme('mocha');
            localStorage.clear();
            location.reload();
        }
    }
}

// Initialize theme customizer
const themeCustomizer = new ThemeCustomizer();