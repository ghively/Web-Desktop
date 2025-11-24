import React, { useState } from 'react';
import { X, Monitor, Play, Save, Clock, Trash2, Copy, Settings } from 'lucide-react';
import {
    useWindowManager,
    type WorkspaceTemplate,
    type WorkspaceState
} from '../context/exports';
import clsx from 'clsx';

interface WorkspaceTemplatesProps {
    onClose?: () => void;
    onApplyTemplate?: (templateId: string) => void;
}

export const WorkspaceTemplates: React.FC<WorkspaceTemplatesProps> = ({ onClose, onApplyTemplate }) => {
    const {
        getWorkspaceTemplates,
        applyWorkspaceTemplate,
        saveWorkspaceState,
        loadWorkspaceState,
        deleteWorkspaceState,
        getRecentWorkspaces
    } = useWindowManager();

    const [activeTab, setActiveTab] = useState<'templates' | 'recent' | 'saved'>('templates');
    const [searchQuery, setSearchQuery] = useState('');

    const workspaceTemplates = getWorkspaceTemplates();
    const recentWorkspaces = getRecentWorkspaces();

    // Filter templates based on search query
    const filteredTemplates = workspaceTemplates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter recent workspaces based on search query
    const filteredRecentWorkspaces = recentWorkspaces.filter(workspace =>
        workspace.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleApplyTemplate = (templateId: string) => {
        applyWorkspaceTemplate(templateId);
        onApplyTemplate?.(templateId);
    };

    const handleLoadWorkspace = (stateId: string) => {
        loadWorkspaceState(stateId);
    };

    const handleDeleteWorkspace = (stateId: string) => {
        if (confirm('Are you sure you want to delete this saved workspace?')) {
            deleteWorkspaceState(stateId);
        }
    };

    const handleSaveCurrentWorkspace = () => {
        const name = prompt('Enter a name for this workspace:');
        if (name) {
            saveWorkspaceState(name);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();
    };

    const getTemplateIcon = (category: WorkspaceTemplate['category']) => {
        const icons = {
            development: '💻',
            'system-admin': '⚙️',
            media: '🎬',
            'ai-development': '🤖',
            communication: '💬',
            general: '📋'
        };
        return icons[category] || '📋';
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <Monitor className="text-blue-400" size={24} />
                        <h2 className="text-xl font-semibold text-white">Workspace Manager</h2>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-700">
                    <input
                        type="text"
                        placeholder="Search templates and workspaces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={clsx(
                            "flex-1 px-4 py-3 font-medium transition-colors",
                            activeTab === 'templates'
                                ? "text-blue-400 bg-gray-800 border-b-2 border-blue-400"
                                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                        )}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setActiveTab('recent')}
                        className={clsx(
                            "flex-1 px-4 py-3 font-medium transition-colors",
                            activeTab === 'recent'
                                ? "text-blue-400 bg-gray-800 border-b-2 border-blue-400"
                                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                        )}
                    >
                        Recent
                    </button>
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={clsx(
                            "flex-1 px-4 py-3 font-medium transition-colors",
                            activeTab === 'saved'
                                ? "text-blue-400 bg-gray-800 border-b-2 border-blue-400"
                                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                        )}
                    >
                        Saved Workspaces
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'templates' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-all hover:shadow-lg cursor-pointer group"
                                    onClick={() => handleApplyTemplate(template.id)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{getTemplateIcon(template.category)}</span>
                                            <div>
                                                <h3 className="font-semibold text-white">{template.name}</h3>
                                                <span className="text-xs text-gray-500 capitalize">
                                                    {template.category.replace('-', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleApplyTemplate(template.id);
                                            }}
                                            className="p-2 bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                                            title="Apply Template"
                                        >
                                            <Play size={14} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-300 mb-3">{template.description}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{template.applications.length} apps</span>
                                        <span>{template.layout.mode} mode</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'recent' && (
                        <div className="space-y-3">
                            {filteredRecentWorkspaces.length > 0 ? (
                                filteredRecentWorkspaces.map((workspace) => (
                                    <div
                                        key={workspace.id}
                                        className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-all hover:shadow-lg group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Clock className="text-gray-400" size={18} />
                                                <div>
                                                    <h3 className="font-semibold text-white">{workspace.name}</h3>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span>{formatDate(workspace.timestamp)}</span>
                                                        <span>{workspace.metadata.windowCount} windows</span>
                                                        {workspace.metadata.groupCount > 0 && (
                                                            <span>{workspace.metadata.groupCount} groups</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleLoadWorkspace(workspace.id)}
                                                    className="p-2 bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                                                    title="Load Workspace"
                                                >
                                                    <Play size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteWorkspace(workspace.id);
                                                    }}
                                                    className="p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                                    title="Delete Workspace"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Clock className="mx-auto text-gray-600 mb-3" size={48} />
                                    <p className="text-gray-400">No recent workspaces found</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Save your current workspace to see it here
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'saved' && (
                        <div className="text-center py-8">
                            <Save className="mx-auto text-gray-600 mb-3" size={48} />
                            <h3 className="text-lg font-semibold text-white mb-2">Save Current Workspace</h3>
                            <p className="text-gray-400 mb-4">
                                Save your current window arrangement and layout as a workspace
                            </p>
                            <button
                                onClick={handleSaveCurrentWorkspace}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                            >
                                <Save size={16} />
                                Save Current Workspace
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                            {activeTab === 'templates' && `${filteredTemplates.length} templates available`}
                            {activeTab === 'recent' && `${filteredRecentWorkspaces.length} recent workspaces`}
                            {activeTab === 'saved' && 'Save and manage your workspaces'}
                        </div>
                        <button
                            onClick={() => onApplyTemplate?.('general-workspace')}
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Quick Apply: General Workspace
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};