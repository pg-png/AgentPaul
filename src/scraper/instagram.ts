/**
 * Instagram Scraper
 * Extracts public profile data: followers, bio, recent posts, engagement
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export interface InstagramData {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  postsCount: number;
  profilePicUrl: string;
  isVerified: boolean;
  recentPosts: InstagramPost[];
  engagementRate: number;
  isPrivate: boolean;
}

export interface InstagramPost {
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
}

/**
 * Scrape Instagram public profile
 * Uses Puppeteer stealth with OG meta fallback
 */
export async function scrapeInstagram(handle: string): Promise<InstagramData> {
  const username = handle.replace('@', '').trim();
  console.log(`[Instagram] Scraping @${username}...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // Try the profile page
    const url = `https://www.instagram.com/${username}/`;
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    if (!response || response.status() === 404) {
      throw new Error(`Profile not found: @${username}`);
    }

    // Try to extract from meta tags (more reliable than DOM scraping)
    const metaData = await page.evaluate(() => {
      const getMeta = (property: string): string => {
        const el = document.querySelector(`meta[property="${property}"]`) ||
                   document.querySelector(`meta[name="${property}"]`);
        return el?.getAttribute('content') || '';
      };

      return {
        title: getMeta('og:title') || document.title,
        description: getMeta('og:description') || getMeta('description'),
        image: getMeta('og:image'),
      };
    });

    // Parse followers/following from description
    // Format: "X Followers, Y Following, Z Posts - ..."
    const descMatch = metaData.description.match(
      /([\d,.]+[KkMm]?)\s*Followers?,?\s*([\d,.]+[KkMm]?)\s*Following,?\s*([\d,.]+[KkMm]?)\s*Posts?/i
    );

    const followers = descMatch ? parseCount(descMatch[1]) : 0;
    const following = descMatch ? parseCount(descMatch[2]) : 0;
    const postsCount = descMatch ? parseCount(descMatch[3]) : 0;

    // Extract bio from page content
    const bio = extractBioFromDescription(metaData.description);
    const fullName = metaData.title.replace(/\(@[^)]+\).*/, '').replace(/• Instagram.*/, '').trim();

    // Try to get recent posts data from shared data JSON
    let recentPosts: InstagramPost[] = [];
    let isPrivate = false;
    let isVerified = false;

    try {
      const sharedData = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
          const text = script.textContent || '';
          if (text.includes('window._sharedData')) {
            const match = text.match(/window\._sharedData\s*=\s*({.+?});/);
            if (match) return JSON.parse(match[1]);
          }
        }
        return null;
      });

      if (sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user) {
        const user = sharedData.entry_data.ProfilePage[0].graphql.user;
        isPrivate = user.is_private || false;
        isVerified = user.is_verified || false;

        const edges = user.edge_owner_to_timeline_media?.edges || [];
        recentPosts = edges.slice(0, 12).map((edge: any) => ({
          imageUrl: edge.node.display_url || edge.node.thumbnail_src || '',
          caption: edge.node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
          likes: edge.node.edge_liked_by?.count || edge.node.edge_media_preview_like?.count || 0,
          comments: edge.node.edge_media_to_comment?.count || 0,
          timestamp: edge.node.taken_at_timestamp ? new Date(edge.node.taken_at_timestamp * 1000).toISOString() : '',
        }));
      }
    } catch {
      // Shared data not available, continue with meta data only
    }

    // Calculate engagement rate
    const totalEngagement = recentPosts.reduce((sum, p) => sum + p.likes + p.comments, 0);
    const engagementRate = recentPosts.length > 0 && followers > 0
      ? (totalEngagement / recentPosts.length / followers) * 100
      : 0;

    console.log(`[Instagram] Found: ${fullName} | ${followers} followers | ${recentPosts.length} posts scraped`);

    return {
      username,
      fullName,
      bio,
      followers,
      following,
      postsCount,
      profilePicUrl: metaData.image,
      isVerified,
      recentPosts,
      engagementRate: Math.round(engagementRate * 100) / 100,
      isPrivate,
    };

  } catch (error: any) {
    console.error(`[Instagram] Scrape failed for @${username}:`, error.message);
    // Return minimal fallback data
    return {
      username,
      fullName: username,
      bio: '',
      followers: 0,
      following: 0,
      postsCount: 0,
      profilePicUrl: '',
      isVerified: false,
      recentPosts: [],
      engagementRate: 0,
      isPrivate: false,
    };
  } finally {
    if (browser) await browser.close();
  }
}

function parseCount(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').trim();
  const multiplier = cleaned.match(/[KkMm]$/);

  if (multiplier) {
    const num = parseFloat(cleaned.replace(/[KkMm]$/, ''));
    if (multiplier[0].toLowerCase() === 'k') return Math.round(num * 1000);
    if (multiplier[0].toLowerCase() === 'm') return Math.round(num * 1000000);
  }

  return parseInt(cleaned, 10) || 0;
}

function extractBioFromDescription(desc: string): string {
  // Remove the "X Followers, Y Following, Z Posts - " prefix
  const parts = desc.split(' - ');
  if (parts.length > 1) {
    return parts.slice(1).join(' - ').trim();
  }
  return '';
}
