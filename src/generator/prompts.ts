/**
 * Premium Prompts Library
 * High-quality prompts for restaurant content generation
 */

import { RestaurantData } from '../scraper';

export interface ContentStyle {
  name: 'elegant' | 'casual' | 'trendy' | 'familial';
  description: string;
  tone: string;
  colorPalette: { primary: string; accent: string };
}

export const STYLES: Record<string, ContentStyle> = {
  elegant: {
    name: 'elegant',
    description: 'Sophistique, raffine, experience premium',
    tone: 'Mots choisis, phrases elegantes, atmosphere exclusive',
    colorPalette: { primary: '#1A1A2E', accent: '#D4AF37' }
  },
  casual: {
    name: 'casual',
    description: 'Chaleureux, accessible, convivial',
    tone: 'Amical, accueillant, comme a la maison',
    colorPalette: { primary: '#5D4037', accent: '#FF8A65' }
  },
  trendy: {
    name: 'trendy',
    description: 'Moderne, dynamique, Instagram-worthy',
    tone: 'Energique, actuel, audacieux',
    colorPalette: { primary: '#6C63FF', accent: '#FF6B6B' }
  },
  familial: {
    name: 'familial',
    description: 'Accueillant, genereux, traditions',
    tone: 'Reconfortant, authentique, partage',
    colorPalette: { primary: '#2E7D32', accent: '#FFC107' }
  }
};

export const CUISINE_COLORS: Record<string, { primary: string; accent: string }> = {
  thai: { primary: '#C41E3A', accent: '#D4AF37' },
  asian: { primary: '#C41E3A', accent: '#D4AF37' },
  japanese: { primary: '#2D2D2D', accent: '#C41E3A' },
  chinese: { primary: '#C41E3A', accent: '#FFD700' },
  vietnamese: { primary: '#4A7C59', accent: '#F4A460' },
  italian: { primary: '#2E5339', accent: '#D4A574' },
  french: { primary: '#1A237E', accent: '#C9B037' },
  mexican: { primary: '#E65100', accent: '#43A047' },
  indian: { primary: '#FF6F00', accent: '#7B1FA2' },
  mediterranean: { primary: '#1565C0', accent: '#FFB300' },
  american: { primary: '#B71C1C', accent: '#1565C0' },
  korean: { primary: '#D32F2F', accent: '#1976D2' },
  default: { primary: '#2C3E50', accent: '#E74C3C' }
};

/**
 * Detect cuisine type from category or name
 */
export function detectCuisine(category: string, name: string): string {
  const text = `${category} ${name}`.toLowerCase();

  if (text.includes('thai') || text.includes('thaï')) return 'thai';
  if (text.includes('japan') || text.includes('sushi') || text.includes('ramen')) return 'japanese';
  if (text.includes('chin') || text.includes('szechuan') || text.includes('canton')) return 'chinese';
  if (text.includes('viet') || text.includes('pho')) return 'vietnamese';
  if (text.includes('ital') || text.includes('pizza') || text.includes('pasta')) return 'italian';
  if (text.includes('franç') || text.includes('french') || text.includes('bistro')) return 'french';
  if (text.includes('mexic') || text.includes('taco') || text.includes('burrito')) return 'mexican';
  if (text.includes('ind') || text.includes('curry') || text.includes('tandoori')) return 'indian';
  if (text.includes('mediterr') || text.includes('greek') || text.includes('lebanese')) return 'mediterranean';
  if (text.includes('burger') || text.includes('american') || text.includes('bbq')) return 'american';
  if (text.includes('korea') || text.includes('korean') || text.includes('bibimbap')) return 'korean';
  if (text.includes('asian')) return 'asian';

  return 'default';
}

/**
 * Build the premium content generation prompt
 */
export function buildPremiumPrompt(
  restaurant: RestaurantData,
  reviewAnalysis: string,
  style: ContentStyle
): string {
  const cuisine = detectCuisine(restaurant.category, restaurant.name);
  const cuisineColors = CUISINE_COLORS[cuisine] || CUISINE_COLORS.default;

  return `Tu es un copywriter senior specialise dans la restauration.
Tu crees du contenu premium pour des landing pages de restaurants.
Tu ecris en francais quebecois: professionnel, chaleureux, jamais guinde.

═══════════════════════════════════════════════════════════════
RESTAURANT
═══════════════════════════════════════════════════════════════
Nom: ${restaurant.name}
Type: ${restaurant.category || 'Restaurant'}
Cuisine: ${cuisine}
Note: ${restaurant.rating}/5 (${restaurant.reviewCount} avis)
Adresse: ${restaurant.address}
Telephone: ${restaurant.phone || 'Non disponible'}

═══════════════════════════════════════════════════════════════
ANALYSE DES AVIS CLIENTS
═══════════════════════════════════════════════════════════════
${reviewAnalysis || 'Pas assez d\'avis pour une analyse detaillee.'}

═══════════════════════════════════════════════════════════════
STYLE DEMANDE: ${style.name.toUpperCase()}
═══════════════════════════════════════════════════════════════
${style.description}
Ton: ${style.tone}

═══════════════════════════════════════════════════════════════
CONTENU A GENERER
═══════════════════════════════════════════════════════════════

1. TAGLINE (5-8 mots maximum)
   Objectif: Phrase d'accroche memorable qui reste en tete

   ✅ BONS EXEMPLES:
   - "Sawadee. L'authenticite dans chaque bouchee."
   - "Du marche a l'assiette, depuis 1987."
   - "La ou le Plateau rencontre Bangkok."
   - "Pasta fresca. Amore vero."

   ❌ MAUVAIS EXEMPLES:
   - "Le meilleur restaurant de Montreal" (cliche)
   - "Bienvenue chez nous" (generique)
   - "Qualite, service, passion" (vide)
   - "Une experience culinaire inoubliable" (pompeux)

2. DESCRIPTION (50-70 mots, 2-3 phrases)
   Structure:
   - Phrase 1: Hook emotionnel, histoire ou ambiance
   - Phrase 2: Ce qui rend unique (base sur les avis)
   - Phrase 3: Invitation ou promesse

   ✅ BON EXEMPLE:
   "Depuis 2015, Mae Sri transporte les saveurs de Bangkok au coeur
   du Plateau. Nos recettes familiales, transmises sur trois generations,
   font revenir nos habitues semaine apres semaine. Venez decouvrir
   pourquoi les Montrealais sont tombes amoureux de notre Pad Thai."

3. MENU HIGHLIGHTS (4 plats)
   - Noms AUTHENTIQUES de la cuisine (pas "Plat signature")
   - Prix REALISTES pour Montreal (16$-32$)
   - Description COURTE et appetissante (6-12 mots)

   FORMAT JSON:
   [
     {"name": "Pad Thai Traditionnel", "price": "18$", "description": "Nouilles de riz sautees, crevettes, arachides, lime fraiche"},
     {"name": "Curry Vert Bangkok", "price": "22$", "description": "Poulet, lait de coco, basilic thai, aubergines"},
     {"name": "Tom Yum Goong", "price": "14$", "description": "Soupe epicee aux crevettes, citronnelle, champignons"},
     {"name": "Mango Sticky Rice", "price": "10$", "description": "Riz gluant, mangue fraiche, lait de coco"}
   ]

4. HERO TITLE
   Options:
   - Nom seul si memorable: "Mae Sri"
   - Nom + type: "Mae Sri Comptoir Thai"
   - Nom creatif: "Mae Sri | Gouts de Bangkok"

5. CTA TEXT (2-4 mots)
   Action claire, peut inclure urgence subtile

   ✅ BONS: "Reserve ta table" / "Commande maintenant" / "Decouvre le menu"
   ❌ MAUVAIS: "Reserver" / "Cliquez ici" / "En savoir plus"

6. COULEURS
   Basees sur la cuisine ${cuisine}:
   - primaryColor: "${cuisineColors.primary}" (ou ajuste selon le style)
   - accentColor: "${cuisineColors.accent}" (ou ajuste selon le style)

═══════════════════════════════════════════════════════════════
REGLES ABSOLUES
═══════════════════════════════════════════════════════════════
1. ZERO superlatifs vides (meilleur, extraordinaire, incroyable)
2. ZERO cliches (passion, experience, voyage culinaire)
3. TOUJOURS base sur le reel (avis, cuisine, lieu)
4. Prix REALISTES Montreal (pas 45$ pour un pad thai)
5. Plats AUTHENTIQUES de la cuisine (recherche les vrais noms)
6. Orthographe PARFAITE

═══════════════════════════════════════════════════════════════
REPONSE
═══════════════════════════════════════════════════════════════
Reponds UNIQUEMENT en JSON valide, sans commentaires:
{
  "tagline": "...",
  "description": "...",
  "menuHighlights": [...],
  "heroTitle": "...",
  "ctaText": "...",
  "primaryColor": "#...",
  "accentColor": "#..."
}`;
}

/**
 * Build the review analysis prompt
 */
export function buildReviewAnalysisPrompt(reviews: string[]): string {
  const reviewText = reviews.slice(0, 8).join('\n---\n');

  return `Analyse ces avis de restaurant et extrait les informations cles.

AVIS:
${reviewText}

EXTRAIT:
1. Les 3 points POSITIFS les plus mentionnes (qualite, service, ambiance, plats specifiques)
2. Le ou les PLATS specifiques mentionnes positivement
3. L'AMBIANCE generale (romantique, familial, anime, intime, etc.)
4. Un MOT-CLE qui resume l'experience client

Reponds en francais, format concis (5 lignes max):`;
}
