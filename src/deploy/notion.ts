/**
 * Notion Database
 * Track restaurant pages and their metadata
 */

import { Client } from '@notionhq/client';
import { PageData } from '../generator';

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const DATABASE_ID = process.env.NOTION_PAGES_DB || '';

export interface NotionPageRecord {
  id: string;
  slug: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  url?: string;
  lastUpdated: string;
  telegramUserId?: number;
}

/**
 * Create or update a page record in Notion
 */
export async function upsertPageRecord(
  pageData: PageData,
  options: {
    telegramUserId?: number;
    url?: string;
    status?: 'draft' | 'published' | 'archived';
  } = {}
): Promise<NotionPageRecord> {
  if (!DATABASE_ID) {
    throw new Error('NOTION_PAGES_DB environment variable is required');
  }

  console.log(`[Notion] Upserting page: ${pageData.name}`);

  // Check if page already exists
  const existing = await findPageBySlug(pageData.slug);

  if (existing) {
    // Update existing page
    const response = await notion.pages.update({
      page_id: existing.id,
      properties: {
        'Nom': {
          title: [{ text: { content: pageData.name } }]
        },
        'Slug': {
          rich_text: [{ text: { content: pageData.slug } }]
        },
        'Status': {
          select: { name: options.status || 'draft' }
        },
        'URL': {
          url: options.url || null
        },
        'Rating': {
          number: pageData.rating ?? null
        },
        'Reviews': {
          number: pageData.reviewCount ?? null
        },
        'Tagline': {
          rich_text: [{ text: { content: pageData.tagline || '' } }]
        },
        'Telegram User': {
          number: options.telegramUserId ?? null
        },
        'Last Updated': {
          date: { start: new Date().toISOString() }
        }
      } as any
    });

    console.log(`[Notion] Updated: ${existing.id}`);

    return {
      id: existing.id,
      slug: pageData.slug,
      name: pageData.name,
      status: options.status || existing.status,
      url: options.url || existing.url,
      lastUpdated: new Date().toISOString(),
      telegramUserId: options.telegramUserId
    };

  } else {
    // Create new page
    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        'Nom': {
          title: [{ text: { content: pageData.name } }]
        },
        'Slug': {
          rich_text: [{ text: { content: pageData.slug } }]
        },
        'Status': {
          select: { name: options.status || 'draft' }
        },
        'URL': {
          url: options.url || null
        },
        'Rating': {
          number: pageData.rating ?? null
        },
        'Reviews': {
          number: pageData.reviewCount ?? null
        },
        'Address': {
          rich_text: [{ text: { content: pageData.address || '' } }]
        },
        'Phone': {
          phone_number: pageData.phone || ''
        },
        'Tagline': {
          rich_text: [{ text: { content: pageData.tagline || '' } }]
        },
        'Primary Color': {
          rich_text: [{ text: { content: pageData.primaryColor || '' } }]
        },
        'Telegram User': {
          number: options.telegramUserId ?? null
        },
        'Created': {
          date: { start: new Date().toISOString() }
        },
        'Last Updated': {
          date: { start: new Date().toISOString() }
        }
      } as any
    });

    console.log(`[Notion] Created: ${response.id}`);

    return {
      id: response.id,
      slug: pageData.slug,
      name: pageData.name,
      status: options.status || 'draft',
      url: options.url,
      lastUpdated: new Date().toISOString(),
      telegramUserId: options.telegramUserId
    };
  }
}

/**
 * Find a page record by slug
 */
export async function findPageBySlug(slug: string): Promise<NotionPageRecord | null> {
  if (!DATABASE_ID) {
    return null;
  }

  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'Slug',
        rich_text: {
          equals: slug
        }
      }
    });

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0] as any;

    return {
      id: page.id,
      slug: page.properties['Slug']?.rich_text?.[0]?.text?.content || '',
      name: page.properties['Nom']?.title?.[0]?.text?.content || '',
      status: page.properties['Status']?.select?.name || 'draft',
      url: page.properties['URL']?.url || undefined,
      lastUpdated: page.properties['Last Updated']?.date?.start || '',
      telegramUserId: page.properties['Telegram User']?.number || undefined
    };

  } catch (error) {
    console.error('[Notion] Query error:', error);
    return null;
  }
}

/**
 * Get all pages for a Telegram user
 */
export async function getPagesByUser(telegramUserId: number): Promise<NotionPageRecord[]> {
  if (!DATABASE_ID) {
    return [];
  }

  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'Telegram User',
        number: {
          equals: telegramUserId
        }
      },
      sorts: [
        { property: 'Last Updated', direction: 'descending' }
      ]
    });

    return response.results.map((page: any) => ({
      id: page.id,
      slug: page.properties['Slug']?.rich_text?.[0]?.text?.content || '',
      name: page.properties['Nom']?.title?.[0]?.text?.content || '',
      status: page.properties['Status']?.select?.name || 'draft',
      url: page.properties['URL']?.url || undefined,
      lastUpdated: page.properties['Last Updated']?.date?.start || '',
      telegramUserId: page.properties['Telegram User']?.number || undefined
    }));

  } catch (error) {
    console.error('[Notion] Query error:', error);
    return [];
  }
}

/**
 * Update page status
 */
export async function updatePageStatus(
  slug: string,
  status: 'draft' | 'published' | 'archived',
  url?: string
): Promise<boolean> {
  const page = await findPageBySlug(slug);

  if (!page) {
    return false;
  }

  try {
    await notion.pages.update({
      page_id: page.id,
      properties: {
        'Status': {
          select: { name: status }
        },
        ...(url && {
          'URL': {
            url: url
          }
        }),
        'Last Updated': {
          date: { start: new Date().toISOString() }
        }
      }
    });

    return true;
  } catch (error) {
    console.error('[Notion] Update error:', error);
    return false;
  }
}

/**
 * Get all published pages
 */
export async function getPublishedPages(): Promise<NotionPageRecord[]> {
  if (!DATABASE_ID) {
    return [];
  }

  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'Status',
        select: {
          equals: 'published'
        }
      },
      sorts: [
        { property: 'Nom', direction: 'ascending' }
      ]
    });

    return response.results.map((page: any) => ({
      id: page.id,
      slug: page.properties['Slug']?.rich_text?.[0]?.text?.content || '',
      name: page.properties['Nom']?.title?.[0]?.text?.content || '',
      status: 'published' as const,
      url: page.properties['URL']?.url || undefined,
      lastUpdated: page.properties['Last Updated']?.date?.start || ''
    }));

  } catch (error) {
    console.error('[Notion] Query error:', error);
    return [];
  }
}
