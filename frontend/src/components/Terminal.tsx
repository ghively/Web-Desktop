import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal, Copy, Check } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
    windowId: string;
}

export const TerminalComponent: React.FC<TerminalProps> = ({ windowId }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalRefInstance = useRef<XTerm | null>(null);
    const [connected, setConnected] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!terminalRef.current) return;

        let ws: WebSocket | null = null;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        let isDisposed = false;

        // Small delay to ensure DOM is ready
        const initTimeout = setTimeout(() => {
            if (isDisposed || !terminalRef.current) return;

            // Create terminal instance with enhanced theme
            const term = new XTerm({
                cursorBlink: true,
                cursorStyle: 'block',
                theme: {
                    background: '#0a0a0a',
                    foreground: '#e0e0e0',
                    cursor: '#00ff00',
                    black: '#000000',
                    red: '#ff5555',
                    green: '#50fa7b',
                    yellow: '#f1fa8c',
                    blue: '#bd93f9',
                    magenta: '#ff79c6',
                    cyan: '#8be9fd',
                    white: '#f8f8f2',
                    brightBlack: '#44475a',
                    brightRed: '#ff6e6e',
                    brightGreen: '#69ff94',
                    brightYellow: '#ffffa5',
                    brightBlue: '#d6acff',
                    brightMagenta: '#ff92df',
                    brightCyan: '#a4ffff',
                    brightWhite: '#ffffff',
                },
                fontFamily: 'JetBrains Mono, "Fira Code", "Cascadia Code", monospace',
                fontSize: 14,
                fontWeight: '400',
                lineHeight: 1.2,
                letterSpacing: 0,
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
                setTimeout(() => {
                    try {
                        fitAddon.fit();
                    } catch (error) {
                        console.error('Failed to fit terminal:', error);
                    }
                }, 100);
            } catch (error) {
                console.error('Failed to initialize terminal:', error);
                return;
            }
        
            // Store reference
            terminalRefInstance.current = term;

            // Clear terminal on start
            term.clear();

        const connectWebSocket = () => {
            if (isDisposed) return;

            try {
                const wsUrl = `ws://${window.location.hostname}:3001`;
                console.log('Connecting to WebSocket:', wsUrl);
                ws = new WebSocket(wsUrl);
                const wsInstance = ws;

                wsInstance.onopen = () => {
                    console.log('WebSocket connected');
                    setConnected(true);
                    term.write('\x1b[32mConnected to terminal server...\x1b[0m\r\n');

                    // Register input handler after connection is open
                    term.onData(data => {
                        if (wsInstance.readyState === WebSocket.OPEN) {
                            wsInstance.send(data);
                        }
                    });
                };

                wsInstance.onmessage = (event) => {
                    term.write(event.data);
                };

                wsInstance.onclose = (event) => {
                    console.log('WebSocket closed:', event.code, event.reason);
                    setConnected(false);
                    if (!event.wasClean) {
                        term.write('\x1b[31m\r\nConnection lost. Attempting to reconnect...\x1b[0m\r\n');
                        // Attempt to reconnect after 2 seconds
                        if (!isDisposed) {
                            reconnectTimeout = setTimeout(connectWebSocket, 2000);
                        }
                    } else {
                        term.write('\x1b[31m\r\nConnection closed.\x1b[0m\r\n');
                    }
                };

                wsInstance.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setConnected(false);
                    term.write('\x1b[31m\r\nConnection error. Please check if backend is running.\x1b[0m\r\n');
                };
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                setConnected(false);
                term.write('\x1b[31m\r\nFailed to establish connection.\x1b[0m\r\n');
            }
        };

            // Initial connection
            connectWebSocket();

            // Handle resize with debouncing
            let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
            const handleResize = () => {
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                resizeTimeout = setTimeout(() => {
                    try {
                        fitAddon.fit();
                    } catch (error) {
                        console.error('Failed to fit terminal:', error);
                    }
                }, 100);
            };
            window.addEventListener('resize', handleResize);

            // Focus terminal on click
            const handleClick = () => {
                try {
                    term.focus();
                } catch (error) {
                    console.error('Failed to focus terminal:', error);
                }
            };
            terminalRef.current?.addEventListener('click', handleClick);

            // Cleanup
            return () => {
                isDisposed = true;
                window.removeEventListener('resize', handleResize);
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                }
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                if (ws) {
                    ws.close();
                }
                try {
                    term.dispose();
                } catch (error) {
                    console.error('Failed to dispose terminal:', error);
                }
            };
        }, 50); // Small delay for DOM readiness

        return () => {
            clearTimeout(initTimeout);
        };
    }, [windowId]);

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

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <Terminal size={16} className={connected ? "text-green-400" : "text-red-400"} />
                    <div>
                        <h3 className="text-gray-100 font-medium text-sm">Terminal</h3>
                        <p className="text-gray-500 text-xs">
                            {connected ? 'Connected' : 'Disconnected'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                        title="Copy selection"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            {/* Terminal */}
            <div 
                ref={terminalRef} 
                className="flex-1"
                style={{ 
                    height: '100%', 
                    width: '100%',
                    padding: '8px'
                }}
            />
        </div>
    );
};