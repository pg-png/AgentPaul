/**
 * Photo Downloader
 * Downloads and processes photos for the landing page
 */

import axios from 'axios';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface ProcessedPhoto {
  id: string;
  originalUrl: string;
  localPath: string;
  publicUrl: string;
  width: number;
  height: number;
  format: string;
  // For template compatibility
  url: string;
  alt: string;
}

export async function downloadAndProcessPhotos(
  urls: string[],
  outputDir: string,
  maxPhotos: number = 6
): Promise<ProcessedPhoto[]> {
  console.log(`[Photos] Processing ${Math.min(urls.length, maxPhotos)} photos...`);

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  const processed: ProcessedPhoto[] = [];

  for (const url of urls.slice(0, maxPhotos)) {
    try {
      const id = uuidv4().substring(0, 8);

      console.log(`[Photos] Downloading: ${url.substring(0, 50)}...`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        }
      });

      const buffer = Buffer.from(response.data);
      const filename = `${id}.webp`;
      const localPath = path.join(outputDir, filename);

      // Get original metadata
      const metadata = await sharp(buffer).metadata();

      // Process: resize, optimize, convert to webp
      await sharp(buffer)
        .resize(1200, 800, {
          fit: 'cover',
          withoutEnlargement: true,
          position: 'center'
        })
        .webp({ quality: 85 })
        .toFile(localPath);

      processed.push({
        id,
        originalUrl: url,
        localPath,
        publicUrl: `/images/${filename}`,
        width: metadata.width || 1200,
        height: metadata.height || 800,
        format: 'webp',
        url: `/images/${filename}`,
        alt: `Photo ${processed.length + 1}`
      });

      console.log(`[Photos] Processed: ${filename}`);

    } catch (error) {
      console.error(`[Photos] Failed to process: ${url.substring(0, 50)}...`, error);
    }
  }

  console.log(`[Photos] Successfully processed ${processed.length} photos`);
  return processed;
}

/**
 * Upload photo to imgbb for hosting
 */
export async function uploadToImgbb(
  localPath: string,
  apiKey: string
): Promise<string> {
  const imageData = await fs.readFile(localPath);
  const base64 = imageData.toString('base64');

  const formData = new URLSearchParams();
  formData.append('image', base64);

  const response = await axios.post(
    `https://api.imgbb.com/1/upload?key=${apiKey}`,
    formData,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000
    }
  );

  return response.data.data.url;
}

/**
 * Convert a single photo from URL to base64
 */
export async function urlToBase64(url: string): Promise<string> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000
  });

  return Buffer.from(response.data).toString('base64');
}
