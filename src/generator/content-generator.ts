/**
 * Content Generator
 * Uses Claude API to generate landing page copy
 */

import Anthropic from '@anthropic-ai/sdk';
import { RestaurantData } from '../scraper';

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
 * Generate marketing content for a restaurant landing page
 */
export async function generateContent(
  restaurantData: RestaurantData
): Promise<GeneratedContent> {
  console.log(`[Generator] Creating content for: ${restaurantData.name}`);

  // Summarize reviews for context
  const reviewSummary = restaurantData.reviews
    .slice(0, 5)
    .map(r => `"${r.text.substring(0, 150)}..."`)
    .join('\n');

  const prompt = `Tu es un copywriter expert specialise dans les restaurants. Tu ecris en francais quebecois naturel et chaleureux.

RESTAURANT:
- Nom: ${restaurantData.name}
- Type: ${restaurantData.category || 'Restaurant'}
- Note: ${restaurantData.rating}/5 (${restaurantData.reviewCount} avis)
- Adresse: ${restaurantData.address}
- Telephone: ${restaurantData.phone}

EXTRAITS D'AVIS CLIENTS:
${reviewSummary || 'Pas d\'avis disponibles'}

GENERE le contenu suivant (en francais):

1. tagline: Accroche percutante de 5-8 mots maximum. Memorable, pas cliche.

2. description: 2-3 phrases qui donnent envie. Mentionne ce qui rend l'endroit unique selon les avis.

3. menuHighlights: 3-4 plats signatures probables avec prix realistes pour le Quebec ($15-35).
   Format: [{"name": "Nom du plat", "price": "XX$", "description": "Courte description optionnelle"}]

4. heroTitle: Titre principal pour le header. Peut etre le nom ou une variation creative.

5. ctaText: Texte du bouton principal (ex: "Reserver", "Commander", "Nous appeler")

6. primaryColor: Couleur principale en hex (#XXXXXX) - basee sur le type de cuisine
   - Thai/Asiatique: #C41E3A (rouge)
   - Italien: #2E7D32 (vert)
   - Francais: #1A237E (bleu marine)
   - Mexicain: #E65100 (orange)
   - Autre: #2C3E50 (anthracite)

7. accentColor: Couleur d'accent complementaire en hex

REGLES IMPORTANTES:
- Ton chaleureux mais authentique
- Pas de superlatifs exageres ("meilleur", "incontournable")
- Prix realistes pour Montreal/Quebec
- Si cuisine ethnique, quelques mots de la culture (ex: "Sawadee" pour thai)
- Le CTA doit etre actionnable et clair

Reponds UNIQUEMENT en JSON valide, sans markdown ni commentaires:`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    const parsed = JSON.parse(text);

    console.log(`[Generator] Content created successfully`);
    console.log(`           Tagline: "${parsed.tagline}"`);

    return {
      tagline: parsed.tagline || `${restaurantData.name}`,
      description: parsed.description || `Decouvrez ${restaurantData.name}.`,
      menuHighlights: parsed.menuHighlights || [],
      heroTitle: parsed.heroTitle || restaurantData.name,
      ctaText: parsed.ctaText || 'Reserver',
      primaryColor: parsed.primaryColor || '#2C3E50',
      accentColor: parsed.accentColor || '#E74C3C'
    };

  } catch (error) {
    console.error('[Generator] Error generating content:', error);

    // Return fallback content
    return {
      tagline: `Bienvenue chez ${restaurantData.name}`,
      description: `Decouvrez ${restaurantData.name}, votre destination ${restaurantData.category || 'gastronomique'} au coeur de la ville.`,
      menuHighlights: [
        { name: 'Plat signature', price: '22$' },
        { name: 'Specialite maison', price: '26$' },
        { name: 'Classique revisite', price: '19$' }
      ],
      heroTitle: restaurantData.name,
      ctaText: 'Reserver',
      primaryColor: '#2C3E50',
      accentColor: '#E74C3C'
    };
  }
}
