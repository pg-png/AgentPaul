/**
 * Edit Flow Handler
 * Manages the interactive modification system
 */

import { Context, Markup } from 'telegraf';
import { MESSAGES } from './messages';
import {
  getSession,
  updateSession,
  transitionTo,
  ConversationState
} from './conversation';
import { PageData, buildPage, savePageData } from '../generator';
import { deployToVercel } from '../deploy';
import fs from 'fs/promises';
import path from 'path';

// Color presets
const COLOR_PRESETS: Record<string, { primary: string; accent: string }> = {
  red: { primary: '#C41E3A', accent: '#D4AF37' },
  blue: { primary: '#1E3A8A', accent: '#60A5FA' },
  green: { primary: '#166534', accent: '#86EFAC' },
  gold: { primary: '#92400E', accent: '#FCD34D' }
};

/**
 * Show the main edit menu
 */
export async function showEditMenu(ctx: Context, userId: number): Promise<void> {
  transitionTo(userId, 'EDIT_MENU');

  await ctx.reply(MESSAGES.EDIT_MENU + MESSAGES.EDIT_MENU_HINT, {
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(MESSAGES.BTN_EDIT_PHOTO, 'edit_photo'),
        Markup.button.callback(MESSAGES.BTN_EDIT_TEXT, 'edit_text')
      ],
      [
        Markup.button.callback(MESSAGES.BTN_EDIT_MENU, 'edit_menu'),
        Markup.button.callback(MESSAGES.BTN_EDIT_COLORS, 'edit_colors')
      ],
      [
        Markup.button.callback(MESSAGES.BTN_EDIT_GALLERY, 'edit_gallery'),
        Markup.button.callback(MESSAGES.BTN_EDIT_INFO, 'edit_info')
      ],
      [
        Markup.button.callback(MESSAGES.BTN_DONE, 'edit_done')
      ]
    ])
  });
}

/**
 * Show post-edit options (view, edit more, done)
 */
export async function showPostEditMenu(ctx: Context, url: string): Promise<void> {
  await ctx.reply(`Regarde le resultat:`, {
    ...Markup.inlineKeyboard([
      [Markup.button.url(MESSAGES.BTN_VIEW, url)],
      [
        Markup.button.callback(MESSAGES.BTN_OTHER_EDIT, 'show_edit_menu'),
        Markup.button.callback(MESSAGES.BTN_DONE, 'edit_done')
      ]
    ])
  });
}

/**
 * Handle edit callback queries
 */
export async function handleEditCallback(
  ctx: Context,
  userId: number,
  action: string
): Promise<boolean> {
  const session = getSession(userId);

  if (!session.pageData || !session.outputDir) {
    await ctx.reply(MESSAGES.ERROR_NO_PAGE);
    return true;
  }

  switch (action) {
    // Main edit menu
    case 'show_edit_menu':
      await showEditMenu(ctx, userId);
      return true;

    case 'edit_done':
      transitionTo(userId, 'READY');
      const url = session.vercelUrl || `https://resto-${session.pageSlug}.vercel.app`;
      await ctx.reply(`Parfait! Ta page est prete.\n\n${url}`);
      return true;

    // Photo edit
    case 'edit_photo':
      transitionTo(userId, 'EDIT_PHOTO');
      await ctx.reply(MESSAGES.EDIT_PHOTO_PROMPT, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback(MESSAGES.BTN_CANCEL, 'show_edit_menu')]
        ])
      });
      return true;

    // Text edit menu
    case 'edit_text':
      transitionTo(userId, 'EDIT_TEXT_MENU');
      await ctx.reply(MESSAGES.EDIT_TEXT_MENU, {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(MESSAGES.BTN_EDIT_TITLE, 'edit_title'),
            Markup.button.callback(MESSAGES.BTN_EDIT_TAGLINE, 'edit_tagline')
          ],
          [
            Markup.button.callback(MESSAGES.BTN_EDIT_DESC, 'edit_desc'),
            Markup.button.callback(MESSAGES.BTN_EDIT_CTA, 'edit_cta')
          ],
          [Markup.button.callback(MESSAGES.BTN_CANCEL, 'show_edit_menu')]
        ])
      });
      return true;

    case 'edit_title':
      transitionTo(userId, 'EDIT_TITLE');
      await ctx.reply(MESSAGES.EDIT_TITLE_PROMPT(session.pageData.heroTitle));
      return true;

    case 'edit_tagline':
      transitionTo(userId, 'EDIT_TAGLINE');
      await ctx.reply(MESSAGES.EDIT_TAGLINE_PROMPT(session.pageData.tagline));
      return true;

    case 'edit_desc':
      transitionTo(userId, 'EDIT_DESC');
      await ctx.reply(MESSAGES.EDIT_DESC_PROMPT(session.pageData.description));
      return true;

    case 'edit_cta':
      transitionTo(userId, 'EDIT_CTA');
      await ctx.reply(MESSAGES.EDIT_CTA_PROMPT(session.pageData.ctaText));
      return true;

    // Menu items edit
    case 'edit_menu':
      transitionTo(userId, 'EDIT_MENU_ITEMS');
      await ctx.reply(MESSAGES.EDIT_MENU_ITEMS(session.pageData.menuHighlights), {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(MESSAGES.BTN_ADD_ITEM, 'menu_add'),
            Markup.button.callback(MESSAGES.BTN_REMOVE_ITEM, 'menu_remove')
          ],
          [Markup.button.callback(MESSAGES.BTN_CANCEL, 'show_edit_menu')]
        ])
      });
      return true;

    case 'menu_add':
      transitionTo(userId, 'EDIT_MENU_ADD');
      await ctx.reply(MESSAGES.EDIT_MENU_ADD_PROMPT);
      return true;

    case 'menu_remove':
      transitionTo(userId, 'EDIT_MENU_REMOVE');
      await ctx.reply(MESSAGES.EDIT_MENU_REMOVE_PROMPT(session.pageData.menuHighlights));
      return true;

    // Colors
    case 'edit_colors':
      transitionTo(userId, 'EDIT_COLORS');
      await ctx.reply(MESSAGES.EDIT_COLORS_MENU, {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(MESSAGES.BTN_COLOR_RED, 'color_red'),
            Markup.button.callback(MESSAGES.BTN_COLOR_BLUE, 'color_blue')
          ],
          [
            Markup.button.callback(MESSAGES.BTN_COLOR_GREEN, 'color_green'),
            Markup.button.callback(MESSAGES.BTN_COLOR_GOLD, 'color_gold')
          ],
          [Markup.button.callback(MESSAGES.BTN_COLOR_CUSTOM, 'color_custom')],
          [Markup.button.callback(MESSAGES.BTN_CANCEL, 'show_edit_menu')]
        ])
      });
      return true;

    case 'color_red':
    case 'color_blue':
    case 'color_green':
    case 'color_gold':
      const colorKey = action.replace('color_', '');
      const colors = COLOR_PRESETS[colorKey];
      await applyColorChange(ctx, userId, colors.primary, colors.accent);
      return true;

    case 'color_custom':
      transitionTo(userId, 'EDIT_COLOR_CUSTOM');
      await ctx.reply(MESSAGES.EDIT_COLOR_CUSTOM_PROMPT);
      return true;

    // Gallery
    case 'edit_gallery':
      transitionTo(userId, 'EDIT_GALLERY');
      const photoCount = session.pageData.photos?.length || 0;
      await ctx.reply(MESSAGES.EDIT_GALLERY_PROMPT(photoCount), {
        ...Markup.inlineKeyboard([
          [Markup.button.callback(MESSAGES.BTN_CANCEL, 'show_edit_menu')]
        ])
      });
      return true;

    // Info edit menu
    case 'edit_info':
      transitionTo(userId, 'EDIT_INFO_MENU');
      await ctx.reply(MESSAGES.EDIT_INFO_MENU, {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(MESSAGES.BTN_EDIT_HOURS, 'info_hours'),
            Markup.button.callback(MESSAGES.BTN_EDIT_PHONE, 'info_phone')
          ],
          [Markup.button.callback(MESSAGES.BTN_EDIT_ADDRESS, 'info_address')],
          [Markup.button.callback(MESSAGES.BTN_CANCEL, 'show_edit_menu')]
        ])
      });
      return true;

    case 'info_hours':
      transitionTo(userId, 'EDIT_HOURS');
      await ctx.reply(MESSAGES.EDIT_HOURS_PROMPT(session.pageData.hours || []));
      return true;

    case 'info_phone':
      transitionTo(userId, 'EDIT_PHONE');
      await ctx.reply(MESSAGES.EDIT_PHONE_PROMPT(session.pageData.phone || ''));
      return true;

    case 'info_address':
      transitionTo(userId, 'EDIT_ADDRESS');
      await ctx.reply(MESSAGES.EDIT_ADDRESS_PROMPT(session.pageData.address || ''));
      return true;

    default:
      return false;
  }
}

/**
 * Handle text input for edit states
 */
export async function handleEditTextInput(
  ctx: Context,
  userId: number,
  text: string
): Promise<boolean> {
  const session = getSession(userId);

  if (!session.pageData || !session.outputDir) {
    return false;
  }

  let updated = false;
  let successMessage = '';

  switch (session.state) {
    case 'EDIT_TITLE':
      session.pageData.heroTitle = text;
      successMessage = MESSAGES.EDIT_TEXT_SUCCESS('Titre');
      updated = true;
      break;

    case 'EDIT_TAGLINE':
      session.pageData.tagline = text;
      successMessage = MESSAGES.EDIT_TEXT_SUCCESS('Accroche');
      updated = true;
      break;

    case 'EDIT_DESC':
      session.pageData.description = text;
      successMessage = MESSAGES.EDIT_TEXT_SUCCESS('Description');
      updated = true;
      break;

    case 'EDIT_CTA':
      session.pageData.ctaText = text;
      successMessage = MESSAGES.EDIT_TEXT_SUCCESS('Bouton');
      updated = true;
      break;

    case 'EDIT_MENU_ADD':
      // Parse "Nom - Prix" format
      const parts = text.split('-').map(p => p.trim());
      if (parts.length >= 2) {
        session.pageData.menuHighlights.push({
          name: parts[0],
          price: parts[1],
          description: parts[2] || ''
        });
        successMessage = MESSAGES.EDIT_MENU_SUCCESS('mis a jour');
        updated = true;
      } else {
        await ctx.reply('Format invalide. Utilise: Nom du plat - Prix');
        return true;
      }
      break;

    case 'EDIT_MENU_REMOVE':
      // Try to match by number or name
      const index = parseInt(text) - 1;
      if (!isNaN(index) && index >= 0 && index < session.pageData.menuHighlights.length) {
        session.pageData.menuHighlights.splice(index, 1);
        successMessage = MESSAGES.EDIT_MENU_SUCCESS('mis a jour');
        updated = true;
      } else {
        // Try to match by name
        const itemIndex = session.pageData.menuHighlights.findIndex(
          m => m.name.toLowerCase().includes(text.toLowerCase())
        );
        if (itemIndex >= 0) {
          session.pageData.menuHighlights.splice(itemIndex, 1);
          successMessage = MESSAGES.EDIT_MENU_SUCCESS('mis a jour');
          updated = true;
        } else {
          await ctx.reply('Plat non trouve. Envoie le numero ou le nom exact.');
          return true;
        }
      }
      break;

    case 'EDIT_COLOR_CUSTOM':
      // Validate hex color
      if (/^#[0-9A-Fa-f]{6}$/.test(text)) {
        await applyColorChange(ctx, userId, text, session.pageData.accentColor);
        return true;
      } else {
        await ctx.reply('Format invalide. Utilise #RRGGBB (ex: #C41E3A)');
        return true;
      }

    case 'EDIT_HOURS':
      // Parse hours (one per line)
      session.pageData.hours = text.split('\n').filter(h => h.trim());
      successMessage = MESSAGES.EDIT_INFO_SUCCESS('Horaires');
      updated = true;
      break;

    case 'EDIT_PHONE':
      session.pageData.phone = text;
      successMessage = MESSAGES.EDIT_INFO_SUCCESS('Telephone');
      updated = true;
      break;

    case 'EDIT_ADDRESS':
      session.pageData.address = text;
      // Update maps URL
      session.pageData.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
      successMessage = MESSAGES.EDIT_INFO_SUCCESS('Adresse');
      updated = true;
      break;

    default:
      return false;
  }

  if (updated) {
    await saveAndRebuild(ctx, userId, session.pageData, session.outputDir);
    await ctx.reply(successMessage);

    const url = session.vercelUrl || `https://resto-${session.pageSlug}.vercel.app`;
    await showPostEditMenu(ctx, url);
    transitionTo(userId, 'READY');
  }

  return updated;
}

/**
 * Handle photo upload for edit states
 */
export async function handleEditPhotoUpload(
  ctx: Context,
  userId: number,
  photoUrl: string
): Promise<boolean> {
  const session = getSession(userId);

  if (!session.pageData || !session.outputDir) {
    return false;
  }

  switch (session.state) {
    case 'EDIT_PHOTO':
      // Update hero image
      session.pageData.heroImage = photoUrl;
      await saveAndRebuild(ctx, userId, session.pageData, session.outputDir);
      await ctx.reply(MESSAGES.EDIT_PHOTO_SUCCESS);

      const url = session.vercelUrl || `https://resto-${session.pageSlug}.vercel.app`;
      await showPostEditMenu(ctx, url);
      transitionTo(userId, 'READY');
      return true;

    case 'EDIT_GALLERY':
      // Add to gallery
      if (!session.pageData.photos) {
        session.pageData.photos = [];
      }
      session.pageData.photos.push({ url: photoUrl, alt: 'Photo restaurant' });
      await saveAndRebuild(ctx, userId, session.pageData, session.outputDir);
      await ctx.reply(MESSAGES.EDIT_GALLERY_SUCCESS(1));

      const galleryUrl = session.vercelUrl || `https://resto-${session.pageSlug}.vercel.app`;
      await showPostEditMenu(ctx, galleryUrl);
      transitionTo(userId, 'READY');
      return true;

    default:
      return false;
  }
}

/**
 * Apply color change and rebuild
 */
async function applyColorChange(
  ctx: Context,
  userId: number,
  primary: string,
  accent: string
): Promise<void> {
  const session = getSession(userId);

  if (!session.pageData || !session.outputDir) {
    await ctx.reply(MESSAGES.ERROR_NO_PAGE);
    return;
  }

  session.pageData.primaryColor = primary;
  session.pageData.accentColor = accent;

  await saveAndRebuild(ctx, userId, session.pageData, session.outputDir);
  await ctx.reply(MESSAGES.EDIT_COLOR_SUCCESS);

  const url = session.vercelUrl || `https://resto-${session.pageSlug}.vercel.app`;
  await showPostEditMenu(ctx, url);
  transitionTo(userId, 'READY');
}

/**
 * Save page data and rebuild HTML
 */
async function saveAndRebuild(
  ctx: Context,
  userId: number,
  pageData: PageData,
  outputDir: string
): Promise<void> {
  const session = getSession(userId);

  // Update session
  updateSession(userId, { pageData });

  // Save JSON
  await savePageData(outputDir, pageData);

  // Rebuild HTML
  const html = await buildPage(pageData);
  await fs.writeFile(path.join(outputDir, 'index.html'), html);

  // Redeploy to Vercel if we have a token
  if (process.env.VERCEL_TOKEN && session.pageSlug) {
    await ctx.sendChatAction('typing');
    const result = await deployToVercel(outputDir, `resto-${session.pageSlug}`);
    if (result.success && result.url) {
      updateSession(userId, { vercelUrl: result.url });
    }
  }
}

/**
 * Check if current state is an edit state
 */
export function isEditState(state: ConversationState): boolean {
  return state.startsWith('EDIT_');
}
