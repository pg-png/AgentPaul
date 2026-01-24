/**
 * Handler Tests
 * Tests for action handling logic
 */

import { handleAction, getPageSummary } from '../src/bot/handler';
import { PageData } from '../src/generator';
import { InterpretedAction } from '../src/bot/interpreter';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock data for testing
const mockPageData: PageData = {
  name: 'Chez Marco',
  slug: 'chez-marco',
  tagline: 'La vraie cuisine italienne',
  description: 'Un restaurant familial au coeur de Montreal',
  address: '123 Rue Saint-Denis, Montreal',
  phone: '514-555-1234',
  hours: ['Lundi-Vendredi: 11h-22h', 'Samedi-Dimanche: 10h-23h'],
  rating: 4.5,
  reviewCount: 250,
  website: 'https://chezmarco.com',
  heroTitle: 'Chez Marco',
  heroImage: '/images/hero.jpg',
  ctaText: 'Reserver',
  photos: [],
  menuHighlights: [
    { name: 'Pizza Margherita', price: '18$' },
    { name: 'Lasagne maison', price: '22$' }
  ],
  reviews: [],
  primaryColor: '#2E7D32',
  accentColor: '#E74C3C'
};

describe('handleAction', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-paul-test-'));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  test('should update hero title', async () => {
    const action: InterpretedAction = {
      action: 'update_hero_title',
      params: { title: 'Bienvenue chez Marco' },
      confirmation: 'Titre mis à jour!'
    };

    const result = await handleAction(action, mockPageData, tempDir);

    expect(result.success).toBe(true);
    expect(result.updatedData?.heroTitle).toBe('Bienvenue chez Marco');
  });

  test('should add menu item', async () => {
    const action: InterpretedAction = {
      action: 'add_menu_item',
      params: { name: 'Tiramisu', price: '12$', description: 'Dessert classique' },
      confirmation: 'Plat ajouté!'
    };

    const result = await handleAction(action, mockPageData, tempDir);

    expect(result.success).toBe(true);
    expect(result.updatedData?.menuHighlights.length).toBe(3);
    expect(result.updatedData?.menuHighlights[2].name).toBe('Tiramisu');
  });

  test('should remove menu item', async () => {
    const action: InterpretedAction = {
      action: 'remove_menu_item',
      params: { name: 'Pizza' },
      confirmation: 'Plat retiré!'
    };

    const result = await handleAction(action, mockPageData, tempDir);

    expect(result.success).toBe(true);
    expect(result.updatedData?.menuHighlights.length).toBe(1);
  });

  test('should update colors', async () => {
    const action: InterpretedAction = {
      action: 'update_colors',
      params: { primaryColor: '#C41E3A', accentColor: '#FFD700' },
      confirmation: 'Couleurs mises à jour!'
    };

    const result = await handleAction(action, mockPageData, tempDir);

    expect(result.success).toBe(true);
    expect(result.updatedData?.primaryColor).toBe('#C41E3A');
    expect(result.updatedData?.accentColor).toBe('#FFD700');
  });

  test('should add event', async () => {
    const action: InterpretedAction = {
      action: 'add_event',
      params: { title: 'Soirée St-Valentin', description: 'Menu spécial', date: '14 février' },
      confirmation: 'Événement ajouté!'
    };

    const result = await handleAction(action, mockPageData, tempDir);

    expect(result.success).toBe(true);
    expect(result.updatedData?.event?.title).toBe('Soirée St-Valentin');
  });

  test('should request photo when update_photo action', async () => {
    const action: InterpretedAction = {
      action: 'update_photo',
      params: { type: 'hero' },
      confirmation: 'Envoie-moi la photo!'
    };

    const result = await handleAction(action, mockPageData, tempDir);

    expect(result.requiresPhoto).toBe(true);
    expect(result.photoType).toBe('hero');
  });

  test('should return failure for unknown action', async () => {
    const action: InterpretedAction = {
      action: 'unknown',
      params: { originalMessage: 'test' },
      confirmation: 'Je ne comprends pas'
    };

    const result = await handleAction(action, mockPageData, tempDir);

    expect(result.success).toBe(false);
  });
});

describe('getPageSummary', () => {
  test('should generate page summary', () => {
    const summary = getPageSummary(mockPageData);

    expect(summary).toContain('Chez Marco');
    expect(summary).toContain('Pizza Margherita');
    expect(summary).toContain('18$');
    expect(summary).toContain('Reserver');
  });
});
