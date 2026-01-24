/**
 * Agent Paul
 * Restaurant Landing Page Generator
 *
 * Usage:
 *   npm run bot        - Start Telegram bot only
 *   npm run server     - Start API server only
 *   npm run dev        - Start both (development)
 *   npm run scrape     - Scrape a restaurant
 *   npm run generate   - Generate page from data
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { startBot } from './bot';
import { startServer } from './api';

// Ensure output directory exists
async function ensureOutputDir() {
  const outputDir = path.join(process.cwd(), 'output');
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`📁 Output directory ready: ${outputDir}`);
  } catch (error) {
    console.error('Failed to create output directory:', error);
  }
}

// Main entry - start bot and/or server
async function main() {
  console.log('🚀 Agent Paul starting...');
  console.log('='.repeat(50));

  // Create output directory
  await ensureOutputDir();

  const mode = process.env.MODE || 'both';
  const port = Number(process.env.PORT) || 3000;

  try {
    if (mode === 'bot' || mode === 'both') {
      await startBot();
      console.log('✅ Bot is running!');
    }

    if (mode === 'server' || mode === 'both') {
      await startServer(port);
      console.log(`✅ Server running on port ${port}`);
    }

    console.log('='.repeat(50));
    console.log('Agent Paul ready! 🎉');

  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

main();
