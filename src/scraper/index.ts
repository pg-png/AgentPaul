/**
 * Restaurant Scraper
 * Main entry point for scraping restaurant data
 */

import { scrapeGoogleMaps, GoogleMapsData } from './google-maps';
import { scrapeReviews, Review } from './google-reviews';
import { downloadAndProcessPhotos, ProcessedPhoto } from './photo-downloader';
import { analyzeAndRankPhotos, logAnalysisSummary, RankedPhotos } from './photo-analyzer';

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
  console.log('[Step 1/4] Fetching Google Maps data...');
  let mapsData: GoogleMapsData;

  try {
    mapsData = await scrapeGoogleMaps(name, city);
    console.log(`[Step 1/4] Found: ${mapsData.name}`);
    console.log(`          Rating: ${mapsData.rating}/5 (${mapsData.reviewCount} reviews)`);
    console.log(`          Photos: ${mapsData.photos.length} found`);
  } catch (error) {
    console.error('[Step 1/4] Google Maps scrape failed:', error);
    throw new Error(`Failed to find restaurant: ${name}, ${city}`);
  }

  // 2. Get reviews
  console.log('\n[Step 2/4] Fetching reviews...');
  let reviews: Review[] = [];

  try {
    reviews = await scrapeReviews(name, city, 8);
    console.log(`[Step 2/4] Found ${reviews.length} quality reviews`);
  } catch (error) {
    console.warn('[Step 2/4] Reviews scrape failed, continuing without reviews');
  }

  // 3. Analyze photos with Claude Vision
  console.log('\n[Step 3/4] Analyzing photos with AI...');
  let rankedPhotos: RankedPhotos | null = null;

  if (mapsData.photos.length > 0) {
    try {
      rankedPhotos = await analyzeAndRankPhotos(mapsData.photos, 8);
      logAnalysisSummary(rankedPhotos);
      console.log(`[Step 3/4] Analyzed ${rankedPhotos.totalAnalyzed} photos`);
    } catch (error) {
      console.warn('[Step 3/4] Photo analysis failed, will use default order');
    }
  }

  // 4. Download and process the best photos
  console.log('\n[Step 4/4] Downloading selected photos...');
  let photos: ProcessedPhoto[] = [];

  if (mapsData.photos.length > 0) {
    try {
      // Use ranked order if available, otherwise original order
      let orderedUrls: string[];
      if (rankedPhotos && rankedPhotos.hero) {
        // Hero first, then gallery photos
        orderedUrls = [
          rankedPhotos.hero.url,
          ...rankedPhotos.gallery.map(p => p.url)
        ];
      } else {
        orderedUrls = mapsData.photos;
      }

      photos = await downloadAndProcessPhotos(
        orderedUrls,
        `${outputDir}/images`,
        6
      );

      // Add analysis metadata to photos if available
      if (rankedPhotos) {
        photos = photos.map((photo, index) => {
          const analysis = index === 0 ? rankedPhotos!.hero : rankedPhotos!.gallery[index - 1];
          return {
            ...photo,
            alt: analysis?.description || `Photo ${index + 1}`
          };
        });
      }

      console.log(`[Step 4/4] Downloaded ${photos.length} photos (AI-ranked)`);
    } catch (error) {
      console.warn('[Step 4/4] Photo processing failed, continuing without photos');
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
export { PhotoAnalysis, RankedPhotos, analyzeAndRankPhotos } from './photo-analyzer';
