/**
 * ModelSelector Component Example
 * 
 * Shows how to integrate ModelLoader into your forms
 * This component:
 * 1. Loads the default model from store_submissions
 * 2. Shows the selected model with details
 * 3. Allows changing the model via click
 * 4. Calls your callback when model is selected
 */

class ModelSelectorComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      label: 'Photography Model',
      storeInfo: null,
      onModelSelect: null,
      allowChange: true,
      showDetails: true,
      ...options
    };

    this.modelLoader = new ModelLoader();
    this.selectedModel = null;
    this.defaultModelId = null;
  }

  /**
   * Initialize the component
   */
  async init() {
    try {
      // Get default model ID from store_submissions
      this.defaultModelId = this.options.storeInfo?.photography_model_id;

      // Fetch models to get default
      await this.modelLoader.fetchModels();

      if (this.defaultModelId) {
        this.selectedModel = this.modelLoader.getModelById(this.defaultModelId);
      }

      // Render the component
      this.render();

      console.log('✅ ModelSelectorComponent initialized');
      return this;

    } catch (error) {
      console.error('Error initializing ModelSelectorComponent:', error);
      return null;
    }
  }

  /**
   * Render the component UI
   */
  render() {
    if (!this.container) {
      console.error('Container not found for ModelSelectorComponent');
      return;
    }

    const html = `
      <div class="model-selector-component">
        <div class="model-selector-component-header">
          <label class="model-selector-component-label">
            ${this.options.label}
            ${this.selectedModel ? ' ✓' : ' (Required)'}
          </label>
          ${this.options.allowChange ? `
            <button type="button" class="model-selector-change-btn">
              ${this.selectedModel ? 'Change Model' : 'Select Model'}
            </button>
          ` : ''}
        </div>

        ${this.selectedModel ? `
          <div class="model-selector-component-preview">
            ${this.selectedModel.imageUrl ? `
              <img 
                src="${this.selectedModel.imageUrl}" 
                alt="${this.selectedModel.name}"
                class="model-selector-component-image"
              />
            ` : `
              <div class="model-selector-component-placeholder">👤</div>
            `}

            <div class="model-selector-component-details">
              <h3>${this.selectedModel.name}</h3>
              <p class="model-type">${this.selectedModel.type}</p>
              
              ${this.selectedModel.location ? `
                <p class="model-location">📍 ${this.selectedModel.location}</p>
              ` : ''}

              ${this.selectedModel.tags.length > 0 ? `
                <div class="model-tags">
                  ${this.selectedModel.tags.slice(0, 3).map(tag => `
                    <span class="model-tag">${tag}</span>
                  `).join('')}
                </div>
              ` : ''}

              <p class="model-description">${this.selectedModel.description}</p>

              ${this.options.allowChange ? `
                <div class="model-selector-component-actions">
                  <button type="button" class="model-info-btn">View Full Profile</button>
                </div>
              ` : ''}
            </div>
          </div>
        ` : `
          <div class="model-selector-component-empty">
            <p>No model selected. Click "Select Model" to choose a photography model for this product.</p>
          </div>
        `}
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    const changeBtn = this.container.querySelector('.model-selector-change-btn');
    const viewProfileBtn = this.container.querySelector('.model-info-btn');

    if (changeBtn) {
      changeBtn.addEventListener('click', () => this.showSelector());
    }

    if (viewProfileBtn) {
      viewProfileBtn.addEventListener('click', () => this.showProfile());
    }
  }

  /**
   * Show model selector modal
   */
  async showSelector() {
    const selected = await this.modelLoader.showSelector({
      defaultModelId: this.selectedModel?.id,
      title: 'Select Photography Model',
      onSelect: (model) => {
        this.selectedModel = model;
        this.render();

        // Call callback
        this.options.onModelSelect?.(model);
      }
    });

    return selected;
  }

  /**
   * Show full profile modal
   */
  showProfile() {
    if (!this.selectedModel) return;

    // Create a simple profile modal
    const modal = document.createElement('div');
    modal.className = 'model-profile-modal';
    modal.innerHTML = `
      <div class="model-profile-overlay"></div>
      <div class="model-profile-content">
        <button class="model-profile-close" type="button">✕</button>

        <div class="model-profile-image">
          ${this.selectedModel.imageUrl ? `
            <img src="${this.selectedModel.imageUrl}" alt="${this.selectedModel.name}" />
          ` : '<div>👤</div>'}
        </div>

        <div class="model-profile-info">
          <h2>${this.selectedModel.name}</h2>
          <p class="model-type">${this.selectedModel.type}</p>
          
          ${this.selectedModel.location ? `
            <p class="model-location">📍 ${this.selectedModel.location}</p>
          ` : ''}

          <p class="model-description">${this.selectedModel.description}</p>

          ${this.selectedModel.tags.length > 0 ? `
            <div class="model-tags-container">
              <h4>Skills & Talents</h4>
              <div class="model-tags">
                ${this.selectedModel.tags.map(tag => `
                  <span class="model-tag">${tag}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="model-profile-actions">
          <button type="button" class="model-profile-select-btn">Select This Model</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add styles
    if (!document.getElementById('modelProfileStyles')) {
      const style = document.createElement('style');
      style.id = 'modelProfileStyles';
      style.textContent = `
        .model-profile-modal {
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

        .model-profile-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
        }

        .model-profile-content {
          position: relative;
          background: white;
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .model-profile-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: white;
          border: none;
          font-size: 24px;
          cursor: pointer;
          z-index: 10;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .model-profile-image {
          width: 100%;
          aspect-ratio: 1/1;
          overflow: hidden;
          background: #f0f0f0;
        }

        .model-profile-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .model-profile-info {
          padding: 24px;
        }

        .model-profile-info h2 {
          margin: 0 0 8px 0;
          color: #2f2f2f;
        }

        .model-type {
          margin: 0;
          color: #999;
          text-transform: capitalize;
        }

        .model-location {
          margin: 8px 0 0 0;
          color: #666;
        }

        .model-description {
          margin: 16px 0 0 0;
          line-height: 1.6;
          color: #666;
        }

        .model-tags-container {
          margin-top: 16px;
        }

        .model-tags-container h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #2f2f2f;
        }

        .model-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .model-tag {
          background: #FFF8F0;
          color: #FF8B00;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          border: 1px solid #FFD9BB;
        }

        .model-profile-actions {
          padding: 24px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .model-profile-select-btn {
          background: #FF8B00;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .model-profile-select-btn:hover {
          background: #E67E00;
        }
      `;
      document.head.appendChild(style);
    }

    // Attach event listeners
    const closeBtn = modal.querySelector('.model-profile-close');
    const overlay = modal.querySelector('.model-profile-overlay');
    const selectBtn = modal.querySelector('.model-profile-select-btn');

    const close = () => modal.remove();

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    selectBtn.addEventListener('click', () => {
      this.selectedModel = this.selectedModel;
      this.render();
      close();
      this.options.onModelSelect?.(this.selectedModel);
    });
  }

  /**
   * Get selected model
   */
  getSelectedModel() {
    return this.selectedModel;
  }

  /**
   * Set selected model programmatically
   */
  setSelectedModel(modelId) {
    this.selectedModel = this.modelLoader.getModelById(modelId);
    if (this.selectedModel) {
      this.render();
      return this.selectedModel;
    }
    return null;
  }

  /**
   * Add inline styles for this component
   */
  static injectStyles() {
    if (document.getElementById('modelSelectorComponentStyles')) return;

    const style = document.createElement('style');
    style.id = 'modelSelectorComponentStyles';
    style.textContent = `
      .model-selector-component {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
      }

      .model-selector-component-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #f9f9f9;
        border-bottom: 1px solid #e0e0e0;
      }

      .model-selector-component-label {
        font-weight: 600;
        color: #2f2f2f;
        margin: 0;
      }

      .model-selector-change-btn {
        padding: 8px 16px;
        background: #FF8B00;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
      }

      .model-selector-change-btn:hover {
        background: #E67E00;
      }

      .model-selector-component-preview {
        display: flex;
        gap: 16px;
        padding: 16px;
      }

      .model-selector-component-image {
        width: 120px;
        height: 120px;
        border-radius: 8px;
        object-fit: cover;
        flex-shrink: 0;
      }

      .model-selector-component-placeholder {
        width: 120px;
        height: 120px;
        border-radius: 8px;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        flex-shrink: 0;
      }

      .model-selector-component-details {
        flex: 1;
      }

      .model-selector-component-details h3 {
        margin: 0 0 4px 0;
        color: #2f2f2f;
      }

      .model-selector-component-details .model-type {
        margin: 0;
        font-size: 13px;
        color: #999;
        text-transform: capitalize;
      }

      .model-selector-component-details .model-location {
        margin: 4px 0 0 0;
        font-size: 13px;
        color: #666;
      }

      .model-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .model-tag {
        background: #FFF8F0;
        color: #FF8B00;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
        border: 1px solid #FFD9BB;
      }

      .model-description {
        margin-top: 8px;
        font-size: 13px;
        color: #666;
        line-height: 1.5;
      }

      .model-selector-component-actions {
        margin-top: 12px;
      }

      .model-info-btn {
        padding: 6px 12px;
        background: white;
        color: #FF8B00;
        border: 1px solid #FF8B00;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .model-info-btn:hover {
        background: #FFF8F0;
      }

      .model-selector-component-empty {
        padding: 24px;
        text-align: center;
        color: #999;
        background: #f9f9f9;
      }

      @media (max-width: 768px) {
        .model-selector-component-header {
          flex-direction: column;
          gap: 12px;
          align-items: flex-start;
        }

        .model-selector-component-preview {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
