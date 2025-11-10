// services/oauth/linkedin-oauth.service.js
const OAuthService = require('./oauth.service');

class LinkedInOAuthService extends OAuthService {
  constructor() {
    super('linkedin');
    this.clientId = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  }

  getAuthUrl(businessId, redirectUri) {
    const scopes = [
      'rw_organization_admin',
      'w_organization_social',
      'r_organization_social',
      'r_organization_social_feed',
      'r_basicprofile'
    ];

    return `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code` +
      `&client_id=${this.clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${businessId}` +
      `&scope=${encodeURIComponent(scopes.join(' '))}`;
  }

  async getOrganizations(accessToken) {
    const orgsResponse = await fetch(
      `https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'LinkedIn-Version': '202409'
        }
      }
    );

    if (!orgsResponse.ok) {
      throw new Error('Failed to fetch organizations. Make sure you have admin access to at least one LinkedIn company page.');
    }

    const orgsData = await orgsResponse.json();

    if (!orgsData.elements || orgsData.elements.length === 0) {
      throw new Error('No LinkedIn company pages found. You must be an admin of at least one LinkedIn company page to connect.');
    }

    const organizations = [];

    for (const element of orgsData.elements) {
      const orgUrn = element.organizationalTarget;
      const orgId = orgUrn.split(':').pop();

      try {
        const orgDetails = await this.fetchWithAuth(
          `https://api.linkedin.com/v2/organizations/${orgId}`,
          accessToken,
          { headers: { 'LinkedIn-Version': '202409' } }
        );

        organizations.push({
          id: orgUrn,
          name: orgDetails.localizedName || orgDetails.name?.localized?.en_US || 'Unknown Organization',
          vanityName: orgDetails.vanityName || '',
          logo: this.extractOrgLogo(orgDetails.logoV2)
        });
      } catch (err) {
        console.warn(`Failed to fetch details for organization ${orgId}:`, err);
        organizations.push({
          id: orgUrn,
          name: `Organization ${orgId}`,
          vanityName: '',
          logo: ''
        });
      }
    }

    return organizations;
  }

  extractOrgLogo(logoV2) {
    if (!logoV2) return '';
    
    const original = logoV2['original~'];
    if (original?.elements?.[0]?.identifiers?.[0]) {
      return original.elements[0].identifiers[0].identifier;
    }
    
    return '';
  }

  formatOrganizationData(org, userId, accessToken, expiresIn) {
    return {
      access_token: accessToken,
      organization_id: org.id,
      organization_name: org.name,
      organization_vanity: org.vanityName,
      organization_logo: org.logo,
      user_id: userId,
      expires_at: this.calculateExpiry(expiresIn)
    };
  }
}

module.exports = new LinkedInOAuthService();