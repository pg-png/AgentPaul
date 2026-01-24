/**
 * Google Maps Scraper
 * Extracts restaurant data from Google Maps
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export interface GoogleMapsData {
  name: string;
  address: string;
  phone: string;
  website: string | null;
  rating: number;
  reviewCount: number;
  category: string;
  hours: string[];
  photos: string[];
  placeId: string;
  coordinates: { lat: number; lng: number };
}

export async function scrapeGoogleMaps(
  restaurantName: string,
  city: string
): Promise<GoogleMapsData> {
  console.log(`[Scraper] Searching for: ${restaurantName}, ${city}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1280, height: 800 });

    // Search on Google Maps
    const searchQuery = encodeURIComponent(`${restaurantName} ${city} restaurant`);
    const url = `https://www.google.com/maps/search/${searchQuery}`;

    console.log(`[Scraper] Navigating to: ${url}`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for results
    await page.waitForSelector('[role="feed"], [role="main"]', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Click first result if in list view
    const feedExists = await page.$('[role="feed"]');
    if (feedExists) {
      const firstResult = await page.$('[role="feed"] > div:first-child a[href*="/maps/place"]');
      if (firstResult) {
        await firstResult.click();
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Wait for details panel
    await page.waitForSelector('h1', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // Extract data
    const data = await page.evaluate(() => {
      const getText = (selectors: string[]): string => {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el?.textContent?.trim()) {
            return el.textContent.trim();
          }
        }
        return '';
      };

      const getHref = (selector: string): string | null => {
        const el = document.querySelector(selector);
        return el?.getAttribute('href') || null;
      };

      // Get name
      const name = getText(['h1']);

      // Get address - look for the address button/link
      let address = '';
      const addressButtons = document.querySelectorAll('button[data-item-id="address"], [data-item-id*="address"]');
      addressButtons.forEach(btn => {
        const text = btn.textContent?.trim();
        if (text && text.length > 5) address = text;
      });
      if (!address) {
        // Fallback: look for text that looks like an address
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => {
          const text = btn.textContent?.trim() || '';
          if (text.match(/^\d+\s+\w+.*,.*\w{2}\s+\w\d\w/i)) {
            address = text;
          }
        });
      }

      // Get phone
      let phone = '';
      const phoneButton = document.querySelector('button[data-item-id*="phone"]');
      if (phoneButton) {
        phone = phoneButton.textContent?.trim() || '';
      }

      // Get website
      const websiteLink = document.querySelector('a[data-item-id*="website"]');
      const website = websiteLink?.getAttribute('href') || null;

      // Get rating
      let rating = 0;
      let reviewCount = 0;
      const ratingEl = document.querySelector('[role="img"][aria-label*="star"]');
      if (ratingEl) {
        const label = ratingEl.getAttribute('aria-label') || '';
        const ratingMatch = label.match(/([\d.]+)/);
        if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      }

      // Get review count
      const reviewButtons = document.querySelectorAll('button');
      reviewButtons.forEach(btn => {
        const text = btn.textContent || '';
        const match = text.match(/([\d,]+)\s*(avis|reviews?)/i);
        if (match) {
          reviewCount = parseInt(match[1].replace(/,/g, ''));
        }
      });

      // Get category
      let category = '';
      const categoryButton = document.querySelector('button[jsaction*="category"]');
      if (categoryButton) {
        category = categoryButton.textContent?.trim() || '';
      }

      // Get hours
      const hours: string[] = [];
      const hoursTable = document.querySelector('table[role="presentation"]');
      if (hoursTable) {
        const rows = hoursTable.querySelectorAll('tr');
        rows.forEach(row => {
          const text = row.textContent?.trim();
          if (text) hours.push(text);
        });
      }

      // Get photos
      const photos: string[] = [];
      const photoElements = document.querySelectorAll('button[data-photo-index] img, img[decoding="async"]');
      photoElements.forEach(img => {
        const src = (img as HTMLImageElement).src;
        if (src && !src.includes('data:') && src.includes('googleusercontent')) {
          // Get higher resolution version
          const highResSrc = src.replace(/=w\d+-h\d+/, '=w800-h600');
          if (!photos.includes(highResSrc)) {
            photos.push(highResSrc);
          }
        }
      });

      return {
        name,
        address,
        phone,
        website,
        rating,
        reviewCount,
        category,
        hours,
        photos: photos.slice(0, 10)
      };
    });

    // Extract place ID from URL
    const currentUrl = page.url();
    const placeIdMatch = currentUrl.match(/!1s([^!]+)/);
    const coordMatch = currentUrl.match(/@([-\d.]+),([-\d.]+)/);

    return {
      ...data,
      placeId: placeIdMatch?.[1] || '',
      coordinates: {
        lat: coordMatch ? parseFloat(coordMatch[1]) : 0,
        lng: coordMatch ? parseFloat(coordMatch[2]) : 0
      }
    };

  } finally {
    await browser.close();
  }
}
