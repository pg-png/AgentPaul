/**
 * CLI: Generate Page from Data
 *
 * Usage:
 *   npm run generate [slug]
 *   npm run generate chez-marco
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { loadPageData, buildPage, savePageData, PageData } from '../generator';
import { generateContent } from '../generator/content-generator';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    // List available pages
    const outputDir = path.join(process.cwd(), 'output');
    try {
      const dirs = await fs.readdir(outputDir);
      console.log('\n📄 Available pages:');
      for (const dir of dirs) {
        const dataPath = path.join(outputDir, dir, 'data.json');
        try {
          await fs.access(dataPath);
          console.log(`   • ${dir}`);
        } catch {
          // Skip
        }
      }
      console.log('\nUsage: npm run generate [slug]');
    } catch {
      console.log('No pages found. Run scrape first.');
    }
    process.exit(0);
  }

  const slug = args[0];
  const outputDir = path.join(process.cwd(), 'output', slug);
  const dataPath = path.join(outputDir, 'data.json');

  console.log(`\n🔄 Generating page for: ${slug}`);

  try {
    // Load existing data
    const rawData = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(rawData);

    console.log(`📄 Found: ${data.name}`);

    // Check if we need to generate content
    if (!data.tagline || args.includes('--regenerate')) {
      console.log('🤖 Generating content with Claude...');
      const content = await generateContent(data);

      data.tagline = content.tagline;
      data.description = content.description;
      data.menuHighlights = content.menuHighlights;
      data.heroTitle = content.heroTitle;
      data.ctaText = content.ctaText;
      data.primaryColor = content.primaryColor;
      data.accentColor = content.accentColor;

      // Save updated data
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
      console.log('💾 Content saved');
    }

    // Build HTML
    console.log('🏗️ Building HTML...');
    const html = await buildPage(data as PageData);

    const htmlPath = path.join(outputDir, 'index.html');
    await fs.writeFile(htmlPath, html);

    console.log(`\n✅ Page generated!`);
    console.log(`   📄 HTML: ${htmlPath}`);
    console.log(`   🎨 Title: ${data.heroTitle}`);
    console.log(`   ✨ Tagline: ${data.tagline}`);

  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  }
}

main();
