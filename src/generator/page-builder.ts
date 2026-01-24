/**
 * Page Builder
 * Generates HTML from template and data
 */

import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

export interface PageData {
  // Restaurant info
  name: string;
  slug: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  hours: string[];
  rating: number;
  reviewCount: number;
  website?: string | null;

  // Generated content
  heroTitle: string;
  heroImage: string;
  ctaText: string;

  // Arrays
  photos: Array<{ url: string; alt: string }>;
  menuHighlights: Array<{ name: string; price: string; description?: string }>;
  reviews: Array<{ text: string; author: string; rating: number }>;

  // Optional sections
  event?: { title: string; description: string; date?: string };
  notice?: string;

  // Styling
  primaryColor: string;
  accentColor: string;
}

// Register Handlebars helpers
Handlebars.registerHelper('stars', (rating: number) => {
  const full = Math.floor(rating);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
});

Handlebars.registerHelper('formatPhone', (phone: string) => {
  if (!phone) return '';
  // Format: (514) 123-4567
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
});

Handlebars.registerHelper('cleanPhone', (phone: string) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
});

Handlebars.registerHelper('truncate', (text: string, length: number) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
});

Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

/**
 * Build HTML page from template and data
 */
export async function buildPage(data: PageData): Promise<string> {
  // Read template
  const templatePath = path.join(__dirname, '../template/index.html');
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  // Compile and render
  const template = Handlebars.compile(templateContent);
  return template(data);
}

/**
 * Save page data to JSON file
 */
export async function savePageData(
  outputDir: string,
  data: PageData
): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
  const dataPath = path.join(outputDir, 'data.json');
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}

/**
 * Load page data from JSON file
 */
export async function loadPageData(dataPath: string): Promise<PageData> {
  const content = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(content);
}
