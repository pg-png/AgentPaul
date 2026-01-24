/**
 * Interpreter Tests
 * Tests for natural language command interpretation
 */

import { interpretMessage } from '../src/bot/interpreter';
import { PageData } from '../src/generator';

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

describe('interpretMessage', () => {
  // Note: These tests require ANTHROPIC_API_KEY to be set
  // Skip if not available
  const apiKey = process.env.ANTHROPIC_API_KEY;

  beforeAll(() => {
    if (!apiKey) {
      console.log('Skipping interpreter tests - ANTHROPIC_API_KEY not set');
    }
  });

  (apiKey ? test : test.skip)('should interpret title update request', async () => {
    const result = await interpretMessage(
      'Change le titre pour Bienvenue chez Marco',
      mockPageData
    );

    expect(result.action).toBe('update_hero_title');
    expect(result.params.title).toContain('Marco');
  }, 30000);

  (apiKey ? test : test.skip)('should interpret menu addition', async () => {
    const result = await interpretMessage(
      'Ajoute la pizza pepperoni à 20$',
      mockPageData
    );

    expect(result.action).toBe('add_menu_item');
    expect(result.params.name).toBeDefined();
    expect(result.params.price).toBeDefined();
  }, 30000);

  (apiKey ? test : test.skip)('should interpret color change', async () => {
    const result = await interpretMessage(
      'Je veux du rouge comme couleur principale',
      mockPageData
    );

    expect(result.action).toBe('update_colors');
    expect(result.params.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  }, 30000);

  (apiKey ? test : test.skip)('should return unknown for gibberish', async () => {
    const result = await interpretMessage(
      'asdfghjkl qwerty',
      mockPageData
    );

    expect(result.action).toBe('unknown');
  }, 30000);
});
