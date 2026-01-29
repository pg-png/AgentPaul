/**
 * Demo Types
 * Shared type definitions for the prospect demo generation pipeline
 */

// ============================================
// PROSPECT ANALYSIS TYPES
// ============================================

export interface ProspectProfile {
  personaType: 'chef-owner' | 'multi-unit-operator' | 'influencer-restaurateur' | 'corporate-operator' | 'franchise-owner';
  cuisineTypes: string[];
  restaurantCount: number;
  contentThemes: string[];
  brandVoice: string;
  painPoints: PainPoint[];
  techSavviness: 'low' | 'medium' | 'high';
  existingTools: string[];
  audienceProfile: AudienceProfile;
  competitivePosition: string;
}

export interface PainPoint {
  id: string;
  category: 'financial' | 'operational' | 'marketing' | 'staffing' | 'technology';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
}

export interface AudienceProfile {
  totalFollowers: number;
  primaryPlatform: string;
  engagementLevel: 'high' | 'medium' | 'low';
  contentFrequency: 'daily' | 'weekly' | 'monthly' | 'sporadic';
  audienceType: string;
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface WwithAIProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  keyBenefits: string[];
  painPointsAddressed: string[];
  idealFor: string[];
  roiMetric: string;
  icon: string;
  color: string;
  screenshotUrl: string;
}

export interface ProductMatch {
  product: WwithAIProduct;
  score: number;
  personalizedPitch: string;
  estimatedROI: string;
  painPointsMatched: string[];
}

// ============================================
// FINANCIAL ESTIMATION TYPES
// ============================================

export interface FinancialEstimate {
  segment: 'fine-dining' | 'casual-dining' | 'fast-casual' | 'qsr' | 'cafe-bar';
  estimatedRevenue: number;
  foodCostPercent: number;
  laborCostPercent: number;
  rentPercent: number;
  profitMargin: number;
  avgTicket: number;
  coversPerDay: number;
  tipsMonthly: number;
  splh: number;
  monthlyData: MonthlyDataPoint[];
  roiWithWwithAI: ROIEstimate;
  disclaimer: string;
}

export interface MonthlyDataPoint {
  month: string;
  revenue: number;
  foodCost: number;
  laborCost: number;
  profit: number;
}

export interface ROIEstimate {
  totalAnnualSavings: number;
  foodCostSavings: number;
  laborSavings: number;
  revenueLift: number;
  paybackMonths: number;
  breakdown: ROIBreakdownItem[];
}

export interface ROIBreakdownItem {
  productId: string;
  productName: string;
  annualSaving: number;
  description: string;
}

// ============================================
// DEMO PAGE DATA
// ============================================

export interface DemoPageData {
  // Prospect info
  prospectName: string;
  prospectSlug: string;
  companyName: string;
  profilePicUrl: string;

  // Social stats
  socialStats: {
    platform: string;
    handle: string;
    followers: number;
    icon: string;
  }[];
  totalFollowers: number;

  // Restaurant info
  restaurantCount: number;
  restaurantName: string;
  rating: number;
  reviewCount: number;
  cuisineType: string;
  city: string;
  address: string;
  restaurantPhotos: string[];

  // Financial data
  financials: FinancialEstimate;

  // AI Analysis
  painPoints: PainPoint[];
  reviewInsights: string[];
  operationInsights: string[];

  // Product recommendations
  products: ProductMatch[];

  // ROI Summary
  totalROI: ROIEstimate;

  // CTA
  ctaText: string;
  calendlyUrl: string;

  // Generation metadata
  generatedAt: string;
  disclaimer: string;
}
