/**
 * Express API Server
 * HTTP endpoints for Agent Paul
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { getBotInstance } from '../bot';
import { scrapeRestaurant } from '../scraper';
import { generateContent, buildPage, savePageData, loadPageData, PageData } from '../generator';
import { deployToVercel, upsertPageRecord, getPublishedPages } from '../deploy';
import { aggregateSocialData, ScrapeRequest } from '../scraper/social-aggregator';
import { analyzeProspect } from '../generator/prospect-analyzer';
import { matchProducts } from '../generator/product-matcher';
import { estimateFinancials } from '../generator/financial-estimator';
import { buildAndSaveDemo } from '../generator/demo-builder';
import { DemoPageData, ProspectProfile, ProductMatch } from '../generator/demo-types';

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'output')));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'agent-paul',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/pages
 * List all pages
 */
app.get('/api/pages', async (req: Request, res: Response) => {
  try {
    const outputDir = path.join(process.cwd(), 'output');
    const dirs = await fs.readdir(outputDir);
    const pages: any[] = [];

    for (const dir of dirs) {
      const dataPath = path.join(outputDir, dir, 'data.json');
      try {
        const data = await loadPageData(dataPath);
        pages.push({
          slug: data.slug,
          name: data.name,
          rating: data.rating,
          tagline: data.tagline
        });
      } catch {
        // Skip invalid directories
      }
    }

    res.json({ pages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list pages' });
  }
});

/**
 * GET /api/pages/:slug
 * Get page data
 */
app.get('/api/pages/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const dataPath = path.join(process.cwd(), 'output', slug, 'data.json');
    const data = await loadPageData(dataPath);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: 'Page not found' });
  }
});

/**
 * POST /api/pages
 * Create new page from restaurant data
 */
app.post('/api/pages', async (req: Request, res: Response) => {
  try {
    const { name, city, telegramUserId } = req.body;

    if (!name || !city) {
      return res.status(400).json({ error: 'name and city are required' });
    }

    console.log(`[API] Creating page: ${name}, ${city}`);

    // Generate slug
    const slug = generateSlug(name);
    const outputDir = path.join(process.cwd(), 'output', slug);

    // Scrape restaurant data
    const restaurantData = await scrapeRestaurant(name, city, outputDir);

    // Generate content
    const content = await generateContent(restaurantData);

    // Build page data
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

    // Save to Notion
    try {
      await upsertPageRecord(pageData, { telegramUserId, status: 'draft' });
    } catch (e) {
      console.warn('[API] Notion save failed:', e);
    }

    res.json({
      success: true,
      slug: pageData.slug,
      name: pageData.name,
      preview: `${process.env.BASE_URL || 'http://localhost:3000'}/${pageData.slug}/index.html`
    });

  } catch (error: any) {
    console.error('[API] Create page error:', error);
    res.status(500).json({ error: error.message || 'Failed to create page' });
  }
});

/**
 * PATCH /api/pages/:slug
 * Update page data
 */
app.patch('/api/pages/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const updates = req.body;

    const dataPath = path.join(process.cwd(), 'output', slug, 'data.json');
    const currentData = await loadPageData(dataPath);

    // Merge updates
    const updatedData = { ...currentData, ...updates };

    // Save updated data
    const outputDir = path.join(process.cwd(), 'output', slug);
    await savePageData(outputDir, updatedData);

    // Rebuild HTML
    const html = await buildPage(updatedData);
    await fs.writeFile(path.join(outputDir, 'index.html'), html);

    res.json({
      success: true,
      data: updatedData
    });

  } catch (error: any) {
    console.error('[API] Update page error:', error);
    res.status(500).json({ error: error.message || 'Failed to update page' });
  }
});

/**
 * POST /api/pages/:slug/deploy
 * Deploy page to Vercel
 */
app.post('/api/pages/:slug/deploy', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const pageDir = path.join(process.cwd(), 'output', slug);

    // Check if page exists
    const dataPath = path.join(pageDir, 'data.json');
    const pageData = await loadPageData(dataPath);

    // Deploy to Vercel
    const result = await deployToVercel(pageDir, `agent-paul-${slug}`);

    if (result.success) {
      // Update Notion status
      try {
        await upsertPageRecord(pageData, {
          status: 'published',
          url: result.url
        });
      } catch (e) {
        console.warn('[API] Notion update failed:', e);
      }

      res.json({
        success: true,
        url: result.url,
        deploymentId: result.deploymentId
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error: any) {
    console.error('[API] Deploy error:', error);
    res.status(500).json({ error: error.message || 'Deployment failed' });
  }
});

/**
 * POST /api/pages/:slug/regenerate
 * Regenerate content for a page
 */
app.post('/api/pages/:slug/regenerate', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const outputDir = path.join(process.cwd(), 'output', slug);
    const dataPath = path.join(outputDir, 'data.json');

    const currentData = await loadPageData(dataPath);

    // Regenerate content
    const content = await generateContent(currentData as any);

    // Update data
    const updatedData: PageData = {
      ...currentData,
      tagline: content.tagline,
      description: content.description,
      menuHighlights: content.menuHighlights,
      heroTitle: content.heroTitle,
      ctaText: content.ctaText,
      primaryColor: content.primaryColor,
      accentColor: content.accentColor
    };

    // Save and rebuild
    await savePageData(outputDir, updatedData);
    const html = await buildPage(updatedData);
    await fs.writeFile(path.join(outputDir, 'index.html'), html);

    res.json({
      success: true,
      data: updatedData
    });

  } catch (error: any) {
    console.error('[API] Regenerate error:', error);
    res.status(500).json({ error: error.message || 'Regeneration failed' });
  }
});

/**
 * GET /api/published
 * Get all published pages from Notion
 */
app.get('/api/published', async (req: Request, res: Response) => {
  try {
    const pages = await getPublishedPages();
    res.json({ pages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get published pages' });
  }
});

/**
 * Telegram webhook handler
 */
app.post('/webhook', async (req: Request, res: Response) => {
  const bot = getBotInstance();
  if (bot) {
    try {
      await bot.handleUpdate(req.body);
    } catch (error) {
      console.error('Webhook error:', error);
    }
  }
  res.sendStatus(200);
});

// ============================================
// AGENT PAUL V2 — PROSPECT DEMO ENDPOINTS
// ============================================

/**
 * POST /api/research/google-maps
 * Scrape restaurant data from Google Maps
 */
app.post('/api/research/google-maps', async (req: Request, res: Response) => {
  try {
    const { name, city } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    console.log(`[API] Google Maps research: ${name}, ${city || ''}`);
    const outputDir = path.join(process.cwd(), 'output', 'prospects', generateSlug(name));
    const data = await scrapeRestaurant(name, city || '', outputDir);

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] Google Maps research error:', error);
    res.status(500).json({ error: error.message || 'Research failed' });
  }
});

/**
 * POST /api/research/social
 * Scrape all social platforms in parallel
 */
app.post('/api/research/social', async (req: Request, res: Response) => {
  try {
    const { instagram, tiktok, youtube, website, gmapsQuery, gmapsCity } = req.body;

    console.log('[API] Social research starting...');
    const scrapeReq: ScrapeRequest = {
      instagram: instagram || undefined,
      tiktok: tiktok || undefined,
      youtube: youtube || undefined,
      website: website || undefined,
      gmapsQuery: gmapsQuery || undefined,
      gmapsCity: gmapsCity || undefined,
    };

    const data = await aggregateSocialData(scrapeReq);

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] Social research error:', error);
    res.status(500).json({ error: error.message || 'Social research failed' });
  }
});

/**
 * POST /api/analyze/prospect
 * Run Claude prospect analysis on scraped data
 */
app.post('/api/analyze/prospect', async (req: Request, res: Response) => {
  try {
    const { socialData } = req.body;
    if (!socialData) return res.status(400).json({ error: 'socialData is required' });

    console.log('[API] Analyzing prospect...');
    const profile = await analyzeProspect(socialData);

    res.json({ success: true, profile });
  } catch (error: any) {
    console.error('[API] Prospect analysis error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

/**
 * POST /api/analyze/products
 * Match WwithAI products to prospect pain points
 */
app.post('/api/analyze/products', async (req: Request, res: Response) => {
  try {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ error: 'profile is required' });

    console.log('[API] Matching products...');
    const products = await matchProducts(profile as ProspectProfile);

    res.json({ success: true, products });
  } catch (error: any) {
    console.error('[API] Product matching error:', error);
    res.status(500).json({ error: error.message || 'Product matching failed' });
  }
});

/**
 * POST /api/analyze/financials
 * Estimate financial data for prospect
 */
app.post('/api/analyze/financials', async (req: Request, res: Response) => {
  try {
    const { profile, products, gmapsData } = req.body;
    if (!profile) return res.status(400).json({ error: 'profile is required' });

    console.log('[API] Estimating financials...');
    const financials = await estimateFinancials(
      profile as ProspectProfile,
      products as ProductMatch[] || [],
      gmapsData
    );

    res.json({ success: true, financials });
  } catch (error: any) {
    console.error('[API] Financial estimation error:', error);
    res.status(500).json({ error: error.message || 'Financial estimation failed' });
  }
});

/**
 * POST /api/generate-demo
 * Build demo HTML and deploy to Vercel
 * Accepts either a ready demoData object or raw pipeline outputs (profile, products, financials, socialData)
 */
app.post('/api/generate-demo', async (req: Request, res: Response) => {
  try {
    let data: DemoPageData;

    if (req.body.demoData && req.body.demoData.prospectName) {
      // Ready-made DemoPageData passed directly
      data = req.body.demoData as DemoPageData;
    } else {
      // Assemble from raw pipeline outputs (n8n workflow path)
      const { prospectName, prospectCompany, profile, products, financials, socialData } = req.body.demoData || req.body;
      if (!prospectName || !profile) {
        return res.status(400).json({ error: 'prospectName and profile are required' });
      }

      const socialStats: { platform: string; handle: string; followers: number; icon: string }[] = [];
      if (socialData?.instagram?.followers > 0) {
        socialStats.push({ platform: 'Instagram', handle: '@' + socialData.instagram.username, followers: socialData.instagram.followers, icon: '📸' });
      }
      if (socialData?.tiktok?.followers > 0) {
        socialStats.push({ platform: 'TikTok', handle: '@' + socialData.tiktok.username, followers: socialData.tiktok.followers, icon: '🎵' });
      }
      if (socialData?.youtube?.subscribers > 0) {
        socialStats.push({ platform: 'YouTube', handle: socialData.youtube.channelName, followers: socialData.youtube.subscribers, icon: '🎬' });
      }

      const gm = socialData?.googleMaps || socialData?.gmaps;

      data = {
        prospectName,
        prospectSlug: '',
        companyName: prospectCompany || gm?.name || '',
        profilePicUrl: socialData?.instagram?.profilePicUrl || socialData?.tiktok?.profilePicUrl || '',
        socialStats,
        totalFollowers: socialData?.totalFollowers || 0,
        restaurantCount: profile.restaurantCount || 1,
        restaurantName: gm?.name || prospectCompany || prospectName,
        rating: gm?.rating || 0,
        reviewCount: gm?.reviewCount || 0,
        cuisineType: (profile.cuisineTypes || []).join(', ') || 'Restaurant',
        city: gm?.address?.split(',')?.slice(-2, -1)[0]?.trim() || '',
        address: gm?.address || '',
        restaurantPhotos: (gm?.photos || []).slice(0, 6).map((p: any) => p.url || p),
        financials: financials || { estimatedRevenue: 0, monthlyData: [], roiWithWwithAI: { totalAnnualSavings: 0, breakdown: [], paybackMonths: 0 }, disclaimer: '' },
        painPoints: profile.painPoints || [],
        reviewInsights: (gm?.reviews || []).slice(0, 3).map((r: any) => r.text?.substring(0, 150) || ''),
        operationInsights: [],
        products: products || [],
        totalROI: financials?.roiWithWwithAI || { totalAnnualSavings: 0, breakdown: [], paybackMonths: 0 },
        ctaText: `Ready to save $${Math.round((financials?.roiWithWwithAI?.totalAnnualSavings || 0) / 1000)}K/year?`,
        calendlyUrl: 'https://calendly.com/wwithai/demo',
        generatedAt: new Date().toISOString(),
        disclaimer: financials?.disclaimer || 'AI-generated estimates for illustration purposes.',
      };
    }

    const slug = data.prospectSlug || generateSlug(data.prospectName);
    const outputDir = path.join(process.cwd(), 'output', 'demos', slug);

    console.log(`[API] Building demo for ${data.prospectName}...`);

    // Build demo HTML
    await buildAndSaveDemo(data, outputDir);

    // Deploy to Vercel
    let deployResult: { success: boolean; url?: string; deploymentId?: string } = { success: false };
    try {
      deployResult = await deployToVercel(outputDir, `demo-${slug}`);
    } catch (e: any) {
      console.warn('[API] Vercel deploy failed:', e.message);
    }

    res.json({
      success: true,
      slug,
      localPath: outputDir,
      deployed: deployResult.success,
      demoUrl: deployResult.url || null,
      deploymentId: deployResult.deploymentId || null,
    });
  } catch (error: any) {
    console.error('[API] Demo generation error:', error);
    res.status(500).json({ error: error.message || 'Demo generation failed' });
  }
});

// Debug: List output directory
app.get('/debug/files', async (req: Request, res: Response) => {
  try {
    const outputDir = path.join(process.cwd(), 'output');
    const cwd = process.cwd();
    let files: string[] = [];

    try {
      const dirs = await fs.readdir(outputDir);
      for (const dir of dirs) {
        const subPath = path.join(outputDir, dir);
        const stats = await fs.stat(subPath);
        if (stats.isDirectory()) {
          const subFiles = await fs.readdir(subPath);
          files.push(`${dir}/: ${subFiles.join(', ')}`);
        } else {
          files.push(dir);
        }
      }
    } catch (e: any) {
      files = [`Error reading output: ${e.message}`];
    }

    res.json({ cwd, outputDir, files });
  } catch (error: any) {
    res.json({ error: error.message });
  }
});

// Serve page HTML
app.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const htmlPath = path.resolve(process.cwd(), 'output', slug, 'index.html');

    console.log(`[Server] Serving page: ${slug}`);
    console.log(`[Server] Path: ${htmlPath}`);

    await fs.access(htmlPath);
    res.sendFile(htmlPath);
  } catch (error: any) {
    console.error(`[Server] Page not found: ${req.params.slug}`, error.message);
    res.status(404).send(`Page not found. Looking for: output/${req.params.slug}/index.html`);
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export { app };

/**
 * Start the server
 */
export async function startServer(port: number = 3000): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`[Server] Running on http://localhost:${port}`);
      resolve();
    });
  });
}
