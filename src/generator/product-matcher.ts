/**
 * Product Matcher
 * Scores WwithAI products against prospect pain points and generates personalized pitches.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ProspectProfile, ProductMatch, WwithAIProduct } from './demo-types';
import { getAllProducts } from './product-catalog';

const anthropic = new Anthropic();
const LOG_PREFIX = '[ProductMatcher]';

/**
 * Score a single product against the prospect's pain points.
 * Returns the numeric score and the list of matched pain point IDs.
 */
function scoreProduct(
  product: WwithAIProduct,
  profile: ProspectProfile
): { score: number; painPointsMatched: string[] } {
  const prospectPainPointIds = profile.painPoints.map((pp) => pp.id);
  const painPointsMatched = product.painPointsAddressed.filter((addr) =>
    prospectPainPointIds.includes(addr)
  );
  return {
    score: painPointsMatched.length,
    painPointsMatched,
  };
}

/**
 * Generate a personalized pitch and estimated ROI for a product-prospect pair
 * by calling the Claude API.
 */
async function generatePitch(
  product: WwithAIProduct,
  profile: ProspectProfile,
  painPointsMatched: string[]
): Promise<{ personalizedPitch: string; estimatedROI: string }> {
  const matchedPainDetails = profile.painPoints
    .filter((pp) => painPointsMatched.includes(pp.id))
    .map((pp) => `- ${pp.title} (${pp.severity} severity): ${pp.description}`)
    .join('\n');

  const prompt = `You are a sales strategist for WwithAI, a restaurant technology company.

Generate a personalized pitch for the product "${product.name}" (${product.tagline}) targeted at this specific prospect.

PROSPECT PROFILE:
- Persona: ${profile.personaType}
- Cuisine: ${profile.cuisineTypes.join(', ')}
- Number of restaurants: ${profile.restaurantCount}
- Tech savviness: ${profile.techSavviness}
- Competitive position: ${profile.competitivePosition}
- Brand voice: ${profile.brandVoice}
- Existing tools: ${profile.existingTools.join(', ') || 'None specified'}

MATCHED PAIN POINTS (why this product is relevant):
${matchedPainDetails || 'General operational improvement'}

PRODUCT DETAILS:
- Name: ${product.name}
- Description: ${product.description}
- Key benefits: ${product.keyBenefits.join('; ')}
- Typical ROI: ${product.roiMetric}

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "personalizedPitch": "<2-3 sentences tailored to this specific prospect, referencing their pain points and situation>",
  "estimatedROI": "<specific dollar amount or percentage based on their restaurant count and profile>"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const parsed = JSON.parse(textBlock.text);
  return {
    personalizedPitch: parsed.personalizedPitch,
    estimatedROI: parsed.estimatedROI,
  };
}

/**
 * Build a fallback pitch when the Claude API call fails.
 */
function buildFallbackPitch(
  product: WwithAIProduct,
  profile: ProspectProfile
): { personalizedPitch: string; estimatedROI: string } {
  const locationLabel =
    profile.restaurantCount === 1
      ? 'your restaurant'
      : `your ${profile.restaurantCount} locations`;

  return {
    personalizedPitch: `${product.name} helps ${profile.personaType.replace(/-/g, ' ')} operators like you tackle key challenges across ${locationLabel}. ${product.description}`,
    estimatedROI: product.roiMetric,
  };
}

/**
 * Match WwithAI products to a prospect profile.
 *
 * 1. Score every product against the prospect's pain points.
 * 2. Sort descending by score and take the top 3.
 * 3. For each top product, call Claude to generate a personalized pitch and ROI estimate.
 *
 * Returns an array of ProductMatch objects.
 */
export async function matchProducts(
  profile: ProspectProfile
): Promise<ProductMatch[]> {
  console.log(`${LOG_PREFIX} Starting product matching for persona: ${profile.personaType}`);

  const allProducts = getAllProducts();
  console.log(`${LOG_PREFIX} Scoring ${allProducts.length} products against ${profile.painPoints.length} pain points`);

  // Step 1: Score each product against prospect pain points
  const scored = allProducts.map((product) => {
    const { score, painPointsMatched } = scoreProduct(product, profile);
    console.log(`${LOG_PREFIX}   ${product.name}: score ${score} (matched: ${painPointsMatched.join(', ') || 'none'})`);
    return { product, score, painPointsMatched };
  });

  // Step 2: Sort by score descending, take top 3
  const topProducts = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  console.log(`${LOG_PREFIX} Top 3 products selected: ${topProducts.map((p) => p.product.name).join(', ')}`);

  // Step 3: Generate personalized pitches via Claude
  const matches: ProductMatch[] = [];

  for (const { product, score, painPointsMatched } of topProducts) {
    console.log(`${LOG_PREFIX} Generating pitch for: ${product.name}`);

    let personalizedPitch: string;
    let estimatedROI: string;

    try {
      const pitchResult = await generatePitch(product, profile, painPointsMatched);
      personalizedPitch = pitchResult.personalizedPitch;
      estimatedROI = pitchResult.estimatedROI;
      console.log(`${LOG_PREFIX} Pitch generated successfully for ${product.name}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.log(`${LOG_PREFIX} Claude pitch generation failed for ${product.name}: ${errMsg}. Using fallback.`);
      const fallback = buildFallbackPitch(product, profile);
      personalizedPitch = fallback.personalizedPitch;
      estimatedROI = fallback.estimatedROI;
    }

    matches.push({
      product,
      score,
      personalizedPitch,
      estimatedROI,
      painPointsMatched,
      trialUrl: (product as any).trialUrl,
    });
  }

  console.log(`${LOG_PREFIX} Product matching complete. Returning ${matches.length} matches.`);
  return matches;
}
