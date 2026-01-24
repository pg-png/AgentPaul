/**
 * Conversation State Machine
 * Manages user flow through the bot
 */

import { PageData } from '../generator';
import { RestaurantData } from '../scraper';

// Conversation states
export type ConversationState =
  | 'IDLE'              // Nothing in progress
  | 'AWAITING_NAME'     // Waiting for restaurant name
  | 'AWAITING_CITY'     // Waiting for city
  | 'CONFIRMING'        // Confirming Google result
  | 'CHOOSING_STYLE'    // Choosing vibe
  | 'GENERATING'        // Generating page
  | 'READY'             // Page ready, edit mode
  | 'AWAITING_PHOTO'    // Waiting for photos
  | 'MODIFYING';        // Processing modification

// Style options
export type StyleChoice = 'elegant' | 'casual' | 'trendy' | 'familial';

// User session data
export interface UserSession {
  state: ConversationState;
  restaurantName?: string;
  city?: string;
  style?: StyleChoice;
  scrapedData?: RestaurantData;
  pageData?: PageData;
  pageSlug?: string;
  outputDir?: string;

  // Photo upload tracking
  photos?: string[];
  expectedPhotos?: number;

  // Confirmation tracking
  awaitingConfirmation?: string;

  // Timestamp for session timeout
  lastActivity: number;
}

// Session storage
const sessions: Map<number, UserSession> = new Map();

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Get or create user session
 */
export function getSession(userId: number): UserSession {
  let session = sessions.get(userId);

  // Check for stale session
  if (session && Date.now() - session.lastActivity > SESSION_TIMEOUT) {
    // Reset to IDLE but keep page data
    session = {
      state: 'IDLE',
      pageSlug: session.pageSlug,
      pageData: session.pageData,
      lastActivity: Date.now()
    };
    sessions.set(userId, session);
  }

  if (!session) {
    session = {
      state: 'IDLE',
      lastActivity: Date.now()
    };
    sessions.set(userId, session);
  }

  return session;
}

/**
 * Update session
 */
export function updateSession(userId: number, updates: Partial<UserSession>): UserSession {
  const session = getSession(userId);
  const updated = {
    ...session,
    ...updates,
    lastActivity: Date.now()
  };
  sessions.set(userId, updated);
  return updated;
}

/**
 * Transition to new state
 */
export function transitionTo(userId: number, newState: ConversationState, data?: Partial<UserSession>): UserSession {
  console.log(`[Conversation] User ${userId}: ${getSession(userId).state} → ${newState}`);
  return updateSession(userId, { ...data, state: newState });
}

/**
 * Reset session (keep page data)
 */
export function resetSession(userId: number): UserSession {
  const current = sessions.get(userId);
  return updateSession(userId, {
    state: 'IDLE',
    restaurantName: undefined,
    city: undefined,
    style: undefined,
    scrapedData: undefined,
    photos: undefined,
    expectedPhotos: undefined,
    awaitingConfirmation: undefined,
    // Keep these
    pageSlug: current?.pageSlug,
    pageData: current?.pageData,
    outputDir: current?.outputDir
  });
}

/**
 * Clear entire session
 */
export function clearSession(userId: number): void {
  sessions.delete(userId);
}

/**
 * Check if user has an active page
 */
export function hasActivePage(userId: number): boolean {
  const session = getSession(userId);
  return !!session.pageSlug;
}

/**
 * Get state display name (for debugging)
 */
export function getStateName(state: ConversationState): string {
  const names: Record<ConversationState, string> = {
    IDLE: 'En attente',
    AWAITING_NAME: 'Attend nom',
    AWAITING_CITY: 'Attend ville',
    CONFIRMING: 'Confirmation',
    CHOOSING_STYLE: 'Choix style',
    GENERATING: 'Generation',
    READY: 'Pret',
    AWAITING_PHOTO: 'Attend photo',
    MODIFYING: 'Modification'
  };
  return names[state];
}

/**
 * Check if message looks like a restaurant name (not a command)
 */
export function looksLikeRestaurantName(text: string): boolean {
  // Not a command
  if (text.startsWith('/')) return false;

  // Not a simple response
  const simpleResponses = ['oui', 'non', 'ok', 'yes', 'no', 'merci', 'thanks'];
  if (simpleResponses.includes(text.toLowerCase().trim())) return false;

  // Has some substance (2+ chars)
  if (text.trim().length < 2) return false;

  // Looks like a modification request
  const modificationKeywords = ['change', 'modifie', 'ajoute', 'enleve', 'supprime', 'met', 'remplace'];
  if (modificationKeywords.some(k => text.toLowerCase().includes(k))) return false;

  return true;
}

/**
 * Check if message looks like a city name
 */
export function looksLikeCityName(text: string): boolean {
  // Not a command
  if (text.startsWith('/')) return false;

  // Not a simple yes/no
  const yesNo = ['oui', 'non', 'ok', 'yes', 'no'];
  if (yesNo.includes(text.toLowerCase().trim())) return false;

  // Has some substance (2+ chars)
  if (text.trim().length < 2) return false;

  return true;
}

/**
 * Check if message is a confirmation
 */
export function isConfirmation(text: string): boolean {
  const confirmations = ['oui', 'yes', 'ok', 'c\'est ca', 'c\'est ça', 'correct', 'exact', 'parfait', 'bien'];
  return confirmations.some(c => text.toLowerCase().includes(c));
}

/**
 * Check if message is a denial
 */
export function isDenial(text: string): boolean {
  const denials = ['non', 'no', 'pas ca', 'pas ça', 'pas le bon', 'autre', 'different'];
  return denials.some(d => text.toLowerCase().includes(d));
}

/**
 * Extract style from button callback or text
 */
export function extractStyle(text: string): StyleChoice | null {
  const lower = text.toLowerCase();

  if (lower.includes('elegant') || lower.includes('élégant') || lower.includes('chic')) {
    return 'elegant';
  }
  if (lower.includes('casual') || lower.includes('decontract') || lower.includes('relax')) {
    return 'casual';
  }
  if (lower.includes('trendy') || lower.includes('branch') || lower.includes('modern')) {
    return 'trendy';
  }
  if (lower.includes('famili') || lower.includes('tradition') || lower.includes('chaleur')) {
    return 'familial';
  }

  return null;
}

// Debug: get all sessions
export function getAllSessions(): Map<number, UserSession> {
  return sessions;
}
