/**
 * CLI: Scrape Restaurant
 *
 * Usage:
 *   npm run scrape "Restaurant Name" "City"
 *   npm run scrape "Chez Marco" "Montreal"
 */

import 'dotenv/config';
import path from 'path';
import { scrapeRestaurant } from '../scraper';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npm run scrape "Restaurant Name" "City"');
    console.log('Example: npm run scrape "Chez Marco" "Montreal"');
    process.exit(1);
  }

  const [name, city] = args;
  const outputDir = path.join(process.cwd(), 'output', generateSlug(name));

  console.log(`\n🔍 Scraping: ${name}, ${city}`);
  console.log(`📂 Output: ${outputDir}\n`);

  try {
    const data = await scrapeRestaurant(name, city, outputDir);

    console.log('\n✅ Scrape complete!');
    console.log(`   Name: ${data.name}`);
    console.log(`   Rating: ${data.rating}/5 (${data.reviewCount} reviews)`);
    console.log(`   Photos: ${data.photos.length}`);
    console.log(`   Reviews: ${data.reviews.length}`);
    console.log(`\n📄 Data saved to: ${outputDir}/data.json`);

  } catch (error) {
    console.error('\n❌ Scrape failed:', error);
    process.exit(1);
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

main();
