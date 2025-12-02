const { ObjectId } = require('mongodb');
const { getDatabase } = require('../../lib/mongodb');
const encryptionService = require('./encryption.service');

class BusinessSettingsService {
  async getSettings(businessId) {
    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      throw new Error('Business not found');
    }

    return business.automation_settings || this.getDefaultSettings();
  }

  async updateSettings(businessId, updates) {
    const db = await getDatabase();
    
    const result = await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      { 
        $set: {
          ...updates,
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('Business not found');
    }

    return this.getSettings(businessId);
  }

  async updatePlatformConnection(businessId, platform, connectionData) {
    const db = await getDatabase();
    const business = await db.collection('store_submissions').findOne({
      _id: new ObjectId(businessId)
    });

    const updateFields = this.buildPlatformUpdateFields(platform, connectionData, business);

    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      { $set: updateFields }
    );

    return this.getSettings(businessId);
  }

  async disconnectPlatform(businessId, platform) {
    const db = await getDatabase();
    const disconnectFields = this.buildDisconnectFields(platform);

    await db.collection('store_submissions').updateOne(
      { _id: new ObjectId(businessId) },
      { $set: disconnectFields }
    );
  }

  async getPlatformToken(businessId, platform) {
    const settings = await this.getSettings(businessId);
    const platformSettings = settings.social_media?.[platform];

    if (!platformSettings?.connected) {
      throw new Error('Platform not connected');
    }

    const tokenData = {
      token: encryptionService.decrypt(platformSettings.access_token),
      ...this.getPlatformMetadata(platform, platformSettings)
    };

    // Add refresh token if available and encrypted
    if (platformSettings.refresh_token) {
      try {
        tokenData.refresh_token = encryptionService.decrypt(platformSettings.refresh_token);
      } catch (err) {
        console.warn(`[Service] Could not decrypt refresh_token for ${platform}:`, err.message);
        tokenData.refresh_token = null;
      }
    }

    return tokenData;
  }

  getDefaultSettings() {
    return {
      social_media: {
        facebook: { connected: false, status: 'disconnected' },
        instagram: { connected: false, status: 'disconnected' },
        linkedin: { connected: false, status: 'disconnected' },
        youtube: { connected: false, status: 'disconnected' },
        tiktok: { connected: false, status: 'disconnected' } // ✅ ADDED
      },
      n8n_config: {
        webhook_url: '',
        enabled: true
      },
      posting_preferences: {
        auto_post: false,
        default_post_time: '09:00',
        timezone: 'Africa/Johannesburg'
      }
    };
  }

  buildPlatformUpdateFields(platform, data, existingBusiness) {
    const updateFields = {
      [`automation_settings.social_media.${platform}.connected`]: true,
      [`automation_settings.social_media.${platform}.status`]: 'active',
      [`automation_settings.social_media.${platform}.last_refreshed`]: new Date(),
      'updated_at': new Date()
    };

    // Platform-specific fields
    switch(platform) {
      case 'facebook':
        Object.assign(updateFields, this.buildFacebookFields(data));
        break;
      case 'instagram':
        Object.assign(updateFields, this.buildInstagramFields(data));
        break;
      case 'linkedin':
        Object.assign(updateFields, this.buildLinkedInFields(data));
        break;
      case 'youtube':
        Object.assign(updateFields, this.buildYouTubeFields(data));
        break;
      case 'tiktok': // ✅ ADDED
        Object.assign(updateFields, this.buildTikTokFields(data));
        break;
    }

    // Initialize other platforms if needed
    if (!existingBusiness?.automation_settings) {
      this.initializeOtherPlatforms(updateFields, platform);
    }

    return updateFields;
  }

  buildFacebookFields(data) {
    return {
      'automation_settings.social_media.facebook.access_token': encryptionService.encrypt(data.access_token),
      'automation_settings.social_media.facebook.page_id': data.page_id,
      'automation_settings.social_media.facebook.page_name': data.page_name,
      'automation_settings.social_media.facebook.page_category': data.page_category || '',
      'automation_settings.social_media.facebook.page_picture': data.page_picture || '',
      'automation_settings.social_media.facebook.expires_at': data.expires_at
    };
  }

  buildInstagramFields(data) {
    return {
      'automation_settings.social_media.instagram.access_token': encryptionService.encrypt(data.access_token),
      'automation_settings.social_media.instagram.account_id': data.account_id,
      'automation_settings.social_media.instagram.username': data.username,
      'automation_settings.social_media.instagram.account_name': data.account_name,
      'automation_settings.social_media.instagram.profile_picture': data.profile_picture || '',
      'automation_settings.social_media.instagram.connected_page_id': data.connected_page_id,
      'automation_settings.social_media.instagram.connected_page_name': data.connected_page_name,
      'automation_settings.social_media.instagram.expires_at': data.expires_at
    };
  }

  buildLinkedInFields(data) {
    return {
      'automation_settings.social_media.linkedin.access_token': encryptionService.encrypt(data.access_token),
      'automation_settings.social_media.linkedin.organization_id': data.organization_id,
      'automation_settings.social_media.linkedin.organization_name': data.organization_name,
      'automation_settings.social_media.linkedin.organization_vanity': data.organization_vanity || '',
      'automation_settings.social_media.linkedin.organization_logo': data.organization_logo || '',
      'automation_settings.social_media.linkedin.authorized_user_id': data.user_id,
      'automation_settings.social_media.linkedin.type': 'organization',
      'automation_settings.social_media.linkedin.expires_at': data.expires_at
    };
  }

  buildYouTubeFields(data) {
    return {
      'automation_settings.social_media.youtube.access_token': encryptionService.encrypt(data.access_token),
      'automation_settings.social_media.youtube.refresh_token': data.refresh_token 
        ? encryptionService.encrypt(data.refresh_token) 
        : null,
      'automation_settings.social_media.youtube.channel_id': data.channel_id,
      'automation_settings.social_media.youtube.channel_name': data.channel_name,
      'automation_settings.social_media.youtube.custom_url': data.custom_url || '',
      'automation_settings.social_media.youtube.channel_thumbnail': data.channel_thumbnail || '',
      'automation_settings.social_media.youtube.subscriber_count': data.subscriber_count || 0,
      'automation_settings.social_media.youtube.video_count': data.video_count || 0,
      'automation_settings.social_media.youtube.view_count': data.view_count || 0,
      'automation_settings.social_media.youtube.expires_at': data.expires_at
    };
  }

  // ✅ NEW METHOD FOR TIKTOK
  buildTikTokFields(data) {
    return {
      'automation_settings.social_media.tiktok.access_token': encryptionService.encrypt(data.access_token),
      'automation_settings.social_media.tiktok.refresh_token': data.refresh_token 
        ? encryptionService.encrypt(data.refresh_token) 
        : null,
      'automation_settings.social_media.tiktok.open_id': data.open_id,
      'automation_settings.social_media.tiktok.union_id': data.union_id || '',
      'automation_settings.social_media.tiktok.username': data.username,
      'automation_settings.social_media.tiktok.display_name': data.display_name,
      'automation_settings.social_media.tiktok.avatar_url': data.avatar_url || '',
      'automation_settings.social_media.tiktok.follower_count': data.follower_count || 0,
      'automation_settings.social_media.tiktok.following_count': data.following_count || 0,
      'automation_settings.social_media.tiktok.video_count': data.video_count || 0,
      'automation_settings.social_media.tiktok.likes_count': data.likes_count || 0,
      'automation_settings.social_media.tiktok.expires_at': data.expires_at
    };
  }

  buildDisconnectFields(platform) {
    const baseFields = {
      [`automation_settings.social_media.${platform}.connected`]: false,
      [`automation_settings.social_media.${platform}.status`]: 'disconnected',
      [`automation_settings.social_media.${platform}.access_token`]: null,
      'updated_at': new Date()
    };

    // Add platform-specific null fields
    const platformFields = {
      facebook: ['page_id', 'page_name', 'page_category', 'page_picture'],
      instagram: ['account_id', 'username', 'account_name', 'profile_picture', 'connected_page_id', 'connected_page_name'],
      linkedin: ['organization_id', 'organization_name', 'organization_vanity', 'organization_logo', 'authorized_user_id', 'type'],
      youtube: ['refresh_token', 'channel_id', 'channel_name', 'custom_url', 'channel_thumbnail', 'subscriber_count', 'video_count', 'view_count'],
      tiktok: ['refresh_token', 'open_id', 'union_id', 'username', 'display_name', 'avatar_url', 'follower_count', 'following_count', 'video_count', 'likes_count'] // ✅ ADDED
    };

    const fields = platformFields[platform] || [];
    fields.forEach(field => {
      baseFields[`automation_settings.social_media.${platform}.${field}`] = null;
    });

    return baseFields;
  }

  initializeOtherPlatforms(updateFields, currentPlatform) {
    const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok']; // ✅ ADDED tiktok
    platforms.forEach(platform => {
      if (platform !== currentPlatform) {
        updateFields[`automation_settings.social_media.${platform}`] = { 
          connected: false, 
          status: 'disconnected' 
        };
      }
    });

    updateFields['automation_settings.n8n_config'] = {
      webhook_url: '',
      enabled: true
    };
    updateFields['automation_settings.posting_preferences'] = {
      auto_post: false,
      default_post_time: '09:00',
      timezone: 'Africa/Johannesburg'
    };
  }

  getPlatformMetadata(platform, settings) {
    const metadata = {};

    switch(platform) {
      case 'facebook':
        metadata.page_id = settings.page_id;
        metadata.page_name = settings.page_name;
        break;
      case 'instagram':
        metadata.account_id = settings.account_id;
        metadata.username = settings.username;
        break;
      case 'linkedin':
        metadata.organization_id = settings.organization_id;
        metadata.organization_name = settings.organization_name;
        break;
      case 'youtube':
        metadata.channel_id = settings.channel_id;
        metadata.channel_name = settings.channel_name;
        break;
      case 'tiktok': // ✅ ADDED
        metadata.open_id = settings.open_id;
        metadata.username = settings.username;
        metadata.display_name = settings.display_name;
        break;
    }

    return metadata;
  }
}

module.exports = new BusinessSettingsService();