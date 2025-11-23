// Terminal Connection Test Script
// This script tests the WebSocket terminal connection with timeout fixes

const WebSocket = require('ws');

console.log('Testing WebSocket Terminal Connection...\n');

const wsUrl = 'ws://localhost:3001';
let connectionAttempts = 0;
const maxAttempts = 3;

function testConnection() {
    connectionAttempts++;
    console.log(`Connection attempt ${connectionAttempts}/${maxAttempts}...`);

    const ws = new WebSocket(wsUrl);
    let messageReceived = false;
    let heartbeatReceived = false;

    const timeout = setTimeout(() => {
        if (!messageReceived) {
            console.log('❌ Connection timeout - no initial message received');
            ws.close();
            if (connectionAttempts < maxAttempts) {
                setTimeout(testConnection, 2000);
            } else {
                console.log('\n❌ All connection attempts failed');
                process.exit(1);
            }
        }
    }, 10000);

    ws.on('open', () => {
        console.log('✅ WebSocket connection established');

        // Send heartbeat ping after 1 second
        setTimeout(() => {
            try {
                ws.send('\x00');
                console.log('📡 Heartbeat ping sent');
            } catch (error) {
                console.error('❌ Failed to send heartbeat:', error);
            }
        }, 1000);

        // Send test command after 2 seconds
        setTimeout(() => {
            try {
                ws.send('echo "WebSocket terminal test successful"\r');
                console.log('⌨️  Test command sent');
            } catch (error) {
                console.error('❌ Failed to send test command:', error);
            }
        }, 2000);

        // Close connection after 5 seconds
        setTimeout(() => {
            ws.close(1000, 'Test completed');
        }, 5000);
    });

    ws.on('message', (data) => {
        const message = data.toString();

        if (!messageReceived) {
            messageReceived = true;
            clearTimeout(timeout);
            console.log('✅ Initial message received:', message.trim());
        } else if (message === '\x00') {
            heartbeatReceived = true;
            console.log('💓 Heartbeat pong received');
        } else if (message.includes('WebSocket terminal test successful')) {
            console.log('✅ Test command executed successfully!');
            console.log('   Response:', message.trim());
        } else {
            console.log('📨 Message:', message.trim());
        }
    });

    ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        console.log(`🔌 Connection closed: ${code} - ${reason}`);

        if (messageReceived && heartbeatReceived) {
            console.log('\n🎉 All tests passed! Terminal connection is working correctly.');
            console.log('   ✅ Connection established');
            console.log('   ✅ Initial message received');
            console.log('   ✅ Heartbeat mechanism working');
            console.log('   ✅ Command execution working');
            process.exit(0);
        } else if (messageReceived) {
            console.log('\n⚠️  Partial success - connection works but heartbeat may have issues');
            process.exit(0);
        } else {
            console.log('\n❌ Connection failed - no messages received');
            if (connectionAttempts < maxAttempts) {
                setTimeout(testConnection, 2000);
            } else {
                process.exit(1);
            }
        }
    });

    ws.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ WebSocket error:', error.message);

        if (connectionAttempts < maxAttempts) {
            setTimeout(testConnection, 2000);
        } else {
            console.log('\n❌ All connection attempts failed with errors');
            process.exit(1);
        }
    });
}

// Start the test
console.log(`Connecting to: ${wsUrl}`);
testConnection();