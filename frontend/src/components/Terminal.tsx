import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal, Copy, Check, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { useSettings } from '../context/useSettings';
import { AsyncErrorBoundary } from './error-boundaries';
import { useMonitoring } from '../hooks/useMonitoring';
import { Loading } from './ui/Loading';

interface TerminalProps {
    windowId: string;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export const TerminalComponent: React.FC<TerminalProps> = ({ windowId }) => {
    const { settings } = useSettings();
    const { trackInteraction, trackMetric, trackError, createAsyncTracker } = useMonitoring({
        component: 'Terminal',
        trackPerformance: true,
        trackErrors: true,
    });
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalRefInstance = useRef<XTerm | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [copied, setCopied] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [connectionMessage, setConnectionMessage] = useState<string>('');

    // Refs for connection management
    const wsRef = useRef<WebSocket | null>(null);
    const termRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const heartbeatIntervalRef = useRef<number | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const isDisposedRef = useRef(false);
    const retryAttemptRef = useRef(0);

    // Constants for connection management
    const MAX_RETRY_ATTEMPTS = 5;
    const BASE_RETRY_DELAY = 1000; // 1 second
    const MAX_RETRY_DELAY = 30000; // 30 seconds
    const HEARTBEAT_INTERVAL = 30000; // 30 seconds
    const CONNECTION_TIMEOUT = 10000; // 10 seconds

    // Calculate exponential backoff delay
    const getRetryDelay = useCallback((attempt: number): number => {
        const delay = Math.pow(2, attempt) * BASE_RETRY_DELAY;
        return Math.min(delay, MAX_RETRY_DELAY);
    }, []);

    // Start heartbeat mechanism
    const startHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        heartbeatIntervalRef.current = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                    // Send a ping message (you can customize this based on your backend)
                    wsRef.current.send('\x00'); // Null byte as ping
                } catch (error) {
                    console.warn('Heartbeat failed:', error);
                    // If heartbeat fails, close the connection to trigger reconnect
                    wsRef.current?.close(1006, 'Heartbeat failed');
                }
            }
        }, HEARTBEAT_INTERVAL);
    }, []);

    // Stop heartbeat
    const stopHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    }, []);

    // Focus handler for terminal
    const handleClick = useCallback(() => {
        if (termRef.current && !isDisposedRef.current) {
            try {
                termRef.current.focus();
            } catch (error) {
                console.error('Failed to focus terminal:', error);
            }
        }
    }, []);

    // Cleanup all resources
    const cleanup = useCallback(() => {
        console.log('Terminal cleanup called');
        isDisposedRef.current = true;

        // Stop heartbeat
        stopHeartbeat();

        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Disconnect ResizeObserver
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
            resizeObserverRef.current = null;
        }

        // Close WebSocket connection properly
        if (wsRef.current) {
            if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
                wsRef.current.close(1000, 'Component unmounting');
            }
            // Remove all event listeners to prevent memory leaks
            wsRef.current.onopen = null;
            wsRef.current.onmessage = null;
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current = null;
        }

        // Dispose terminal instance
        if (termRef.current) {
            try {
                // Remove event listeners before disposing
                if (terminalRef.current) {
                    terminalRef.current.removeEventListener('click', handleClick);
                }
                termRef.current.dispose();
            } catch (error) {
                console.error('Failed to dispose terminal:', error);
            } finally {
                termRef.current = null;
                terminalRefInstance.current = null;
            }
        }

        fitAddonRef.current = null;
    }, [stopHeartbeat, handleClick]);

    // Connect to WebSocket with improved error handling and retry logic
    const connectWebSocket = useCallback(() => {
        if (isDisposedRef.current || !termRef.current) return;

        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close(1000, 'Reconnecting');
            wsRef.current = null;
        }

        const connectionTracker = createAsyncTracker('terminal-websocket-connection');
        trackInteraction('connect', 'websocket-terminal', { attempt: retryAttemptRef.current + 1 });

        try {
            const wsUrl = settings.backend.wsUrl;
            console.log(`Connecting to WebSocket (attempt ${retryAttemptRef.current + 1}):`, wsUrl);

            setConnectionState('connecting');
            setConnectionMessage(`Connecting to terminal... (${retryAttemptRef.current + 1}/${MAX_RETRY_ATTEMPTS})`);

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            // Connection timeout
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING) {
                    ws.close(1006, 'Connection timeout');
                }
            }, CONNECTION_TIMEOUT);

            ws.onopen = () => {
                clearTimeout(connectionTimeout);
                connectionTracker.end({ success: true });

                if (isDisposedRef.current) return;

                console.log('WebSocket connected');
                setConnectionState('connected');
                setConnectionMessage('Connected to terminal server');
                setRetryCount(0);
                retryAttemptRef.current = 0;

                trackMetric('terminal-connection-success', 1, 'interaction', 'count', {
                    attempt: retryAttemptRef.current + 1,
                    duration: connectionTracker.getDuration()
                });

                if (termRef.current) {
                    termRef.current.write('\x1b[32mConnected to terminal server...\x1b[0m\r\n');
                }

                // Register input handler after connection is open
                termRef.current?.onData(data => {
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isDisposedRef.current) {
                        wsRef.current.send(data);
                    }
                });

                // Set up ResizeObserver for terminal fitting
                if (terminalRef.current && !resizeObserverRef.current) {
                    resizeObserverRef.current = new ResizeObserver(() => {
                        if (fitAddonRef.current && !isDisposedRef.current) {
                            try {
                                fitAddonRef.current.fit();
                            } catch (error) {
                                console.warn('Resize error:', error);
                            }
                        }
                    });
                    resizeObserverRef.current.observe(terminalRef.current);
                }

                // Start heartbeat
                startHeartbeat();
            };

            ws.onmessage = (event) => {
                if (!isDisposedRef.current && termRef.current) {
                    // Handle heartbeat response (if backend sends one)
                    if (event.data === '\x00') {
                        // Heartbeat response received
                        return;
                    }
                    termRef.current.write(event.data);
                }
            };

            ws.onclose = (event) => {
                clearTimeout(connectionTimeout);

                if (isDisposedRef.current) return;

                console.log('WebSocket closed:', event.code, event.reason);
                setConnectionState('disconnected');

                // Stop heartbeat on close
                stopHeartbeat();

                // Clean up resize observer on close
                if (resizeObserverRef.current) {
                    resizeObserverRef.current.disconnect();
                    resizeObserverRef.current = null;
                }

                // Clear WebSocket reference
                wsRef.current = null;

                // Handle reconnection logic
                if (!event.wasClean && retryAttemptRef.current < MAX_RETRY_ATTEMPTS) {
                    const delay = getRetryDelay(retryAttemptRef.current);
                    setConnectionState('reconnecting');
                    setConnectionMessage(`Connection lost. Reconnecting in ${Math.ceil(delay / 1000)}s...`);

                    if (termRef.current) {
                        termRef.current.write(`\x1b[33m\r\nConnection lost. Reconnecting in ${Math.ceil(delay / 1000)}s...\x1b[0m\r\n`);
                    }

                    reconnectTimeoutRef.current = setTimeout(() => {
                        retryAttemptRef.current++;
                        setRetryCount(retryAttemptRef.current);
                        connectWebSocket();
                    }, delay);
                } else if (retryAttemptRef.current >= MAX_RETRY_ATTEMPTS) {
                    setConnectionState('error');
                    setConnectionMessage('Max retry attempts reached. Please refresh the page.');
                    if (termRef.current) {
                        termRef.current.write('\x1b[31m\r\nMax retry attempts reached. Please refresh the page.\x1b[0m\r\n');
                    }
                } else {
                    setConnectionMessage('Connection closed.');
                    if (termRef.current) {
                        termRef.current.write('\x1b[31m\r\nConnection closed.\x1b[0m\r\n');
                    }
                }
            };

            ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                connectionTracker.end({ success: false, error: error.toString() });

                if (isDisposedRef.current) return;

                console.error('WebSocket error:', error);
                setConnectionState('error');
                setConnectionMessage('Connection error. Please check if backend is running.');

                trackError(`WebSocket connection error: ${error}`, {
                    type: 'websocket',
                    attempt: retryAttemptRef.current + 1,
                    errorType: 'connection_error',
                    wsUrl: settings.backend.wsUrl
                });

                if (termRef.current) {
                    termRef.current.write('\x1b[31m\r\nConnection error. Please check if backend is running.\x1b[0m\r\n');
                }
            };

        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setConnectionState('error');
            setConnectionMessage('Failed to establish connection.');

            if (termRef.current) {
                termRef.current.write('\x1b[31m\r\nFailed to establish connection.\x1b[0m\r\n');
            }
        }
    }, [settings.backend.wsUrl, getRetryDelay, startHeartbeat, stopHeartbeat, createAsyncTracker, trackError, trackInteraction, trackMetric]);

    // Initialize terminal and connect
    useEffect(() => {
        if (!terminalRef.current || isDisposedRef.current) return;

        // Create terminal instance with Catppuccin theme (matching legacy frontend)
        const term = new XTerm({
            cursorBlink: true,
            cursorStyle: 'block',
            theme: {
                background: '#1e1e2e',
                foreground: '#cdd6f4',
                cursor: '#f5e0dc',
                black: '#45475a',
                red: '#f38ba8',
                green: '#a6e3a1',
                yellow: '#f9e2af',
                blue: '#89b4fa',
                magenta: '#f5c2e7',
                cyan: '#94e2d5',
                white: '#bac2de',
                brightBlack: '#585b70',
                brightRed: '#f38ba8',
                brightGreen: '#a6e3a1',
                brightYellow: '#f9e2af',
                brightBlue: '#89b4fa',
                brightMagenta: '#f5c2e7',
                brightCyan: '#94e2d5',
                brightWhite: '#a6adc8',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
            scrollback: 1000,
            convertEol: true,
            cols: 80,
            rows: 24,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        try {
            // Open terminal in DOM
            term.open(terminalRef.current);

            // Small delay before fitting to ensure element is rendered
            requestAnimationFrame(() => {
                if (fitAddon && !isDisposedRef.current) {
                    try {
                        fitAddon.fit();
                    } catch (error) {
                        console.error('Failed to fit terminal:', error);
                    }
                }
            });
        } catch (error) {
            console.error('Failed to initialize terminal:', error);
            cleanup();
            return;
        }

        // Store references
        termRef.current = term;
        fitAddonRef.current = fitAddon;
        terminalRefInstance.current = term;

        // Clear terminal on start
        term.clear();

        // Add click listener
        terminalRef.current.addEventListener('click', handleClick);

        // Initial connection
        connectWebSocket();

        // Return cleanup function
        return cleanup;
    }, [windowId, handleClick, connectWebSocket, cleanup]);

    // Manual reconnect handler
    const handleReconnect = useCallback(() => {
        retryAttemptRef.current = 0;
        setRetryCount(0);
        connectWebSocket();
    }, [connectWebSocket]);

    const handleCopy = async () => {
        if (!terminalRefInstance.current) return;

        try {
            const selection = terminalRefInstance.current.getSelection();
            if (!selection) return;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(selection);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = selection;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
            // Show error in terminal
            if (terminalRefInstance.current) {
                terminalRefInstance.current.write('\r\n\x1b[31mFailed to copy selection\x1b[0m\r\n');
            }
        }
    };

    // Get connection status color and icon
    const getConnectionStatus = () => {
        switch (connectionState) {
            case 'connected':
                return { color: 'text-green-400', icon: Wifi, text: 'Connected' };
            case 'connecting':
            case 'reconnecting':
                return { color: 'text-yellow-400', icon: RefreshCw, text: 'Connecting...' };
            case 'error':
                return { color: 'text-red-400', icon: WifiOff, text: 'Error' };
            case 'disconnected':
            default:
                return { color: 'text-gray-400', icon: WifiOff, text: 'Disconnected' };
        }
    };

    const connectionStatus = getConnectionStatus();
    const StatusIcon = connectionStatus.icon;

    return (
        <AsyncErrorBoundary
            maxRetries={3}
            customMessages={{
                title: 'Terminal Connection Error',
                description: 'Failed to establish terminal connection. Please check the backend server.',
                retry: 'Reconnect Terminal'
            }}
        >
            <div className="relative flex flex-col h-full" style={{ backgroundColor: '#1e1e2e' }}>
                {/* Terminal Header - Overlay */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <Terminal size={16} className={connectionStatus.color} />
                        <div className="flex items-center gap-2">
                            <div>
                                <h3 className="text-gray-100 font-medium text-sm">Terminal</h3>
                                <p className="text-gray-500 text-xs">
                                    {connectionStatus.text}
                                    {connectionMessage && ` - ${connectionMessage}`}
                                    {retryCount > 0 && ` (Retry ${retryCount}/${MAX_RETRY_ATTEMPTS})`}
                                </p>
                            </div>
                            {connectionState === 'connecting' || connectionState === 'reconnecting' ? (
                                <div className="scale-75">
                                    <Loading
                                        variant="dots"
                                        size="sm"
                                        className="text-yellow-400"
                                    />
                                </div>
                            ) : (
                                <StatusIcon size={12} className={connectionStatus.color} />
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Manual reconnect button - only show when not connected */}
                        {(connectionState === 'disconnected' || connectionState === 'error') && (
                            <button
                                onClick={handleReconnect}
                                className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-gray-100 transition-colors"
                                title="Reconnect to terminal"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                            title="Copy selection"
                        >
                            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* Terminal Container */}
                <div
                    ref={terminalRef}
                    className="flex-1"
                    style={{
                        width: '100%',
                        height: '100%',
                        paddingTop: '40px' // Account for header
                    }}
                />
            </div>
        </AsyncErrorBoundary>
    );
};
