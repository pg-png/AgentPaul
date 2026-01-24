/**
 * Telegram Bot - Natural Conversation Flow
 * Restaurant landing page creation through chat
 */

import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { CallbackQuery } from 'telegraf/typings/core/types/typegram';
import path from 'path';
import fs from 'fs/promises';

import { MESSAGES, StyleChoice } from './messages';
import {
  getSession,
  updateSession,
  transitionTo,
  resetSession,
  looksLikeRestaurantName,
  looksLikeCityName,
  isConfirmation,
  isDenial,
  extractStyle,
  ConversationState
} from './conversation';
import { interpretMessage, getHelpMessage } from './interpreter';
import { handleAction, updatePhoto, getPageSummary } from './handler';
import { loadPageData, buildPage, savePageData, PageData } from '../generator';
import { scrapeRestaurant } from '../scraper';
import { generateContent } from '../generator';

// Paths
const DATA_DIR = process.env.DATA_DIR || './output';

// Store token for file URL construction
let botToken: string = '';

/**
 * Generate URL-friendly slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build preview URL
 */
function getPreviewUrl(slug: string): string {
  const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/${slug}/`;
}

/**
 * List available pages
 */
async function listPages(): Promise<string[]> {
  try {
    const dirs = await fs.readdir(DATA_DIR);
    const pages: string[] = [];

    for (const dir of dirs) {
      const dataPath = path.join(DATA_DIR, dir, 'data.json');
      try {
        await fs.access(dataPath);
        pages.push(dir);
      } catch {
        // Not a valid page directory
      }
    }

    return pages;
  } catch {
    return [];
  }
}

/**
 * Create and configure the bot
 */
export function createBot(token: string): Telegraf {
  const bot = new Telegraf(token);
  botToken = token;

  // /start command - Begin conversation
  bot.command('start', async (ctx) => {
    const userId = ctx.from!.id;
    const session = resetSession(userId);
    const pages = await listPages();

    let welcomeMessage: string;

    if (pages.length > 0) {
      welcomeMessage = MESSAGES.WELCOME_RETURNING(pages);
    } else {
      welcomeMessage = MESSAGES.WELCOME;
    }

    transitionTo(userId, 'AWAITING_NAME');
    await ctx.reply(welcomeMessage);
  });

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(MESSAGES.HELP);
  });

  // /preview command - get current page link
  bot.command('preview', async (ctx) => {
    const session = getSession(ctx.from!.id);

    if (!session.pageSlug) {
      await ctx.reply(MESSAGES.ERROR_NO_PAGE);
      return;
    }

    const url = getPreviewUrl(session.pageSlug);
    await ctx.reply(`Voici ta page:\n\n${url}`);
  });

  // /status command
  bot.command('status', async (ctx) => {
    const session = getSession(ctx.from!.id);

    if (!session.pageData) {
      await ctx.reply(MESSAGES.ERROR_NO_PAGE);
      return;
    }

    await ctx.reply(getPageSummary(session.pageData));
  });

  // /new command - explicitly start new page
  bot.command('new', async (ctx) => {
    const userId = ctx.from!.id;
    resetSession(userId);
    transitionTo(userId, 'AWAITING_NAME');
    await ctx.reply(MESSAGES.ASK_NAME);
  });

  // /deploy command
  bot.command('deploy', async (ctx) => {
    const session = getSession(ctx.from!.id);

    if (!session.pageSlug) {
      await ctx.reply(MESSAGES.DEPLOY_NOT_READY);
      return;
    }

    await ctx.reply(
      `Pour deployer ta page sur Vercel, configure VERCEL_TOKEN dans les variables d'environnement.\n\n(Fonctionnalite en developpement)`
    );
  });

  // Handle callback queries (button clicks)
  bot.on('callback_query', async (ctx) => {
    const userId = ctx.from!.id;
    const session = getSession(userId);
    const data = (ctx.callbackQuery as CallbackQuery.DataQuery).data;

    await ctx.answerCbQuery();

    // Handle confirmation buttons
    if (data === 'confirm_yes') {
      if (session.state === 'CONFIRMING' && session.scrapedData) {
        await handleStyleSelection(ctx, userId);
      }
    } else if (data === 'confirm_no') {
      resetSession(userId);
      transitionTo(userId, 'AWAITING_NAME');
      await ctx.reply('Pas de souci. Dis-moi le nom exact du restaurant.');
    }

    // Handle style buttons
    else if (data.startsWith('style_')) {
      const style = data.replace('style_', '') as StyleChoice;
      await handleGeneration(ctx, userId, style);
    }

    // Handle photo buttons
    else if (data === 'photos_yes') {
      transitionTo(userId, 'AWAITING_PHOTO');
      await ctx.reply(MESSAGES.PHOTO_INSTRUCTIONS);
    } else if (data === 'photos_no') {
      // Continue with Google photos
      await finalizePageCreation(ctx, userId);
    }
  });

  // Handle text messages
  bot.on(message('text'), async (ctx) => {
    const userId = ctx.from!.id;
    const session = getSession(userId);
    const text = ctx.message.text.trim();

    // Handle based on current state
    switch (session.state) {
      case 'IDLE':
      case 'AWAITING_NAME':
        await handleNameInput(ctx, userId, text);
        break;

      case 'AWAITING_CITY':
        await handleCityInput(ctx, userId, text);
        break;

      case 'CONFIRMING':
        await handleConfirmation(ctx, userId, text);
        break;

      case 'CHOOSING_STYLE':
        await handleStyleInput(ctx, userId, text);
        break;

      case 'READY':
        await handleModification(ctx, userId, text);
        break;

      case 'GENERATING':
        await ctx.reply('Je suis en train de generer ta page, patiente un instant...');
        break;

      default:
        await ctx.reply(MESSAGES.ERROR_GENERIC);
    }
  });

  // Handle photo messages
  bot.on(message('photo'), async (ctx) => {
    const userId = ctx.from!.id;
    const session = getSession(userId);

    if (session.state !== 'AWAITING_PHOTO' && session.state !== 'READY') {
      await ctx.reply(
        'Belle photo! Pour l\'ajouter a ta page, dis-moi:\n• "Change la photo principale"\n• "Ajoute cette photo a la galerie"'
      );
      return;
    }

    await handlePhotoUpload(ctx, userId);
  });

  // Error handler
  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply(MESSAGES.ERROR_GENERIC);
  });

  return bot;
}

/**
 * Handle restaurant name input
 */
async function handleNameInput(ctx: Context, userId: number, text: string): Promise<void> {
  // Check if it's a page shortcut
  if (text.startsWith('/')) {
    const slug = text.slice(1);
    const pages = await listPages();

    if (pages.includes(slug)) {
      const dataPath = path.join(DATA_DIR, slug, 'data.json');
      try {
        const pageData = await loadPageData(dataPath);
        updateSession(userId, {
          pageSlug: slug,
          pageData: pageData,
          outputDir: path.join(DATA_DIR, slug)
        });
        transitionTo(userId, 'READY');
        await ctx.reply(`Page "${pageData.name}" selectionnee.\n\nQue veux-tu modifier?`);
        return;
      } catch {
        // Fall through
      }
    }
  }

  if (!looksLikeRestaurantName(text)) {
    await ctx.reply(MESSAGES.ASK_NAME);
    return;
  }

  updateSession(userId, { restaurantName: text });
  transitionTo(userId, 'AWAITING_CITY');
  await ctx.reply(MESSAGES.ASK_CITY(text));
}

/**
 * Handle city input
 */
async function handleCityInput(ctx: Context, userId: number, text: string): Promise<void> {
  const session = getSession(userId);

  if (!looksLikeCityName(text)) {
    await ctx.reply('Dans quelle ville se trouve ton restaurant?');
    return;
  }

  updateSession(userId, { city: text });

  // Search for restaurant
  await ctx.reply(MESSAGES.SEARCHING(session.restaurantName!, text));
  await ctx.sendChatAction('typing');

  try {
    const folderSlug = generateSlug(session.restaurantName!);
    const outputDir = path.join(DATA_DIR, folderSlug);

    const restaurantData = await scrapeRestaurant(session.restaurantName!, text, outputDir);

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurantData.name + ' ' + restaurantData.address)}`;

    updateSession(userId, {
      scrapedData: restaurantData,
      outputDir: outputDir
    });
    transitionTo(userId, 'CONFIRMING');

    // Show found restaurant with confirmation buttons
    const message = MESSAGES.FOUND_RESTAURANT(
      { name: restaurantData.name, address: restaurantData.address, phone: restaurantData.phone },
      mapsUrl
    );

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
      ...Markup.inlineKeyboard([
        [Markup.button.callback(MESSAGES.BTN_YES, 'confirm_yes')],
        [Markup.button.callback(MESSAGES.BTN_NO, 'confirm_no')]
      ])
    });

  } catch (error: any) {
    console.error('Scrape error:', error);
    transitionTo(userId, 'AWAITING_NAME');
    await ctx.reply(MESSAGES.NOT_FOUND);
  }
}

/**
 * Handle confirmation response
 */
async function handleConfirmation(ctx: Context, userId: number, text: string): Promise<void> {
  if (isConfirmation(text)) {
    await handleStyleSelection(ctx, userId);
  } else if (isDenial(text)) {
    resetSession(userId);
    transitionTo(userId, 'AWAITING_NAME');
    await ctx.reply('Pas de souci. Dis-moi le nom exact du restaurant.');
  } else {
    await ctx.reply('C\'est bien ton restaurant? Reponds oui ou non.');
  }
}

/**
 * Show style selection
 */
async function handleStyleSelection(ctx: Context, userId: number): Promise<void> {
  transitionTo(userId, 'CHOOSING_STYLE');

  await ctx.reply(MESSAGES.ASK_STYLE, {
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(`Elegant`, 'style_elegant'),
        Markup.button.callback(`Casual`, 'style_casual')
      ],
      [
        Markup.button.callback(`Trendy`, 'style_trendy'),
        Markup.button.callback(`Familial`, 'style_familial')
      ]
    ])
  });
}

/**
 * Handle style text input
 */
async function handleStyleInput(ctx: Context, userId: number, text: string): Promise<void> {
  const style = extractStyle(text);

  if (!style) {
    await ctx.reply(
      'Choisis un style:\n• Elegant - sophistique, premium\n• Casual - chaleureux, accessible\n• Trendy - moderne, Instagram\n• Familial - accueillant, genereux'
    );
    return;
  }

  await handleGeneration(ctx, userId, style);
}

/**
 * Generate the page
 */
async function handleGeneration(ctx: Context, userId: number, style: StyleChoice): Promise<void> {
  const session = getSession(userId);

  if (!session.scrapedData) {
    await ctx.reply(MESSAGES.ERROR_GENERIC);
    resetSession(userId);
    return;
  }

  updateSession(userId, { style });
  transitionTo(userId, 'GENERATING');

  await ctx.reply(MESSAGES.GENERATING_START);
  await ctx.sendChatAction('typing');

  try {
    // Generate content
    await ctx.reply(MESSAGES.GENERATING_CONTENT);
    const content = await generateContent(session.scrapedData);

    // Build page
    await ctx.reply(MESSAGES.GENERATING_PAGE);

    const folderSlug = generateSlug(session.scrapedData.name);
    const outputDir = session.outputDir || path.join(DATA_DIR, folderSlug);

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.scrapedData.name + ' ' + session.scrapedData.address)}`;

    const pageData: PageData = {
      name: session.scrapedData.name,
      slug: folderSlug,
      tagline: content.tagline,
      description: content.description,
      address: session.scrapedData.address,
      phone: session.scrapedData.phone,
      hours: session.scrapedData.hours,
      website: session.scrapedData.website,
      mapsUrl: mapsUrl,
      heroTitle: content.heroTitle,
      heroImage: session.scrapedData.photos[0]?.url || '',
      ctaText: content.ctaText,
      photos: session.scrapedData.photos.map(p => ({ url: p.url, alt: p.alt })),
      menuHighlights: content.menuHighlights,
      reviews: session.scrapedData.reviews.slice(0, 5).map(r => ({
        text: r.text,
        author: r.author,
        rating: r.rating
      })),
      primaryColor: content.primaryColor,
      accentColor: content.accentColor
    };

    // Save page data
    await savePageData(outputDir, pageData);

    // Build HTML
    const html = await buildPage(pageData);
    await fs.writeFile(path.join(outputDir, 'index.html'), html);

    // Update session
    updateSession(userId, {
      pageSlug: folderSlug,
      pageData: pageData,
      outputDir: outputDir
    });
    transitionTo(userId, 'READY');

    // Send success message
    const previewUrl = getPreviewUrl(folderSlug);
    await ctx.reply(MESSAGES.PAGE_READY(pageData, previewUrl));

  } catch (error: any) {
    console.error('Generation error:', error);
    transitionTo(userId, 'AWAITING_NAME');
    await ctx.reply(MESSAGES.ERROR_GENERATE + '\n\nErreur: ' + (error.message || 'Inconnue'));
  }
}

/**
 * Handle modification in READY state
 */
async function handleModification(ctx: Context, userId: number, text: string): Promise<void> {
  const session = getSession(userId);

  // Check if starting a new page
  if (looksLikeRestaurantName(text) && !text.toLowerCase().includes('change') && !text.toLowerCase().includes('modifie')) {
    // Could be a new restaurant name
    await ctx.reply(
      `Tu veux creer une page pour "${text}"?\n\nSi oui, tape /new puis le nom.\nSinon, dis-moi ce que tu veux modifier sur ta page actuelle.`
    );
    return;
  }

  if (!session.pageData || !session.pageSlug) {
    await ctx.reply(MESSAGES.ERROR_NO_PAGE);
    return;
  }

  await ctx.sendChatAction('typing');

  // Interpret the message
  const interpreted = await interpretMessage(text, session.pageData);

  // Handle the action
  const result = await handleAction(interpreted, session.pageData, session.outputDir!);

  // Rebuild HTML if successful
  if (result.success && result.updatedData) {
    updateSession(userId, { pageData: result.updatedData });

    const html = await buildPage(result.updatedData);
    await fs.writeFile(path.join(session.outputDir!, 'index.html'), html);
  }

  // Check if photo is required
  if (result.requiresPhoto) {
    transitionTo(userId, 'AWAITING_PHOTO');
  }

  // Send response
  const emoji = result.success ? '' : '';
  await ctx.reply(`${emoji} ${result.message}`);

  if (result.success) {
    const url = getPreviewUrl(session.pageSlug);
    await ctx.reply(MESSAGES.MODIFICATION_PREVIEW(url));
  }
}

/**
 * Handle photo upload
 */
async function handlePhotoUpload(ctx: Context, userId: number): Promise<void> {
  const session = getSession(userId);

  await ctx.reply('Photo recue! Traitement...');

  try {
    // Get highest resolution photo
    const photoMessage = ctx.message as any;
    const photo = photoMessage.photo[photoMessage.photo.length - 1];
    const file = await ctx.telegram.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;

    if (!session.pageData || !session.outputDir) {
      await ctx.reply(MESSAGES.ERROR_NO_PAGE);
      return;
    }

    // Update photo
    const result = await updatePhoto(
      session.pageData,
      fileUrl,
      'hero', // Default to hero for now
      0,
      session.outputDir
    );

    if (result.success && result.updatedData) {
      updateSession(userId, { pageData: result.updatedData });

      // Rebuild HTML
      const html = await buildPage(result.updatedData);
      await fs.writeFile(path.join(session.outputDir, 'index.html'), html);
    }

    transitionTo(userId, 'READY');
    await ctx.reply(result.message);

    if (result.success) {
      const url = getPreviewUrl(session.pageSlug!);
      await ctx.reply(`Regarde le resultat: ${url}`);
    }

  } catch (error: any) {
    console.error('Photo processing error:', error);
    await ctx.reply('Erreur lors du traitement de la photo. Reessaie!');
    transitionTo(userId, 'READY');
  }
}

/**
 * Finalize page creation (placeholder for future photo flow)
 */
async function finalizePageCreation(ctx: Context, userId: number): Promise<void> {
  const session = getSession(userId);
  const url = getPreviewUrl(session.pageSlug!);
  await ctx.reply(`Ta page est prete!\n\n${url}`);
}

// Global bot instance for webhook handling
let botInstance: Telegraf | null = null;

/**
 * Get the bot instance for webhook handling
 */
export function getBotInstance(): Telegraf | null {
  return botInstance;
}

/**
 * Start the bot
 */
export async function startBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }

  const bot = createBot(token);
  botInstance = bot;

  // Use webhook in production (handled by Express), polling in development
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
    await bot.telegram.setWebhook(`https://${domain}/webhook`);
    console.log(`[Bot] Webhook set: https://${domain}/webhook`);
    console.log('[Bot] Webhook mode - requests handled by Express server');
  } else {
    // Polling mode for local development
    await bot.launch();
    console.log('[Bot] Started in polling mode');
  }

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
