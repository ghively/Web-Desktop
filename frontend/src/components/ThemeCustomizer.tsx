import React, { useState, useEffect } from 'react';
import { useTheme, ThemeConfig } from '../lib/theme/ThemeEngine';
import { Palette, Settings, Download, Upload, RefreshCw, Plus, X, Eye, EyeOff, Monitor, Sun, Moon, Zap, Layers } from 'lucide-react';

const ThemeCustomizer: React.FC<{ windowId?: string }> = () => {
  const { theme, uiTheme, setTheme, setUITheme, themeEngine } = useTheme();
  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'typography' | 'ui' | 'custom'>('presets');
  const [customTheme, setCustomTheme] = useState<ThemeConfig>(theme);
  const [previewMode, setPreviewMode] = useState(false);

  const presetThemes = themeEngine.getPresetThemes();
  const customThemes = themeEngine.getCustomThemes();

  useEffect(() => {
    setCustomTheme({ ...theme });
  }, [theme]);

  const handleColorChange = (colorKey: keyof ThemeConfig['colors'], value: string) => {
    setCustomTheme({
      ...customTheme,
      colors: {
        ...customTheme.colors,
        [colorKey]: value
      }
    });
  };

  const handlePresetSelect = (presetTheme: ThemeConfig) => {
    if (previewMode) {
      setCustomTheme(presetTheme);
    } else {
      setTheme(presetTheme);
    }
  };

  const saveCustomTheme = () => {
    const newTheme = {
      ...customTheme,
      id: `custom-${Date.now()}`,
      name: customTheme.name || 'Custom Theme'
    };
    themeEngine.addCustomTheme(newTheme);
    setTheme(newTheme);
  };

  const exportTheme = () => {
    const dataStr = JSON.stringify(customTheme, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `${customTheme.name.replace(/\s+/g, '-').toLowerCase()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTheme = JSON.parse(e.target?.result as string);
          setCustomTheme(importedTheme);
          setTheme(importedTheme);
        } catch (error) {
          alert('Invalid theme file');
        }
      };
      reader.readAsText(file);
    }
  };

  const generateRandomTheme = () => {
    const randomTheme = themeEngine.generateRandomTheme();
    setCustomTheme(randomTheme);
    if (!previewMode) {
      setTheme(randomTheme);
    }
  };

  const ColorPicker = ({ label, colorKey, value }: { label: string; colorKey: keyof ThemeConfig['colors']; value: string }) => (
    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value}
          onChange={(e) => handleColorChange(colorKey, e.target.value)}
          className="w-8 h-8 border border-gray-600 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleColorChange(colorKey, e.target.value)}
          className="w-24 bg-gray-700 text-sm px-2 py-1 rounded border border-gray-600"
        />
      </div>
    </div>
  );

  return (
    <div className="h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Palette className="w-6 h-6 text-purple-500" />
            <span>Theme Customizer</span>
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`p-2 rounded-lg transition-colors ${
                previewMode ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title={previewMode ? 'Preview Mode' : 'Live Mode'}
            >
              {previewMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={generateRandomTheme}
              className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors"
              title="Generate Random Theme"
            >
              <Zap className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-gray-600"></div>
            <button
              onClick={exportTheme}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <label className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={importTheme}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mt-4">
          {[
            { id: 'presets', label: 'Presets', icon: Layers },
            { id: 'colors', label: 'Colors', icon: Palette },
            { id: 'typography', label: 'Typography', icon: Settings },
            { id: 'ui', label: 'UI Settings', icon: Monitor },
            { id: 'custom', label: 'Custom CSS', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
        {activeTab === 'presets' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Preset Themes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...presetThemes, ...customThemes].map((presetTheme, index) => (
                  <div
                    key={`${presetTheme.id}-${index}`}
                    className={`bg-gray-800 rounded-lg p-4 cursor-pointer transition-all hover:ring-2 hover:ring-purple-500 ${
                      theme.id === presetTheme.id && !previewMode ? 'ring-2 ring-purple-500' : ''
                    } ${customTheme.id === presetTheme.id && previewMode ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => handlePresetSelect(presetTheme)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{presetTheme.name}</h3>
                      {presetTheme.isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: presetTheme.colors.primary }}
                        />
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: presetTheme.colors.secondary }}
                        />
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: presetTheme.colors.accent }}
                        />
                        <div
                          className="w-8 h-8 rounded border border-gray-600"
                          style={{ backgroundColor: presetTheme.colors.background }}
                        />
                      </div>
                      <div className="text-xs text-gray-400">
                        {presetTheme.description || `${presetTheme.isDark ? 'Dark' : 'Light'} theme`}
                      </div>
                    </div>
                    {customThemes.includes(presetTheme) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          themeEngine.removeCustomTheme(presetTheme.id);
                        }}
                        className="mt-2 text-red-400 hover:text-red-300 text-xs flex items-center space-x-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handlePresetSelect(themeEngine.createCatppuccinMochaTheme())}
                  className="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium">Apply Catppuccin Mocha</div>
                  <div className="text-sm text-gray-400">Dark theme with purple accents</div>
                </button>
                <button
                  onClick={() => handlePresetSelect(themeEngine.createCatppuccinLatteTheme())}
                  className="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium">Apply Catppuccin Latte</div>
                  <div className="text-sm text-gray-400">Light theme with pastel colors</div>
                </button>
                <button
                  onClick={() => handlePresetSelect(themeEngine.createSynologyTheme())}
                  className="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium">Apply Synology DSM</div>
                  <div className="text-sm text-gray-400">Professional dark theme</div>
                </button>
                <button
                  onClick={() => handlePresetSelect(themeEngine.createWindowsTheme())}
                  className="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium">Apply Windows 11</div>
                  <div className="text-sm text-gray-400">Clean and modern interface</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Color Palette</h2>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={customTheme.name}
                  onChange={(e) => setCustomTheme({ ...customTheme, name: e.target.value })}
                  placeholder="Theme Name"
                  className="bg-gray-700 px-3 py-2 rounded-lg"
                />
                <button
                  onClick={saveCustomTheme}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Save as Custom
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-purple-400">Primary Colors</h3>
                <ColorPicker label="Primary" colorKey="primary" value={customTheme.colors.primary} />
                <ColorPicker label="Secondary" colorKey="secondary" value={customTheme.colors.secondary} />
                <ColorPicker label="Accent" colorKey="accent" value={customTheme.colors.accent} />
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-purple-400">Surface Colors</h3>
                <ColorPicker label="Background" colorKey="background" value={customTheme.colors.background} />
                <ColorPicker label="Surface" colorKey="surface" value={customTheme.colors.surface} />
                <ColorPicker label="Border" colorKey="border" value={customTheme.colors.border} />
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-purple-400">Text Colors</h3>
                <ColorPicker label="Primary Text" colorKey="text" value={customTheme.colors.text} />
                <ColorPicker label="Secondary Text" colorKey="textSecondary" value={customTheme.colors.textSecondary} />
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-purple-400">Status Colors</h3>
                <ColorPicker label="Success" colorKey="success" value={customTheme.colors.success} />
                <ColorPicker label="Warning" colorKey="warning" value={customTheme.colors.warning} />
                <ColorPicker label="Error" colorKey="error" value={customTheme.colors.error} />
              </div>
            </div>

            {/* Color Preview */}
            <div>
              <h3 className="font-medium text-purple-400 mb-3">Preview</h3>
              <div className="bg-gray-800 rounded-lg p-6" style={{ backgroundColor: customTheme.colors.surface }}>
                <div className="space-y-4">
                  <h2 style={{ color: customTheme.colors.text }}>Sample Header</h2>
                  <p style={{ color: customTheme.colors.textSecondary }}>
                    This is sample text content to demonstrate how your theme colors will appear.
                  </p>
                  <div className="flex space-x-4">
                    <button
                      style={{
                        backgroundColor: customTheme.colors.primary,
                        color: '#ffffff'
                      }}
                      className="px-4 py-2 rounded"
                    >
                      Primary Button
                    </button>
                    <button
                      style={{
                        backgroundColor: customTheme.colors.secondary,
                        color: '#ffffff'
                      }}
                      className="px-4 py-2 rounded"
                    >
                      Secondary Button
                    </button>
                  </div>
                  <div className="flex space-x-4">
                    <div style={{ color: customTheme.colors.success }}>✓ Success</div>
                    <div style={{ color: customTheme.colors.warning }}>⚠ Warning</div>
                    <div style={{ color: customTheme.colors.error }}>✗ Error</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Typography</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Font Family</label>
                  <select
                    value={customTheme.typography.fontFamily}
                    onChange={(e) => setCustomTheme({
                      ...customTheme,
                      typography: { ...customTheme.typography, fontFamily: e.target.value }
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  >
                    <option value="Inter, system-ui, sans-serif">Inter</option>
                    <option value="system-ui, -apple-system, sans-serif">System UI</option>
                    <option value="'Segoe UI', Tahoma, sans-serif">Segoe UI</option>
                    <option value="'SF Pro Display', -apple-system, sans-serif">SF Pro Display</option>
                    <option value="Roboto, Arial, sans-serif">Roboto</option>
                    <option value="'Helvetica Neue', Arial, sans-serif">Helvetica Neue</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Font Size Scale</label>
                  <div className="space-y-2">
                    {Object.entries(customTheme.typography.fontSize).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-3">
                        <span className="w-16 text-sm">{key}</span>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setCustomTheme({
                            ...customTheme,
                            typography: {
                              ...customTheme.typography,
                              fontSize: { ...customTheme.typography.fontSize, [key]: e.target.value }
                            }
                          })}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
                        />
                        <span
                          className="text-sm"
                          style={{ fontSize: value }}
                        >
                          Sample
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Font Weights</label>
                  <div className="space-y-2">
                    {Object.entries(customTheme.typography.fontWeight).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-3">
                        <span className="w-16 text-sm capitalize">{key}</span>
                        <input
                          type="number"
                          min="100"
                          max="900"
                          step="100"
                          value={value}
                          onChange={(e) => setCustomTheme({
                            ...customTheme,
                            typography: {
                              ...customTheme.typography,
                              fontWeight: { ...customTheme.typography.fontWeight, [key]: parseInt(e.target.value) }
                            }
                          })}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
                        />
                        <span
                          className="text-sm"
                          style={{ fontWeight: value }}
                        >
                          Sample
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Line Height</label>
                  <div className="space-y-2">
                    {Object.entries(customTheme.typography.lineHeight).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-3">
                        <span className="w-16 text-sm capitalize">{key}</span>
                        <input
                          type="number"
                          min="1"
                          max="3"
                          step="0.1"
                          value={value}
                          onChange={(e) => setCustomTheme({
                            ...customTheme,
                            typography: {
                              ...customTheme.typography,
                              lineHeight: { ...customTheme.typography.lineHeight, [key]: parseFloat(e.target.value) }
                            }
                          })}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Preview */}
            <div className="bg-gray-800 rounded-lg p-6" style={{
              fontFamily: customTheme.typography.fontFamily,
              fontSize: customTheme.typography.fontSize.base
            }}>
              <h1 style={{
                fontSize: customTheme.typography.fontSize['3xl'],
                fontWeight: customTheme.typography.fontWeight.bold,
                lineHeight: customTheme.typography.lineHeight.tight
              }}>
                Heading 1
              </h1>
              <h2 style={{
                fontSize: customTheme.typography.fontSize['2xl'],
                fontWeight: customTheme.typography.fontWeight.semibold,
                lineHeight: customTheme.typography.lineHeight.tight
              }}>
                Heading 2
              </h2>
              <h3 style={{
                fontSize: customTheme.typography.fontSize.xl,
                fontWeight: customTheme.typography.fontWeight.medium
              }}>
                Heading 3
              </h3>
              <p style={{
                lineHeight: customTheme.typography.lineHeight.normal
              }}>
                This is a paragraph of text demonstrating the typography settings.
                The font family, sizes, weights, and line heights all come from your theme configuration.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'ui' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">UI Settings</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-purple-400">Appearance</h3>

                <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Desktop Icons</label>
                    <button
                      onClick={() => setUITheme({ desktopIcons: !uiTheme.desktopIcons })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        uiTheme.desktopIcons ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        uiTheme.desktopIcons ? 'translate-x-6' : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Show Clock</label>
                    <button
                      onClick={() => setUITheme({ showClock: !uiTheme.showClock })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        uiTheme.showClock ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        uiTheme.showClock ? 'translate-x-6' : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Animations</label>
                    <button
                      onClick={() => setUITheme({ animations: !uiTheme.animations })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        uiTheme.animations ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        uiTheme.animations ? 'translate-x-6' : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Transparency</label>
                    <button
                      onClick={() => setUITheme({ transparency: !uiTheme.transparency })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        uiTheme.transparency ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        uiTheme.transparency ? 'translate-x-6' : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Blur Effects</label>
                    <button
                      onClick={() => setUITheme({ blurEffects: !uiTheme.blurEffects })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        uiTheme.blurEffects ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        uiTheme.blurEffects ? 'translate-x-6' : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-purple-400">Window Controls</h3>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="space-y-2">
                    {[
                      { value: 'mac', label: 'macOS Style' },
                      { value: 'windows', label: 'Windows Style' },
                      { value: 'custom', label: 'Custom' }
                    ].map(({ value, label }) => (
                      <label key={value} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="window-controls"
                          value={value}
                          checked={uiTheme.windowControls === value}
                          onChange={(e) => setUITheme({ windowControls: e.target.value as any })}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Icon Pack</label>
                  <select
                    value={uiTheme.iconPack}
                    onChange={(e) => setUITheme({ iconPack: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  >
                    <option value="lucide">Lucide</option>
                    <option value="heroicons">Heroicons</option>
                    <option value="feather">Feather</option>
                    <option value="material">Material Design</option>
                    <option value="fontawesome">Font Awesome</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Wallpaper</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={uiTheme.wallpaper || ''}
                      onChange={(e) => setUITheme({ wallpaper: e.target.value })}
                      placeholder="Enter image URL or leave empty for default"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400">
                      Supported formats: JPG, PNG, WebP. Use URL or local file path.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Custom CSS</h2>

            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-4">
                Add custom CSS rules to override any theme property. Use CSS variables for dynamic theming.
              </p>

              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Available CSS Variables:</h3>
                <div className="bg-gray-900 rounded p-3 text-xs font-mono space-y-1">
                  <div>--color-primary, --color-secondary, --color-accent</div>
                  <div>--color-background, --color-surface, --color-text</div>
                  <div>--font-family, --font-size-base, --spacing-md</div>
                  <div>--shadow-md, --border-radius-md, --animation-normal</div>
                </div>
              </div>

              <textarea
                value={customTheme.customCSS || ''}
                onChange={(e) => setCustomTheme({ ...customTheme, customCSS: e.target.value })}
                placeholder="/* Add your custom CSS here */&#10;.custom-component {&#10;  background: var(--color-primary);&#10;  border-radius: var(--border-radius-lg);&#10;}"
                className="w-full h-64 bg-gray-900 text-gray-100 font-mono text-sm border border-gray-700 rounded-lg p-4 focus:outline-none focus:border-purple-500"
              />

              <div className="mt-4 flex justify-between">
                <div className="text-sm text-gray-400">
                  {customTheme.customCSS?.length || 0} characters
                </div>
                <button
                  onClick={() => {
                    if (!previewMode) {
                      setTheme(customTheme);
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                >
                  {previewMode ? 'Preview Applied' : 'Apply Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeCustomizer;
