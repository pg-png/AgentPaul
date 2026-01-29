/**
 * TikTok Scraper
 * Extracts public profile data via __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export interface TikTokData {
  username: string;
  nickname: string;
  bio: string;
  followers: number;
  following: number;
  likes: number;
  videoCount: number;
  profilePicUrl: string;
  isVerified: boolean;
  recentVideos: TikTokVideo[];
}

export interface TikTokVideo {
  id: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  thumbnailUrl: string;
  createTime: string;
}

/**
 * Scrape TikTok public profile
 * Extracts data from __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON embedded in page
 */
export async function scrapeTikTok(handle: string): Promise<TikTokData> {
  const username = handle.replace('@', '').trim();
  console.log(`[TikTok] Scraping @${username}...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    const url = `https://www.tiktok.com/@${username}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extract __UNIVERSAL_DATA_FOR_REHYDRATION__ from script tag
    const universalData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const text = script.textContent || '';
        if (text.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__')) {
          const match = text.match(/window\['__UNIVERSAL_DATA_FOR_REHYDRATION__'\]\s*=\s*({.+?});?\s*$/m);
          if (match) {
            try { return JSON.parse(match[1]); } catch { /* ignore */ }
          }
        }
      }

      // Fallback: try SIGI_STATE
      for (const script of scripts) {
        const text = script.textContent || '';
        if (text.includes('SIGI_STATE')) {
          const match = text.match(/SIGI_STATE\s*=\s*({.+?});?\s*$/m);
          if (match) {
            try { return JSON.parse(match[1]); } catch { /* ignore */ }
          }
        }
      }

      return null;
    });

    let userData: any = null;
    let itemList: any[] = [];

    if (universalData) {
      // Navigate the nested structure to find user data
      // Structure varies but commonly: __DEFAULT_SCOPE__["webapp.user-detail"]
      const defaultScope = universalData['__DEFAULT_SCOPE__'] || {};
      const userDetail = defaultScope['webapp.user-detail'] || {};
      userData = userDetail.userInfo?.user || null;
      const userStats = userDetail.userInfo?.stats || {};

      if (userData) {
        const videos = defaultScope['webapp.user-detail']?.itemList || [];
        itemList = Array.isArray(videos) ? videos : [];

        const result: TikTokData = {
          username: userData.uniqueId || username,
          nickname: userData.nickname || username,
          bio: userData.signature || '',
          followers: userStats.followerCount || 0,
          following: userStats.followingCount || 0,
          likes: userStats.heartCount || userStats.heart || 0,
          videoCount: userStats.videoCount || 0,
          profilePicUrl: userData.avatarLarger || userData.avatarMedium || '',
          isVerified: userData.verified || false,
          recentVideos: itemList.slice(0, 12).map((v: any) => ({
            id: v.id || '',
            description: v.desc || '',
            likes: v.stats?.diggCount || 0,
            comments: v.stats?.commentCount || 0,
            shares: v.stats?.shareCount || 0,
            views: v.stats?.playCount || 0,
            thumbnailUrl: v.video?.cover || '',
            createTime: v.createTime ? new Date(v.createTime * 1000).toISOString() : '',
          })),
        };

        console.log(`[TikTok] Found: ${result.nickname} | ${result.followers} followers | ${result.likes} likes`);
        return result;
      }
    }

    // Fallback: extract from meta tags
    const metaData = await page.evaluate(() => {
      const getMeta = (prop: string) => {
        const el = document.querySelector(`meta[property="${prop}"]`) ||
                   document.querySelector(`meta[name="${prop}"]`);
        return el?.getAttribute('content') || '';
      };
      return {
        title: getMeta('og:title') || document.title,
        description: getMeta('og:description') || getMeta('description'),
        image: getMeta('og:image'),
      };
    });

    // Parse from description: "X Followers, Y Likes, Z Videos..."
    const descMatch = metaData.description.match(
      /([\d,.]+[KkMm]?)\s*Followers?,?\s*([\d,.]+[KkMm]?)\s*Likes?,?\s*([\d,.]+[KkMm]?)\s*Videos?/i
    );

    const result: TikTokData = {
      username,
      nickname: metaData.title.replace(/@\w+.*/, '').replace(/\|.*/, '').trim() || username,
      bio: '',
      followers: descMatch ? parseCount(descMatch[1]) : 0,
      following: 0,
      likes: descMatch ? parseCount(descMatch[2]) : 0,
      videoCount: descMatch ? parseCount(descMatch[3]) : 0,
      profilePicUrl: metaData.image,
      isVerified: false,
      recentVideos: [],
    };

    console.log(`[TikTok] Fallback data: ${result.nickname} | ${result.followers} followers`);
    return result;

  } catch (error: any) {
    console.error(`[TikTok] Scrape failed for @${username}:`, error.message);
    return {
      username,
      nickname: username,
      bio: '',
      followers: 0,
      following: 0,
      likes: 0,
      videoCount: 0,
      profilePicUrl: '',
      isVerified: false,
      recentVideos: [],
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
