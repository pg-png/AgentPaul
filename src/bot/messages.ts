/**
 * Bot Messages Library
 * All text content for the Telegram bot in French
 */

import { PageData } from '../generator';

export interface RestaurantInfo {
  name: string;
  address: string;
  phone?: string;
}

export const MESSAGES = {
  // Welcome
  WELCOME: `Salut! Je suis Paul, ton assistant pour creer une landing page pour ton restaurant.

C'est simple: tu me donnes les infos, je cree la page.

On commence? Dis-moi le nom de ton restaurant.`,

  WELCOME_RETURNING: (pages: string[]) => `Content de te revoir!

Tu as deja ${pages.length} page${pages.length > 1 ? 's' : ''}:
${pages.map(p => `• ${p}`).join('\n')}

Tu veux modifier une page existante ou en creer une nouvelle?
Dis-moi le nom du restaurant.`,

  // Onboarding flow
  ASK_NAME: `Dis-moi le nom de ton restaurant.`,

  ASK_CITY: (name: string) => `${name}, note!

Dans quelle ville?`,

  SEARCHING: (name: string, city: string) => `Je cherche "${name}" a ${city} sur Google Maps...`,

  // Restaurant found
  FOUND_RESTAURANT: (data: RestaurantInfo, mapsUrl: string) => `J'ai trouve:

${data.name}
${data.address}
${data.phone ? data.phone : ''}

[Voir sur Google Maps](${mapsUrl})

C'est bien ton restaurant?`,

  NOT_FOUND: `Je n'ai pas trouve ce restaurant sur Google Maps.

Verifie:
• Le nom exact (comme sur Google)
• La ville
• Que le restaurant est bien sur Maps

Essaie encore avec le nom exact.`,

  // Style selection
  ASK_STYLE: `Quel vibe correspond le mieux a ton resto?`,

  // Generation progress
  GENERATING_START: `Parfait! Je genere ta landing page...`,
  GENERATING_CONTENT: `Creation du contenu...`,
  GENERATING_PAGE: `Design de la page...`,

  // Page ready
  PAGE_READY: (data: PageData, url: string) => `Ta page est prete!

Voir ta page: ${url}

━━━━━━━━━━━━━━━━━━━━━━

Titre: ${data.heroTitle}
Accroche: ${data.tagline}

Menu:
${data.menuHighlights.slice(0, 3).map(m => `• ${m.name} - ${m.price}`).join('\n')}

Couleurs: ${data.primaryColor}

━━━━━━━━━━━━━━━━━━━━━━

Tu peux modifier n'importe quoi:
• "Change le titre pour..."
• "Ajoute [plat] a [prix]"
• "Met du bleu comme couleur"

Ou tape /preview pour voir la page.`,

  // Errors
  ERROR_GENERIC: `Oups, quelque chose s'est mal passe. Reessaie!`,

  ERROR_SCRAPE: `Je n'ai pas reussi a trouver les infos de ce restaurant.

Verifie:
• Le nom est correct
• Le restaurant est sur Google Maps
• La ville est bonne`,

  ERROR_GENERATE: `Le contenu n'a pas pu etre genere. Je reessaie...`,

  ERROR_NO_PAGE: `Tu n'as pas encore de page.

Envoie-moi le nom de ton restaurant pour commencer!`,

  // Help
  HELP: `Voici ce que je peux faire:

Creer une page
→ Dis-moi le nom de ton resto

Modifier ta page
→ "Change le titre pour..."
→ "Ajoute [plat] a [prix]"
→ "Enleve le pad thai"
→ "Met du rouge"

Voir ta page
→ /preview

Publier
→ /deploy

Aide
→ /help`,

  // Modification confirmations
  MODIFICATION_SUCCESS: (what: string) => `C'est fait! ${what}`,

  MODIFICATION_PREVIEW: (url: string) => `Regarde le resultat: ${url}`,

  // Photo flow
  ASK_PHOTO: `Tu veux ajouter tes propres photos?`,

  PHOTO_INSTRUCTIONS: `Envoie-moi 3 a 5 photos de ton restaurant.

Tips:
• La premiere sera la photo principale
• Format carre ou portrait = ideal
• Bonne lumiere = meilleur rendu

Envoie quand tu es pret!`,

  PHOTO_RECEIVED: (current: number, total: number) => `Photo ${current}/${total} recue`,

  PHOTOS_COMPLETE: (count: number) => `Parfait! J'ai ${count} photos.`,

  // Deploy
  DEPLOY_START: `Je deploie ta page sur Vercel...`,
  DEPLOY_SUCCESS: (url: string) => `Deploye!

URL definitive: ${url}

Tu peux maintenant partager ce lien!`,

  DEPLOY_NOT_READY: `Pour deployer, tu dois d'abord creer une page.`,

  // Buttons
  BTN_YES: 'Oui, c\'est ca',
  BTN_NO: 'Non, ce n\'est pas ca',
  BTN_STYLE_ELEGANT: 'Elegant',
  BTN_STYLE_CASUAL: 'Casual',
  BTN_STYLE_TRENDY: 'Trendy',
  BTN_STYLE_FAMILIAL: 'Familial',
  BTN_YES_PHOTOS: 'Oui, j\'en ai',
  BTN_NO_PHOTOS: 'Non, utilise Google',
  BTN_CONTINUE: 'Continuer',
  BTN_ADD_MORE: 'Ajouter d\'autres'
};

export type StyleChoice = 'elegant' | 'casual' | 'trendy' | 'familial';

export const STYLE_DESCRIPTIONS: Record<StyleChoice, string> = {
  elegant: 'Sophistique, experience premium',
  casual: 'Chaleureux, accessible, convivial',
  trendy: 'Moderne, dynamique, Instagram-worthy',
  familial: 'Accueillant, genereux, traditions'
};
