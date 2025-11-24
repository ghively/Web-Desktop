import React, { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Users,
  Globe,
  HardDrive,
  Shield,
  Settings as SettingsIcon,
  ChevronRight,
  Home,
  Palette,
  Clock,
  Volume2,
  Key,
  Server,
  Database,
  Bug,
  Beaker,
  User,
  Lock,
  Wifi,
  Router,
  Network,
  Folder,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
  Loader
} from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { clsx } from 'clsx';

interface ComprehensiveSettingsProps {
  windowId?: string;
}

// Settings categories with icons and descriptions
const settingsCategories = [
  {
    id: 'desktop',
    name: 'Desktop',
    icon: Monitor,
    description: 'Theme, wallpaper, appearance',
    subcategories: [
      { id: 'appearance', name: 'Appearance', icon: Palette },
      { id: 'sounds', name: 'Sounds & Notifications', icon: Volume2 },
      { id: 'datetime', name: 'Date & Time', icon: Clock }
    ]
  },
  {
    id: 'system',
    name: 'System',
    icon: Server,
    description: 'Hostname, updates, system settings',
    subcategories: [
      { id: 'general', name: 'General', icon: Home },
      { id: 'updates', name: 'System Updates', icon: RefreshCw },
      { id: 'info', name: 'System Information', icon: Info }
    ]
  },
  {
    id: 'users',
    name: 'User Management',
    icon: Users,
    description: 'Accounts, permissions, authentication',
    subcategories: [
      { id: 'accounts', name: 'User Accounts', icon: User },
      { id: 'permissions', name: 'Permissions', icon: Lock },
      { id: 'authentication', name: 'Authentication', icon: Key }
    ]
  },
  {
    id: 'network',
    name: 'Network',
    icon: Globe,
    description: 'DNS, proxy, firewall, VPN',
    subcategories: [
      { id: 'general', name: 'General', icon: Network },
      { id: 'interfaces', name: 'Interfaces', icon: Router },
      { id: 'firewall', name: 'Firewall', icon: Shield },
      { id: 'vpn', name: 'VPN', icon: Wifi }
    ]
  },
  {
    id: 'storage',
    name: 'Storage',
    icon: HardDrive,
    description: 'Volumes, backup, quotas',
    subcategories: [
      { id: 'volumes', name: 'Storage Volumes', icon: Folder },
      { id: 'backup', name: 'Backup & Recovery', icon: RefreshCw },
      { id: 'quotas', name: 'Quotas & Limits', icon: Database }
    ]
  },
  {
    id: 'security',
    name: 'Security',
    icon: Shield,
    description: 'API keys, certificates, auditing',
    subcategories: [
      { id: 'api-keys', name: 'API Keys', icon: Key },
      { id: 'certificates', name: 'Certificates', icon: Lock },
      { id: 'auditing', name: 'Audit Logs', icon: Bug }
    ]
  },
  {
    id: 'advanced',
    name: 'Advanced',
    icon: SettingsIcon,
    description: 'Modules, services, development',
    subcategories: [
      { id: 'modules', name: 'Modules', icon: Database },
      { id: 'services', name: 'Services', icon: Server },
      { id: 'experimental', name: 'Experimental', icon: Beaker }
    ]
  }
];

export const ComprehensiveSettings: React.FC<ComprehensiveSettingsProps> = () => {
  const { settings } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState('desktop');
  const [selectedSubcategory, setSelectedSubcategory] = useState('appearance');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const [settingsData, setSettingsData] = useState<Record<string, Record<string, unknown>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Find current category and subcategory
  const currentCategory = settingsCategories.find(cat => cat.id === selectedCategory);
  const currentSubcategory = currentCategory?.subcategories.find(sub => sub.id === selectedSubcategory);

  // Load settings data on component mount and category change
  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${settings.backend.apiUrl}/api/comprehensive-settings?category=${selectedCategory}`);
        if (response.ok) {
          const data = await response.json();
          setSettingsData(prev => ({ ...prev, [selectedCategory]: data }));
          setValidationErrors({});
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedCategory && !settingsData[selectedCategory]) {
      loadSettingsData();
    }
  }, [selectedCategory, settings.backend.apiUrl, settingsData]);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string) => {
    const category = settingsCategories.find(cat => cat.id === categoryId);
    if (category?.subcategories.length > 0) {
      setSelectedCategory(categoryId);
      setSelectedSubcategory(category.subcategories[0].id);
    }
  }, []);

  // Handle subcategory selection
  const handleSubcategorySelect = useCallback((subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
  }, []);

  // Validate field in real-time
  const validateField = useCallback((field: string, value: unknown): string => {
    switch (field) {
      case 'hostname': {
        const hostnameValue = typeof value === 'string' ? value : String(value || '');
        if (!hostnameValue || hostnameValue.trim().length === 0) return 'Hostname is required';
        if (!/^[a-zA-Z0-9.-]+$/.test(hostnameValue)) return 'Hostname can only contain letters, numbers, dots, and hyphens';
        if (hostnameValue.length > 253) return 'Hostname is too long';
        break;
      }
      case 'passwordMinLength': {
        const passwordLength = typeof value === 'number' ? value : Number(value);
        if (passwordLength < 4) return 'Password must be at least 4 characters';
        if (passwordLength > 128) return 'Password cannot be more than 128 characters';
        break;
      }
      case 'sessionTimeout': {
        const sessionTimeout = typeof value === 'number' ? value : Number(value);
        if (sessionTimeout < 1) return 'Session timeout must be at least 1 minute';
        if (sessionTimeout > 1440) return 'Session timeout cannot exceed 24 hours';
        break;
      }
      case 'maxFailedAttempts': {
        const maxAttempts = typeof value === 'number' ? value : Number(value);
        if (maxAttempts < 1) return 'Max failed attempts must be at least 1';
        if (maxAttempts > 100) return 'Max failed attempts cannot exceed 100';
        break;
      }
      case 'ip': {
        const ipValue = typeof value === 'string' ? value : String(value || '');
        if (ipValue && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipValue)) return 'Invalid IP address format';
        break;
      }
      default:
        return '';
    }
    return '';
  }, []);

  // Handle settings changes with validation
  const handleSettingsChange = useCallback((category: string, field: string, value: unknown) => {
    setHasChanges(true);

    // Validate field
    const error = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [`${category}.${field}`]: error
    }));

    // Update settings data
    setSettingsData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  }, [validateField]);

  // Save settings
  const handleSave = useCallback(async () => {
    setIsLoading(true);
    setSaveStatus('saving');

    try {
      // Check for validation errors
      const hasValidationErrors = Object.values(validationErrors).some(error => error.length > 0);
      if (hasValidationErrors) {
        setSaveStatus('error');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
        return;
      }

      // Save all modified settings categories
      const savePromises = Object.keys(settingsData).map(async (category) => {
        const categoryData = settingsData[category];
        if (categoryData && hasChanges) {
          const response = await fetch(`${settings.backend.apiUrl}/api/comprehensive-settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, settings: categoryData })
          });

          if (!response.ok) {
            throw new Error(`Failed to save ${category} settings`);
          }

          return response.json();
        }
      });

      await Promise.all(savePromises);

      setSaveStatus('saved');
      setHasChanges(false);
      setValidationErrors({});

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [settingsData, validationErrors, hasChanges, settings.backend.apiUrl]);

  // Render save button
  const renderSaveButton = () => {
    if (!hasChanges) return null;

    const buttonConfig = {
      saving: { icon: Loader, text: 'Saving...', class: 'bg-yellow-500 hover:bg-yellow-600' },
      saved: { icon: CheckCircle, text: 'Saved', class: 'bg-green-500 hover:bg-green-600' },
      error: { icon: AlertCircle, text: 'Error', class: 'bg-red-500 hover:bg-red-600' }
    };

    const config = saveStatus === 'idle' ? { icon: Save, text: 'Save Changes', class: 'bg-blue-500 hover:bg-blue-600' } : buttonConfig[saveStatus];

    return (
      <button
        onClick={handleSave}
        disabled={isLoading}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200',
          config.class,
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <config.icon size={16} className={isLoading ? 'animate-spin' : ''} />
        <span>{config.text}</span>
      </button>
    );
  };

  // Render main content based on selected category
  const renderMainContent = () => {
    switch (selectedCategory) {
      case 'desktop':
        switch (selectedSubcategory) {
          case 'appearance':
            return <DesktopAppearanceSettings onSettingsChange={handleSettingsChange} />;
          case 'sounds':
            return <SoundsSettings onSettingsChange={handleSettingsChange} />;
          case 'datetime':
            return <DateTimeSettings onSettingsChange={handleSettingsChange} />;
          default:
            return <div className="p-8 text-center text-gray-500">Subcategory not implemented yet</div>;
        }
      case 'system':
        switch (selectedSubcategory) {
          case 'general':
            return <SystemGeneralSettings
              settingsData={settingsData}
              handleSettingsChange={handleSettingsChange}
              validationErrors={validationErrors}
              isLoading={isLoading}
            />;
          case 'updates':
            return <SystemUpdatesSettings onSettingsChange={handleSettingsChange} />;
          case 'info':
            return <SystemInfoSettings onSettingsChange={handleSettingsChange} />;
          default:
            return <div className="p-8 text-center text-gray-500">Subcategory not implemented yet</div>;
        }
      default:
        return (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              {currentSubcategory?.icon && <currentSubcategory.icon size={24} className="text-blue-400" />}
              <h2 className="text-2xl font-bold text-gray-100">{currentSubcategory?.name}</h2>
            </div>
            <div className="text-gray-400">
              <p>{currentSubcategory && `${currentSubcategory.name} settings coming soon...`}</p>
              <p className="mt-2 text-sm">Category: {currentCategory?.name}</p>
              <p className="text-sm">Subcategory: {selectedSubcategory}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full bg-gray-900 text-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <SettingsIcon size={20} className="text-blue-400" />
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto">
          {settingsCategories.map((category) => {
            const isActive = category.id === selectedCategory;
            const Icon = category.icon;

            return (
              <div key={category.id}>
                <button
                  onClick={() => handleCategorySelect(category.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    'hover:bg-gray-700',
                    isActive && 'bg-gray-700 border-l-4 border-blue-500'
                  )}
                >
                  <Icon
                    size={18}
                    className={clsx(
                      isActive ? 'text-blue-400' : 'text-gray-400'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={clsx(
                      'font-medium',
                      isActive ? 'text-gray-100' : 'text-gray-300'
                    )}>
                      {category.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {category.description}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className={clsx(
                      'transition-transform',
                      isActive ? 'rotate-90 text-gray-400' : 'text-gray-600'
                    )}
                  />
                </button>

                {/* Subcategories (show when category is active) */}
                {isActive && category.subcategories.length > 0 && (
                  <div className="bg-gray-750 border-l-4 border-blue-500">
                    {category.subcategories.map((subcategory) => {
                      const isSubActive = subcategory.id === selectedSubcategory;
                      const SubIcon = subcategory.icon;

                      return (
                        <button
                          key={subcategory.id}
                          onClick={() => handleSubcategorySelect(subcategory.id)}
                          className={clsx(
                            'w-full flex items-center gap-3 px-8 py-2 text-left transition-colors',
                            'hover:bg-gray-700',
                            isSubActive && 'bg-gray-700 border-l-4 border-blue-400 ml-4'
                          )}
                        >
                          <SubIcon
                            size={16}
                            className={clsx(
                              isSubActive ? 'text-blue-400' : 'text-gray-500'
                            )}
                          />
                          <span className={clsx(
                            'text-sm',
                            isSubActive ? 'text-gray-100' : 'text-gray-400'
                          )}>
                            {subcategory.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with Save Button */}
        <div className="p-4 border-t border-gray-700">
          {renderSaveButton()}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentSubcategory?.icon && (
                <currentSubcategory.icon size={24} className="text-blue-400" />
              )}
              <h2 className="text-xl font-bold text-gray-100">
                {currentSubcategory?.name || 'Settings'}
              </h2>
              {currentCategory && (
                <span className="text-sm text-gray-500">
                  {currentCategory.name}
                </span>
              )}
            </div>

            {/* Save indicator */}
            {hasChanges && (
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <AlertCircle size={16} />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

// Interface for settings components
interface SettingsComponentProps {
  onSettingsChange: (category: string, field: string, value: unknown) => void;
}

// Placeholder components for each subcategory
const DesktopAppearanceSettings: React.FC<SettingsComponentProps> = ({ onSettingsChange }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">Desktop Appearance</h3>
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="font-medium mb-3">Theme</h4>
        <div className="grid grid-cols-4 gap-3">
          {['Mocha', 'Latte', 'Frappe', 'Macchiato'].map((theme) => (
            <button key={theme} className="p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="font-medium mb-3">Wallpaper</h4>
        <div className="space-y-3">
          <button className="w-full p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-left">
            Solid Color
          </button>
          <button className="w-full p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-left">
            Gradient
          </button>
          <button className="w-full p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-left">
            Image
          </button>
          <button className="w-full p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-left">
            Slideshow
          </button>
        </div>
      </div>
    </div>
  </div>
);

const SoundsSettings: React.FC<SettingsComponentProps> = ({ onSettingsChange }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">Sounds & Notifications</h3>
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400">Sound settings coming soon...</p>
    </div>
  </div>
);

const DateTimeSettings: React.FC<SettingsComponentProps> = ({ onSettingsChange }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">Date & Time</h3>
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400">Date & time settings coming soon...</p>
    </div>
  </div>
);

interface SystemGeneralSettingsProps {
  settingsData?: Record<string, unknown>;
  handleSettingsChange?: (category: string, field: string, value: unknown) => void;
  validationErrors?: Record<string, string>;
  isLoading?: boolean;
}

const SystemGeneralSettings: React.FC<SystemGeneralSettingsProps> = ({
  settingsData = {},
  handleSettingsChange = () => {},
  validationErrors = {},
  isLoading = false
}) => {
  const systemData = (settingsData.system as Record<string, unknown>) || {};

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-semibold mb-4">System General Settings</h3>

      <div className="bg-gray-800 rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hostname
            </label>
            <input
              type="text"
              value={(systemData.hostname as string) || ''}
              onChange={(e) => handleSettingsChange && handleSettingsChange('system', 'hostname', e.target.value)}
              className={clsx(
                "w-full px-3 py-2 bg-gray-700 border rounded-md text-gray-100",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                validationErrors['system.hostname'] ? "border-red-500" : "border-gray-600"
              )}
              placeholder="webdesktop"
              disabled={isLoading}
            />
            {validationErrors['system.hostname'] && (
              <p className="mt-1 text-sm text-red-400">{validationErrors['system.hostname']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={(systemData.timezone as string) || 'UTC'}
              onChange={(e) => handleSettingsChange && handleSettingsChange('system', 'timezone', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Shanghai">Shanghai</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Language
            </label>
            <select
              value={(systemData.language as string) || 'en'}
              onChange={(e) => handleSettingsChange && handleSettingsChange('system', 'language', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Region
            </label>
            <select
              value={(systemData.region as string) || 'US'}
              onChange={(e) => handleSettingsChange && handleSettingsChange('system', 'region', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
              <option value="CN">China</option>
            </select>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-md font-medium text-gray-200 mb-4">System Options</h4>

          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!(systemData.autoUpdates as boolean)}
                onChange={(e) => handleSettingsChange && handleSettingsChange('system', 'autoUpdates', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-gray-300">Enable automatic system updates</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!(systemData.systemSounds as boolean)}
                onChange={(e) => handleSettingsChange && handleSettingsChange('system', 'systemSounds', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-gray-300">Enable system sounds</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={(systemData.animations as boolean) !== false}
                onChange={(e) => handleSettingsChange && handleSettingsChange('system', 'animations', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-gray-300">Enable interface animations</span>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-md font-medium text-gray-200 mb-4">Update Channel</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'stable', label: 'Stable', desc: 'Recommended for most users' },
              { value: 'beta', label: 'Beta', desc: 'Early access to new features' },
              { value: 'dev', label: 'Development', desc: 'Latest features and updates' }
            ].map((channel) => (
              <label key={channel.value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="updateChannel"
                  value={channel.value}
                  checked={(systemData.updateChannel as string) === channel.value}
                  onChange={(e) => handleSettingsChange && handleSettingsChange('system', 'updateChannel', e.target.value)}
                  className="sr-only peer"
                  disabled={isLoading}
                />
                <div className={clsx(
                  "p-4 border rounded-lg transition-all",
                  "peer-checked:border-blue-500 peer-checked:bg-blue-500/10",
                  "border-gray-600 hover:border-gray-500"
                )}>
                  <div className="font-medium text-gray-200">{channel.label}</div>
                  <div className="text-sm text-gray-400 mt-1">{channel.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SystemUpdatesSettings: React.FC<SettingsComponentProps> = ({ onSettingsChange }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">System Updates</h3>
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400">System update settings coming soon...</p>
    </div>
  </div>
);

const SystemInfoSettings: React.FC<SettingsComponentProps> = ({ onSettingsChange }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4">System Information</h3>
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400">System information display coming soon...</p>
    </div>
  </div>
);
