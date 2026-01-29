/**
 * Financial Estimator
 * Uses Claude to estimate financial data for a restaurant prospect
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  FinancialEstimate,
  MonthlyDataPoint,
  ROIEstimate,
  ROIBreakdownItem,
  ProspectProfile,
  ProductMatch,
} from './demo-types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// INDUSTRY BENCHMARKS BY SEGMENT
// ============================================

interface SegmentBenchmark {
  revenueMin: number;
  revenueMax: number;
  foodCostMin: number;
  foodCostMax: number;
  laborCostMin: number;
  laborCostMax: number;
  rentMin: number;
  rentMax: number;
  profitMin: number;
  profitMax: number;
}

const INDUSTRY_BENCHMARKS: Record<string, SegmentBenchmark> = {
  'fine-dining': {
    revenueMin: 80000,
    revenueMax: 150000,
    foodCostMin: 28,
    foodCostMax: 35,
    laborCostMin: 30,
    laborCostMax: 35,
    rentMin: 8,
    rentMax: 12,
    profitMin: 5,
    profitMax: 12,
  },
  'casual-dining': {
    revenueMin: 50000,
    revenueMax: 100000,
    foodCostMin: 28,
    foodCostMax: 32,
    laborCostMin: 28,
    laborCostMax: 33,
    rentMin: 8,
    rentMax: 10,
    profitMin: 8,
    profitMax: 15,
  },
  'fast-casual': {
    revenueMin: 40000,
    revenueMax: 80000,
    foodCostMin: 25,
    foodCostMax: 30,
    laborCostMin: 25,
    laborCostMax: 30,
    rentMin: 8,
    rentMax: 12,
    profitMin: 10,
    profitMax: 18,
  },
  'qsr': {
    revenueMin: 30000,
    revenueMax: 70000,
    foodCostMin: 22,
    foodCostMax: 28,
    laborCostMin: 22,
    laborCostMax: 28,
    rentMin: 6,
    rentMax: 10,
    profitMin: 12,
    profitMax: 20,
  },
  'cafe-bar': {
    revenueMin: 25000,
    revenueMax: 60000,
    foodCostMin: 20,
    foodCostMax: 28,
    laborCostMin: 25,
    laborCostMax: 32,
    rentMin: 8,
    rentMax: 12,
    profitMin: 8,
    profitMax: 15,
  },
};

// ============================================
// SEASONAL VARIATION FACTORS
// ============================================

const SEASONAL_FACTORS: Record<string, number> = {
  Jan: 0.85,
  Feb: 0.87,
  Mar: 0.95,
  Apr: 1.00,
  May: 1.05,
  Jun: 1.10,
  Jul: 1.12,
  Aug: 1.08,
  Sep: 1.02,
  Oct: 0.98,
  Nov: 1.05,
  Dec: 1.15,
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ============================================
// MAIN ESTIMATION FUNCTION
// ============================================

/**
 * Estimate financial data for a restaurant prospect using Claude and industry benchmarks
 */
export async function estimateFinancials(
  profile: ProspectProfile,
  products: ProductMatch[],
  gmapsData?: any
): Promise<FinancialEstimate> {
  console.log('[FinancialEstimator] Starting financial estimation...');
  console.log(`[FinancialEstimator] Cuisine types: ${profile.cuisineTypes.join(', ')}`);
  console.log(`[FinancialEstimator] Restaurant count: ${profile.restaurantCount}`);

  // Step 1: Ask Claude to determine the segment and estimate key metrics
  const claudeEstimate = await getClaudeEstimate(profile, gmapsData);
  console.log(`[FinancialEstimator] Claude determined segment: ${claudeEstimate.segment}`);

  // Step 2: Generate 12 months of data with seasonal variation
  console.log('[FinancialEstimator] Generating monthly data with seasonal variation...');
  const monthlyData = generateMonthlyData(claudeEstimate);

  // Step 3: Calculate ROI per matched product
  console.log(`[FinancialEstimator] Calculating ROI for ${products.length} matched products...`);
  const roiEstimate = calculateROI(claudeEstimate, products);

  // Step 4: Build the final estimate
  const disclaimer =
    'These figures are AI-generated estimates for illustration purposes. Actual results will vary based on your specific operation.';

  const rentCostPercent = claudeEstimate.rentPercent;
  const otherCostPercent = Math.round((100 - claudeEstimate.foodCostPercent - claudeEstimate.laborCostPercent - rentCostPercent - claudeEstimate.profitMargin) * 10) / 10;

  const estimate: FinancialEstimate = {
    segment: claudeEstimate.segment,
    estimatedRevenue: claudeEstimate.monthlyRevenue,
    foodCostPercent: claudeEstimate.foodCostPercent,
    laborCostPercent: claudeEstimate.laborCostPercent,
    rentPercent: claudeEstimate.rentPercent,
    rentCostPercent,
    otherCostPercent: Math.max(otherCostPercent, 5),
    profitMargin: claudeEstimate.profitMargin,
    avgTicket: claudeEstimate.avgTicket,
    coversPerDay: claudeEstimate.coversPerDay,
    tipsMonthly: claudeEstimate.tipsMonthly,
    splh: claudeEstimate.splh,
    monthlyData,
    roiWithWwithAI: roiEstimate,
    disclaimer,
  };

  console.log('[FinancialEstimator] Financial estimation complete.');
  console.log(`[FinancialEstimator] Estimated monthly revenue: $${estimate.estimatedRevenue.toLocaleString()}`);
  console.log(`[FinancialEstimator] Total annual ROI: $${roiEstimate.totalAnnualSavings.toLocaleString()}`);

  return estimate;
}

// ============================================
// CLAUDE ESTIMATION
// ============================================

interface ClaudeEstimateResult {
  segment: FinancialEstimate['segment'];
  monthlyRevenue: number;
  foodCostPercent: number;
  laborCostPercent: number;
  rentPercent: number;
  profitMargin: number;
  avgTicket: number;
  coversPerDay: number;
  tipsMonthly: number;
  splh: number;
}

/**
 * Ask Claude to analyze the prospect and estimate financial metrics
 */
async function getClaudeEstimate(
  profile: ProspectProfile,
  gmapsData?: any
): Promise<ClaudeEstimateResult> {
  console.log('[FinancialEstimator] Asking Claude for financial estimates...');

  const benchmarkSummary = Object.entries(INDUSTRY_BENCHMARKS)
    .map(([seg, b]) =>
      `- ${seg}: revenue $${b.revenueMin / 1000}K-$${b.revenueMax / 1000}K/mo, food cost ${b.foodCostMin}-${b.foodCostMax}%, labor ${b.laborCostMin}-${b.laborCostMax}%, rent ${b.rentMin}-${b.rentMax}%, profit ${b.profitMin}-${b.profitMax}%`
    )
    .join('\n');

  const gmapsContext = gmapsData
    ? `
Google Maps Data:
- Name: ${gmapsData.name || 'N/A'}
- Rating: ${gmapsData.rating || 'N/A'} (${gmapsData.reviewCount || 'N/A'} reviews)
- Price level: ${gmapsData.priceLevel || 'N/A'}
- Address: ${gmapsData.address || 'N/A'}
- Category: ${gmapsData.category || 'N/A'}
`
    : 'No Google Maps data available.';

  const prompt = `You are a restaurant financial analyst. Based on the following prospect profile and any available data, determine the restaurant segment and estimate key financial metrics.

Prospect Profile:
- Persona: ${profile.personaType}
- Cuisine: ${profile.cuisineTypes.join(', ')}
- Number of restaurants: ${profile.restaurantCount}
- Tech savviness: ${profile.techSavviness}
- Existing tools: ${profile.existingTools.join(', ') || 'None mentioned'}
- Competitive position: ${profile.competitivePosition}
- Brand voice: ${profile.brandVoice}
- Pain points: ${profile.painPoints.map(pp => `${pp.title} (${pp.severity})`).join(', ')}

${gmapsContext}

Industry Benchmarks:
${benchmarkSummary}

Based on all available information, provide your best estimate. Return ONLY a valid JSON object with these fields:
{
  "segment": "fine-dining" | "casual-dining" | "fast-casual" | "qsr" | "cafe-bar",
  "monthlyRevenue": <number>,
  "foodCostPercent": <number>,
  "laborCostPercent": <number>,
  "rentPercent": <number>,
  "profitMargin": <number>,
  "avgTicket": <number>,
  "coversPerDay": <number>,
  "tipsMonthly": <number>,
  "splh": <number>
}

Reasoning guidelines:
- Choose the segment that best fits the cuisine, persona, and price indicators
- Revenue should be within the benchmark range, adjusted for restaurant count and positioning
- Food cost and labor should reflect the cuisine type (e.g., fine dining has higher labor, QSR has lower food cost)
- Average ticket should be realistic for the segment
- Covers per day should align with revenue / avg ticket / 30 days
- Tips should be estimated as ~15-20% of revenue for full-service, less for QSR
- SPLH (Sales Per Labor Hour) should be realistic: $55-80 for full-service, $80-120 for QSR/fast-casual
- Return ONLY the JSON, no explanation.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedText);
    console.log('[FinancialEstimator] Claude estimation received successfully');

    // Validate segment
    const validSegments: FinancialEstimate['segment'][] = [
      'fine-dining', 'casual-dining', 'fast-casual', 'qsr', 'cafe-bar',
    ];
    const segment = validSegments.includes(parsed.segment) ? parsed.segment : 'casual-dining';
    const benchmark = INDUSTRY_BENCHMARKS[segment];

    // Clamp values to reasonable ranges using benchmarks
    return {
      segment,
      monthlyRevenue: clamp(parsed.monthlyRevenue, benchmark.revenueMin * 0.8, benchmark.revenueMax * 1.3),
      foodCostPercent: clamp(parsed.foodCostPercent, benchmark.foodCostMin - 3, benchmark.foodCostMax + 3),
      laborCostPercent: clamp(parsed.laborCostPercent, benchmark.laborCostMin - 3, benchmark.laborCostMax + 3),
      rentPercent: clamp(parsed.rentPercent, benchmark.rentMin - 2, benchmark.rentMax + 2),
      profitMargin: clamp(parsed.profitMargin, benchmark.profitMin - 3, benchmark.profitMax + 5),
      avgTicket: clamp(parsed.avgTicket, 8, 200),
      coversPerDay: clamp(parsed.coversPerDay, 20, 800),
      tipsMonthly: clamp(parsed.tipsMonthly, 0, 50000),
      splh: clamp(parsed.splh, 30, 150),
    };
  } catch (error) {
    console.error('[FinancialEstimator] Claude estimation failed, using fallback:', error);
    return buildFallbackEstimate(profile);
  }
}

/**
 * Build a fallback estimate when Claude API fails
 */
function buildFallbackEstimate(profile: ProspectProfile): ClaudeEstimateResult {
  console.log('[FinancialEstimator] Using fallback estimation based on profile heuristics');

  // Simple heuristic: pick segment based on persona and cuisine
  let segment: FinancialEstimate['segment'] = 'casual-dining';
  if (profile.personaType === 'corporate-operator' || profile.personaType === 'franchise-owner') {
    segment = 'fast-casual';
  } else if (profile.personaType === 'chef-owner' && profile.brandVoice.toLowerCase().includes('fine')) {
    segment = 'fine-dining';
  } else if (profile.cuisineTypes.some(c => c.toLowerCase().includes('coffee') || c.toLowerCase().includes('bar'))) {
    segment = 'cafe-bar';
  }

  const benchmark = INDUSTRY_BENCHMARKS[segment];
  const midRevenue = Math.round((benchmark.revenueMin + benchmark.revenueMax) / 2);
  const midFoodCost = (benchmark.foodCostMin + benchmark.foodCostMax) / 2;
  const midLaborCost = (benchmark.laborCostMin + benchmark.laborCostMax) / 2;
  const midRent = (benchmark.rentMin + benchmark.rentMax) / 2;
  const midProfit = (benchmark.profitMin + benchmark.profitMax) / 2;
  const seg: string = segment;
  const avgTicket = seg === 'fine-dining' ? 75 : seg === 'casual-dining' ? 35 : seg === 'fast-casual' ? 18 : seg === 'qsr' ? 12 : 22;
  const coversPerDay = Math.round(midRevenue / avgTicket / 30);
  const tipsMonthly = seg === 'qsr' ? Math.round(midRevenue * 0.05) : Math.round(midRevenue * 0.17);
  const splh = seg === 'qsr' || seg === 'fast-casual' ? 90 : 65;

  return {
    segment,
    monthlyRevenue: midRevenue,
    foodCostPercent: Math.round(midFoodCost * 10) / 10,
    laborCostPercent: Math.round(midLaborCost * 10) / 10,
    rentPercent: Math.round(midRent * 10) / 10,
    profitMargin: Math.round(midProfit * 10) / 10,
    avgTicket,
    coversPerDay,
    tipsMonthly,
    splh,
  };
}

// ============================================
// MONTHLY DATA GENERATION
// ============================================

/**
 * Generate 12 months of financial data with seasonal variation
 * Dips in Jan/Feb, peaks in summer and holidays (Dec)
 */
function generateMonthlyData(estimate: ClaudeEstimateResult): MonthlyDataPoint[] {
  const monthlyData: MonthlyDataPoint[] = [];

  for (let i = 0; i < 12; i++) {
    const monthName = MONTH_NAMES[i];
    const seasonalFactor = SEASONAL_FACTORS[monthName];

    // Apply seasonal variation to revenue
    const revenue = Math.round(estimate.monthlyRevenue * seasonalFactor);

    // Costs are somewhat sticky but also flex with revenue
    // Food cost scales closely with revenue
    const foodCost = Math.round(revenue * (estimate.foodCostPercent / 100));

    // Labor is stickier - doesn't drop as much in slow months
    const laborFactor = 1 + (seasonalFactor - 1) * 0.5; // Half the seasonal swing
    const laborCost = Math.round(estimate.monthlyRevenue * (estimate.laborCostPercent / 100) * laborFactor);

    // Profit is what's left after costs
    const rentCost = Math.round(estimate.monthlyRevenue * (estimate.rentPercent / 100)); // Rent is fixed
    const otherCosts = Math.round(revenue * 0.08); // Utilities, supplies, misc ~8%
    const profit = revenue - foodCost - laborCost - rentCost - otherCosts;

    monthlyData.push({
      month: monthName,
      revenue,
      foodCost,
      laborCost,
      profit: Math.max(profit, Math.round(revenue * -0.05)), // Floor at -5% loss
    });
  }

  return monthlyData;
}

// ============================================
// ROI CALCULATION
// ============================================

/**
 * Calculate ROI for each matched product and aggregate totals
 */
function calculateROI(
  estimate: ClaudeEstimateResult,
  products: ProductMatch[]
): ROIEstimate {
  const annualRevenue = estimate.monthlyRevenue * 12;
  const annualFoodCost = annualRevenue * (estimate.foodCostPercent / 100);
  const annualLaborCost = annualRevenue * (estimate.laborCostPercent / 100);

  const breakdown: ROIBreakdownItem[] = [];
  let totalFoodCostSavings = 0;
  let totalLaborSavings = 0;
  let totalRevenueLift = 0;

  for (const match of products) {
    const productId = match.product.id;
    let annualSaving = 0;
    let description = '';

    switch (productId) {
      case 'food-cost': {
        // 2-5% food cost reduction
        const reductionPercent = 2 + Math.random() * 3; // 2-5%
        annualSaving = Math.round(annualFoodCost * (reductionPercent / 100));
        totalFoodCostSavings += annualSaving;
        description = `${reductionPercent.toFixed(1)}% food cost reduction through real-time tracking and waste prevention`;
        break;
      }

      case 'labor-control': {
        // 1-3% labor cost reduction
        const reductionPercent = 1 + Math.random() * 2; // 1-3%
        annualSaving = Math.round(annualLaborCost * (reductionPercent / 100));
        totalLaborSavings += annualSaving;
        description = `${reductionPercent.toFixed(1)}% labor cost reduction through optimized scheduling and SPLH tracking`;
        break;
      }

      case 'ceo-dashboard': {
        // Value based on time savings: 10+ hours/week at owner's effective rate
        const hoursPerWeek = 10 + Math.random() * 5; // 10-15 hours
        const effectiveRate = 75; // Owner's effective hourly rate
        annualSaving = Math.round(hoursPerWeek * effectiveRate * 52);
        description = `${hoursPerWeek.toFixed(0)} hours/week saved on reporting and decision-making at $${effectiveRate}/hr effective rate`;
        break;
      }

      case 'voice-agent': {
        // Captured revenue from missed calls: 20-40 calls/week, avg ticket value
        const missedCallsPerWeek = 20 + Math.random() * 20; // 20-40
        const conversionRate = 0.3; // 30% of calls become orders
        const capturedRevenuePerCall = estimate.avgTicket * conversionRate;
        annualSaving = Math.round(missedCallsPerWeek * capturedRevenuePerCall * 52);
        totalRevenueLift += annualSaving;
        description = `${missedCallsPerWeek.toFixed(0)} missed calls/week recovered, ${(conversionRate * 100).toFixed(0)}% conversion at $${estimate.avgTicket} avg ticket`;
        break;
      }

      case 'morning-coach': {
        // Operational efficiency gains: prevents 2-4 costly mistakes per week
        const preventedIssuesPerWeek = 2 + Math.random() * 2; // 2-4
        const avgIssueCost = 150 + Math.random() * 100; // $150-250 per issue
        annualSaving = Math.round(preventedIssuesPerWeek * avgIssueCost * 52);
        description = `${preventedIssuesPerWeek.toFixed(0)} operational issues/week prevented at ~$${avgIssueCost.toFixed(0)} avg cost per issue`;
        break;
      }

      case 'content-pipeline': {
        // Marketing ROI increase: 15-30% more engagement leading to revenue lift
        const engagementLift = 15 + Math.random() * 15; // 15-30%
        const marketingSpendPercent = 2; // Assume 2% of revenue on marketing
        const annualMarketingSpend = annualRevenue * (marketingSpendPercent / 100);
        annualSaving = Math.round(annualMarketingSpend * (engagementLift / 100) * 3); // 3x multiplier for ROI
        totalRevenueLift += annualSaving;
        description = `${engagementLift.toFixed(0)}% engagement increase driving additional revenue, plus 15+ hours/week saved on content creation`;
        break;
      }

      default: {
        // Generic product: 1% of revenue
        annualSaving = Math.round(annualRevenue * 0.01);
        description = 'Estimated operational improvement';
        break;
      }
    }

    breakdown.push({
      productId,
      productName: match.product.name,
      annualSaving,
      description,
    });
  }

  const totalAnnualSavings = breakdown.reduce((sum, item) => sum + item.annualSaving, 0);

  // Estimate monthly WwithAI cost for payback calculation
  // Assume ~$500/month per product on average
  const monthlyWwithAICost = products.length * 500;
  const paybackMonths = monthlyWwithAICost > 0
    ? Math.max(1, Math.round((monthlyWwithAICost * 12) / totalAnnualSavings * 10) / 10)
    : 0;

  console.log(`[FinancialEstimator] ROI breakdown:`);
  for (const item of breakdown) {
    console.log(`[FinancialEstimator]   ${item.productName}: $${item.annualSaving.toLocaleString()}/year`);
  }
  console.log(`[FinancialEstimator] Total annual savings: $${totalAnnualSavings.toLocaleString()}`);
  console.log(`[FinancialEstimator] Estimated payback: ${paybackMonths} months`);

  return {
    totalAnnualSavings,
    foodCostSavings: totalFoodCostSavings,
    laborSavings: totalLaborSavings,
    revenueLift: totalRevenueLift,
    paybackMonths,
    breakdown,
  };
}

// ============================================
// UTILITY
// ============================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return (min + max) / 2;
  }
  return Math.min(Math.max(value, min), max);
}
