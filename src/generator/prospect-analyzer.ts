/**
 * Prospect Analyzer
 * Feeds all scraped social media data to Claude Sonnet and outputs a ProspectProfile.
 * Analyzes Google Maps, Instagram, TikTok, YouTube, and Website data to build
 * a comprehensive prospect profile with pain points, audience insights, and competitive positioning.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ProspectProfile, PainPoint, AudienceProfile } from './demo-types';
import { SocialAggregateResult } from '../scraper/social-aggregator';

const anthropic = new Anthropic();

/**
 * Analyze all scraped prospect data using Claude Sonnet
 * Returns a structured ProspectProfile with pain points ranked by severity
 */
export async function analyzeProspect(data: SocialAggregateResult): Promise<ProspectProfile> {
  console.log('[ProspectAnalyzer] Starting prospect analysis...');
  console.log(`[ProspectAnalyzer] Active platforms: ${data.activePlatforms.join(', ')}`);
  console.log(`[ProspectAnalyzer] Total followers: ${data.totalFollowers.toLocaleString()}`);

  try {
    const prompt = buildAnalysisPrompt(data);

    console.log('[ProspectAnalyzer] Sending data to Claude Sonnet for analysis...');
    const startTime = Date.now();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[ProspectAnalyzer] Claude response received in ${duration}s`);

    // Extract text content from response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    const rawText = textBlock.text;

    // Extract JSON from the response (handle markdown code blocks)
    const jsonString = extractJSON(rawText);
    console.log('[ProspectAnalyzer] Parsing Claude response...');

    const parsed = JSON.parse(jsonString);
    const profile = validateAndNormalize(parsed, data);

    console.log(`[ProspectAnalyzer] Analysis complete:`);
    console.log(`[ProspectAnalyzer]   Persona: ${profile.personaType}`);
    console.log(`[ProspectAnalyzer]   Cuisine: ${profile.cuisineTypes.join(', ')}`);
    console.log(`[ProspectAnalyzer]   Pain points: ${profile.painPoints.length}`);
    console.log(`[ProspectAnalyzer]   Tech savviness: ${profile.techSavviness}`);
    console.log(`[ProspectAnalyzer]   Competitive position: ${profile.competitivePosition}`);

    return profile;
  } catch (error: any) {
    console.error(`[ProspectAnalyzer] Analysis failed: ${error.message}`);
    console.log('[ProspectAnalyzer] Falling back to basic profile...');
    return buildFallbackProfile(data);
  }
}

/**
 * Build the detailed analysis prompt with ALL scraped data
 */
function buildAnalysisPrompt(data: SocialAggregateResult): string {
  const sections: string[] = [];

  sections.push(`You are an expert restaurant industry analyst. Analyze the following scraped data about a restaurant prospect and return a structured JSON profile.

Your goal is to understand:
1. Who this restaurant owner/operator is (persona type)
2. Their cuisine and brand identity
3. Their content strategy and social media presence
4. Their pain points (ranked by severity)
5. Their tech sophistication
6. Their competitive position in the market

Analyze ALL of the data below carefully and return your analysis as a JSON object.`);

  // --- Google Maps Data ---
  if (data.googleMaps) {
    const gm = data.googleMaps;
    sections.push(`
=== GOOGLE MAPS DATA ===
Restaurant Name: ${gm.name}
Address: ${gm.address}
Phone: ${gm.phone}
Website: ${gm.website || 'None'}
Category: ${gm.category}
Rating: ${gm.rating}/5 (${gm.reviewCount} reviews)
Hours: ${gm.hours.join(' | ')}
Place ID: ${gm.placeId}
Coordinates: ${gm.coordinates.lat}, ${gm.coordinates.lng}
Number of Photos: ${gm.photos.length}`);

    if (gm.reviews && gm.reviews.length > 0) {
      sections.push(`
--- Recent Reviews (${gm.reviews.length}) ---`);
      gm.reviews.forEach((review, i) => {
        sections.push(`Review ${i + 1}: [${review.rating}/5] "${review.text}"${review.date ? ` (${review.date})` : ''}`);
      });
    }
  } else {
    sections.push('\n=== GOOGLE MAPS DATA ===\nNot available');
  }

  // --- Instagram Data ---
  if (data.instagram) {
    const ig = data.instagram;
    sections.push(`
=== INSTAGRAM DATA ===
Username: @${ig.username}
Full Name: ${ig.fullName}
Bio: ${ig.bio}
Followers: ${ig.followers.toLocaleString()}
Following: ${ig.following.toLocaleString()}
Posts Count: ${ig.postsCount.toLocaleString()}
Engagement Rate: ${ig.engagementRate}%
Verified: ${ig.isVerified}
Private: ${ig.isPrivate}`);

    if (ig.recentPosts && ig.recentPosts.length > 0) {
      sections.push(`
--- Recent Posts (${ig.recentPosts.length}) ---`);
      ig.recentPosts.forEach((post, i) => {
        sections.push(`Post ${i + 1}: "${post.caption?.substring(0, 200) || 'No caption'}" | Likes: ${post.likes} | Comments: ${post.comments}${post.timestamp ? ` | Date: ${post.timestamp}` : ''}`);
      });
    }
  } else {
    sections.push('\n=== INSTAGRAM DATA ===\nNot available');
  }

  // --- TikTok Data ---
  if (data.tiktok) {
    const tt = data.tiktok;
    sections.push(`
=== TIKTOK DATA ===
Username: @${tt.username}
Nickname: ${tt.nickname}
Bio: ${tt.bio}
Followers: ${tt.followers.toLocaleString()}
Following: ${tt.following.toLocaleString()}
Total Likes: ${tt.likes.toLocaleString()}
Video Count: ${tt.videoCount}
Verified: ${tt.isVerified}`);

    if (tt.recentVideos && tt.recentVideos.length > 0) {
      sections.push(`
--- Recent Videos (${tt.recentVideos.length}) ---`);
      tt.recentVideos.forEach((video, i) => {
        sections.push(`Video ${i + 1}: "${video.description?.substring(0, 200) || 'No description'}" | Views: ${video.views.toLocaleString()} | Likes: ${video.likes.toLocaleString()} | Comments: ${video.comments} | Shares: ${video.shares}`);
      });
    }
  } else {
    sections.push('\n=== TIKTOK DATA ===\nNot available');
  }

  // --- YouTube Data ---
  if (data.youtube) {
    const yt = data.youtube;
    sections.push(`
=== YOUTUBE DATA ===
Channel: ${yt.channelName}
Description: ${yt.description?.substring(0, 300) || 'None'}
Subscribers: ${yt.subscribers.toLocaleString()}
Videos: ${yt.videoCount}
Total Views: ${yt.viewCount.toLocaleString()}
Country: ${yt.country || 'Unknown'}
Channel Created: ${yt.publishedAt}`);

    if (yt.recentVideos && yt.recentVideos.length > 0) {
      sections.push(`
--- Recent Videos (${yt.recentVideos.length}) ---`);
      yt.recentVideos.forEach((video, i) => {
        sections.push(`Video ${i + 1}: "${video.title}" | Views: ${video.viewCount.toLocaleString()} | Likes: ${video.likeCount} | Comments: ${video.commentCount} | Published: ${video.publishedAt}`);
      });
    }
  } else {
    sections.push('\n=== YOUTUBE DATA ===\nNot available');
  }

  // --- Website Data ---
  if (data.website) {
    const ws = data.website;
    sections.push(`
=== WEBSITE DATA ===
URL: ${ws.url}
Title: ${ws.title}
Description: ${ws.description}
Tech Stack: ${ws.techStack.length > 0 ? ws.techStack.join(', ') : 'Unknown'}
Navigation Items: ${ws.navItems.join(', ')}

Features:
- Online Ordering: ${ws.features.hasOnlineOrdering}
- Reservations: ${ws.features.hasReservation}
- Menu Page: ${ws.features.hasMenu}
- Delivery: ${ws.features.hasDelivery}
- Catering: ${ws.features.hasCatering}
- Gift Cards: ${ws.features.hasGiftCards}
- Loyalty Program: ${ws.features.hasLoyaltyProgram}

Social Links:
- Instagram: ${ws.socialLinks.instagram || 'None'}
- Facebook: ${ws.socialLinks.facebook || 'None'}
- TikTok: ${ws.socialLinks.tiktok || 'None'}
- YouTube: ${ws.socialLinks.youtube || 'None'}
- Twitter/X: ${ws.socialLinks.twitter || 'None'}
- Yelp: ${ws.socialLinks.yelp || 'None'}

Contact:
- Email: ${ws.contactInfo.email || 'None'}
- Phone: ${ws.contactInfo.phone || 'None'}
- Address: ${ws.contactInfo.address || 'None'}`);
  } else {
    sections.push('\n=== WEBSITE DATA ===\nNot available');
  }

  // --- Aggregate Stats ---
  sections.push(`
=== AGGREGATE STATS ===
Total Followers: ${data.totalFollowers.toLocaleString()}
Active Platforms: ${data.activePlatforms.join(', ')}
Total Content Pieces: ${data.totalContentPieces}
Average Engagement Rate: ${data.avgEngagementRate}%`);

  // --- Output Format ---
  sections.push(`
=== INSTRUCTIONS ===

Based on ALL of the data above, return a JSON object with exactly this structure:

{
  "personaType": "chef-owner" | "multi-unit-operator" | "influencer-restaurateur" | "corporate-operator" | "franchise-owner",
  "cuisineTypes": ["string array of cuisine types, e.g. Thai, Italian, etc."],
  "restaurantCount": number (how many locations they appear to operate),
  "contentThemes": ["string array of recurring content themes, e.g. behind-the-scenes, food-plating, staff-culture"],
  "brandVoice": "string description of their brand voice/tone (e.g. casual and fun, premium and refined, family-oriented, etc.)",
  "painPoints": [
    {
      "id": "kebab-case-id (e.g. food-cost-unknown, labor-cost-high, no-online-ordering, inconsistent-social-media, low-google-rating, no-website-seo, staff-turnover-high, no-loyalty-program, manual-inventory, outdated-tech-stack)",
      "category": "financial" | "operational" | "marketing" | "staffing" | "technology",
      "title": "Short title",
      "description": "Detailed description of the pain point",
      "severity": "high" | "medium" | "low",
      "evidence": "What specific data from the scrape supports this pain point"
    }
  ],
  "techSavviness": "low" | "medium" | "high",
  "existingTools": ["string array of tools/platforms they already use, e.g. Lightspeed, BentoBox, Toast, etc."],
  "audienceProfile": {
    "totalFollowers": number,
    "primaryPlatform": "string (instagram, tiktok, youtube, etc.)",
    "engagementLevel": "high" | "medium" | "low",
    "contentFrequency": "daily" | "weekly" | "monthly" | "sporadic",
    "audienceType": "string description of their audience (e.g. local foodies, young professionals, etc.)"
  },
  "competitivePosition": "string summary of their competitive position in the market (strengths, weaknesses, opportunities)"
}

IMPORTANT:
- Include at least 3-5 pain points, ranked by severity (highest first)
- Pain point IDs must be kebab-case strings
- Pain point categories must be one of: financial, operational, marketing, staffing, technology
- Base ALL analysis on the actual data provided, not assumptions
- If data is limited, note that in the evidence fields
- Be specific in the evidence field — reference actual numbers, posts, reviews, or features

Return ONLY the JSON object, no other text.`);

  return sections.join('\n');
}

/**
 * Extract JSON from Claude's response, handling markdown code blocks
 */
function extractJSON(text: string): string {
  // Try to extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  // Return as-is and let JSON.parse handle the error
  return text.trim();
}

/**
 * Validate the parsed JSON and normalize it into a ProspectProfile
 */
function validateAndNormalize(parsed: any, data: SocialAggregateResult): ProspectProfile {
  // Validate personaType
  const validPersonaTypes = ['chef-owner', 'multi-unit-operator', 'influencer-restaurateur', 'corporate-operator', 'franchise-owner'];
  const personaType = validPersonaTypes.includes(parsed.personaType)
    ? parsed.personaType
    : 'chef-owner';

  // Validate cuisineTypes
  const cuisineTypes = Array.isArray(parsed.cuisineTypes) && parsed.cuisineTypes.length > 0
    ? parsed.cuisineTypes.map((c: any) => String(c))
    : inferCuisineTypes(data);

  // Validate restaurantCount
  const restaurantCount = typeof parsed.restaurantCount === 'number' && parsed.restaurantCount > 0
    ? parsed.restaurantCount
    : 1;

  // Validate contentThemes
  const contentThemes = Array.isArray(parsed.contentThemes)
    ? parsed.contentThemes.map((t: any) => String(t))
    : [];

  // Validate brandVoice
  const brandVoice = typeof parsed.brandVoice === 'string' && parsed.brandVoice.length > 0
    ? parsed.brandVoice
    : 'Not enough data to determine';

  // Validate painPoints
  const painPoints = validatePainPoints(parsed.painPoints);

  // Validate techSavviness
  const validTechLevels = ['low', 'medium', 'high'];
  const techSavviness = validTechLevels.includes(parsed.techSavviness)
    ? parsed.techSavviness
    : 'medium';

  // Validate existingTools
  const existingTools = Array.isArray(parsed.existingTools)
    ? parsed.existingTools.map((t: any) => String(t))
    : inferExistingTools(data);

  // Validate audienceProfile
  const audienceProfile = validateAudienceProfile(parsed.audienceProfile, data);

  // Validate competitivePosition
  const competitivePosition = typeof parsed.competitivePosition === 'string' && parsed.competitivePosition.length > 0
    ? parsed.competitivePosition
    : 'Insufficient data for competitive analysis';

  return {
    personaType,
    cuisineTypes,
    restaurantCount,
    contentThemes,
    brandVoice,
    painPoints,
    techSavviness,
    existingTools,
    audienceProfile,
    competitivePosition,
  } as ProspectProfile;
}

/**
 * Validate and normalize pain points array
 */
function validatePainPoints(rawPainPoints: any): PainPoint[] {
  if (!Array.isArray(rawPainPoints) || rawPainPoints.length === 0) {
    return getDefaultPainPoints();
  }

  const validCategories = ['financial', 'operational', 'marketing', 'staffing', 'technology'];
  const validSeverities = ['high', 'medium', 'low'];

  const validated: PainPoint[] = rawPainPoints
    .filter((pp: any) => pp && typeof pp === 'object')
    .map((pp: any) => ({
      id: typeof pp.id === 'string' ? toKebabCase(pp.id) : toKebabCase(pp.title || 'unknown-pain-point'),
      category: validCategories.includes(pp.category) ? pp.category : 'operational',
      title: typeof pp.title === 'string' ? pp.title : 'Unknown Pain Point',
      description: typeof pp.description === 'string' ? pp.description : '',
      severity: validSeverities.includes(pp.severity) ? pp.severity : 'medium',
      evidence: typeof pp.evidence === 'string' ? pp.evidence : 'Inferred from available data',
    }));

  // Sort by severity: high > medium > low
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  validated.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return validated;
}

/**
 * Validate and normalize audience profile
 */
function validateAudienceProfile(parsed: any, data: SocialAggregateResult): AudienceProfile {
  if (!parsed || typeof parsed !== 'object') {
    return buildFallbackAudienceProfile(data);
  }

  const validEngagement = ['high', 'medium', 'low'];
  const validFrequency = ['daily', 'weekly', 'monthly', 'sporadic'];

  return {
    totalFollowers: typeof parsed.totalFollowers === 'number'
      ? parsed.totalFollowers
      : data.totalFollowers,
    primaryPlatform: typeof parsed.primaryPlatform === 'string'
      ? parsed.primaryPlatform
      : determinePrimaryPlatform(data),
    engagementLevel: validEngagement.includes(parsed.engagementLevel)
      ? parsed.engagementLevel
      : determineEngagementLevel(data.avgEngagementRate),
    contentFrequency: validFrequency.includes(parsed.contentFrequency)
      ? parsed.contentFrequency
      : 'sporadic',
    audienceType: typeof parsed.audienceType === 'string'
      ? parsed.audienceType
      : 'local diners',
  };
}

/**
 * Build a fallback profile when Claude analysis fails
 */
function buildFallbackProfile(data: SocialAggregateResult): ProspectProfile {
  console.log('[ProspectAnalyzer] Building fallback profile from raw data...');

  return {
    personaType: 'chef-owner',
    cuisineTypes: inferCuisineTypes(data),
    restaurantCount: 1,
    contentThemes: inferContentThemes(data),
    brandVoice: 'Not enough data to determine',
    painPoints: getDefaultPainPoints(),
    techSavviness: inferTechSavviness(data),
    existingTools: inferExistingTools(data),
    audienceProfile: buildFallbackAudienceProfile(data),
    competitivePosition: 'Analysis unavailable — insufficient data or API error',
  };
}

// ============================================
// HELPER / INFERENCE FUNCTIONS
// ============================================

/**
 * Convert a string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Infer cuisine types from available data
 */
function inferCuisineTypes(data: SocialAggregateResult): string[] {
  const cuisines: string[] = [];

  if (data.googleMaps?.category) {
    // Extract cuisine from Google Maps category (e.g., "Thai restaurant" -> "Thai")
    const category = data.googleMaps.category.replace(/restaurant/i, '').trim();
    if (category) cuisines.push(category);
  }

  if (data.instagram?.bio) {
    // Common cuisine keywords
    const keywords = ['thai', 'italian', 'japanese', 'chinese', 'mexican', 'french', 'indian', 'korean', 'vietnamese', 'mediterranean', 'sushi', 'pizza', 'burger', 'seafood', 'bbq', 'vegan', 'fusion'];
    const bioLower = data.instagram.bio.toLowerCase();
    keywords.forEach((k) => {
      if (bioLower.includes(k) && !cuisines.map(c => c.toLowerCase()).includes(k)) {
        cuisines.push(k.charAt(0).toUpperCase() + k.slice(1));
      }
    });
  }

  return cuisines.length > 0 ? cuisines : ['General'];
}

/**
 * Infer content themes from available data
 */
function inferContentThemes(data: SocialAggregateResult): string[] {
  const themes: string[] = [];

  if (data.instagram && data.instagram.postsCount > 0) themes.push('food-photography');
  if (data.tiktok && data.tiktok.videoCount > 0) themes.push('short-form-video');
  if (data.youtube && data.youtube.videoCount > 0) themes.push('long-form-video');
  if (data.website) themes.push('web-presence');

  return themes.length > 0 ? themes : ['minimal-content'];
}

/**
 * Infer tech savviness from available data
 */
function inferTechSavviness(data: SocialAggregateResult): 'low' | 'medium' | 'high' {
  let score = 0;

  if (data.website) {
    score += 1;
    if (data.website.features.hasOnlineOrdering) score += 1;
    if (data.website.features.hasReservation) score += 1;
    if (data.website.features.hasLoyaltyProgram) score += 1;
    if (data.website.techStack.length > 2) score += 1;
  }

  if (data.activePlatforms.length >= 3) score += 1;
  if (data.totalFollowers > 10000) score += 1;

  if (score >= 5) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

/**
 * Infer existing tools from website tech stack and features
 */
function inferExistingTools(data: SocialAggregateResult): string[] {
  const tools: string[] = [];

  if (data.website?.techStack) {
    tools.push(...data.website.techStack);
  }

  if (data.website?.features.hasOnlineOrdering) tools.push('Online Ordering Platform');
  if (data.website?.features.hasReservation) tools.push('Reservation System');

  return tools;
}

/**
 * Build a fallback audience profile from raw data
 */
function buildFallbackAudienceProfile(data: SocialAggregateResult): AudienceProfile {
  return {
    totalFollowers: data.totalFollowers,
    primaryPlatform: determinePrimaryPlatform(data),
    engagementLevel: determineEngagementLevel(data.avgEngagementRate),
    contentFrequency: 'sporadic',
    audienceType: 'local diners',
  };
}

/**
 * Determine the primary social platform based on follower count
 */
function determinePrimaryPlatform(data: SocialAggregateResult): string {
  const platforms: { name: string; followers: number }[] = [];

  if (data.instagram) platforms.push({ name: 'instagram', followers: data.instagram.followers });
  if (data.tiktok) platforms.push({ name: 'tiktok', followers: data.tiktok.followers });
  if (data.youtube) platforms.push({ name: 'youtube', followers: data.youtube.subscribers });

  if (platforms.length === 0) return 'none';

  platforms.sort((a, b) => b.followers - a.followers);
  return platforms[0].name;
}

/**
 * Determine engagement level from average engagement rate
 */
function determineEngagementLevel(rate: number): 'high' | 'medium' | 'low' {
  if (rate >= 3.0) return 'high';
  if (rate >= 1.0) return 'medium';
  return 'low';
}

/**
 * Get default pain points when Claude analysis is unavailable
 */
function getDefaultPainPoints(): PainPoint[] {
  return [
    {
      id: 'food-cost-unknown',
      category: 'financial',
      title: 'Food Cost Visibility',
      description: 'Unable to determine if food costs are being tracked effectively. Most independent restaurants lack real-time food cost monitoring.',
      severity: 'high',
      evidence: 'No food cost management tools detected in tech stack or website',
    },
    {
      id: 'labor-cost-high',
      category: 'staffing',
      title: 'Labor Cost Management',
      description: 'Labor scheduling and cost optimization tools not detected. Industry average labor cost runs 28-35%.',
      severity: 'high',
      evidence: 'No labor management or scheduling platform detected',
    },
    {
      id: 'inconsistent-social-media',
      category: 'marketing',
      title: 'Inconsistent Social Media Presence',
      description: 'Social media posting appears irregular, potentially leaving engagement and reach on the table.',
      severity: 'medium',
      evidence: 'Based on available social data and content frequency patterns',
    },
    {
      id: 'no-loyalty-program',
      category: 'marketing',
      title: 'No Loyalty or Retention Program',
      description: 'No loyalty or rewards program detected. Repeat customer programs typically increase visit frequency by 20-30%.',
      severity: 'medium',
      evidence: 'No loyalty program found on website or social profiles',
    },
    {
      id: 'manual-inventory',
      category: 'operational',
      title: 'Manual Inventory Processes',
      description: 'No inventory management system detected. Manual processes lead to over-ordering and waste.',
      severity: 'medium',
      evidence: 'No inventory management tools found in tech stack',
    },
  ];
}
