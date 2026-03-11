/**
 * Meta Ads Execution Engine
 * Handles real Meta Marketing API operations for agent actions.
 * 
 * Operations:
 * - pause_campaign: Pause a campaign
 * - resume_campaign: Resume a paused campaign
 * - update_budget: Change daily/lifetime budget
 * - create_campaign: Create a new campaign
 * - update_audience: Modify targeting
 * - duplicate_campaign: Copy a campaign with modifications
 */

const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Ad account mapping
const CLIENT_AD_ACCOUNTS = {
  'The Shape SPA Miami': 'act_1595667451424210',
  'The Shape Spa FLL': 'act_862498366234569',
  'Super Crisp': 'act_2118394678903177',
};

function getToken() {
  return process.env.META_ACCESS_TOKEN;
}

function getAdAccount(clientName) {
  for (const [name, account] of Object.entries(CLIENT_AD_ACCOUNTS)) {
    if (clientName.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(clientName.toLowerCase().replace('the ', ''))) {
      return account;
    }
  }
  return null;
}

async function metaAPI(endpoint, method = 'GET', body = null) {
  const token = getToken();
  const url = `${BASE_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}access_token=${token}`;
  
  const options = { method };
  if (body && method === 'POST') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(url, options);
  const data = await res.json();
  
  if (data.error) {
    throw new Error(`Meta API Error: ${data.error.message} (code: ${data.error.code})`);
  }
  
  return data;
}

async function metaAPIForm(endpoint, params) {
  const token = getToken();
  const formData = new URLSearchParams({ access_token: token, ...params });
  
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  
  const data = await res.json();
  if (data.error) {
    throw new Error(`Meta API Error: ${data.error.message} (code: ${data.error.code})`);
  }
  return data;
}

// ─── OPERATIONS ───────────────────────────────────────────

/**
 * Get all campaigns for a client
 */
async function getCampaigns(clientName) {
  const account = getAdAccount(clientName);
  if (!account) throw new Error(`No ad account found for ${clientName}`);
  
  const data = await metaAPI(`${account}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time`);
  return data.data || [];
}

/**
 * Pause a campaign
 */
async function pauseCampaign(campaignId) {
  const result = await metaAPIForm(campaignId, { status: 'PAUSED' });
  return {
    success: true,
    campaignId,
    action: 'paused',
    detail: `Campaign ${campaignId} paused successfully`,
  };
}

/**
 * Resume (activate) a campaign
 */
async function resumeCampaign(campaignId) {
  const result = await metaAPIForm(campaignId, { status: 'ACTIVE' });
  return {
    success: true,
    campaignId,
    action: 'activated',
    detail: `Campaign ${campaignId} activated successfully`,
  };
}

/**
 * Update campaign daily budget (in dollars — API expects cents)
 */
async function updateBudget(campaignId, dailyBudgetDollars) {
  // Get current budget first
  const current = await metaAPI(`${campaignId}?fields=name,daily_budget,status`);
  const oldBudget = current.daily_budget ? (parseInt(current.daily_budget) / 100).toFixed(2) : 'N/A';
  
  const result = await metaAPIForm(campaignId, { 
    daily_budget: Math.round(dailyBudgetDollars * 100) // API uses cents
  });
  
  return {
    success: true,
    campaignId,
    campaignName: current.name,
    action: 'budget_updated',
    oldBudget: `$${oldBudget}/day`,
    newBudget: `$${dailyBudgetDollars}/day`,
    detail: `Budget changed from $${oldBudget}/day to $${dailyBudgetDollars}/day on "${current.name}"`,
  };
}

/**
 * Update ad set budget (campaign-level budget must be removed or use ad set budgets)
 */
async function updateAdSetBudget(adSetId, dailyBudgetDollars) {
  const current = await metaAPI(`${adSetId}?fields=name,daily_budget,status`);
  const oldBudget = current.daily_budget ? (parseInt(current.daily_budget) / 100).toFixed(2) : 'N/A';
  
  const result = await metaAPIForm(adSetId, {
    daily_budget: Math.round(dailyBudgetDollars * 100)
  });
  
  return {
    success: true,
    adSetId,
    adSetName: current.name,
    action: 'adset_budget_updated',
    oldBudget: `$${oldBudget}/day`,
    newBudget: `$${dailyBudgetDollars}/day`,
    detail: `Ad set "${current.name}" budget: $${oldBudget} → $${dailyBudgetDollars}/day`,
  };
}

/**
 * Create a new campaign
 */
async function createCampaign(clientName, { name, objective, dailyBudget, status = 'PAUSED', specialAdCategories = [] }) {
  const account = getAdAccount(clientName);
  if (!account) throw new Error(`No ad account found for ${clientName}`);
  
  const params = {
    name,
    objective: objective.toUpperCase(),
    status,
    special_ad_categories: JSON.stringify(specialAdCategories),
  };
  
  // Note: daily_budget is set at ad set level for most objectives
  // Campaign-level budget only works with certain bid strategies
  
  const result = await metaAPIForm(`${account}/campaigns`, params);
  
  return {
    success: true,
    campaignId: result.id,
    action: 'campaign_created',
    detail: `Created campaign "${name}" (${objective}) — ID: ${result.id} — Status: ${status}`,
  };
}

/**
 * Get ad sets for a campaign
 */
async function getAdSets(campaignId) {
  const data = await metaAPI(`${campaignId}/adsets?fields=id,name,status,daily_budget,targeting,optimization_goal`);
  return data.data || [];
}

/**
 * Update ad set targeting
 */
async function updateTargeting(adSetId, targeting) {
  const current = await metaAPI(`${adSetId}?fields=name,targeting`);
  
  const result = await metaAPIForm(adSetId, {
    targeting: JSON.stringify(targeting)
  });
  
  return {
    success: true,
    adSetId,
    adSetName: current.name,
    action: 'targeting_updated',
    oldTargeting: JSON.stringify(current.targeting, null, 2).substring(0, 200),
    detail: `Targeting updated on ad set "${current.name}"`,
  };
}

/**
 * Get campaign insights (performance data)
 */
async function getCampaignInsights(campaignId, datePreset = 'last_7d') {
  const data = await metaAPI(
    `${campaignId}/insights?fields=spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type&date_preset=${datePreset}`
  );
  return data.data?.[0] || null;
}

// ─── EXECUTION PLAN PARSER ───────────────────────────────

/**
 * Execute an action plan. The plan is an array of steps, each with an operation and params.
 * Example plan:
 * [
 *   { "op": "pause_campaign", "campaignId": "120237323259790160" },
 *   { "op": "create_campaign", "clientName": "Super Crisp", "name": "Traffic Campaign", "objective": "OUTCOME_TRAFFIC", "dailyBudget": 24 },
 *   { "op": "update_budget", "campaignId": "123", "dailyBudget": 30 }
 * ]
 */
async function executePlan(plan, clientName) {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    console.log(`  Step ${i + 1}/${plan.length}: ${step.op}...`);
    
    try {
      let result;
      switch (step.op) {
        case 'pause_campaign':
          result = await pauseCampaign(step.campaignId);
          break;
        case 'resume_campaign':
          result = await resumeCampaign(step.campaignId);
          break;
        case 'update_budget':
          result = await updateBudget(step.campaignId, step.dailyBudget);
          break;
        case 'update_adset_budget':
          result = await updateAdSetBudget(step.adSetId, step.dailyBudget);
          break;
        case 'create_campaign':
          result = await createCampaign(step.clientName || clientName, step);
          break;
        case 'update_targeting':
          result = await updateTargeting(step.adSetId, step.targeting);
          break;
        case 'get_campaigns':
          const campaigns = await getCampaigns(step.clientName || clientName);
          result = { success: true, action: 'listed_campaigns', campaigns, detail: `Found ${campaigns.length} campaigns` };
          break;
        case 'get_adsets':
          const adsets = await getAdSets(step.campaignId);
          result = { success: true, action: 'listed_adsets', adsets, detail: `Found ${adsets.length} ad sets` };
          break;
        case 'get_insights':
          const insights = await getCampaignInsights(step.campaignId, step.datePreset);
          result = { success: true, action: 'fetched_insights', insights, detail: `Insights retrieved` };
          break;
        default:
          throw new Error(`Unknown operation: ${step.op}`);
      }
      results.push({ step: i + 1, ...result });
    } catch (err) {
      errors.push({ step: i + 1, op: step.op, error: err.message });
      // Don't stop on error — continue with remaining steps
      console.error(`  ❌ Step ${i + 1} failed: ${err.message}`);
    }
  }
  
  return { results, errors, totalSteps: plan.length, succeeded: results.length, failed: errors.length };
}

// ─── SMART EXECUTOR ──────────────────────────────────────

/**
 * Intelligently execute an agent action based on its title and proposed action.
 * This handles actions that don't have a structured executionPlan.
 */
async function smartExecute(action) {
  const { title, proposedAction, clientName, category } = action;
  const titleLower = title.toLowerCase();
  
  // If there's a structured execution plan, use it
  if (action.executionPlan) {
    try {
      const plan = JSON.parse(action.executionPlan);
      if (Array.isArray(plan)) {
        return await executePlan(plan, clientName);
      }
    } catch (e) {
      // Not valid JSON, fall through to smart execution
    }
  }
  
  // Smart execution based on action content
  const results = [];
  const errors = [];
  
  try {
    if (category === 'ads') {
      // Get current campaigns for context
      const campaigns = await getCampaigns(clientName);
      results.push({ step: 0, action: 'audit', detail: `Found ${campaigns.length} campaigns for ${clientName}`, campaigns: campaigns.map(c => ({ id: c.id, name: c.name, status: c.status })) });
      
      // Switch objective (pause old, note for new)
      if (titleLower.includes('switch') && titleLower.includes('traffic')) {
        // Pause lead campaigns
        const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
        for (const camp of activeCampaigns) {
          const r = await pauseCampaign(camp.id);
          results.push({ step: results.length, ...r });
        }
        
        // Create new traffic campaign
        const adAccount = getAdAccount(clientName);
        const newCampaign = await createCampaign(clientName, {
          name: `${clientName} — Traffic (Agent Created)`,
          objective: 'OUTCOME_TRAFFIC',
          status: 'PAUSED', // Create paused — Bruno can activate when ready
        });
        results.push({ step: results.length, ...newCampaign, note: 'Created as PAUSED — activate when ad sets and creatives are configured' });
      }
      
      // Scale budget
      else if (titleLower.includes('scale') && titleLower.includes('budget')) {
        const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
        for (const camp of activeCampaigns) {
          // Get ad sets to find budget level
          const adSets = await getAdSets(camp.id);
          for (const adSet of adSets) {
            if (adSet.daily_budget) {
              const currentBudget = parseInt(adSet.daily_budget) / 100;
              const newBudget = Math.round(currentBudget * 1.25 * 100) / 100; // 25% increase
              const r = await updateAdSetBudget(adSet.id, newBudget);
              results.push({ step: results.length, ...r });
            }
          }
          // If campaign-level budget
          if (camp.daily_budget) {
            const currentBudget = parseInt(camp.daily_budget) / 100;
            const newBudget = Math.round(currentBudget * 1.25 * 100) / 100;
            const r = await updateBudget(camp.id, newBudget);
            results.push({ step: results.length, ...r });
          }
        }
      }
      
      // Refresh creatives (can't create creatives via API easily — document what needs to happen)
      else if (titleLower.includes('refresh') && titleLower.includes('creative')) {
        // Get current ads for audit
        const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
        for (const camp of activeCampaigns) {
          const adSets = await getAdSets(camp.id);
          for (const adSet of adSets) {
            const ads = await metaAPI(`${adSet.id}/ads?fields=id,name,status,creative`);
            results.push({ 
              step: results.length, 
              action: 'creative_audit', 
              campaignName: camp.name,
              adSetName: adSet.name,
              activeAds: (ads.data || []).filter(a => a.status === 'ACTIVE').length,
              totalAds: (ads.data || []).length,
              detail: `${camp.name} → ${adSet.name}: ${(ads.data || []).filter(a => a.status === 'ACTIVE').length} active ads of ${(ads.data || []).length} total`,
            });
          }
        }
        // Get insights to identify worst performers
        for (const camp of activeCampaigns) {
          const insights = await getCampaignInsights(camp.id, 'last_7d');
          if (insights) {
            results.push({
              step: results.length,
              action: 'performance_audit',
              campaignName: camp.name,
              spend: insights.spend,
              ctr: insights.ctr,
              clicks: insights.clicks,
              detail: `${camp.name}: $${insights.spend} spent, ${insights.ctr}% CTR, ${insights.clicks} clicks (7d)`,
            });
          }
        }
        results.push({
          step: results.length,
          action: 'recommendation',
          detail: 'Creative refresh requires manual upload of new images/videos to Meta Ads Manager. Audit above shows current ad performance to guide which creatives to replace first.',
          note: 'NEXT STEP: Upload 3-5 new creative variations (before/after, testimonials, urgency hooks) to the active ad sets.',
        });
      }
      
      // Generic ad action — at least audit
      else {
        results.push({
          step: results.length,
          action: 'audit_complete',
          campaigns: campaigns.map(c => ({ id: c.id, name: c.name, status: c.status, objective: c.objective })),
          detail: `Audited ${campaigns.length} campaigns. Manual review recommended for: "${title}"`,
        });
      }
    }
  } catch (err) {
    errors.push({ step: 'execution', error: err.message });
  }
  
  return { results, errors, totalSteps: results.length + errors.length, succeeded: results.length, failed: errors.length };
}

module.exports = {
  getCampaigns,
  pauseCampaign,
  resumeCampaign,
  updateBudget,
  updateAdSetBudget,
  createCampaign,
  getAdSets,
  updateTargeting,
  getCampaignInsights,
  executePlan,
  smartExecute,
  getAdAccount,
  CLIENT_AD_ACCOUNTS,
};
