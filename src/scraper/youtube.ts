/**
 * YouTube Scraper
 * Uses YouTube Data API v3 (free 10K calls/day)
 */

import axios from 'axios';

export interface YouTubeData {
  channelId: string;
  channelName: string;
  description: string;
  subscribers: number;
  videoCount: number;
  viewCount: number;
  thumbnailUrl: string;
  customUrl: string;
  country: string;
  publishedAt: string;
  recentVideos: YouTubeVideo[];
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Scrape YouTube channel data
 * @param handle - Channel handle (@username), channel ID, or custom URL
 */
export async function scrapeYouTube(handle: string): Promise<YouTubeData> {
  const cleanHandle = handle.replace('@', '').trim();
  console.log(`[YouTube] Scraping ${cleanHandle}...`);

  if (!YOUTUBE_API_KEY) {
    console.warn('[YouTube] No YOUTUBE_API_KEY set, returning empty data');
    return emptyYouTubeData(cleanHandle);
  }

  try {
    // Step 1: Find channel
    const channelId = await findChannelId(cleanHandle);
    if (!channelId) {
      console.warn(`[YouTube] Channel not found: ${cleanHandle}`);
      return emptyYouTubeData(cleanHandle);
    }

    // Step 2: Get channel details
    const channelResponse = await axios.get(`${API_BASE}/channels`, {
      params: {
        key: YOUTUBE_API_KEY,
        id: channelId,
        part: 'snippet,statistics,brandingSettings',
      },
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      return emptyYouTubeData(cleanHandle);
    }

    const snippet = channel.snippet || {};
    const stats = channel.statistics || {};

    // Step 3: Get recent videos
    const recentVideos = await getRecentVideos(channelId);

    const result: YouTubeData = {
      channelId,
      channelName: snippet.title || cleanHandle,
      description: snippet.description || '',
      subscribers: parseInt(stats.subscriberCount || '0', 10),
      videoCount: parseInt(stats.videoCount || '0', 10),
      viewCount: parseInt(stats.viewCount || '0', 10),
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      customUrl: snippet.customUrl || '',
      country: snippet.country || '',
      publishedAt: snippet.publishedAt || '',
      recentVideos,
    };

    console.log(`[YouTube] Found: ${result.channelName} | ${result.subscribers} subs | ${result.videoCount} videos`);
    return result;

  } catch (error: any) {
    console.error(`[YouTube] Scrape failed for ${cleanHandle}:`, error.message);
    return emptyYouTubeData(cleanHandle);
  }
}

async function findChannelId(handle: string): Promise<string | null> {
  // Try as channel handle (@username)
  try {
    const response = await axios.get(`${API_BASE}/channels`, {
      params: {
        key: YOUTUBE_API_KEY,
        forHandle: handle,
        part: 'id',
      },
    });
    if (response.data.items?.length > 0) {
      return response.data.items[0].id;
    }
  } catch { /* try next method */ }

  // Try as channel ID directly
  if (handle.startsWith('UC') && handle.length === 24) {
    return handle;
  }

  // Try search
  try {
    const response = await axios.get(`${API_BASE}/search`, {
      params: {
        key: YOUTUBE_API_KEY,
        q: handle,
        type: 'channel',
        part: 'id',
        maxResults: 1,
      },
    });
    if (response.data.items?.length > 0) {
      return response.data.items[0].id?.channelId || null;
    }
  } catch { /* no result */ }

  return null;
}

async function getRecentVideos(channelId: string): Promise<YouTubeVideo[]> {
  try {
    // Get recent video IDs
    const searchResponse = await axios.get(`${API_BASE}/search`, {
      params: {
        key: YOUTUBE_API_KEY,
        channelId,
        part: 'id',
        order: 'date',
        type: 'video',
        maxResults: 10,
      },
    });

    const videoIds = (searchResponse.data.items || [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) return [];

    // Get video details
    const videosResponse = await axios.get(`${API_BASE}/videos`, {
      params: {
        key: YOUTUBE_API_KEY,
        id: videoIds.join(','),
        part: 'snippet,statistics',
      },
    });

    return (videosResponse.data.items || []).map((v: any) => ({
      id: v.id,
      title: v.snippet?.title || '',
      description: (v.snippet?.description || '').substring(0, 200),
      thumbnailUrl: v.snippet?.thumbnails?.medium?.url || '',
      publishedAt: v.snippet?.publishedAt || '',
      viewCount: parseInt(v.statistics?.viewCount || '0', 10),
      likeCount: parseInt(v.statistics?.likeCount || '0', 10),
      commentCount: parseInt(v.statistics?.commentCount || '0', 10),
    }));
  } catch (error) {
    console.warn('[YouTube] Failed to fetch recent videos');
    return [];
  }
}

function emptyYouTubeData(handle: string): YouTubeData {
  return {
    channelId: '',
    channelName: handle,
    description: '',
    subscribers: 0,
    videoCount: 0,
    viewCount: 0,
    thumbnailUrl: '',
    customUrl: '',
    country: '',
    publishedAt: '',
    recentVideos: [],
  };
}
