#!/usr/bin/env node

import fs from 'fs';

console.log("Resetting processed coins tracking...");

try {
    // Remove the processed coins file if it exists
    if (fs.existsSync('processed_coins.json')) {
        fs.unlinkSync('processed_coins.json');
        console.log("✓ Removed processed_coins.json");
    } else {
        console.log("✓ No processed_coins.json found");
    }
    
    console.log("Discovery reset complete! You can now run the discovery script to find new tokens and wallets.");
} catch (error) {
    console.error("Error resetting discovery:", error);
} 