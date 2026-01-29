/**
 * Product Catalog
 * WwithAI product definitions for prospect matching
 */

import { WwithAIProduct } from './demo-types';

export interface WwithAIProductWithTrial extends WwithAIProduct {
  trialUrl?: string;
}

export const PRODUCT_CATALOG: WwithAIProductWithTrial[] = [
  {
    id: 'food-cost',
    name: 'Food Cost Sentinel',
    tagline: 'Know your real food cost — in real time',
    description: 'AI-powered food cost tracking that connects to your invoices and POS. Get instant alerts when costs spike, track ingredient prices, and optimize your menu pricing automatically.',
    keyBenefits: [
      'Real-time food cost tracking per dish',
      'Automatic invoice scanning & price alerts',
      'Menu engineering recommendations',
      'Waste reduction insights',
      'Vendor price comparison',
    ],
    painPointsAddressed: [
      'food-cost-unknown',
      'food-cost-high',
      'no-recipe-costing',
      'invoice-tracking-manual',
      'menu-pricing-guesswork',
      'food-waste',
    ],
    idealFor: ['chef-owner', 'multi-unit-operator', 'franchise-owner'],
    roiMetric: '2-5% food cost reduction = $2,000-$8,000/month saved',
    icon: '🍽️',
    color: '#00e5ff',
    screenshotUrl: '/screenshots/food-cost-sentinel.png',
    trialUrl: 'https://chatgpt.com/g/g-recipe-costing-wwithai',
  },
  {
    id: 'labor-control',
    name: 'Labor Control',
    tagline: 'Staff smarter, spend less',
    description: 'Connect your scheduling and POS to monitor labor cost in real time. Get alerts when SPLH drops, optimize shift scheduling, and prevent overtime before it happens.',
    keyBenefits: [
      'Real-time labor % vs target',
      'SPLH tracking per shift',
      'Overtime prevention alerts',
      'Schedule vs actual comparison',
      'Weekly performance reports',
    ],
    painPointsAddressed: [
      'labor-cost-high',
      'scheduling-inefficient',
      'splh-low',
      'overtime-uncontrolled',
      'no-labor-tracking',
    ],
    idealFor: ['multi-unit-operator', 'corporate-operator', 'franchise-owner'],
    roiMetric: '1-3% labor cost reduction = $1,500-$6,000/month saved',
    icon: '👥',
    color: '#7c4dff',
    screenshotUrl: '/screenshots/labor-control.png',
    trialUrl: 'https://chatgpt.com/g/g-financial-health-check-wwithai',
  },
  {
    id: 'ceo-dashboard',
    name: 'CEO Dashboard',
    tagline: 'Your empire at a glance',
    description: 'One dashboard to see all your restaurants. Revenue, costs, performance, alerts — everything you need to make decisions without digging through spreadsheets.',
    keyBenefits: [
      'Multi-location overview',
      'Real-time financial KPIs',
      'Automated daily/weekly reports',
      'Alert system for anomalies',
      'Mobile-friendly design',
    ],
    painPointsAddressed: [
      'no-unified-view',
      'manual-reporting',
      'spreadsheet-overload',
      'multi-unit-complexity',
      'decision-making-slow',
    ],
    idealFor: ['multi-unit-operator', 'corporate-operator', 'franchise-owner'],
    roiMetric: 'Save 10+ hours/week on reporting + faster decision-making',
    icon: '📊',
    color: '#00e676',
    screenshotUrl: '/screenshots/ceo-dashboard.png',
    trialUrl: 'https://calendly.com/wwithai/demo',
  },
  {
    id: 'voice-agent',
    name: 'Voice Agent',
    tagline: 'Never miss a call again',
    description: 'AI phone agent that answers calls 24/7, takes reservations, handles FAQs, and routes urgent calls to you. Speaks multiple languages and learns your restaurant.',
    keyBenefits: [
      '24/7 phone coverage',
      'Reservation booking',
      'FAQ handling (hours, menu, events)',
      'Urgent call routing',
      'Call transcripts & analytics',
    ],
    painPointsAddressed: [
      'missed-calls',
      'phone-interruptions',
      'reservation-management',
      'after-hours-calls',
      'language-barrier',
    ],
    idealFor: ['chef-owner', 'multi-unit-operator', 'influencer-restaurateur'],
    roiMetric: 'Capture 20-40 missed calls/week = $3,000-$8,000/month in recovered revenue',
    icon: '📞',
    color: '#ff9100',
    screenshotUrl: '/screenshots/voice-agent.png',
    trialUrl: 'https://calendly.com/wwithai/demo',
  },
  {
    id: 'morning-coach',
    name: 'Morning Coach',
    tagline: 'Start every day with a game plan',
    description: 'AI-powered daily briefing delivered to your phone each morning. Yesterday\'s numbers, today\'s priorities, staff updates, and actionable insights — before you even get to the restaurant.',
    keyBenefits: [
      'Daily performance summary',
      'Priority action items',
      'Staff & schedule overview',
      'Weather & event impact predictions',
      'Customizable per restaurant',
    ],
    painPointsAddressed: [
      'no-morning-routine',
      'reactive-management',
      'information-overload',
      'no-daily-kpis',
      'missing-context',
    ],
    idealFor: ['chef-owner', 'multi-unit-operator', 'influencer-restaurateur'],
    roiMetric: 'Transform reactive to proactive management — catch issues before they cost you',
    icon: '🌅',
    color: '#ff6d00',
    screenshotUrl: '/screenshots/morning-coach.png',
    trialUrl: 'https://calendly.com/wwithai/demo',
  },
  {
    id: 'content-pipeline',
    name: 'Content Pipeline',
    tagline: 'Restaurant content on autopilot',
    description: 'AI generates social media content from your menu, photos, and brand. Instagram posts, TikTok scripts, review responses — scheduled and ready to publish.',
    keyBenefits: [
      'AI-generated posts & captions',
      'Brand-consistent visual templates',
      'Multi-platform scheduling',
      'Review response drafting',
      'Content calendar management',
    ],
    painPointsAddressed: [
      'no-content-strategy',
      'content-creation-time',
      'inconsistent-posting',
      'social-media-overwhelm',
      'review-responses-slow',
    ],
    idealFor: ['chef-owner', 'influencer-restaurateur', 'franchise-owner'],
    roiMetric: 'Save 15+ hours/week on content creation + 30-50% more engagement',
    icon: '📱',
    color: '#d500f9',
    screenshotUrl: '/screenshots/content-pipeline.png',
    trialUrl: 'https://calendly.com/wwithai/demo',
  },
];

/**
 * Get all products
 */
export function getAllProducts(): WwithAIProductWithTrial[] {
  return PRODUCT_CATALOG;
}

/**
 * Get product by ID
 */
export function getProductById(id: string): WwithAIProduct | undefined {
  return PRODUCT_CATALOG.find(p => p.id === id);
}

/**
 * Get products that address specific pain points
 */
export function getProductsForPainPoints(painPointIds: string[]): WwithAIProduct[] {
  return PRODUCT_CATALOG.filter(p =>
    p.painPointsAddressed.some(pp => painPointIds.includes(pp))
  );
}
