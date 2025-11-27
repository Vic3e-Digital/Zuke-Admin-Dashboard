/**
 * ModelLoader - Reusable utility for loading and displaying creative models
 * Square grid with info icons showing additional details on hover
 */

class ModelLoader {
  constructor(options = {}) {
    this.options = {
      cacheKey: 'creativeModels',
      apiEndpoint: '/api/creative-models/all?limit=100',
      ...options
    };
    
    this.models = [];
    this.selectedModel = null;
    this.modal = null;
  }

  async fetchModels(forceRefresh = false) {
    try {
      if (!forceRefresh && window.dataManager) {
        const cached = window.dataManager.getCreativeModels();
        if (cached && cached.length > 0) {
          console.log('📦 Using cached creative models:', cached.length);
          this.models = cached;
          return cached;
        }
      }

      console.log('🔄 Fetching creative models from API...');
      const response = await fetch(this.options.apiEndpoint);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.models || data.models.length === 0) {
        console.warn('⚠️ No models found');
        return [];
      }

      this.models = data.models.map(doc => this._transformModel(doc));
      console.log('✅ Fetched', this.models.length, 'models');

      if (window.dataManager) {
        window.dataManager.setCreativeModels(this.models);
      }

      return this.models;

    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  _transformModel(doc) {
    let headshot = null;
    if (doc.portfolio) {
      if (doc.portfolio.headshots) {
        if (Array.isArray(doc.portfolio.headshots) && doc.portfolio.headshots.length > 0) {
          const first = doc.portfolio.headshots[0];
          headshot = typeof first === 'string' ? first : first.url || first.imageUrl;
        } else if (typeof doc.portfolio.headshots === 'string') {
          headshot = doc.portfolio.headshots;
        }
      }
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
      status: doc.metadata?.status || 'pending-review'
    };
  }

  getModelById(modelId) {
    return this.models.find(m => m.id === modelId);
  }

  async showSelector(options = {}) {
    const {
      defaultModelId = null,
      onSelect = null,
      allowMultiple = false,
      title = 'Select a Model'
    } = options;

    if (this.models.length === 0) {
      await this.fetchModels();
    }

    this._createModal(defaultModelId, onSelect, allowMultiple, title);
    
    return new Promise((resolve) => {
      this.resolveModal = resolve;
    });
  }

  _createModal(defaultModelId, onSelect, allowMultiple, title) {
    const existingModal = document.getElementById('modelSelectorModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'modelSelectorModal';
    modal.className = 'model-selector-modal';
    modal.innerHTML = `
      <div class="model-selector-overlay"></div>
      <div class="model-selector-content">
        <div class="model-selector-header">
          <h2>${title}</h2>
          <button class="model-selector-close" type="button">✕</button>
        </div>

        <div class="model-selector-grid">
          ${this.models.map(model => `
            <div class="model-selector-card ${defaultModelId === model.id ? 'selected' : ''}" data-model-id="${model.id}">
              <div class="model-selector-image">
                ${model.imageUrl 
                  ? `<img src="${model.imageUrl}" alt="${model.name}" class="model-selector-img">`
                  : ''
                }
                <div class="model-selector-placeholder">👤</div>
              </div>
              <div class="model-selector-info">
                <div class="model-selector-header-row">
                  <h3>${model.name}</h3>
                  <button class="model-info-btn" type="button" data-model-id="${model.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </button>
                </div>
                <p class="model-selector-type">${model.type}</p>
                ${model.location ? `<p class="model-selector-location">📍 ${model.location}</p>` : ''}
                <div class="model-selector-tags">
                  ${model.tags.slice(0, 2).map(tag => `<span>${tag}</span>`).join('')}
                </div>
              </div>
              ${allowMultiple ? `<input type="checkbox" class="model-selector-checkbox" ${defaultModelId === model.id ? 'checked' : ''}>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="model-selector-actions">
          <button class="model-selector-btn cancel" type="button">Cancel</button>
          <button class="model-selector-btn confirm" type="button">Confirm Selection</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    if (!document.getElementById('modelSelectorStyles')) {
      this._injectStyles();
    }

    this._attachEventListeners(onSelect, allowMultiple);
    this._setupImageHandlers();
  }

  _setupImageHandlers() {
    const modal = this.modal;
    const images = modal.querySelectorAll('.model-selector-img');
    
    images.forEach(img => {
      const container = img.closest('.model-selector-image');
      const placeholder = container.querySelector('.model-selector-placeholder');
      
      // If image is already loaded (cached), hide placeholder
      if (img.complete && img.naturalHeight !== 0) {
        placeholder.classList.remove('show');
      }
      
      // When image loads successfully, hide placeholder
      img.addEventListener('load', () => {
        placeholder.classList.remove('show');
      });
      
      // If image fails, show placeholder
      img.addEventListener('error', () => {
        placeholder.classList.add('show');
      });
    });
    
    // For models without images, show placeholder
    modal.querySelectorAll('.model-selector-image').forEach(container => {
      const img = container.querySelector('.model-selector-img');
      const placeholder = container.querySelector('.model-selector-placeholder');
      
      if (!img) {
        placeholder.classList.add('show');
      }
    });
  }

  _attachEventListeners(onSelect, allowMultiple) {
    const modal = this.modal;
    const cards = modal.querySelectorAll('.model-selector-card');
    const closeBtn = modal.querySelector('.model-selector-close');
    const cancelBtn = modal.querySelector('.cancel');
    const confirmBtn = modal.querySelector('.confirm');
    const overlay = modal.querySelector('.model-selector-overlay');

    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.model-info-btn')) return;

        if (allowMultiple) {
          const checkbox = card.querySelector('.model-selector-checkbox');
          checkbox.checked = !checkbox.checked;
          card.classList.toggle('selected');
        } else {
          cards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        }
      });

      const infoBtn = card.querySelector('.model-info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const modelId = infoBtn.dataset.modelId;
          const model = this.getModelById(modelId);
          this._showModelDetails(model);
        });
      }
    });

    const closeModal = () => {
      modal.remove();
      this.resolveModal?.(null);
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    confirmBtn.addEventListener('click', () => {
      if (allowMultiple) {
        const selected = Array.from(cards)
          .filter(card => card.classList.contains('selected'))
          .map(card => this.getModelById(card.dataset.modelId));
        
        this.selectedModel = selected;
      } else {
        const selected = modal.querySelector('.model-selector-card.selected');
        if (selected) {
          this.selectedModel = this.getModelById(selected.dataset.modelId);
        }
      }

      if (this.selectedModel) {
        onSelect?.(this.selectedModel);
        this.resolveModal?.(this.selectedModel);
      }

      modal.remove();
    });
  }

  _showModelDetails(model) {
    const detailPanel = document.createElement('div');
    detailPanel.className = 'model-detail-panel';
    detailPanel.innerHTML = `
      <div class="model-detail-overlay"></div>
      <div class="model-detail-content">
        <button class="model-detail-close" type="button">✕</button>
        
        <div class="model-detail-image">
          ${model.imageUrl 
            ? `<img src="${model.imageUrl}" alt="${model.name}">`
            : '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f5f5f5;font-size:64px;">👤</div>'
          }
        </div>

        <div class="model-detail-info">
          <h2>${model.name}</h2>
          
          <div class="detail-section">
            <h3>Profile</h3>
            <p class="detail-item"><strong>Type:</strong> ${model.type || 'Model'}</p>
            ${model.location ? `<p class="detail-item"><strong>Location:</strong> ${model.location}</p>` : ''}
            <p class="detail-item"><strong>Status:</strong> <span class="status-badge">${model.status || 'Active'}</span></p>
          </div>

          <div class="detail-section">
            <h3>About</h3>
            <p class="detail-description">${model.description || 'No description available'}</p>
          </div>

          ${model.email ? `
            <div class="detail-section">
              <h3>Contact</h3>
              <p class="detail-item"><strong>Email:</strong> <a href="mailto:${model.email}">${model.email}</a></p>
              ${model.phone ? `<p class="detail-item"><strong>Phone:</strong> ${model.phone}</p>` : ''}
            </div>
          ` : ''}

          ${model.tags && model.tags.length > 0 ? `
            <div class="detail-section">
              <h3>Skills & Talents</h3>
              <div class="detail-tags">
                ${model.tags.map(tag => `<span class="detail-tag">${tag}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <button class="detail-select-btn" type="button">Select This Model</button>
        </div>
      </div>
    `;

    document.body.appendChild(detailPanel);

    if (!document.getElementById('modelDetailStyles')) {
      this._injectDetailStyles();
    }

    const closeBtn = detailPanel.querySelector('.model-detail-close');
    const overlay = detailPanel.querySelector('.model-detail-overlay');
    const selectBtn = detailPanel.querySelector('.detail-select-btn');

    const closeDetail = () => {
      detailPanel.remove();
    };

    closeBtn.addEventListener('click', closeDetail);
    overlay.addEventListener('click', closeDetail);
    selectBtn.addEventListener('click', closeDetail);
  }

  _injectDetailStyles() {
    const style = document.createElement('style');
    style.id = 'modelDetailStyles';
    style.textContent = `
      .model-detail-panel {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .model-detail-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
      }

      .model-detail-content {
        position: relative;
        background: white;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 85vh;
        display: flex;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .model-detail-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10002;
        transition: all 0.2s;
      }

      .model-detail-close:hover {
        background: #f5f5f5;
      }

      .model-detail-image {
        width: 45%;
        aspect-ratio: 3/4;
        overflow: hidden;
        background: #f5f5f5;
        flex-shrink: 0;
      }

      .model-detail-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .model-detail-info {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      .model-detail-info h2 {
        margin: 0 0 20px 0;
        font-size: 24px;
        color: #2f2f2f;
      }

      .detail-section {
        margin-bottom: 20px;
      }

      .detail-section h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #666;
        text-transform: uppercase;
      }

      .detail-item {
        margin: 8px 0;
        font-size: 14px;
        color: #555;
      }

      .detail-item a {
        color: #FF8B00;
        text-decoration: none;
      }

      .status-badge {
        display: inline-block;
        background: #E8F5E9;
        color: #2E7D32;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
      }

      .detail-description {
        margin: 0;
        font-size: 14px;
        color: #666;
        line-height: 1.6;
      }

      .detail-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .detail-tag {
        display: inline-block;
        background: #FFF8F0;
        color: #FF8B00;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        border: 1px solid #FFE5CC;
      }

      .detail-select-btn {
        margin-top: auto;
        padding: 12px 16px;
        background: #FF8B00;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }

      .detail-select-btn:hover {
        background: #E67E00;
      }
    `;
    document.head.appendChild(style);
  }

  _injectStyles() {
    const style = document.createElement('style');
    style.id = 'modelSelectorStyles';
    style.textContent = `
      .model-selector-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .model-selector-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
      }

      .model-selector-content {
        position: relative;
        background: white;
        border-radius: 12px;
        max-width: 900px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .model-selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        border-bottom: 1px solid #e0e0e0;
      }

      .model-selector-header h2 {
        margin: 0;
        font-size: 20px;
        color: #2f2f2f;
      }

      .model-selector-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 32px;
        height: 32px;
      }

      .model-selector-grid {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 16px;
        align-content: start;
      }

      .model-selector-card {
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        // overflow: hidden;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .model-selector-card:hover {
        border-color: #FF8B00;
        box-shadow: 0 4px 12px rgba(255, 139, 0, 0.1);
      }

      .model-selector-card.selected {
        border-color: #FF8B00;
        background: #FFF8F0;
      }

      .model-selector-image {
        width: 100%;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        background: #f5f5f5;
        position: relative;
        flex-shrink: 0;
      }

      .model-selector-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .model-selector-placeholder {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        color: #ccc;
        background: #f5f5f5;
      }

      .model-selector-placeholder.show {
        display: flex;
      }

      .model-selector-info {
        padding: 12px;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .model-selector-header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 4px;
      }

      .model-selector-info h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #2f2f2f;
        flex: 1;
      }

      .model-info-btn {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FF8B00;
        cursor: pointer;
        background: transparent;
        border: none;
        padding: 0;
        transition: all 0.2s;
      }

      .model-info-btn:hover {
        color: #E67E00;
        transform: scale(1.2);
      }

      .model-info-btn svg {
        width: 16px;
        height: 16px;
      }

      .model-selector-type {
        margin: 0;
        font-size: 12px;
        color: #999;
        text-transform: capitalize;
      }

      .model-selector-location {
        margin: 4px 0 0 0;
        font-size: 11px;
        color: #666;
      }

      .model-selector-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;
      }

      .model-selector-tags span {
        display: inline-block;
        background: #f0f0f0;
        color: #666;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 10px;
      }

      .model-selector-actions {
        display: flex;
        gap: 12px;
        padding: 24px;
        border-top: 1px solid #e0e0e0;
        justify-content: flex-end;
      }

      .model-selector-btn {
        padding: 10px 20px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        background: white;
        color: #2f2f2f;
      }

      .model-selector-btn:hover {
        border-color: #999;
        background: #f9f9f9;
      }

      .model-selector-btn.confirm {
        background: #FF8B00;
        color: white;
        border-color: #FF8B00;
      }

      .model-selector-btn.confirm:hover {
        background: #E67E00;
      }
    `;
    document.head.appendChild(style);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModelLoader;
}
