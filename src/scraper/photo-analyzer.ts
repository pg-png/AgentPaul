/**
 * Photo Analyzer
 * Uses Claude Vision to analyze and rank restaurant photos
 */

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export type PhotoType = 'FOOD' | 'AMBIANCE' | 'EXTERIOR' | 'PEOPLE' | 'OTHER';
export type PhotoRecommendation = 'HERO' | 'GALLERY' | 'SKIP';

export interface PhotoAnalysis {
  url: string;
  type: PhotoType;
  quality: number;        // 1-10: lighting, sharpness, composition
  visualAppeal: number;   // 1-10: appetizing/inviting
  recommendation: PhotoRecommendation;
  description: string;
  score: number;          // Combined score for ranking
}

export interface RankedPhotos {
  hero: PhotoAnalysis | null;
  gallery: PhotoAnalysis[];
  skipped: PhotoAnalysis[];
  totalAnalyzed: number;
}

/**
 * Convert image URL to base64
 */
async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    });
    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error(`[PhotoAnalyzer] Failed to fetch: ${url.substring(0, 50)}...`);
    throw error;
  }
}

/**
 * Detect image media type from URL or content
 */
function getMediaType(url: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg'; // Default for Google images
}

/**
 * Analyze a single photo with Claude Vision
 */
async function analyzePhoto(url: string): Promise<PhotoAnalysis | null> {
  try {
    const base64 = await urlToBase64(url);
    const mediaType = getMediaType(url);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64
            }
          },
          {
            type: 'text',
            text: `Analyse cette photo de restaurant pour une landing page.

Reponds en JSON strict:
{
  "type": "FOOD|AMBIANCE|EXTERIOR|PEOPLE|OTHER",
  "quality": 1-10,
  "visualAppeal": 1-10,
  "recommendation": "HERO|GALLERY|SKIP",
  "description": "description courte en francais"
}

Criteres:
- FOOD: Photo de plat/nourriture
- AMBIANCE: Interieur du restaurant, decoration, atmosphere
- EXTERIOR: Facade, terrasse, exterieur
- PEOPLE: Clients, staff, foule
- OTHER: Menu, logo, non-pertinent

- quality: eclairage, nettete, composition
- visualAppeal: appetissant pour FOOD, invitant pour AMBIANCE
- HERO: Meilleure photo (food idealement), excellente qualite
- GALLERY: Bonne photo, variete
- SKIP: Floue, mal cadree, non-pertinente

JSON uniquement, pas de texte avant/apres:`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Clean and parse JSON
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedText);

    // Calculate combined score
    // FOOD photos get bonus, HERO recommendations get bonus
    let score = (parsed.quality + parsed.visualAppeal) / 2;
    if (parsed.type === 'FOOD') score *= 1.3;
    if (parsed.type === 'AMBIANCE') score *= 1.1;
    if (parsed.recommendation === 'HERO') score *= 1.2;
    if (parsed.recommendation === 'SKIP') score *= 0.3;

    return {
      url,
      type: parsed.type,
      quality: parsed.quality,
      visualAppeal: parsed.visualAppeal,
      recommendation: parsed.recommendation,
      description: parsed.description,
      score: Math.round(score * 10) / 10
    };

  } catch (error) {
    console.error(`[PhotoAnalyzer] Analysis failed for: ${url.substring(0, 50)}...`, error);
    return null;
  }
}

/**
 * Analyze multiple photos and rank them
 */
export async function analyzeAndRankPhotos(
  urls: string[],
  maxToAnalyze: number = 10
): Promise<RankedPhotos> {
  console.log(`[PhotoAnalyzer] Analyzing ${Math.min(urls.length, maxToAnalyze)} photos with Claude Vision...`);

  const toAnalyze = urls.slice(0, maxToAnalyze);
  const results: PhotoAnalysis[] = [];

  // Analyze in parallel batches of 3 to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < toAnalyze.length; i += batchSize) {
    const batch = toAnalyze.slice(i, i + batchSize);
    console.log(`[PhotoAnalyzer] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toAnalyze.length / batchSize)}...`);

    const batchResults = await Promise.all(
      batch.map(url => analyzePhoto(url))
    );

    results.push(...batchResults.filter((r): r is PhotoAnalysis => r !== null));

    // Small delay between batches
    if (i + batchSize < toAnalyze.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  // Select hero: best FOOD photo, or best overall if no food
  let hero: PhotoAnalysis | null = null;
  const foodPhotos = results.filter(r => r.type === 'FOOD' && r.recommendation !== 'SKIP');
  if (foodPhotos.length > 0) {
    hero = foodPhotos[0];
  } else {
    const nonSkipped = results.filter(r => r.recommendation !== 'SKIP');
    if (nonSkipped.length > 0) {
      hero = nonSkipped[0];
    }
  }

  // Select gallery: variety of types, good quality
  const gallery: PhotoAnalysis[] = [];
  const skipped: PhotoAnalysis[] = [];

  for (const photo of results) {
    if (photo === hero) continue;

    if (photo.recommendation === 'SKIP' || photo.score < 4) {
      skipped.push(photo);
    } else if (gallery.length < 5) {
      gallery.push(photo);
    } else {
      skipped.push(photo);
    }
  }

  console.log(`[PhotoAnalyzer] Results: HERO=${hero ? 1 : 0}, GALLERY=${gallery.length}, SKIPPED=${skipped.length}`);

  return {
    hero,
    gallery,
    skipped,
    totalAnalyzed: results.length
  };
}

/**
 * Quick analysis - just get the best photo for hero without full ranking
 */
export async function findBestHeroPhoto(urls: string[]): Promise<string | null> {
  if (urls.length === 0) return null;

  const result = await analyzeAndRankPhotos(urls, Math.min(urls.length, 6));
  return result.hero?.url || urls[0];
}

/**
 * Log analysis summary
 */
export function logAnalysisSummary(ranked: RankedPhotos): void {
  console.log('\n[PhotoAnalyzer] === ANALYSIS SUMMARY ===');

  if (ranked.hero) {
    console.log(`HERO: ${ranked.hero.type} - Score ${ranked.hero.score}`);
    console.log(`      "${ranked.hero.description}"`);
  }

  console.log(`\nGALLERY (${ranked.gallery.length}):`);
  ranked.gallery.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.type} - Score ${p.score} - "${p.description}"`);
  });

  if (ranked.skipped.length > 0) {
    console.log(`\nSKIPPED (${ranked.skipped.length}):`);
    ranked.skipped.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.type} - Score ${p.score} - "${p.description}"`);
    });
  }

  console.log('[PhotoAnalyzer] === END SUMMARY ===\n');
}
