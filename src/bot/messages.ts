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
  FOUND_RESTAURANT: (data: RestaurantInfo, mapsUrl: string) => `*${data.name}*

${data.address}${data.phone ? `\n${data.phone}` : ''}

[Voir sur Maps](${mapsUrl})

C'est le bon?`,

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

  // Buttons - Creation
  BTN_YES: 'Oui, c\'est ca',
  BTN_NO: 'Non, ce n\'est pas ca',
  BTN_STYLE_ELEGANT: 'Elegant',
  BTN_STYLE_CASUAL: 'Casual',
  BTN_STYLE_TRENDY: 'Trendy',
  BTN_STYLE_FAMILIAL: 'Familial',
  BTN_YES_PHOTOS: 'Oui, j\'en ai',
  BTN_NO_PHOTOS: 'Non, utilise Google',
  BTN_CONTINUE: 'Continuer',
  BTN_ADD_MORE: 'Ajouter d\'autres',

  // Buttons - Edit menu
  BTN_VIEW: '👁️ Voir',
  BTN_EDIT: '✏️ Modifier',
  BTN_SHARE: '📤 Partager',
  BTN_EDIT_PHOTO: '📷 Photo',
  BTN_EDIT_TEXT: '✏️ Textes',
  BTN_EDIT_MENU: '🍽️ Menu',
  BTN_EDIT_COLORS: '🎨 Couleurs',
  BTN_EDIT_GALLERY: '📸 Galerie',
  BTN_EDIT_INFO: '📍 Infos',
  BTN_CANCEL: '❌ Annuler',
  BTN_DONE: '✅ Terminer',
  BTN_OTHER_EDIT: '✏️ Autre modif',

  // Edit menu
  EDIT_MENU: `Que veux-tu modifier?`,

  EDIT_MENU_HINT: `\n\nOu decris simplement ce que tu veux changer.`,

  // Edit - Photo
  EDIT_PHOTO_PROMPT: `📷 Envoie-moi la nouvelle photo principale.

Elle sera affichee en grand sur le hero de ta page.`,

  EDIT_PHOTO_SUCCESS: `Photo principale mise a jour!`,

  // Edit - Text submenu
  EDIT_TEXT_MENU: `Quel texte veux-tu modifier?`,

  BTN_EDIT_TITLE: '📝 Titre principal',
  BTN_EDIT_TAGLINE: '💬 Accroche',
  BTN_EDIT_DESC: '📄 Description',
  BTN_EDIT_CTA: '🔘 Bouton CTA',

  EDIT_TITLE_PROMPT: (current: string) => `Titre actuel: "${current}"

Envoie le nouveau titre:`,

  EDIT_TAGLINE_PROMPT: (current: string) => `Accroche actuelle: "${current}"

Envoie la nouvelle accroche:`,

  EDIT_DESC_PROMPT: (current: string) => `Description actuelle: "${current.substring(0, 100)}..."

Envoie la nouvelle description:`,

  EDIT_CTA_PROMPT: (current: string) => `Texte du bouton actuel: "${current}"

Envoie le nouveau texte du bouton:`,

  EDIT_TEXT_SUCCESS: (field: string) => `${field} mis a jour!`,

  // Edit - Menu
  EDIT_MENU_ITEMS: (items: Array<{name: string, price: string}>) => `Menu actuel:
${items.map((m, i) => `${i + 1}. ${m.name} - ${m.price}`).join('\n')}

Que veux-tu faire?`,

  BTN_ADD_ITEM: '➕ Ajouter plat',
  BTN_REMOVE_ITEM: '➖ Supprimer plat',
  BTN_EDIT_ITEM: '✏️ Modifier plat',

  EDIT_MENU_ADD_PROMPT: `Envoie le nouveau plat au format:
Nom du plat - Prix

Exemple: Pad Thai aux crevettes - 18$`,

  EDIT_MENU_REMOVE_PROMPT: (items: Array<{name: string}>) => `Quel plat supprimer?
${items.map((m, i) => `${i + 1}. ${m.name}`).join('\n')}

Envoie le numero ou le nom du plat.`,

  EDIT_MENU_SUCCESS: (action: string) => `Menu ${action}!`,

  // Edit - Colors
  EDIT_COLORS_MENU: `Choisis un theme de couleurs:`,

  BTN_COLOR_RED: '🔴 Rouge classique',
  BTN_COLOR_BLUE: '🔵 Bleu moderne',
  BTN_COLOR_GREEN: '🟢 Vert nature',
  BTN_COLOR_GOLD: '🟡 Or premium',
  BTN_COLOR_CUSTOM: '🎨 Personnalise',

  EDIT_COLOR_CUSTOM_PROMPT: `Envoie ta couleur en format hex.

Exemple: #C41E3A (rouge) ou #1E3A8A (bleu)`,

  EDIT_COLOR_SUCCESS: `Couleurs mises a jour!`,

  // Edit - Gallery
  EDIT_GALLERY_PROMPT: (count: number) => `Tu as ${count} photo${count > 1 ? 's' : ''} dans la galerie.

Envoie de nouvelles photos pour les ajouter.`,

  EDIT_GALLERY_SUCCESS: (added: number) => `${added} photo${added > 1 ? 's' : ''} ajoutee${added > 1 ? 's' : ''} a la galerie!`,

  // Edit - Info
  EDIT_INFO_MENU: `Quelle info modifier?`,

  BTN_EDIT_HOURS: '🕐 Horaires',
  BTN_EDIT_PHONE: '📞 Telephone',
  BTN_EDIT_ADDRESS: '📍 Adresse',

  EDIT_HOURS_PROMPT: (current: string[]) => `Horaires actuels:
${current.join('\n')}

Envoie les nouveaux horaires (une ligne par jour):`,

  EDIT_PHONE_PROMPT: (current: string) => `Telephone actuel: ${current}

Envoie le nouveau numero:`,

  EDIT_ADDRESS_PROMPT: (current: string) => `Adresse actuelle: ${current}

Envoie la nouvelle adresse:`,

  EDIT_INFO_SUCCESS: (field: string) => `${field} mis a jour!`,

  // Share
  SHARE_MESSAGE: (url: string, name: string) => `Partage ta page!

${url}

📋 Lien copie-colle:
${url}

📱 Pour WhatsApp/SMS:
Decouvre ${name}: ${url}`
};

export type StyleChoice = 'elegant' | 'casual' | 'trendy' | 'familial';

export const STYLE_DESCRIPTIONS: Record<StyleChoice, string> = {
  elegant: 'Sophistique, experience premium',
  casual: 'Chaleureux, accessible, convivial',
  trendy: 'Moderne, dynamique, Instagram-worthy',
  familial: 'Accueillant, genereux, traditions'
};
