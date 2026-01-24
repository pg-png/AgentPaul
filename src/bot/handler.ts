/**
 * Action Handler
 * Applies interpreted actions to page data
 */

import { PageData, savePageData, loadPageData } from '../generator';
import { InterpretedAction } from './interpreter';

export interface ActionResult {
  success: boolean;
  message: string;
  updatedData?: PageData;
  requiresPhoto?: boolean;
  photoType?: 'hero' | 'gallery';
}

/**
 * Apply an action to page data
 */
export async function handleAction(
  action: InterpretedAction,
  currentData: PageData,
  outputDir: string
): Promise<ActionResult> {
  console.log(`[Handler] Executing: ${action.action}`);

  try {
    let updatedData = { ...currentData };
    let requiresPhoto = false;
    let photoType: 'hero' | 'gallery' | undefined;

    switch (action.action) {
      case 'update_hero_title':
        updatedData.heroTitle = action.params.title;
        break;

      case 'update_tagline':
        updatedData.tagline = action.params.tagline;
        break;

      case 'update_description':
        updatedData.description = action.params.description;
        break;

      case 'update_cta':
        updatedData.ctaText = action.params.text;
        break;

      case 'add_menu_item':
        updatedData.menuHighlights = [
          ...updatedData.menuHighlights,
          {
            name: action.params.name,
            price: action.params.price,
            description: action.params.description
          }
        ];
        break;

      case 'remove_menu_item':
        const itemName = action.params.name.toLowerCase();
        updatedData.menuHighlights = updatedData.menuHighlights.filter(
          item => !item.name.toLowerCase().includes(itemName)
        );
        break;

      case 'update_menu_item':
        updatedData.menuHighlights = updatedData.menuHighlights.map(item => {
          if (item.name.toLowerCase().includes(action.params.name.toLowerCase())) {
            return {
              name: action.params.newName || item.name,
              price: action.params.newPrice || item.price,
              description: action.params.newDescription || item.description
            };
          }
          return item;
        });
        break;

      case 'add_event':
        updatedData.event = {
          title: action.params.title,
          description: action.params.description,
          date: action.params.date
        };
        break;

      case 'remove_event':
        updatedData.event = undefined;
        break;

      case 'update_notice':
        updatedData.notice = action.params.text;
        break;

      case 'remove_notice':
        updatedData.notice = undefined;
        break;

      case 'update_colors':
        if (action.params.primaryColor) {
          updatedData.primaryColor = action.params.primaryColor;
        }
        if (action.params.accentColor) {
          updatedData.accentColor = action.params.accentColor;
        }
        break;

      case 'update_hours':
        updatedData.hours = action.params.hours;
        break;

      case 'update_photo':
        requiresPhoto = true;
        photoType = action.params.type || 'hero';
        return {
          success: true,
          message: `📸 Envoie-moi la nouvelle photo pour ${photoType === 'hero' ? 'le header' : 'la galerie'}!`,
          updatedData,
          requiresPhoto,
          photoType
        };

      case 'request_regenerate':
        return {
          success: true,
          message: '🔄 Pour régénérer tout le contenu, je dois relancer le scraping complet. Confirme-tu?',
          updatedData
        };

      case 'unknown':
        return {
          success: false,
          message: action.confirmation,
          updatedData
        };

      default:
        return {
          success: false,
          message: `Action non reconnue: ${action.action}`,
          updatedData
        };
    }

    // Save updated data
    await savePageData(outputDir, updatedData);

    return {
      success: true,
      message: action.confirmation,
      updatedData
    };

  } catch (error) {
    console.error('[Handler] Error:', error);
    return {
      success: false,
      message: 'Une erreur est survenue. Réessaie!'
    };
  }
}

/**
 * Update a photo in the page data
 */
export async function updatePhoto(
  currentData: PageData,
  photoUrl: string,
  photoType: 'hero' | 'gallery',
  index: number = 0,
  outputDir: string
): Promise<ActionResult> {
  console.log(`[Handler] Updating ${photoType} photo`);

  try {
    const updatedData = { ...currentData };

    if (photoType === 'hero') {
      updatedData.heroImage = photoUrl;
    } else {
      // Gallery photo
      if (index < updatedData.photos.length) {
        updatedData.photos[index] = {
          url: photoUrl,
          alt: `Photo ${index + 1} - ${currentData.name}`
        };
      } else {
        updatedData.photos.push({
          url: photoUrl,
          alt: `Photo ${updatedData.photos.length + 1} - ${currentData.name}`
        });
      }
    }

    await savePageData(outputDir, updatedData);

    return {
      success: true,
      message: '📸 Photo mise à jour avec succès!',
      updatedData
    };

  } catch (error) {
    console.error('[Handler] Photo update error:', error);
    return {
      success: false,
      message: 'Erreur lors de la mise à jour de la photo.'
    };
  }
}

/**
 * Get a summary of current page state
 */
export function getPageSummary(data: PageData): string {
  const menuItems = data.menuHighlights
    .map(item => `• ${item.name} - ${item.price}`)
    .join('\n');

  return `📄 *Page: ${data.name}*

🎯 *Titre:* ${data.heroTitle}
✨ *Accroche:* ${data.tagline}

📝 *Description:*
${data.description}

🍽️ *Menu (${data.menuHighlights.length} plats):*
${menuItems || 'Aucun plat'}

${data.event ? `📅 *Événement:* ${data.event.title}` : ''}
${data.notice ? `📢 *Avis:* ${data.notice}` : ''}

🎨 *Couleurs:* ${data.primaryColor}, ${data.accentColor}

🔘 *CTA:* ${data.ctaText}`;
}
