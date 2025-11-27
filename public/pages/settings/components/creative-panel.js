import { Formatters } from '../utils/formatters.js';

export class CreativePanelComponent {
  constructor(apiService, notificationManager) {
    this.api = apiService;
    this.notifications = notificationManager;
    this.availableModels = [];
    this.selectedModel = null;
    this.selectedVoice = null;
  }

  async render(businessSettings, currentBusiness) {
    await this.populateCreativeSettings(businessSettings, currentBusiness);
    this.setupEventListeners(currentBusiness);
  }

  async populateCreativeSettings(businessSettings, currentBusiness) {
    // ✅ FIRST: Try to load from automation_settings (primary source)
    if (businessSettings?.creative_settings?.selected_model) {
      this.selectedModel = businessSettings.creative_settings.selected_model;
      this.updateSelectedModelDisplay();
      console.log('✅ Loaded selected model from automation_settings');
    }
    // FALLBACK: Load from business_creatives array if automation_settings is empty
    else if (currentBusiness?.business_creatives?.length > 0) {
      const creativeModel = currentBusiness.business_creatives[currentBusiness.business_creatives.length - 1];
      this.selectedModel = {
        id: creativeModel.modelId || creativeModel.id,
        name: creativeModel.name,
        description: creativeModel.description,
        type: creativeModel.type,
        tags: creativeModel.tags || [],
        imageUrl: creativeModel.imageUrl,
        email: creativeModel.email,
        location: creativeModel.location
      };
      this.updateSelectedModelDisplay();
      console.log('⚠️ Loaded selected model from business_creatives (fallback)');
    }

    // Load selected voice from automation_settings
    if (businessSettings?.creative_settings?.selected_voice) {
      this.selectedVoice = businessSettings.creative_settings.selected_voice;
      this.updateSelectedVoiceDisplay();
    }

    // Load available models from API (with caching)
    try {
      this.availableModels = await this.fetchAvailableModels();
    } catch (error) {
      console.error('Failed to load available models:', error);
      this.availableModels = [];
    }
  }

  // Method to refresh models from API (clears cache and fetches fresh)
  async refreshCreativeModels() {
    try {
      console.log('🔄 Refreshing creative models...');
      
      // Clear cache to force fresh fetch
      if (window.dataManager) {
        window.dataManager.clearCreativeModelsCache();
      }

      this.availableModels = await this.fetchAvailableModels();
      
      console.log('✅ Models refreshed:', this.availableModels.length);
      
      if (this.notifications) {
        this.notifications.show('Models refreshed successfully', 'success');
      }
    } catch (error) {
      console.error('Error refreshing models:', error);
      if (this.notifications) {
        this.notifications.show('Failed to refresh models', 'error');
      }
    }
  }

  async fetchAvailableModels() {
    try {
      // Check DataManager cache first
      let cachedModels = window.dataManager?.getCreativeModels();
      
      if (cachedModels && cachedModels.length > 0) {
        console.log('📦 Using cached creative models:', cachedModels.length);
        return cachedModels;
      }

      console.log('🔄 Fetching all creative models from API...');
      
      // Fetch from API - get ALL models (no status filter)
      const response = await fetch('/api/creative-models/all?limit=100');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.models || data.models.length === 0) {
        console.warn('⚠️ No models found');
        return [];
      }

      // Transform MongoDB documents to model format
      const models = data.models.map(doc => {
        // Get headshot from portfolio - handle both old (string) and new (array) formats
        let headshot = null;
        if (doc.portfolio) {
          // New format: doc.portfolio.headshots (array)
          if (doc.portfolio.headshots) {
            if (Array.isArray(doc.portfolio.headshots) && doc.portfolio.headshots.length > 0) {
              const first = doc.portfolio.headshots[0];
              headshot = typeof first === 'string' ? first : first.url || first.imageUrl;
            } else if (typeof doc.portfolio.headshots === 'string') {
              headshot = doc.portfolio.headshots;
            }
          }
          // Old format: doc.portfolio.headshot (string) - fallback if new format not found
          if (!headshot && doc.portfolio.headshot) {
            headshot = doc.portfolio.headshot;
          }
        }

        return {
          id: doc._id,
          name: doc.personalInfo?.fullName || 'Unknown',
          description: doc.professional?.bio || doc.professional?.skills?.join(', ') || 'Professional model',
          type: doc.personalInfo?.gender || 'model',
          tags: [
            ...doc.professional?.skills || [],
            ...doc.professional?.talents || [],
            ...doc.professional?.interests || []
          ],
          imageUrl: headshot,
          additionalPhotos: doc.portfolio?.additionalPhotos || [],
          email: doc.personalInfo?.email,
          phone: doc.personalInfo?.phone,
          location: doc.personalInfo?.address?.city,
          socialMedia: doc.portfolio?.socialMedia,
          modelId: doc._id,
          status: doc.metadata?.status || 'pending-review'
        };
      });

      console.log('✅ Fetched', models.length, 'total models from API');

      // Cache in DataManager for future use
      if (window.dataManager) {
        window.dataManager.setCreativeModels(models);
        console.log('💾 Cached models in DataManager');
      }

      return models;

    } catch (error) {
      console.error('❌ Error fetching creative models:', error);
      
      // Fallback to empty array if API fails
      // (they can still use the refresh button to retry)
      return [];
    }
  }

  updateSelectedModelDisplay() {
    if (this.selectedModel) {
      const modelElement = document.getElementById('selectedModelName');
      const imageElement = document.getElementById('selectedModelImage');
      
      if (modelElement) modelElement.textContent = this.selectedModel.name;
      
      if (imageElement && this.selectedModel.imageUrl) {
        imageElement.src = this.selectedModel.imageUrl;
        imageElement.style.display = 'block';
      } else if (imageElement) {
        imageElement.style.display = 'none';
      }
    }
  }

  updateSelectedVoiceDisplay() {
    if (this.selectedVoice) {
      const voiceElement = document.getElementById('selectedVoiceName');
      if (voiceElement) voiceElement.textContent = this.selectedVoice.name;
    }
  }

  setupEventListeners(currentBusiness) {
    // Event listeners will be handled through global functions
  }

  renderModelsList(searchQuery = '') {
    const container = document.getElementById('modelsListContainer');
    if (!container) return;

    let filteredModels = this.availableModels;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredModels = this.availableModels.filter(model =>
        model.name.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query) ||
        model.type.toLowerCase().includes(query) ||
        (model.tags && model.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    if (filteredModels.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: #666;">
          <p>No models found. Try a different search.</p>
        </div>
      `;
      return;
    }

    // Grid layout with square headshots
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; padding: 20px 0;">
        ${filteredModels
          .map((model) => `
            <div 
              class="model-card ${this.selectedModel?.id === model.id ? 'selected' : ''}" 
              data-model-id="${model.id}"
              style="
                cursor: pointer;
                border-radius: 12px;
                overflow: hidden;
                border: 3px solid ${this.selectedModel?.id === model.id ? '#FF8B00' : '#e0e0e0'};
                transition: all 0.3s ease;
                background: white;
              "
            >
              <!-- Headshot Container - Square -->
              <div style="
                position: relative;
                width: 100%;
                aspect-ratio: 1/1;
                background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
              ">
                ${model.imageUrl 
                  ? `<img src="${model.imageUrl}" alt="${model.name}" style="width: 100%; height: 100%; object-fit: cover; loaded: true;">` 
                  : `<div style="
                      font-size: 48px;
                      text-align: center;
                      color: #999;
                    ">👤</div>`
                }
                
                <!-- Info Icon Button -->
                <button 
                  class="model-info-btn" 
                  data-model-id="${model.id}"
                  style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: transparent;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                  "
                  title="View details"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF8B00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </button>
              </div>

              <!-- Model Name -->
              <div style="
                padding: 12px;
                text-align: center;
                border-top: 1px solid #f0f0f0;
              ">
                <div style="
                  font-weight: 600;
                  font-size: 13px;
                  color: #2f2f2f;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                ">
                  ${Formatters.sanitizeHTML(model.name)}
                </div>
                <div style="
                  font-size: 11px;
                  color: #999;
                  margin-top: 4px;
                  text-transform: capitalize;
                ">
                  ${Formatters.sanitizeHTML(model.type)}
                </div>
              </div>
            </div>
          `)
          .join('')}
      </div>
    `;

    // Add click handlers for model selection
    const modelCards = container.querySelectorAll('.model-card');
    modelCards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't select if clicking the info button
        if (e.target.closest('.model-info-btn')) {
          return;
        }

        const modelId = card.getAttribute('data-model-id');
        const model = this.availableModels.find(m => m.id === modelId);

        // Update selection
        modelCards.forEach(mc => {
          mc.style.borderColor = '#e0e0e0';
          mc.classList.remove('selected');
        });
        card.style.borderColor = '#FF8B00';
        card.classList.add('selected');

        this.selectedModel = model;

        // Enable select button
        const selectBtn = document.getElementById('selectModelBtn');
        if (selectBtn) selectBtn.disabled = false;
      });
    });

    // Add click handlers for info buttons
    const infoButtons = container.querySelectorAll('.model-info-btn');
    infoButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const modelId = btn.getAttribute('data-model-id');
        const model = this.availableModels.find(m => m.id === modelId);
        if (model) {
          this.showModelDetailsModal(model);
        }
      });
    });
  }

  showModelDetailsModal(model) {
    // Create or get modal
    let modal = document.getElementById('modelDetailsModal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modelDetailsModal';
      document.body.appendChild(modal);
    }

    // Modal HTML
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      " onclick="if(event.target === this) document.getElementById('modelDetailsModal').style.display = 'none'">
        
        <div style="
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        ">
          <!-- Close Button -->
          <button 
            onclick="document.getElementById('modelDetailsModal').style.display = 'none'"
            style="
              position: absolute;
              top: 16px;
              right: 16px;
              background: white;
              border: none;
              border-radius: 50%;
              width: 36px;
              height: 36px;
              font-size: 24px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10001;
            "
          >
            ✕
          </button>

          <!-- Headshot -->
          <div style="
            width: 100%;
            aspect-ratio: 1/1;
            background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 16px 16px 0 0;
          ">
            ${model.imageUrl 
              ? `<img src="${model.imageUrl}" alt="${model.name}" style="width: 100%; height: 100%; object-fit: cover;">` 
              : `<div style="font-size: 64px; color: #999;">👤</div>`
            }
          </div>

          <!-- Model Info -->
          <div style="padding: 24px;">
            <!-- Name -->
            <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #2f2f2f;" data-model-name>
              ${Formatters.sanitizeHTML(model.name)}
            </h2>

            <!-- Type & Location -->
            <div style="
              display: flex;
              gap: 12px;
              margin-bottom: 16px;
              font-size: 13px;
              color: #666;
            ">
              <span style="text-transform: capitalize; font-weight: 500;">
                ${Formatters.sanitizeHTML(model.type)}
              </span>
              ${model.location ? `
                <span>📍 ${Formatters.sanitizeHTML(model.location)}</span>
              ` : ''}
            </div>

            <!-- Status Badge -->
            ${model.status ? `
              <div style="
                display: inline-block;
                padding: 6px 12px;
                background: ${model.status === 'approved' ? '#d4edda' : model.status === 'rejected' ? '#f8d7da' : '#d1ecf1'};
                color: ${model.status === 'approved' ? '#155724' : model.status === 'rejected' ? '#721c24' : '#0c5460'};
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 16px;
                text-transform: capitalize;
              ">
                ${Formatters.sanitizeHTML(model.status)}
              </div>
            ` : ''}

            <!-- Description/Bio -->
            ${model.description ? `
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #2f2f2f; text-transform: uppercase; letter-spacing: 0.5px;">
                  About
                </h4>
                <p style="
                  margin: 0;
                  font-size: 13px;
                  color: #666;
                  line-height: 1.6;
                ">
                  ${Formatters.sanitizeHTML(model.description)}
                </p>
              </div>
            ` : ''}

            <!-- Tags -->
            ${model.tags && model.tags.length > 0 ? `
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #2f2f2f; text-transform: uppercase; letter-spacing: 0.5px;">
                  Skills & Talents
                </h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  ${model.tags.map(tag => `
                    <span style="
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 6px 12px;
                      border-radius: 20px;
                      font-size: 12px;
                      font-weight: 500;
                    ">
                      ${Formatters.sanitizeHTML(tag)}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Additional Portfolio Images -->
            ${model.additionalPhotos && model.additionalPhotos.length > 0 ? `
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #2f2f2f; text-transform: uppercase; letter-spacing: 0.5px;">
                  Portfolio Gallery
                </h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                  ${model.additionalPhotos.map(photo => `
                    <div style="aspect-ratio: 1/1; border-radius: 8px; overflow: hidden; background: #f0f0f0; cursor: pointer;" onclick="window.open('${photo}', '_blank')">
                      <img src="${photo}" alt="Portfolio" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Contact Info - Email Blurred -->
            <div style="
              border-top: 1px solid #f0f0f0;
              padding-top: 16px;
            ">
              ${model.email ? `
                <div style="margin-bottom: 12px;">
                  <span style="font-size: 12px; color: #999;">Email:</span>
                  <div style="
                    font-size: 13px;
                    color: #2f2f2f;
                    filter: blur(4px);
                    user-select: none;
                    display: inline-block;
                  ">
                    ${Formatters.sanitizeHTML(model.email)}
                  </div>
                  <button 
                    onclick="requestModelDetails('${model.id}', '${model.email}')"
                    style="
                      margin-left: 8px;
                      padding: 4px 12px;
                      background: #FF8B00;
                      color: white;
                      border: none;
                      border-radius: 4px;
                      font-size: 12px;
                      cursor: pointer;
                      font-weight: 600;
                    "
                  >
                    Request
                  </button>
                </div>
              ` : ''}
              ${model.phone ? `
                <div>
                  <span style="font-size: 12px; color: #999;">Phone:</span>
                  <div style="
                    font-size: 13px;
                    color: #2f2f2f;
                    filter: blur(4px);
                    user-select: none;
                  ">
                    ${Formatters.sanitizeHTML(model.phone)}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <style>
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      </style>
    `;

    modal.style.display = 'flex';
  }

  async saveCreativeSettings(currentBusiness) {
    try {
      if (!this.selectedModel) {
        this.notifications.show('Please select a model', 'warning');
        return;
      }

      if (!currentBusiness || !currentBusiness._id) {
        this.notifications.show('Business information not found', 'error');
        return;
      }

      console.log('💾 Saving selected model to automation_settings:', {
        businessId: currentBusiness._id,
        modelId: this.selectedModel.id,
        modelName: this.selectedModel.name
      });

      // Prepare the update payload for automation_settings
      const updates = {
        'automation_settings.creative_settings.selected_model': {
          id: this.selectedModel.id,
          modelId: this.selectedModel.modelId || this.selectedModel.id,
          name: this.selectedModel.name,
          description: this.selectedModel.description,
          type: this.selectedModel.type,
          imageUrl: this.selectedModel.imageUrl,
          email: this.selectedModel.email,
          location: this.selectedModel.location,
          tags: this.selectedModel.tags || [],
          selectedAt: new Date().toISOString()
        }
      };

      // Optional: Also save selected voice if it exists
      if (this.selectedVoice) {
        updates['automation_settings.creative_settings.selected_voice'] = this.selectedVoice;
      }

      // Use the existing PATCH endpoint for business settings
      const response = await fetch(`/api/business-settings/${currentBusiness._id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save model selection');
      }

      const result = await response.json();

      this.notifications.show('Model selection saved successfully', 'success');
      console.log('✅ Model saved to automation_settings:', result);
      
      // Update the display
      this.updateSelectedModelDisplay();
      
      // Close the picker modal
      this.closeModelPicker();

      // Optional: Also add to business_creatives array for portfolio/history
      // You can keep this as a secondary action if needed
      await this.addModelToBusinessCreatives(currentBusiness._id, this.selectedModel);

    } catch (error) {
      console.error('❌ Error saving creative settings:', error);
      this.notifications.show(error.message || 'Failed to save model selection', 'error');
    }
  }

  // Optional helper method to also maintain business_creatives array
  async addModelToBusinessCreatives(businessId, model) {
    try {
      await fetch(`/api/business-creatives/add-to-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: businessId,
          model: model,
          modelId: model.id,
          addedAt: new Date().toISOString()
        })
      });
      console.log('✅ Model also added to business_creatives array');
    } catch (error) {
      console.warn('⚠️ Could not add to business_creatives array:', error);
      // Non-critical error, don't show to user
    }
  }

  // Save voice selection to automation_settings
  async saveVoiceSelection(voiceData) {
    try {
      if (!voiceData) {
        this.notifications.show('Please select a voice', 'warning');
        return;
      }

      if (!this.currentBusinessId) {
        this.notifications.show('Business information not found', 'error');
        return;
      }

      const updates = {
        'automation_settings.creative_settings.selected_voice': {
          id: voiceData.id,
          name: voiceData.name,
          provider: voiceData.provider,
          language: voiceData.language,
          selectedAt: new Date().toISOString()
        }
      };

      const response = await fetch(`/api/business-settings/${this.currentBusinessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to save voice selection');

      this.selectedVoice = voiceData;
      this.updateSelectedVoiceDisplay();
      this.notifications.show('Voice selection saved successfully', 'success');
      console.log('✅ Voice saved to automation_settings:', voiceData);

    } catch (error) {
      console.error('Error saving voice selection:', error);
      this.notifications.show(error.message, 'error');
    }
  }

  closeModelPicker() {
    const modal = document.getElementById('modelPickerModal');
    if (modal) modal.style.display = 'none';
  }
}

// Global function to request model contact details
window.requestModelDetails = async function(modelId, modelEmail) {
  try {
    // Get current user's email from Auth0
    const auth0User = JSON.parse(sessionStorage.getItem('auth0User') || '{}');
    const businessEmail = auth0User.email;

    if (!businessEmail) {
      alert('Please log in to request contact details');
      return;
    }

    // Get model name from modal if available
    const modelNameEl = document.querySelector('[data-model-name]');
    const modelName = modelNameEl?.textContent || 'Model';

    // Show loading state
    const requestBtn = event?.target;
    if (requestBtn) {
      requestBtn.disabled = true;
      requestBtn.textContent = 'Processing...';
    }

    // Call the mailgun API to request contact details
    const response = await fetch('/api/mailgun/request-contact-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        businessEmail: businessEmail,
        modelId: modelId,
        modelEmail: modelEmail,
        amount: 10,
        modelName: modelName
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to request contact details');
    }

    const result = await response.json();
    
    console.log('✅ Contact details requested successfully:', result);
    
    // Show success message
    if (window.notificationManager) {
      window.notificationManager.show(
        `Contact details sent! R${result.amount.toFixed(2)} deducted from wallet.`,
        'success'
      );
    } else {
      alert(`Contact details sent! R${result.amount.toFixed(2)} deducted from wallet.`);
    }

    // Update wallet display if available
    if (window.dataManager) {
      window.dataManager.clearWalletCache();
    }

    // Close the modal after 2 seconds
    setTimeout(() => {
      const modal = document.getElementById('modelDetailsModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }, 2000);

  } catch (error) {
    console.error('❌ Error requesting contact details:', error);
    
    if (window.notificationManager) {
      window.notificationManager.show(
        error.message || 'Failed to request contact details',
        'error'
      );
    } else {
      alert(error.message || 'Failed to request contact details');
    }

    // Reset button state
    const requestBtn = event?.target;
    if (requestBtn) {
      requestBtn.disabled = false;
      requestBtn.textContent = 'Request';
    }
  }
};

