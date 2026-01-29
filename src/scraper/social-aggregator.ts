/**
 * Social Aggregator
 * Runs all scrapers in parallel with Promise.allSettled
 * Each platform is optional - graceful fail
 */

import { scrapeInstagram, InstagramData } from './instagram';
import { scrapeTikTok, TikTokData } from './tiktok';
import { scrapeYouTube, YouTubeData } from './youtube';
import { scrapeWebsite, WebsiteData } from './website';
import { scrapeRestaurant, RestaurantData } from './index';

export interface SocialAggregateResult {
  googleMaps: RestaurantData | null;
  instagram: InstagramData | null;
  tiktok: TikTokData | null;
  youtube: YouTubeData | null;
  website: WebsiteData | null;

  // Aggregated stats
  totalFollowers: number;
  activePlatforms: string[];
  totalContentPieces: number;
  avgEngagementRate: number;
}

export interface ScrapeRequest {
  gmapsQuery?: string;
  gmapsCity?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
}

/**
 * Run all scrapers in parallel
 * Each one is optional and can fail independently
 */
export async function aggregateSocialData(req: ScrapeRequest): Promise<SocialAggregateResult> {
  console.log('\n[Aggregator] Starting multi-platform scrape...');
  const startTime = Date.now();

  // Build promise array — only include platforms that have handles
  const promises: Promise<{ platform: string; data: any }>[] = [];

  if (req.gmapsQuery) {
    promises.push(
      scrapeRestaurant(req.gmapsQuery, req.gmapsCity || '', '')
        .then(data => ({ platform: 'google_maps', data }))
        .catch(err => {
          console.warn(`[Aggregator] Google Maps failed: ${err.message}`);
          return { platform: 'google_maps', data: null };
        })
    );
  }

  if (req.instagram) {
    promises.push(
      scrapeInstagram(req.instagram)
        .then(data => ({ platform: 'instagram', data }))
        .catch(err => {
          console.warn(`[Aggregator] Instagram failed: ${err.message}`);
          return { platform: 'instagram', data: null };
        })
    );
  }

  if (req.tiktok) {
    promises.push(
      scrapeTikTok(req.tiktok)
        .then(data => ({ platform: 'tiktok', data }))
        .catch(err => {
          console.warn(`[Aggregator] TikTok failed: ${err.message}`);
          return { platform: 'tiktok', data: null };
        })
    );
  }

  if (req.youtube) {
    promises.push(
      scrapeYouTube(req.youtube)
        .then(data => ({ platform: 'youtube', data }))
        .catch(err => {
          console.warn(`[Aggregator] YouTube failed: ${err.message}`);
          return { platform: 'youtube', data: null };
        })
    );
  }

  if (req.website) {
    promises.push(
      scrapeWebsite(req.website)
        .then(data => ({ platform: 'website', data }))
        .catch(err => {
          console.warn(`[Aggregator] Website failed: ${err.message}`);
          return { platform: 'website', data: null };
        })
    );
  }

  // Run all in parallel
  const results = await Promise.allSettled(promises);

  // Extract results
  let googleMaps: RestaurantData | null = null;
  let instagram: InstagramData | null = null;
  let tiktok: TikTokData | null = null;
  let youtube: YouTubeData | null = null;
  let website: WebsiteData | null = null;

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.data) {
      switch (result.value.platform) {
        case 'google_maps': googleMaps = result.value.data; break;
        case 'instagram': instagram = result.value.data; break;
        case 'tiktok': tiktok = result.value.data; break;
        case 'youtube': youtube = result.value.data; break;
        case 'website': website = result.value.data; break;
      }
    }
  }

  // Aggregate stats
  const activePlatforms: string[] = [];
  let totalFollowers = 0;
  let totalContentPieces = 0;
  const engagementRates: number[] = [];

  if (instagram && instagram.followers > 0) {
    activePlatforms.push('instagram');
    totalFollowers += instagram.followers;
    totalContentPieces += instagram.postsCount;
    if (instagram.engagementRate > 0) engagementRates.push(instagram.engagementRate);
  }

  if (tiktok && tiktok.followers > 0) {
    activePlatforms.push('tiktok');
    totalFollowers += tiktok.followers;
    totalContentPieces += tiktok.videoCount;
  }

  if (youtube && youtube.subscribers > 0) {
    activePlatforms.push('youtube');
    totalFollowers += youtube.subscribers;
    totalContentPieces += youtube.videoCount;
  }

  if (website && website.url) {
    activePlatforms.push('website');
  }

  if (googleMaps) {
    activePlatforms.push('google_maps');
  }

  const avgEngagementRate = engagementRates.length > 0
    ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
    : 0;

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[Aggregator] Complete in ${duration}s`);
  console.log(`[Aggregator] Active platforms: ${activePlatforms.join(', ')}`);
  console.log(`[Aggregator] Total followers: ${totalFollowers.toLocaleString()}`);
  console.log(`[Aggregator] Total content: ${totalContentPieces} pieces\n`);

  return {
    googleMaps,
    instagram,
    tiktok,
    youtube,
    website,
    totalFollowers,
    activePlatforms,
    totalContentPieces,
    avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
  };
}
