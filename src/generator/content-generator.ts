/**
 * Content Generator - Premium Version
 * Uses Claude API with optimized prompts for high-quality restaurant content
 */

import Anthropic from '@anthropic-ai/sdk';
import { RestaurantData } from '../scraper';
import {
  buildPremiumPrompt,
  buildReviewAnalysisPrompt,
  STYLES,
  ContentStyle,
  detectCuisine,
  CUISINE_COLORS
} from './prompts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface GeneratedContent {
  tagline: string;
  description: string;
  menuHighlights: Array<{ name: string; price: string; description?: string }>;
  heroTitle: string;
  ctaText: string;
  primaryColor: string;
  accentColor: string;
}

/**
 * Analyze reviews to extract key insights
 */
async function analyzeReviews(reviews: Array<{ text: string }>): Promise<string> {
  if (!reviews || reviews.length === 0) {
    return 'Pas assez d\'avis disponibles pour une analyse.';
  }

  const reviewTexts = reviews.map(r => r.text).filter(t => t && t.length > 20);

  if (reviewTexts.length === 0) {
    return 'Avis trop courts pour une analyse detaillee.';
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: buildReviewAnalysisPrompt(reviewTexts)
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[Generator] Review analysis complete');
    return text;

  } catch (error) {
    console.error('[Generator] Review analysis failed:', error);
    return 'Analyse des avis non disponible.';
  }
}

/**
 * Generate premium marketing content for a restaurant landing page
 */
export async function generateContent(
  restaurantData: RestaurantData,
  styleName: 'elegant' | 'casual' | 'trendy' | 'familial' = 'casual'
): Promise<GeneratedContent> {
  console.log(`[Generator] Creating premium content for: ${restaurantData.name}`);
  console.log(`[Generator] Style: ${styleName}`);

  const style = STYLES[styleName] || STYLES.casual;
  const cuisine = detectCuisine(restaurantData.category, restaurantData.name);
  const defaultColors = CUISINE_COLORS[cuisine] || CUISINE_COLORS.default;

  // Step 1: Analyze reviews
  console.log('[Generator] Analyzing reviews...');
  const reviewAnalysis = await analyzeReviews(restaurantData.reviews);

  // Step 2: Generate content with premium prompt
  console.log('[Generator] Generating content...');
  const prompt = buildPremiumPrompt(restaurantData, reviewAnalysis, style);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Clean and parse JSON
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedText);

    console.log('[Generator] Content created successfully');
    console.log(`[Generator] Tagline: "${parsed.tagline}"`);

    // Validate and return with fallbacks
    return {
      tagline: parsed.tagline || `Bienvenue chez ${restaurantData.name}`,
      description: parsed.description || buildFallbackDescription(restaurantData),
      menuHighlights: validateMenuHighlights(parsed.menuHighlights, cuisine),
      heroTitle: parsed.heroTitle || restaurantData.name,
      ctaText: parsed.ctaText || 'Reserve ta table',
      primaryColor: parsed.primaryColor || defaultColors.primary,
      accentColor: parsed.accentColor || defaultColors.accent
    };

  } catch (error) {
    console.error('[Generator] Content generation failed:', error);

    // Return quality fallback content
    return buildFallbackContent(restaurantData, style, defaultColors);
  }
}

/**
 * Validate and clean menu highlights
 */
function validateMenuHighlights(
  items: any[],
  cuisine: string
): Array<{ name: string; price: string; description?: string }> {
  if (!Array.isArray(items) || items.length === 0) {
    return getDefaultMenuForCuisine(cuisine);
  }

  return items.slice(0, 4).map(item => ({
    name: item.name || 'Specialite du chef',
    price: item.price || '22$',
    description: item.description
  }));
}

/**
 * Get default menu items based on cuisine type
 */
function getDefaultMenuForCuisine(cuisine: string): Array<{ name: string; price: string; description?: string }> {
  const menus: Record<string, Array<{ name: string; price: string; description: string }>> = {
    thai: [
      { name: 'Pad Thai Classique', price: '18$', description: 'Nouilles de riz, crevettes, arachides, lime' },
      { name: 'Curry Vert', price: '20$', description: 'Poulet, lait de coco, basilic thai' },
      { name: 'Tom Yum', price: '14$', description: 'Soupe epicee aux crevettes, citronnelle' },
      { name: 'Mango Sticky Rice', price: '10$', description: 'Dessert traditionnel a la mangue' }
    ],
    japanese: [
      { name: 'Sashimi Selection', price: '28$', description: 'Assortiment de poissons frais du jour' },
      { name: 'Ramen Tonkotsu', price: '19$', description: 'Bouillon porc, chashu, oeuf marine' },
      { name: 'Dragon Roll', price: '22$', description: 'Crevette tempura, avocat, anguille' },
      { name: 'Gyoza', price: '12$', description: 'Raviolis japonais grilles, porc et legumes' }
    ],
    italian: [
      { name: 'Tagliatelle al Ragu', price: '24$', description: 'Pates fraiches, sauce bolognaise maison' },
      { name: 'Pizza Margherita', price: '18$', description: 'Tomate San Marzano, mozzarella, basilic' },
      { name: 'Osso Buco', price: '32$', description: 'Jarret de veau braise, gremolata' },
      { name: 'Tiramisu', price: '12$', description: 'Classique au mascarpone et cafe' }
    ],
    french: [
      { name: 'Tartare de Boeuf', price: '22$', description: 'Coupe au couteau, condiments classiques' },
      { name: 'Magret de Canard', price: '34$', description: 'Sauce aux cerises, legumes de saison' },
      { name: 'Moules Frites', price: '24$', description: 'Moules marinieres, frites maison' },
      { name: 'Creme Brulee', price: '12$', description: 'Vanille de Madagascar' }
    ],
    default: [
      { name: 'Entree du Chef', price: '16$', description: 'Selection du jour' },
      { name: 'Plat Signature', price: '26$', description: 'Specialite de la maison' },
      { name: 'Classique Revisite', price: '22$', description: 'Notre interpretation moderne' },
      { name: 'Dessert Maison', price: '12$', description: 'Fait sur place quotidiennement' }
    ]
  };

  return menus[cuisine] || menus.default;
}

/**
 * Build fallback description when API fails
 */
function buildFallbackDescription(restaurant: RestaurantData): string {
  const cuisine = detectCuisine(restaurant.category, restaurant.name);

  const cuisineDescriptions: Record<string, string> = {
    thai: `Decouvrez l'authenticite de la cuisine thailandaise chez ${restaurant.name}. Des saveurs parfumees, des ingredients frais, et un accueil chaleureux vous attendent.`,
    japanese: `${restaurant.name} vous invite a un voyage culinaire au Japon. Precision, fraicheur et tradition dans chaque assiette.`,
    italian: `Chez ${restaurant.name}, la dolce vita prend vie. Pates fraiches, ingredients importes, et l'amour de la cuisine italienne.`,
    french: `${restaurant.name} celebre le savoir-faire francais. Une cuisine raffinee dans une atmosphere accueillante.`,
    default: `Bienvenue chez ${restaurant.name}. Une destination culinaire ou qualite et convivialite sont au rendez-vous.`
  };

  return cuisineDescriptions[cuisine] || cuisineDescriptions.default;
}

/**
 * Build complete fallback content
 */
function buildFallbackContent(
  restaurant: RestaurantData,
  style: ContentStyle,
  colors: { primary: string; accent: string }
): GeneratedContent {
  const cuisine = detectCuisine(restaurant.category, restaurant.name);

  return {
    tagline: `Bienvenue chez ${restaurant.name}`,
    description: buildFallbackDescription(restaurant),
    menuHighlights: getDefaultMenuForCuisine(cuisine),
    heroTitle: restaurant.name,
    ctaText: 'Reserve ta table',
    primaryColor: colors.primary,
    accentColor: colors.accent
  };
}
