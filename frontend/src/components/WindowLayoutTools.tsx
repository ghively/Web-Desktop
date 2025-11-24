import React, { useState, useRef, useEffect } from 'react';
import { useVirtualDesktopManager, useWindowManager } from '../context/exports';
import { LayoutTemplate, DEFAULT_LAYOUT_TEMPLATES } from '../types/virtualDesktops';
import { Grid, Layers, Columns, Rows, Copy, Save, Trash2, Plus, Settings, Eye, EyeOff } from 'lucide-react';

interface LayoutPreviewProps {
    template: LayoutTemplate;
    isSelected: boolean;
    onClick: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
}

const LayoutPreview: React.FC<LayoutPreviewProps> = ({
    template,
    isSelected,
    onClick,
    onDelete,
    onEdit
}) => {
    const renderPreview = () => {
        switch (template.type) {
            case 'grid':
                const { rows = 2, cols = 2 } = template.config as { rows?: number; cols?: number };
                return (
                    <div
                        className="grid gap-1 h-full w-full"
                        style={{
                            gridTemplateColumns: `repeat(${cols}, 1fr)`,
                            gridTemplateRows: `repeat(${rows}, 1fr)`
                        }}
                    >
                        {Array.from({ length: rows * cols }).map((_, i) => (
                            <div key={i} className="bg-blue-500/20 border border-blue-400/30 rounded" />
                        ))}
                    </div>
                );

            case 'cascade':
                return (
                    <div className="relative h-full w-full">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="absolute bg-blue-500/20 border border-blue-400/30 rounded"
                                style={{
                                    left: `${i * 15}px`,
                                    top: `${i * 10}px`,
                                    right: `${i * 10}px`,
                                    bottom: `${i * 15}px`,
                                    zIndex: 4 - i
                                }}
                            />
                        ))}
                    </div>
                );

            case 'vertical':
                return (
                    <div className="flex gap-1 h-full w-full">
                        <div
                            className="bg-blue-500/20 border border-blue-400/30 rounded"
                            style={{ width: `${((template.config.ratio as number) || 0.5) * 100}%` }}
                        />
                        <div className="flex-1 bg-blue-500/20 border border-blue-400/30 rounded" />
                    </div>
                );

            case 'horizontal':
                return (
                    <div className="flex flex-col gap-1 h-full w-full">
                        <div
                            className="bg-blue-500/20 border border-blue-400/30 rounded"
                            style={{ height: `${((template.config.ratio as number) || 0.5) * 100}%` }}
                        />
                        <div className="flex-1 bg-blue-500/20 border border-blue-400/30 rounded" />
                    </div>
                );

            case 'master-stack':
                const { masterRatio = 0.6, stackDirection = 'right' } = template.config as { masterRatio?: number; stackDirection?: string };
                return (
                    <div className={`flex gap-1 h-full w-full ${stackDirection === 'bottom' ? 'flex-col' : ''}`}>
                        <div
                            className={`bg-blue-500/20 border border-blue-400/30 rounded ${
                                stackDirection === 'bottom' ? 'w-full' : ''
                            }`}
                            style={{
                                [stackDirection === 'right' ? 'width' : 'height']: `${masterRatio * 100}%`
                            }}
                        />
                        <div className={`flex-1 gap-1 grid grid-cols-1 ${stackDirection === 'right' ? '' : 'grid-rows-3'}`}>
                            <div className="bg-blue-500/20 border border-blue-400/30 rounded" />
                            <div className="bg-blue-500/20 border border-blue-400/30 rounded" />
                            <div className="bg-blue-500/20 border border-blue-400/30 rounded" />
                        </div>
                    </div>
                );

            default:
                return <div className="bg-blue-500/20 border border-blue-400/30 rounded h-full w-full" />;
        }
    };

    const isDefault = DEFAULT_LAYOUT_TEMPLATES.some(t => t.id === template.id);

    return (
        <div
            className={`relative group cursor-pointer transition-all duration-200 p-2 rounded-lg ${
                isSelected
                    ? 'bg-gray-700 ring-2 ring-blue-500'
                    : 'bg-gray-800 hover:bg-gray-700'
            }`}
            onClick={onClick}
        >
            {/* Preview */}
            <div className="h-16 w-20 mb-2">
                {renderPreview()}
            </div>

            {/* Name */}
            <div className="text-white text-xs font-medium truncate">
                {template.name}
            </div>

            {/* Actions */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {!isDefault && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.();
                            }}
                            className="p-1 bg-gray-600 hover:bg-gray-500 rounded"
                            title="Edit template"
                        >
                            <Settings size={10} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.();
                            }}
                            className="p-1 bg-red-600 hover:bg-red-500 rounded"
                            title="Delete template"
                        >
                            <Trash2 size={10} />
                        </button>
                    </>
                )}
            </div>

            {/* Type indicator */}
            <div className="absolute bottom-1 left-2">
                <span className="text-xs text-gray-400 capitalize">
                    {template.type}
                </span>
            </div>
        </div>
    );
};

export const WindowLayoutTools: React.FC = () => {
    const {
        getLayoutTemplates,
        applyLayoutTemplate,
        saveLayoutTemplate,
        currentDesktopId,
        settings
    } = useVirtualDesktopManager();

    const { windows, toggleLayoutMode, layoutMode } = useWindowManager();

    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showCustomCreator, setShowCustomCreator] = useState(false);
    const [customTemplate, setCustomTemplate] = useState<Partial<LayoutTemplate>>({
        name: '',
        description: '',
        type: 'grid',
        config: {}
    });

    const templates = getLayoutTemplates();

    // Auto-select current desktop's template
    useEffect(() => {
        // This would ideally get the current desktop's layout template
        // For now, we'll select based on layout mode
        if (layoutMode === 'tiling') {
            setSelectedTemplate('grid-2x2');
        } else {
            setSelectedTemplate(null);
        }
    }, [layoutMode, currentDesktopId]);

    const handleApplyTemplate = (templateId: string) => {
        setSelectedTemplate(templateId);
        applyLayoutTemplate(templateId);

        // Switch to floating mode if not already
        if (layoutMode === 'tiling') {
            toggleLayoutMode();
        }
    };

    const handleCreateTemplate = () => {
        if (!customTemplate.name || !customTemplate.type) return;

        const newTemplate: LayoutTemplate = {
            id: `custom-${Date.now()}`,
            name: customTemplate.name,
            description: customTemplate.description || '',
            type: customTemplate.type as any,
            config: customTemplate.config || {}
        };

        saveLayoutTemplate(newTemplate);
        setShowCustomCreator(false);
        setCustomTemplate({
            name: '',
            description: '',
            type: 'grid',
            config: {}
        });
    };

    const handleQuickArrange = (type: 'cascade' | 'tile' | 'grid') => {
        switch (type) {
            case 'cascade':
                // Cascade windows
                windows.forEach((window, index) => {
                    if (window.x !== undefined && window.y !== undefined) {
                        // This would need to be implemented in the window manager
                        // For now, just indicate the action
                        console.log(`Cascading window ${window.id} to position ${index * 30}`);
                    }
                });
                break;

            case 'tile':
                // Apply tiling mode
                if (layoutMode !== 'tiling') {
                    toggleLayoutMode();
                }
                break;

            case 'grid':
                // Apply grid layout
                handleApplyTemplate('grid-2x2');
                break;
        }
    };

    return (
        <>
            {/* Layout Tools Toggle */}
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-600 flex items-center gap-2 transition-all ${
                        isExpanded ? 'ring-2 ring-blue-500' : ''
                    }`}
                    title="Window Layout Tools"
                >
                    <Grid size={16} />
                    <span className="text-sm font-medium">Layout</span>
                </button>
            </div>

            {/* Expanded Layout Tools Panel */}
            {isExpanded && (
                <div className="fixed bottom-20 right-4 z-50 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 p-4 w-80">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Layers size={18} className="text-blue-400" />
                            <h3 className="text-white font-medium">Window Layouts</h3>
                        </div>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-4">
                        <h4 className="text-sm text-gray-300 mb-2">Quick Arrange</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleQuickArrange('cascade')}
                                className="bg-gray-800 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors flex flex-col items-center gap-1"
                            >
                                <Layers size={14} />
                                <span>Cascade</span>
                            </button>
                            <button
                                onClick={() => handleQuickArrange('tile')}
                                className="bg-gray-800 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors flex flex-col items-center gap-1"
                            >
                                <Grid size={14} />
                                <span>Tile</span>
                            </button>
                            <button
                                onClick={() => handleQuickArrange('grid')}
                                className="bg-gray-800 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors flex flex-col items-center gap-1"
                            >
                                <Rows size={14} />
                                <span>Grid</span>
                            </button>
                        </div>
                    </div>

                    {/* Layout Templates */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm text-gray-300">Templates</h4>
                            <button
                                onClick={() => setShowCustomCreator(!showCustomCreator)}
                                className="p-1 bg-gray-800 hover:bg-gray-700 rounded"
                                title="Create custom template"
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {templates.map((template) => (
                                <LayoutPreview
                                    key={template.id}
                                    template={template}
                                    isSelected={selectedTemplate === template.id}
                                    onClick={() => handleApplyTemplate(template.id)}
                                    onDelete={() => {
                                        if (confirm('Delete this template?')) {
                                            // Handle template deletion
                                            saveLayoutTemplate({ ...template, id: `deleted-${template.id}` });
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Custom Template Creator */}
                    {showCustomCreator && (
                        <div className="border-t border-gray-700 pt-4 space-y-3">
                            <h4 className="text-sm text-gray-300">Create Template</h4>

                            <input
                                type="text"
                                placeholder="Template name"
                                value={customTemplate.name}
                                onChange={(e) => setCustomTemplate(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm"
                            />

                            <textarea
                                placeholder="Description (optional)"
                                value={customTemplate.description}
                                onChange={(e) => setCustomTemplate(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm resize-none h-16"
                            />

                            <select
                                value={customTemplate.type}
                                onChange={(e) => setCustomTemplate(prev => ({ ...prev, type: e.target.value as any }))}
                                className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm"
                            >
                                <option value="grid">Grid</option>
                                <option value="cascade">Cascade</option>
                                <option value="vertical">Vertical Split</option>
                                <option value="horizontal">Horizontal Split</option>
                                <option value="master-stack">Master Stack</option>
                                <option value="custom">Custom</option>
                            </select>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateTemplate}
                                    disabled={!customTemplate.name}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm py-2 px-3 rounded transition-colors"
                                >
                                    Create Template
                                </button>
                                <button
                                    onClick={() => setShowCustomCreator(false)}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Current Layout Info */}
                    <div className="border-t border-gray-700 pt-3 mt-4">
                        <div className="text-xs text-gray-400 space-y-1">
                            <div className="flex items-center justify-between">
                                <span>Current Mode:</span>
                                <span className="text-white capitalize">{layoutMode}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Windows:</span>
                                <span className="text-white">{windows.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Selected Template:</span>
                                <span className="text-white">
                                    {templates.find(t => t.id === selectedTemplate)?.name || 'None'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};