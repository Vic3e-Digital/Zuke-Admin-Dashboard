/**
 * Email Tracking Helper Utilities
 * Use these functions to easily integrate email tracking into your workflows
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Check which emails have already been sent to avoid duplicates
 * @param {string} businessId - The business ID
 * @param {string[]} emails - Array of email addresses to check
 * @returns {Promise<{alreadySent: string[], newEmails: string[], stats: object}>}
 */
async function checkDuplicates(businessId, emails) {
  try {
    const response = await fetch(`${BASE_URL}/api/email-tracking/check-duplicates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, emails })
    });

    if (!response.ok) {
      throw new Error(`Failed to check duplicates: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking duplicates:', error);
    // On error, assume all emails are new to avoid blocking sends
    return { alreadySent: [], newEmails: emails, stats: { checked: emails.length, alreadySent: 0, new: emails.length } };
  }
}

/**
 * Record sent emails after successful send
 * @param {string} businessId - The business ID
 * @param {Array<{email: string, name?: string, status?: string, mailgunId?: string}>} emails - Sent email details
 * @param {string} campaignId - Optional campaign ID
 * @param {string} emailSubject - Email subject line
 * @returns {Promise<{success: boolean, recorded: number, campaignId: string}>}
 */
async function recordSends(businessId, emails, campaignId = null, emailSubject = '') {
  try {
    const response = await fetch(`${BASE_URL}/api/email-tracking/record-sends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        businessId, 
        emails, 
        campaignId: campaignId || `campaign_${Date.now()}`,
        emailSubject 
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to record sends: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error recording sends:', error);
    // Continue even if recording fails
    return { success: false, recorded: 0, campaignId: campaignId || `campaign_${Date.now()}` };
  }
}

/**
 * Filter out emails that have already been sent
 * @param {string} businessId - The business ID
 * @param {Array<object>} leads - Array of lead objects with email property
 * @param {string} emailField - The field name containing the email (default: 'email')
 * @returns {Promise<{newLeads: object[], skippedLeads: object[], stats: object}>}
 */
async function filterDuplicateLeads(businessId, leads, emailField = 'email') {
  const emails = leads.map(lead => lead[emailField]).filter(e => e);
  
  const duplicateCheck = await checkDuplicates(businessId, emails);
  const alreadySentSet = new Set(duplicateCheck.alreadySent.map(e => e.toLowerCase()));

  const newLeads = [];
  const skippedLeads = [];

  for (const lead of leads) {
    const email = (lead[emailField] || '').toLowerCase().trim();
    
    if (!email) {
      skippedLeads.push({ ...lead, skipReason: 'No email' });
    } else if (alreadySentSet.has(email)) {
      skippedLeads.push({ ...lead, skipReason: 'Already sent' });
    } else {
      newLeads.push(lead);
    }
  }

  return {
    newLeads,
    skippedLeads,
    stats: {
      total: leads.length,
      new: newLeads.length,
      alreadySent: skippedLeads.filter(l => l.skipReason === 'Already sent').length,
      noEmail: skippedLeads.filter(l => l.skipReason === 'No email').length
    }
  };
}

/**
 * Check if a specific email has been sent to
 * @param {string} businessId - The business ID
 * @param {string} email - Email address to check
 * @returns {Promise<{sent: boolean, details?: object}>}
 */
async function checkEmailSent(businessId, email) {
  try {
    const response = await fetch(`${BASE_URL}/api/email-tracking/check/${businessId}/${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to check email: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking email:', error);
    return { sent: false };
  }
}

/**
 * Get email tracking statistics for a business
 * @param {string} businessId - The business ID
 * @returns {Promise<object>}
 */
async function getStats(businessId) {
  try {
    const response = await fetch(`${BASE_URL}/api/email-tracking/stats/${businessId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting stats:', error);
    return { uniqueEmailsSent: 0, totalSends: 0, campaignCount: 0, recentCampaigns: [] };
  }
}

/**
 * Get campaign history for a business
 * @param {string} businessId - The business ID
 * @param {number} limit - Number of campaigns to retrieve (default: 10)
 * @param {number} skip - Number of campaigns to skip (default: 0)
 * @returns {Promise<{campaigns: object[], pagination: object}>}
 */
async function getCampaignHistory(businessId, limit = 10, skip = 0) {
  try {
    const response = await fetch(`${BASE_URL}/api/email-tracking/history/${businessId}?limit=${limit}&skip=${skip}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get history: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting history:', error);
    return { campaigns: [], pagination: { total: 0, limit, skip, hasMore: false } };
  }
}

/**
 * Complete workflow: Check duplicates, filter, and return ready-to-send leads
 * Use this as an all-in-one solution before sending emails
 * 
 * @param {string} businessId - The business ID
 * @param {Array<object>} leads - Array of lead objects
 * @param {string} emailField - Field name containing email address
 * @returns {Promise<{toSend: object[], skipped: object[], stats: object}>}
 */
async function prepareEmailBatch(businessId, leads, emailField = 'email') {
  console.log(`📋 Preparing email batch for business ${businessId}`);
  console.log(`   Total leads: ${leads.length}`);
  
  const filtered = await filterDuplicateLeads(businessId, leads, emailField);
  
  console.log(`   ✅ New leads: ${filtered.newLeads.length}`);
  console.log(`   ⏭️  Already sent: ${filtered.stats.alreadySent}`);
  console.log(`   ⚠️  No email: ${filtered.stats.noEmail}`);
  
  return {
    toSend: filtered.newLeads,
    skipped: filtered.skippedLeads,
    stats: filtered.stats
  };
}

/**
 * Record batch send results
 * Call this after successfully sending a batch of emails
 * 
 * @param {string} businessId - The business ID
 * @param {Array<object>} sentLeads - Leads that were sent to
 * @param {Array<object>} sendResults - Results from email provider (with status, mailgunId, etc.)
 * @param {string} subject - Email subject
 * @param {string} campaignId - Optional campaign ID
 * @returns {Promise<object>}
 */
async function recordBatchSend(businessId, sentLeads, sendResults, subject, campaignId = null) {
  const emailRecords = sentLeads.map((lead, index) => {
    const result = sendResults[index] || {};
    return {
      email: lead.email || lead.Email,
      name: lead.name || lead.Name || lead.first_name || '',
      status: result.status || 'sent',
      mailgunId: result.id || result.messageId || null
    };
  });

  console.log(`📝 Recording ${emailRecords.length} sent emails...`);
  
  const recorded = await recordSends(businessId, emailRecords, campaignId, subject);
  
  if (recorded.success) {
    console.log(`✅ Recorded sends for campaign: ${recorded.campaignId}`);
  } else {
    console.warn(`⚠️ Failed to record sends`);
  }
  
  return recorded;
}

module.exports = {
  checkDuplicates,
  recordSends,
  filterDuplicateLeads,
  checkEmailSent,
  getStats,
  getCampaignHistory,
  prepareEmailBatch,
  recordBatchSend
};
