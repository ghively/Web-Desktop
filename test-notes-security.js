#!/usr/bin/env node

/**
 * Test script to verify Notes component security fixes
 * Tests for ReDoS vulnerabilities and input validation
 */

const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:3001/api/notes';

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', reject);
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function testSearchReDoS() {
    console.log('🧪 Testing ReDoS vulnerability in search...');

    // Test potentially dangerous patterns
    const dangerousPatterns = [
        'a'.repeat(1000) + 'a+a+a+a',
        '***************************************',
        '(a{100})',
        '[a{100}]',
        '\\\\' * 50,
        '^a^a^a^a^a^a^a^a^a^a',
        '$a$a$a$a$a$a$a$a$a$a'
    ];

    for (const pattern of dangerousPatterns) {
        try {
            const response = await makeRequest(`${API_BASE}/search?q=${encodeURIComponent(pattern)}`);

            if (response.statusCode === 200) {
                console.log(`✅ Pattern handled safely: ${pattern.substring(0, 50)}...`);
            } else if (response.statusCode === 400) {
                console.log(`✅ Dangerous pattern blocked: ${pattern.substring(0, 50)}...`);
            } else {
                console.log(`⚠️  Unexpected response ${response.statusCode} for pattern: ${pattern.substring(0, 50)}...`);
            }

            // Pattern should be handled quickly (under 2 seconds)
            const startTime = Date.now();
            await makeRequest(`${API_BASE}/search?q=${encodeURIComponent(pattern)}`);
            const duration = Date.now() - startTime;

            if (duration > 2000) {
                console.log(`🚨 SLOW RESPONSE: Pattern took ${duration}ms - potential ReDoS!`);
            } else {
                console.log(`✅ Fast response: ${duration}ms`);
            }

        } catch (error) {
            console.log(`❌ Error testing pattern: ${error.message}`);
        }
    }
}

async function testInputValidation() {
    console.log('\n🧪 Testing input validation...');

    // Test invalid JSON
    const invalidNoteData = [
        { title: '', content: 'valid content' },
        { title: 'valid title', content: 'x'.repeat(2000000) }, // Too large
        { title: '<script>alert("xss")</script>', content: 'content' },
        { title: 'valid title', tags: ['tag1', 123, null, 'tag2'] }
    ];

    for (const noteData of invalidNoteData) {
        try {
            const response = await makeRequest(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            });

            if (response.statusCode === 400) {
                console.log(`✅ Invalid input rejected: ${JSON.stringify(noteData).substring(0, 50)}...`);
            } else if (response.statusCode === 201) {
                console.log(`⚠️  Invalid input accepted: ${JSON.stringify(noteData).substring(0, 50)}...`);
            } else {
                console.log(`❓ Unexpected response ${response.statusCode}`);
            }
        } catch (error) {
            console.log(`❌ Error testing input validation: ${error.message}`);
        }
    }
}

async function testSearchFunctionality() {
    console.log('\n🧪 Testing normal search functionality...');

    const normalQueries = [
        'test',
        'hello world',
        'markdown',
        '2023',
        '# heading'
    ];

    for (const query of normalQueries) {
        try {
            const response = await makeRequest(`${API_BASE}/search?q=${encodeURIComponent(query)}`);

            if (response.statusCode === 200) {
                console.log(`✅ Normal search works: "${query}"`);
            } else {
                console.log(`❌ Normal search failed: "${query}" - ${response.statusCode}`);
            }
        } catch (error) {
            console.log(`❌ Error with normal search: ${error.message}`);
        }
    }
}

async function runAllTests() {
    console.log('🔒 Testing Notes Component Security Fixes\n');

    try {
        // Test if server is running
        await makeRequest(API_BASE);
        console.log('✅ Server is accessible\n');
    } catch (error) {
        console.log('❌ Server not accessible. Make sure the backend is running on localhost:3001\n');
        process.exit(1);
    }

    await testSearchReDoS();
    await testInputValidation();
    await testSearchFunctionality();

    console.log('\n🎉 Security testing complete!');
    console.log('If you see any 🚨 or ❌ messages, review the issues carefully.');
}

runAllTests().catch(console.error);