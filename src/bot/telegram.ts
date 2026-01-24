/**
 * Telegram Bot
 * Natural language interface for restaurant page editing
 */

import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import path from 'path';
import fs from 'fs/promises';

import { interpretMessage, getHelpMessage } from './interpreter';
import { handleAction, updatePhoto, getPageSummary, ActionResult } from './handler';
import { loadPageData, buildPage, savePageData, PageData } from '../generator';
import { scrapeRestaurant } from '../scraper';
import { generateContent } from '../generator';

// Bot state per user
interface UserState {
  currentPageSlug?: string;
  awaitingPhoto?: boolean;
  photoType?: 'hero' | 'gallery';
  awaitingConfirmation?: string;
}

const userStates: Map<number, UserState> = new Map();

// Paths
const DATA_DIR = process.env.DATA_DIR || './output';

// Store token for file URL construction
let botToken: string = '';

/**
 * Get or create user state
 */
function getUserState(userId: number): UserState {
  if (!userStates.has(userId)) {
    userStates.set(userId, {});
  }
  return userStates.get(userId)!;
}

/**
 * Load page data for a user's current page
 */
async function getCurrentPageData(state: UserState): Promise<PageData | null> {
  if (!state.currentPageSlug) return null;

  const dataPath = path.join(DATA_DIR, state.currentPageSlug, 'data.json');
  try {
    return await loadPageData(dataPath);
  } catch {
    return null;
  }
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

  // /start command
  bot.command('start', async (ctx) => {
    const pages = await listPages();

    let message = `👋 *Bienvenue sur Agent Paul!*

Je suis ton assistant pour créer et gérer des landing pages de restaurant.

`;

    if (pages.length > 0) {
      message += `📄 *Pages existantes:*\n${pages.map(p => `• /${p}`).join('\n')}\n\n`;
      message += `Tape le nom d'une page pour la modifier, ou utilise /new pour en créer une nouvelle.`;
    } else {
      message += `Tu n'as pas encore de page. Utilise /new pour en créer une!`;
    }

    message += `\n\n📚 Tape /help pour voir ce que je peux faire.`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(getHelpMessage(), { parse_mode: 'Markdown' });
  });

  // /new command - create new page
  bot.command('new', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 2) {
      await ctx.reply(
        `🆕 *Créer une nouvelle page*\n\nUtilise: /new [nom du restaurant] [ville]\n\nExemple:\n/new "Chez Marco" Montreal`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Parse restaurant name and city
    const text = args.join(' ');
    const match = text.match(/"([^"]+)"\s+(.+)/) || text.match(/(.+)\s+(\w+)$/);

    if (!match) {
      await ctx.reply('Format incorrect. Exemple: /new "Chez Marco" Montreal');
      return;
    }

    const restaurantName = match[1];
    const city = match[2];

    await ctx.reply(
      `🔍 *Recherche en cours...*\n\nJe cherche "${restaurantName}" à ${city} sur Google Maps.\nCela peut prendre quelques secondes...`,
      { parse_mode: 'Markdown' }
    );

    // Step 1: Scrape restaurant
    let restaurantData;
    let outputDir: string;

    try {
      outputDir = path.join(DATA_DIR, generateSlug(restaurantName));
      restaurantData = await scrapeRestaurant(restaurantName, city, outputDir);

      await ctx.reply(
        `✅ *Restaurant trouvé!*\n\n📍 ${restaurantData.name}\n⭐ ${restaurantData.rating}/5 (${restaurantData.reviewCount} avis)\n📸 ${restaurantData.photos.length} photos\n\nGénération du contenu...`,
        { parse_mode: 'Markdown' }
      );
    } catch (error: any) {
      console.error('Scrape error:', error);
      await ctx.reply(
        `❌ *Restaurant non trouvé*\n\nVérifie:\n• L'orthographe du nom\n• La ville\n• Que le restaurant est sur Google Maps\n\nErreur: ${error.message || 'Inconnue'}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Step 2: Generate content with Claude
    let content;
    try {
      content = await generateContent(restaurantData);
    } catch (error: any) {
      console.error('Content generation error:', error);
      await ctx.reply(
        `❌ *Erreur génération contenu*\n\nLe restaurant a été trouvé mais la génération du contenu a échoué.\n\nErreur: ${error.message || 'API Claude indisponible'}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Step 3: Build and save page
    try {
      const pageData: PageData = {
        name: restaurantData.name,
        slug: restaurantData.slug,
        tagline: content.tagline,
        description: content.description,
        address: restaurantData.address,
        phone: restaurantData.phone,
        hours: restaurantData.hours,
        rating: restaurantData.rating,
        reviewCount: restaurantData.reviewCount,
        website: restaurantData.website,
        heroTitle: content.heroTitle,
        heroImage: restaurantData.photos[0]?.url || '',
        ctaText: content.ctaText,
        photos: restaurantData.photos.map(p => ({ url: p.url, alt: p.alt })),
        menuHighlights: content.menuHighlights,
        reviews: restaurantData.reviews.slice(0, 5).map(r => ({
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

      // Update user state
      const state = getUserState(ctx.from!.id);
      state.currentPageSlug = restaurantData.slug;

      // Build preview URL
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : `http://localhost:${process.env.PORT || 3000}`;
      const previewUrl = `${baseUrl}/${pageData.slug}`;

      await ctx.reply(
        `🎉 *Ta page est prete!*\n\n` +
        `🔗 *Voir ta page:* ${previewUrl}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 *Titre:* ${pageData.heroTitle}\n` +
        `✨ *Accroche:* ${pageData.tagline}\n\n` +
        `🍽️ *Menu:*\n${pageData.menuHighlights.map(m => `• ${m.name} - ${m.price}`).join('\n')}\n\n` +
        `🎨 *Couleurs:* ${pageData.primaryColor}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Tu peux modifier ta page en m'envoyant un message:\n` +
        `• "Change le titre pour..."\n` +
        `• "Ajoute [plat] a [prix]"\n` +
        `• "Met du bleu comme couleur"`,
        { parse_mode: 'Markdown' }
      );

    } catch (error: any) {
      console.error('Page build error:', error);
      await ctx.reply(
        `❌ *Erreur sauvegarde*\n\nLe contenu a été généré mais la sauvegarde a échoué.\n\nErreur: ${error.message || 'Inconnue'}`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // /select command - select existing page
  bot.command('select', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length === 0) {
      const pages = await listPages();
      if (pages.length === 0) {
        await ctx.reply('Aucune page disponible. Utilise /new pour en créer une.');
        return;
      }

      await ctx.reply(
        `📄 *Pages disponibles:*\n${pages.map(p => `• /select ${p}`).join('\n')}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const slug = args[0];
    const dataPath = path.join(DATA_DIR, slug, 'data.json');

    try {
      const pageData = await loadPageData(dataPath);
      const state = getUserState(ctx.from!.id);
      state.currentPageSlug = slug;

      await ctx.reply(
        `✅ *Page sélectionnée:* ${pageData.name}\n\n${getPageSummary(pageData)}`,
        { parse_mode: 'Markdown' }
      );
    } catch {
      await ctx.reply(`Page "${slug}" non trouvée.`);
    }
  });

  // /preview command - get current page link
  bot.command('preview', async (ctx) => {
    const state = getUserState(ctx.from!.id);
    const pageData = await getCurrentPageData(state);

    if (!pageData) {
      await ctx.reply('Tu n\'as pas encore de page. Envoie-moi le nom de ton restaurant pour commencer!');
      return;
    }

    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${process.env.PORT || 3000}`;
    const previewUrl = `${baseUrl}/${pageData.slug}`;

    await ctx.reply(
      `🔗 *Voici ta page:*\n\n${previewUrl}\n\n` +
      `Tu peux partager ce lien!\n\n` +
      `_Pour une URL personnalisee (ex: maesri.com), utilise /deploy_`,
      { parse_mode: 'Markdown' }
    );
  });

  // /deploy command
  bot.command('deploy', async (ctx) => {
    const state = getUserState(ctx.from!.id);
    const pageData = await getCurrentPageData(state);

    if (!pageData) {
      await ctx.reply('Aucune page sélectionnée. Utilise /select ou /new.');
      return;
    }

    await ctx.reply(
      `🚀 *Déploiement*\n\nPour déployer ta page sur Vercel, tu dois:\n\n1. Avoir un compte Vercel\n2. Configurer le token dans .env\n3. Utiliser /deploy confirm\n\n(Fonctionnalité en développement)`,
      { parse_mode: 'Markdown' }
    );
  });

  // /status command
  bot.command('status', async (ctx) => {
    const state = getUserState(ctx.from!.id);
    const pageData = await getCurrentPageData(state);

    if (!pageData) {
      await ctx.reply('Aucune page sélectionnée. Utilise /select ou /new.');
      return;
    }

    await ctx.reply(getPageSummary(pageData), { parse_mode: 'Markdown' });
  });

  // Handle text messages (natural language commands)
  bot.on(message('text'), async (ctx) => {
    const state = getUserState(ctx.from!.id);
    const text = ctx.message.text;

    // Check if it's a page selection shortcut
    if (text.startsWith('/')) {
      const slug = text.slice(1);
      const pages = await listPages();

      if (pages.includes(slug)) {
        const dataPath = path.join(DATA_DIR, slug, 'data.json');
        try {
          const pageData = await loadPageData(dataPath);
          state.currentPageSlug = slug;
          await ctx.reply(
            `✅ *Page sélectionnée:* ${pageData.name}\n\nQue veux-tu modifier?`,
            { parse_mode: 'Markdown' }
          );
          return;
        } catch {
          // Continue to normal processing
        }
      }
    }

    // Need a page selected
    const pageData = await getCurrentPageData(state);
    if (!pageData) {
      await ctx.reply(
        `👋 Tu n'as pas de page active.\n\n• /new pour créer une page\n• /select pour choisir une page existante`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Handle confirmation responses
    if (state.awaitingConfirmation) {
      if (['oui', 'yes', 'ok', 'confirme', 'go'].includes(text.toLowerCase())) {
        if (state.awaitingConfirmation === 'regenerate') {
          await ctx.reply('🔄 Régénération en cours...');
          // TODO: Implement regeneration
        }
        state.awaitingConfirmation = undefined;
        return;
      } else {
        state.awaitingConfirmation = undefined;
        await ctx.reply('Action annulée.');
        return;
      }
    }

    // Interpret the message
    await ctx.sendChatAction('typing');
    const interpreted = await interpretMessage(text, pageData);

    // Handle the action
    const outputDir = path.join(DATA_DIR, state.currentPageSlug!);
    const result = await handleAction(interpreted, pageData, outputDir);

    // Check if photo is required
    if (result.requiresPhoto) {
      state.awaitingPhoto = true;
      state.photoType = result.photoType;
    }

    // Check if confirmation is required
    if (interpreted.action === 'request_regenerate') {
      state.awaitingConfirmation = 'regenerate';
    }

    // Rebuild HTML if successful
    if (result.success && result.updatedData && !result.requiresPhoto) {
      const html = await buildPage(result.updatedData);
      await fs.writeFile(path.join(outputDir, 'index.html'), html);
    }

    // Send response
    const emoji = result.success ? '✅' : '❌';
    await ctx.reply(`${emoji} ${result.message}`, { parse_mode: 'Markdown' });
  });

  // Handle photo messages
  bot.on(message('photo'), async (ctx) => {
    const state = getUserState(ctx.from!.id);
    const pageData = await getCurrentPageData(state);

    if (!pageData) {
      await ctx.reply('Aucune page sélectionnée.');
      return;
    }

    if (!state.awaitingPhoto) {
      await ctx.reply(
        `📸 Belle photo! Pour la changer sur ta page, dis-moi:\n• "Change la photo principale"\n• "Ajoute cette photo à la galerie"`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await ctx.reply('📸 Traitement de la photo...');

    try {
      // Get highest resolution photo
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;

      // TODO: Download and process photo properly
      // For now, we'll use the Telegram URL (temporary)

      const outputDir = path.join(DATA_DIR, state.currentPageSlug!);
      const result = await updatePhoto(
        pageData,
        fileUrl,
        state.photoType || 'gallery',
        0,
        outputDir
      );

      // Reset state
      state.awaitingPhoto = false;
      state.photoType = undefined;

      // Rebuild HTML
      if (result.success && result.updatedData) {
        const html = await buildPage(result.updatedData);
        await fs.writeFile(path.join(outputDir, 'index.html'), html);
      }

      await ctx.reply(result.message);

    } catch (error) {
      console.error('Photo processing error:', error);
      await ctx.reply('❌ Erreur lors du traitement de la photo.');
      state.awaitingPhoto = false;
      state.photoType = undefined;
    }
  });

  // Error handler
  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Une erreur est survenue. Réessaie!');
  });

  return bot;
}

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
    // Don't call bot.launch() - Express will handle the webhook
  } else {
    // Polling mode for local development
    await bot.launch();
    console.log('[Bot] Started in polling mode');
  }

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
