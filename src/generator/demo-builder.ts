/**
 * Demo Builder
 * Compiles the demo.html Handlebars template with DemoPageData
 */

import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { DemoPageData } from './demo-types';

// ============================================
// HANDLEBARS HELPERS
// ============================================

Handlebars.registerHelper('formatNumber', (num: number) => {
  if (num == null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
});

Handlebars.registerHelper('formatCurrency', (num: number) => {
  if (num == null) return '$0';
  if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
  return '$' + Math.round(num).toLocaleString();
});

Handlebars.registerHelper('formatPercent', (num: number) => {
  if (num == null) return '0%';
  return num.toFixed(1) + '%';
});

Handlebars.registerHelper('json', (context: any) => {
  return JSON.stringify(context || {});
});

Handlebars.registerHelper('stars', (rating: number) => {
  const full = Math.floor(rating || 0);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
});

Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('add', (a: number, b: number) => {
  return (a || 0) + (b || 0);
});

Handlebars.registerHelper('multiply', (a: number, b: number) => {
  return (a || 0) * (b || 0);
});

// ============================================
// TEMPLATE FINDER
// ============================================

async function findDemoTemplatePath(): Promise<string> {
  const possiblePaths = [
    path.join(process.cwd(), 'src/template/demo.html'),
    path.join(process.cwd(), 'dist/template/demo.html'),
    path.join(__dirname, '../template/demo.html'),
    path.join(__dirname, '../../src/template/demo.html'),
  ];

  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      return p;
    } catch {
      continue;
    }
  }

  throw new Error(`Demo template not found. Tried: ${possiblePaths.join(', ')}`);
}

// ============================================
// BUILD DEMO
// ============================================

/**
 * Build a complete demo HTML page from DemoPageData
 */
export async function buildDemo(data: DemoPageData): Promise<string> {
  console.log(`[DemoBuilder] Building demo for ${data.prospectName}...`);

  // Find and read template
  const templatePath = await findDemoTemplatePath();
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  // Add computed fields
  const templateData = {
    ...data,
    cuisine: data.cuisineType,
    generatedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    currentYear: new Date().getFullYear(),
  };

  // Compile and render
  const template = Handlebars.compile(templateContent);
  const html = template(templateData);

  console.log(`[DemoBuilder] Demo built: ${html.length} bytes`);
  return html;
}

/**
 * Build and save demo to output directory
 */
export async function buildAndSaveDemo(
  data: DemoPageData,
  outputDir: string
): Promise<{ htmlPath: string; dataPath: string }> {
  await fs.mkdir(outputDir, { recursive: true });

  // Build HTML
  const html = await buildDemo(data);

  // Save files
  const htmlPath = path.join(outputDir, 'index.html');
  const dataPath = path.join(outputDir, 'data.json');

  await fs.writeFile(htmlPath, html, 'utf-8');
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`[DemoBuilder] Saved to ${outputDir}`);

  return { htmlPath, dataPath };
}
