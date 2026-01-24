/**
 * Google Reviews Scraper
 * Extracts reviews from Google Maps
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export async function scrapeReviews(
  restaurantName: string,
  city: string,
  limit: number = 10
): Promise<Review[]> {
  console.log(`[Reviews] Fetching reviews for: ${restaurantName}, ${city}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    );

    // Search and navigate to restaurant
    const searchQuery = encodeURIComponent(`${restaurantName} ${city} restaurant`);
    await page.goto(`https://www.google.com/maps/search/${searchQuery}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(r => setTimeout(r, 3000));

    // Click first result
    const firstResult = await page.$('[role="feed"] > div:first-child a[href*="/maps/place"]');
    if (firstResult) {
      await firstResult.click();
      await new Promise(r => setTimeout(r, 3000));
    }

    // Click on reviews tab
    const reviewsTab = await page.$('button[aria-label*="Avis"], button[aria-label*="Reviews"]');
    if (reviewsTab) {
      await reviewsTab.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    // Sort by highest rating
    const sortButton = await page.$('button[data-value="Sort"], button[aria-label*="Sort"]');
    if (sortButton) {
      await sortButton.click();
      await new Promise(r => setTimeout(r, 1000));

      // Click "Highest rating" option
      const highestOption = await page.$('[data-index="2"], [role="menuitemradio"]:nth-child(3)');
      if (highestOption) {
        await highestOption.click();
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Scroll to load more reviews
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const scrollable = document.querySelector('[role="feed"], .m6QErb.DxyBCb');
        if (scrollable) {
          scrollable.scrollTop = scrollable.scrollHeight;
        }
      });
      await new Promise(r => setTimeout(r, 1500));
    }

    // Extract reviews
    const reviews = await page.evaluate((maxReviews: number) => {
      const results: Review[] = [];

      // Find review containers
      const reviewContainers = document.querySelectorAll('[data-review-id], .jftiEf');

      reviewContainers.forEach((container, index) => {
        if (index >= maxReviews) return;

        // Get rating
        let rating = 0;
        const ratingEl = container.querySelector('[role="img"][aria-label*="star"], .kvMYJc');
        if (ratingEl) {
          const label = ratingEl.getAttribute('aria-label') || '';
          const match = label.match(/(\d)/);
          if (match) rating = parseInt(match[1]);
        }

        // Only include 4+ star reviews
        if (rating < 4) return;

        // Get text
        let text = '';
        const textEl = container.querySelector('.wiI7pd, [data-expandable-section], .MyEned');
        if (textEl) {
          text = textEl.textContent?.trim() || '';
        }

        // Minimum text length
        if (text.length < 20) return;

        // Get author
        let author = 'Client';
        const authorEl = container.querySelector('.d4r55, .WNxzHc');
        if (authorEl) {
          author = authorEl.textContent?.trim() || 'Client';
        }

        // Get date
        let date = '';
        const dateEl = container.querySelector('.rsqaWe, .DU9Pgb');
        if (dateEl) {
          date = dateEl.textContent?.trim() || '';
        }

        results.push({
          author,
          rating,
          text: text.substring(0, 300), // Limit text length
          date
        });
      });

      return results;
    }, limit);

    console.log(`[Reviews] Found ${reviews.length} quality reviews`);
    return reviews.slice(0, limit);

  } finally {
    await browser.close();
  }
}
