/**
 * Website Scraper
 * Extracts meta tags, social links, tech stack, and features from restaurant websites
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export interface WebsiteData {
  url: string;
  title: string;
  description: string;
  ogImage: string;
  socialLinks: SocialLinks;
  features: WebsiteFeatures;
  techStack: string[];
  navItems: string[];
  contactInfo: ContactInfo;
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  yelp: string;
}

export interface WebsiteFeatures {
  hasOnlineOrdering: boolean;
  hasReservation: boolean;
  hasMenu: boolean;
  hasDelivery: boolean;
  hasCatering: boolean;
  hasGiftCards: boolean;
  hasLoyaltyProgram: boolean;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

/**
 * Scrape a restaurant website for key information
 */
export async function scrapeWebsite(websiteUrl: string): Promise<WebsiteData> {
  console.log(`[Website] Scraping ${websiteUrl}...`);

  // Normalize URL
  let url = websiteUrl.trim();
  if (!url.startsWith('http')) url = `https://${url}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const data = await page.evaluate(() => {
      const getMeta = (prop: string): string => {
        const el = document.querySelector(`meta[property="${prop}"]`) ||
                   document.querySelector(`meta[name="${prop}"]`);
        return el?.getAttribute('content') || '';
      };

      // Extract all links on the page
      const allLinks = Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).href.toLowerCase());

      const allText = document.body?.innerText?.toLowerCase() || '';

      // Social links detection
      const findSocialLink = (patterns: string[]): string => {
        for (const link of allLinks) {
          if (patterns.some(p => link.includes(p))) return link;
        }
        return '';
      };

      const socialLinks = {
        instagram: findSocialLink(['instagram.com']),
        facebook: findSocialLink(['facebook.com']),
        tiktok: findSocialLink(['tiktok.com']),
        youtube: findSocialLink(['youtube.com', 'youtu.be']),
        twitter: findSocialLink(['twitter.com', 'x.com']),
        yelp: findSocialLink(['yelp.com']),
      };

      // Feature detection from links and text
      const orderingKeywords = ['order online', 'order now', 'commandez', 'commander', 'ubereats', 'doordash', 'grubhub', 'skip the dishes', 'online ordering'];
      const reservationKeywords = ['reservation', 'réservation', 'reserver', 'réserver', 'book a table', 'opentable', 'resy', 'yelp reservations'];
      const menuKeywords = ['menu', '/menu', 'our menu', 'notre menu', 'food menu'];
      const deliveryKeywords = ['delivery', 'livraison', 'deliver'];
      const cateringKeywords = ['catering', 'traiteur', 'events', 'private dining'];
      const giftCardKeywords = ['gift card', 'carte cadeau', 'gift certificate'];
      const loyaltyKeywords = ['loyalty', 'rewards', 'fidelite', 'points'];

      const features = {
        hasOnlineOrdering: orderingKeywords.some(k => allText.includes(k) || allLinks.some(l => l.includes(k.replace(/\s/g, '')))),
        hasReservation: reservationKeywords.some(k => allText.includes(k) || allLinks.some(l => l.includes(k.replace(/\s/g, '')))),
        hasMenu: menuKeywords.some(k => allText.includes(k) || allLinks.some(l => l.includes(k))),
        hasDelivery: deliveryKeywords.some(k => allText.includes(k)),
        hasCatering: cateringKeywords.some(k => allText.includes(k)),
        hasGiftCards: giftCardKeywords.some(k => allText.includes(k)),
        hasLoyaltyProgram: loyaltyKeywords.some(k => allText.includes(k)),
      };

      // Tech stack detection
      const techStack: string[] = [];
      const html = document.documentElement.outerHTML.toLowerCase();
      if (html.includes('shopify')) techStack.push('Shopify');
      if (html.includes('wordpress') || html.includes('wp-content')) techStack.push('WordPress');
      if (html.includes('squarespace')) techStack.push('Squarespace');
      if (html.includes('wix.com')) techStack.push('Wix');
      if (html.includes('webflow')) techStack.push('Webflow');
      if (html.includes('bentobox')) techStack.push('BentoBox');
      if (html.includes('popmenu')) techStack.push('Popmenu');
      if (html.includes('toast')) techStack.push('Toast');
      if (html.includes('clover')) techStack.push('Clover');
      if (html.includes('square')) techStack.push('Square');
      if (html.includes('lightspeed')) techStack.push('Lightspeed');
      if (html.includes('react')) techStack.push('React');
      if (html.includes('next')) techStack.push('Next.js');

      // Navigation items
      const navItems = Array.from(document.querySelectorAll('nav a, header a, .nav a, .menu a, .navbar a'))
        .map(a => a.textContent?.trim() || '')
        .filter(t => t.length > 0 && t.length < 30);

      // Contact info extraction
      const emailMatch = allText.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      const phoneMatch = allText.match(/(\+?1?\s*[-.]?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);

      const contactInfo = {
        email: emailMatch ? emailMatch[0] : '',
        phone: phoneMatch ? phoneMatch[0] : '',
        address: getMeta('business:contact_data:street_address') || '',
      };

      return {
        title: getMeta('og:title') || document.title || '',
        description: getMeta('og:description') || getMeta('description') || '',
        ogImage: getMeta('og:image') || '',
        socialLinks,
        features,
        techStack,
        navItems: [...new Set(navItems)].slice(0, 15),
        contactInfo,
      };
    });

    console.log(`[Website] Found: ${data.title} | Tech: ${data.techStack.join(', ') || 'unknown'} | Features: ${Object.entries(data.features).filter(([, v]) => v).map(([k]) => k).join(', ')}`);

    return {
      url,
      ...data,
    };

  } catch (error: any) {
    console.error(`[Website] Scrape failed for ${url}:`, error.message);
    return {
      url,
      title: '',
      description: '',
      ogImage: '',
      socialLinks: { instagram: '', facebook: '', tiktok: '', youtube: '', twitter: '', yelp: '' },
      features: {
        hasOnlineOrdering: false,
        hasReservation: false,
        hasMenu: false,
        hasDelivery: false,
        hasCatering: false,
        hasGiftCards: false,
        hasLoyaltyProgram: false,
      },
      techStack: [],
      navItems: [],
      contactInfo: { email: '', phone: '', address: '' },
    };
  } finally {
    if (browser) await browser.close();
  }
}
