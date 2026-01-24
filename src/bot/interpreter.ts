/**
 * Command Interpreter
 * Uses Claude to understand natural language and convert to actions
 */

import Anthropic from '@anthropic-ai/sdk';
import { PageData } from '../generator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface InterpretedAction {
  action: string;
  params: Record<string, any>;
  confirmation: string;
}

const AVAILABLE_ACTIONS = `
ACTIONS DISPONIBLES:
1. update_hero_title - Changer le titre principal
   params: { title: string }

2. update_tagline - Changer l'accroche
   params: { tagline: string }

3. update_description - Changer la description
   params: { description: string }

4. update_cta - Changer le bouton d'action
   params: { text: string }

5. add_menu_item - Ajouter un plat au menu
   params: { name: string, price: string, description?: string }

6. remove_menu_item - Retirer un plat du menu
   params: { name: string }

7. update_menu_item - Modifier un plat existant
   params: { name: string, newName?: string, newPrice?: string, newDescription?: string }

8. add_event - Ajouter un événement/promotion
   params: { title: string, description: string, date?: string }

9. remove_event - Retirer l'événement
   params: {}

10. update_notice - Ajouter/modifier un avis important
    params: { text: string }

11. remove_notice - Retirer l'avis
    params: {}

12. update_colors - Changer les couleurs
    params: { primaryColor?: string, accentColor?: string }

13. update_hours - Mettre à jour les heures
    params: { hours: string[] }

14. update_photo - Demander une nouvelle photo (nécessite upload)
    params: { type: "hero" | "gallery", index?: number }

15. request_regenerate - Régénérer tout le contenu
    params: {}

16. unknown - Action non reconnue
    params: { originalMessage: string }
`;

/**
 * Interpret a natural language message and convert to action
 */
export async function interpretMessage(
  message: string,
  currentData: PageData
): Promise<InterpretedAction> {
  console.log(`[Interpreter] Processing: "${message.substring(0, 50)}..."`);

  const prompt = `Tu es un assistant qui aide les restaurateurs à modifier leur page web.
Tu dois comprendre leur demande en langage naturel et la convertir en action structurée.

CONTEXTE DE LA PAGE ACTUELLE:
- Nom: ${currentData.name}
- Titre hero: ${currentData.heroTitle}
- Tagline: ${currentData.tagline}
- Description: ${currentData.description}
- CTA: ${currentData.ctaText}
- Menu: ${JSON.stringify(currentData.menuHighlights)}
- Événement: ${currentData.event ? JSON.stringify(currentData.event) : 'Aucun'}
- Notice: ${currentData.notice || 'Aucune'}
- Couleurs: ${currentData.primaryColor}, ${currentData.accentColor}

${AVAILABLE_ACTIONS}

MESSAGE DU RESTAURATEUR:
"${message}"

RÈGLES:
1. Comprends l'intention même si le français est approximatif
2. Si plusieurs actions sont demandées, choisis la principale
3. Si le message est ambigu, demande clarification via "unknown"
4. Génère une confirmation naturelle et chaleureuse
5. Pour les couleurs, convertis les noms en hex (ex: "rouge" -> "#C41E3A")

Réponds UNIQUEMENT en JSON valide:
{
  "action": "nom_de_action",
  "params": { ... },
  "confirmation": "Message de confirmation pour l'utilisateur"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);

    console.log(`[Interpreter] Action: ${parsed.action}`);

    return {
      action: parsed.action || 'unknown',
      params: parsed.params || {},
      confirmation: parsed.confirmation || 'Action comprise!'
    };

  } catch (error) {
    console.error('[Interpreter] Error:', error);
    return {
      action: 'unknown',
      params: { originalMessage: message },
      confirmation: "Désolé, je n'ai pas compris. Peux-tu reformuler?"
    };
  }
}

/**
 * Generate a help message listing available actions
 */
export function getHelpMessage(): string {
  return `🔧 *Voici ce que je peux faire:*

📝 *Textes*
• Changer le titre principal
• Modifier l'accroche
• Mettre à jour la description
• Modifier le bouton d'action

🍽️ *Menu*
• Ajouter un plat
• Retirer un plat
• Modifier un plat existant

📅 *Événements*
• Ajouter une promo/événement
• Retirer l'événement

📢 *Annonces*
• Ajouter un avis important
• Retirer l'avis

🎨 *Style*
• Changer les couleurs

📸 *Photos*
• Changer la photo principale
• Modifier la galerie

💡 *Exemples de demandes:*
"Change le titre pour Bienvenue chez Marco"
"Ajoute la pizza margherita à 18$"
"Met une promo pour la St-Valentin"
"Je veux du rouge comme couleur principale"`;
}
