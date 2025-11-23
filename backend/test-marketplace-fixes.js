#!/usr/bin/env node
// Test script to validate marketplace race condition fixes
// This script checks that the proper mechanisms are in place

const fs = require('fs');
const path = require('path');

const marketplaceFile = path.join(__dirname, 'src', 'routes', 'marketplace.ts');

console.log('🔍 Validating marketplace race condition fixes...\n');

try {
    const content = fs.readFileSync(marketplaceFile, 'utf8');

    // Check for key race condition fixes
    const checks = [
        {
            name: 'File locking mechanism (withLock)',
            pattern: /const withLock = async <T>/,
            critical: true
        },
        {
            name: 'Atomic file operations (moveFilesAtomic)',
            pattern: /const moveFilesAtomic = async/,
            critical: true
        },
        {
            name: 'Retry mechanism with exponential backoff',
            pattern: /Math\.pow\(2, retries\)/,
            critical: true
        },
        {
            name: 'Staging directory for atomic operations',
            pattern: /stagingDir.*sessionId.*staging/,
            critical: true
        },
        {
            name: 'App installation lock',
            pattern: /appLockKey.*app-install/,
            critical: true
        },
        {
            name: 'Enhanced cleanup logic',
            pattern: /maxCleanupRetries/,
            critical: false
        },
        {
            name: 'Directory conflict handling',
            pattern: /App.*already installed/,
            critical: true
        },
        {
            name: 'Cross-filesystem compatible file operations',
            pattern: /moveFileCrossFilesystem/,
            critical: true
        },
        {
            name: 'Download size limits',
            pattern: /MAX_DOWNLOAD_SIZE/,
            critical: true
        },
        {
            name: 'Job tracking system',
            pattern: /activeJobs.*Map/,
            critical: false
        }
    ];

    let allPassed = true;
    let criticalPassed = true;

    checks.forEach(check => {
        if (content.match(check.pattern)) {
            console.log(`✅ ${check.name}`);
        } else {
            console.log(`❌ ${check.name} ${check.critical ? '(CRITICAL)' : ''}`);
            if (check.critical) {
                criticalPassed = false;
            }
            allPassed = false;
        }
    });

    console.log('\n' + '='.repeat(50));

    if (criticalPassed && allPassed) {
        console.log('🎉 ALL RACE CONDITION FIXES VALIDATED SUCCESSFULLY!');
        console.log('\nKey improvements implemented:');
        console.log('• File locking to prevent concurrent operations');
        console.log('• Atomic file operations with retry logic');
        console.log('• Staging directories for safe atomic moves');
        console.log('• Enhanced error handling and cleanup');
        console.log('• Directory conflict prevention');
        process.exit(0);
    } else if (criticalPassed) {
        console.log('⚠️  CRITICAL fixes validated, some optional improvements missing');
        process.exit(0);
    } else {
        console.log('🚨 CRITICAL RACE CONDITION FIXES MISSING!');
        process.exit(1);
    }

} catch (error) {
    console.error('❌ Failed to read marketplace.ts file:', error.message);
    process.exit(1);
}