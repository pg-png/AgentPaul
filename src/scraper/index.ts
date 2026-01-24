/**
 * Restaurant Scraper
 * Main entry point for scraping restaurant data
 */

import { scrapeGoogleMaps, GoogleMapsData } from './google-maps';
import { scrapeReviews, Review } from './google-reviews';
import { downloadAndProcessPhotos, ProcessedPhoto } from './photo-downloader';

export interface RestaurantData {
  // Basic info
  name: string;
  slug: string;
  address: string;
  phone: string;
  website: string | null;
  category: string;
  hours: string[];

  // Ratings
  rating: number;
  reviewCount: number;

  // Content
  photos: ProcessedPhoto[];
  reviews: Review[];

  // Metadata
  placeId: string;
  coordinates: { lat: number; lng: number };
  scrapedAt: Date;
}

/**
 * Generate URL-friendly slug from restaurant name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Scrape all restaurant data
 */
export async function scrapeRestaurant(
  name: string,
  city: string,
  outputDir: string
): Promise<RestaurantData> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[Scraper] Starting scrape for: ${name}, ${city}`);
  console.log(`${'='.repeat(50)}\n`);

  const startTime = Date.now();

  // 1. Get basic data from Google Maps
  console.log('[Step 1/3] Fetching Google Maps data...');
  let mapsData: GoogleMapsData;

  try {
    mapsData = await scrapeGoogleMaps(name, city);
    console.log(`[Step 1/3] Found: ${mapsData.name}`);
    console.log(`          Rating: ${mapsData.rating}/5 (${mapsData.reviewCount} reviews)`);
    console.log(`          Photos: ${mapsData.photos.length} found`);
  } catch (error) {
    console.error('[Step 1/3] Google Maps scrape failed:', error);
    throw new Error(`Failed to find restaurant: ${name}, ${city}`);
  }

  // 2. Get reviews (in parallel with photo download)
  console.log('\n[Step 2/3] Fetching reviews...');
  let reviews: Review[] = [];

  try {
    reviews = await scrapeReviews(name, city, 8);
    console.log(`[Step 2/3] Found ${reviews.length} quality reviews`);
  } catch (error) {
    console.warn('[Step 2/3] Reviews scrape failed, continuing without reviews');
  }

  // 3. Download and process photos
  console.log('\n[Step 3/3] Processing photos...');
  let photos: ProcessedPhoto[] = [];

  if (mapsData.photos.length > 0) {
    try {
      photos = await downloadAndProcessPhotos(
        mapsData.photos,
        `${outputDir}/images`,
        6
      );
      console.log(`[Step 3/3] Processed ${photos.length} photos`);
    } catch (error) {
      console.warn('[Step 3/3] Photo processing failed, continuing without photos');
    }
  }

  // 4. Generate slug
  const slug = generateSlug(mapsData.name);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[Scraper] Complete in ${duration}s`);
  console.log(`${'='.repeat(50)}\n`);

  return {
    name: mapsData.name,
    slug,
    address: mapsData.address,
    phone: mapsData.phone,
    website: mapsData.website,
    category: mapsData.category,
    hours: mapsData.hours,
    rating: mapsData.rating,
    reviewCount: mapsData.reviewCount,
    photos,
    reviews,
    placeId: mapsData.placeId,
    coordinates: mapsData.coordinates,
    scrapedAt: new Date()
  };
}

// Re-export types
export { GoogleMapsData, Review, ProcessedPhoto };
