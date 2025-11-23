// This file contains the implementation of a simple command-line terminal.
// It is saved for future reference, as requested by the user.

async function executeCommand(command, outputElement) {
    const prompt = `<div style="font-family: monospace; color: #a6e3a1;">user@omarchy:~$ ${command}</div>`;
    outputElement.innerHTML += prompt;

    try {
        const response = await fetch('/api/system/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        const data = await response.json();
        const output = data.stdout || data.stderr || data.error;
        outputElement.innerHTML += `<pre>${output}</pre>`;
    } catch (error) {
        outputElement.innerHTML += `<pre>${error.message}</pre>`;
    }
    outputElement.scrollTop = outputElement.scrollHeight;
}

/*
// This was the 'terminal' case in launchApp in desktop.js:
case 'terminal':
    title = 'Terminal';
    const terminalId = `terminal-${Date.now()}`;
    content = `
        <div id="${terminalId}-output" style="height: calc(100% - 30px); overflow-y: auto; font-family: monospace; color: #a6e3a1; padding: 5px;"></div>
        <input id="${terminalId}-input" type="text" style="width: 100%; height: 30px; border: none; background: #1e1e2e; color: #a6e3a1; font-family: monospace; padding: 5px;" placeholder="user@omarchy:~$">
    `;
    setTimeout(() => {
        const input = document.getElementById(`${terminalId}-input`);
        const output = document.getElementById(`${terminalId}-output`);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                executeCommand(input.value, output);
                input.value = '';
            }
        });
    }, 100);
    break;
*/
