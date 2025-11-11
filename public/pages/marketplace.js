// pages/marketing.js
let auth0Client = null;
let currentBusiness = null;

async function getAuth0Client() {
  if (window.auth0Client) {
    return window.auth0Client;
  }
  try {
    const response = await fetch("/auth_config.json");
    const config = await response.json();
    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
    window.auth0Client = auth0Client;
    return auth0Client;
  } catch (error) {
    console.error("Error configuring Auth0:", error);
    return null;
  }
}

// Function to load social media cards
async function loadSocialMediaCards(userEmail, userName) {
  return `
      <!-- Text + AI Image Card -->
      <div class="sim-card" id="textAIImageCard">
        <div class="sim-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5 2 4 3 4 4V20C4 21 5 22 6 22H18C19 22 20 21 20 20V8L14 2Z" stroke="#323544" stroke-width="2"/>
            <polyline points="14,2 14,8 20,8" stroke="#323544" stroke-width="2"/>
            <line x1="8" y1="13" x2="16" y2="13" stroke="#323544" stroke-width="2" opacity="0.4"/>
            <line x1="8" y1="17" x2="13" y2="17" stroke="#323544" stroke-width="2" opacity="0.4"/>
            <rect x="14" y="16" width="4" height="4" rx="1" fill="#323544" opacity="0.4"/>
          </svg>
        </div>
        <div class="sim-content">
          <div class="sim-body">
            <div class="sim-info">
              <h3 class="sim-name">Text + AI Image</h3>
              <p class="sim-description">Combine compelling text with AI-generated images for unique social media posts.</p>
            </div>
            <button class="sim-action-btn" data-action="textAIImage" aria-label="Open Text + AI Image Creator">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path opacity="0.4" d="M17.4672 5.47445C17.7601 5.18157 18.2349 5.18157 18.5278 5.47445C18.8207 5.76735 18.8207 6.24211 18.5278 6.535L6.53168 18.5311C6.23878 18.824 5.76402 18.824 5.47113 18.5311C5.17825 18.2382 5.17824 17.7634 5.47113 17.4705L17.4672 5.47445Z" fill="#323544"/>
                <path d="M18.7478 14.9936C18.7479 15.4078 18.412 15.7435 17.9978 15.7436C17.5839 15.7435 17.2482 15.4084 17.2478 14.9946L18.7478 14.9936ZM17.9958 5.25238L18.072 5.25629C18.4501 5.29477 18.7448 5.61422 18.7449 6.00238L18.7478 14.9936H17.9978L17.2478 14.9946L17.2449 6.7514L8.99976 6.74945L8.92261 6.74554C8.54461 6.70692 8.24975 6.38759 8.24976 5.99945C8.2499 5.58532 8.58566 5.24945 8.99976 5.24945L17.9958 5.25238Z" fill="#323544"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
  `;
}

// Function to render AI Image Editor
function renderAIImageEditor(container, userEmail, userName) {
  container.innerHTML = `
    <style>
      /* AI Image Editor Styles */
      .ai-editor-container * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .ai-editor-container {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
        padding: 20px;
      }

      .ai-editor-content {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }

      .ai-editor-title {
        color: #333;
        margin-bottom: 10px;
        text-align: center;
      }

      .ai-editor-subtitle {
        text-align: center;
        color: #666;
        margin-bottom: 30px;
      }

      .mode-selector {
        display: flex;
        justify-content: center;
        margin-bottom: 40px;
        gap: 20px;
      }

      .mode-btn {
        padding: 12px 30px;
        border: 2px solid #ddd;
        background: white;
        border-radius: 25px;
        cursor: pointer;
        transition: all 0.3s;
        font-size: 16px;
      }

      .mode-btn.active {
        background: #6366f1;
        color: white;
        border-color: #6366f1;
      }

      .mode-btn:hover:not(.active) {
        border-color: #6366f1;
        color: #6366f1;
      }

      .mode-description {
        text-align: center;
        color: #666;
        margin-bottom: 30px;
        padding: 20px;
        background: #f9f9f9;
        border-radius: 8px;
      }

      .templates {
        margin-bottom: 30px;
        display: none;
      }

      .templates.active {
        display: block;
      }

      .templates h3 {
        margin-bottom: 15px;
        color: #666;
      }

      .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }

      .template-item {
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
        text-align: center;
        font-size: 14px;
      }

      .template-item:hover {
        border-color: #6366f1;
        background: #f0f0ff;
      }

      .model-gallery {
        margin-bottom: 40px;
        display: none;
      }

      .model-gallery.active {
        display: block;
      }

      .model-gallery h3 {
        margin-bottom: 15px;
        color: #666;
      }

      .model-images {
        display: flex;
        gap: 15px;
        overflow-x: auto;
        padding: 10px;
        background: #f9f9f9;
        border-radius: 8px;
      }

      .model-item {
        min-width: 120px;
        height: 120px;
        border: 2px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
        cursor: move;
        transition: all 0.3s ease;
      }

      .model-item:hover {
        transform: scale(1.05);
        border-color: #4CAF50;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }

      .model-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        pointer-events: none;
      }

      .drop-zones {
        display: none;
        gap: 40px;
        margin-bottom: 30px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .drop-zones.active {
        display: flex;
      }

      .single-zone {
        display: none;
        max-width: 600px;
        margin: 0 auto 30px;
      }

      .single-zone.active {
        display: block;
      }

      .drop-container {
        flex: 1;
        min-width: 300px;
        max-width: 400px;
      }

      .drop-container h3 {
        margin-bottom: 15px;
        color: #333;
      }

      .drop-zone {
        width: 100%;
        height: 250px;
        border: 3px dashed #ccc;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #fafafa;
        position: relative;
        transition: all 0.3s ease;
      }

      .single-zone .drop-zone {
        height: 350px;
      }

      .drop-zone.dragover {
        border-color: #6366f1;
        background-color: #f0f0ff;
      }

      .drop-zone.has-image {
        border-style: solid;
        border-color: #6366f1;
      }

      .drop-zone-text {
        text-align: center;
        color: #999;
        font-size: 16px;
      }

      .preview-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: none;
      }

      .upload-btn {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: #2196F3;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }

      .upload-btn:hover {
        background: #1976D2;
      }

      .remove-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: #f44336;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        display: none;
        font-size: 12px;
      }

      .instruction-input {
        width: 100%;
        margin-top: 15px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        resize: vertical;
        min-height: 80px;
      }

      .submit-container {
        text-align: center;
        margin-top: 30px;
      }

      .submit-btn {
        background: #6366f1;
        color: white;
        border: none;
        padding: 15px 40px;
        font-size: 18px;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.3s ease;
      }

      .submit-btn:hover {
        background: #4f46e5;
      }

      .submit-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .result-container {
        display: none;
        margin-top: 40px;
        padding: 20px;
        background: #f0f8ff;
        border-radius: 8px;
        border: 1px solid #6366f1;
      }

      .result-container h3 {
        color: #333;
        margin-bottom: 15px;
      }

      .result-image {
        max-width: 100%;
        margin-top: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .loading-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }

      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #6366f1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }

      .loading-text {
        color: white;
        font-size: 18px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .hidden-input {
        display: none;
      }
    </style>

    <div class="ai-editor-container">
      <div class="ai-editor-content">
        <h1 class="ai-editor-title">AI Image Editor</h1>
        <p class="ai-editor-subtitle">Upload images and provide instructions for AI editing</p>
        
        <div class="mode-selector">
          <button class="mode-btn active" onclick="window.aiEditorSetMode('single')">Single Image</button>
          <button class="mode-btn" onclick="window.aiEditorSetMode('dual')">Image with Models</button>
        </div>

        <div class="mode-description" id="aiModeDescription">
          <strong>Single Image Mode:</strong> Upload one image and provide instructions (e.g., change background, remove objects, apply effects)
        </div>

        <div class="templates active" id="aiSingleTemplates">
          <h3>Quick Templates (Click to use):</h3>
          <div class="template-grid">
            <div class="template-item" onclick="window.aiEditorUseTemplate('single', 'Change the background to a beach with sunset')">🏖️ Beach Background</div>
            <div class="template-item" onclick="window.aiEditorUseTemplate('single', 'Make it look like a vintage photograph with sepia tones')">📸 Vintage Style</div>
            <div class="template-item" onclick="window.aiEditorUseTemplate('single', 'Remove the background completely')">✂️ Remove Background</div>
            <div class="template-item" onclick="window.aiEditorUseTemplate('single', 'Transform into anime style illustration')">🎨 Anime Style</div>
            <div class="template-item" onclick="window.aiEditorUseTemplate('single', 'Add dramatic lighting and shadows')">💡 Dramatic Lighting</div>
            <div class="template-item" onclick="window.aiEditorUseTemplate('single', 'Convert to professional product photography on white background')">📦 Product Photo</div>
          </div>
        </div>

        <div class="model-gallery" id="aiModelGallery">
          <h3>Step 1: Select a Model Image (Drag to Box 1)</h3>
          <div class="model-images" id="aiModelImagesContainer"></div>
        </div>
        
        <div class="single-zone active" id="aiSingleZone">
          <div class="drop-container">
            <h3>Upload Your Image</h3>
            <div class="drop-zone" id="aiDropZoneSingle">
              <div class="drop-zone-text">Drop your image here or click to upload</div>
              <img class="preview-image" id="aiPreviewSingle" alt="Preview">
              <button class="upload-btn" onclick="window.aiEditorTriggerFileInput('single')">Upload</button>
              <button class="remove-btn" onclick="window.aiEditorRemoveImage('single')">Remove</button>
            </div>
            <textarea class="instruction-input" id="aiInstructionSingle" placeholder="Enter your instructions (e.g., 'Change the background to a beach', 'Remove the background', 'Make it look vintage')"></textarea>
          </div>
        </div>

        <div class="drop-zones" id="aiDualZone">
          <div class="drop-container">
            <h3>Box 1: Model/Reference Image</h3>
            <div class="drop-zone" id="aiDropZone1">
              <div class="drop-zone-text">Drag a model image here</div>
              <img class="preview-image" id="aiPreview1" alt="Preview">
              <button class="remove-btn" onclick="window.aiEditorRemoveImage(1)">Remove</button>
            </div>
            <textarea class="instruction-input" id="aiInstruction1" placeholder="Instructions for model image (e.g., 'Use this style')"></textarea>
          </div>

          <div class="drop-container">
            <h3>Box 2: Your Image</h3>
            <div class="drop-zone" id="aiDropZone2">
              <div class="drop-zone-text">Drop your image here or click to upload</div>
              <img class="preview-image" id="aiPreview2" alt="Preview">
              <button class="upload-btn" onclick="window.aiEditorTriggerFileInput(2)">Upload</button>
              <button class="remove-btn" onclick="window.aiEditorRemoveImage(2)">Remove</button>
            </div>
            <textarea class="instruction-input" id="aiInstruction2" placeholder="Instructions for your image (e.g., 'Apply the model style to this image')"></textarea>
          </div>
        </div>

        <div class="submit-container">
          <button class="submit-btn" id="aiSubmitBtn" onclick="window.aiEditorSubmitImages()">Submit</button>
        </div>

        <div class="result-container" id="aiResultContainer">
          <h3>Result</h3>
          <div id="aiResultContent"></div>
        </div>
      </div>

      <input type="file" class="hidden-input" id="aiFileInputSingle" accept="image/*">
      <input type="file" class="hidden-input" id="aiFileInput2" accept="image/*">

      <div class="loading-overlay" id="aiLoadingOverlay">
        <div class="loading-spinner"></div>
        <div class="loading-text" id="aiLoadingText">Processing your request...</div>
      </div>
    </div>
  `;

  initAIImageEditor();
}

// AI Image Editor initialization
function initAIImageEditor() {
  const CONFIG = {
    CLOUD_NAME: 'vic-3e',
    UPLOAD_PRESET: 'n8n-ai-preset',
    WEBHOOK_URL: 'https://aigents.southafricanorth.azurecontainer.io/webhook/fa8d8494-e06e-4c1c-9412-7eb4aba4bd59'
  };

  const modelImages = [
    { id: 1, url: 'https://res.cloudinary.com/vic-3e/image/upload/v1759830082/IMG_1668_lrxj8o.jpg', name: 'Model 1' },
    { id: 2, url: 'https://res.cloudinary.com/vic-3e/image/upload/v1759830051/IMG_1490_kvqkvl.jpg', name: 'Model 2' },
    { id: 3, url: 'https://res.cloudinary.com/vic-3e/image/upload/v1759779423/IMG-20241126-WA0047_c5klt2.jpg', name: 'Model 3' },
    { id: 4, url: 'https://res.cloudinary.com/vic-3e/image/upload/v1759912708/esme_witbooi_yellow_ldavng.png', name: 'Model 4' },
    { id: 5, url: 'https://res.cloudinary.com/vic-3e/image/upload/v1759781380/481568624_18272695681255798_2288483397882122213_n_r9h99v.jpg', name: 'Model 5' }
  ];

  let currentMode = 'single';
  let currentFileInput = null;
  let imageData = {
    single: { file: null, url: null },
    box1: { file: null, url: null, isModel: false },
    box2: { file: null, url: null, isModel: false }
  };

  function initModelGallery() {
    const gallery = document.getElementById('aiModelImagesContainer');
    if (!gallery) return;
    
    gallery.innerHTML = '';
    modelImages.forEach(model => {
      const div = document.createElement('div');
      div.className = 'model-item';
      div.draggable = true;
      div.ondragstart = (e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('modelData', JSON.stringify(model));
      };
      
      const img = document.createElement('img');
      img.src = model.url;
      img.alt = model.name;
      img.title = model.name;
      
      div.appendChild(img);
      gallery.appendChild(div);
    });
  }

  window.aiEditorSetMode = function(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const description = document.getElementById('aiModeDescription');
    const singleZone = document.getElementById('aiSingleZone');
    const dualZone = document.getElementById('aiDualZone');
    const singleTemplates = document.getElementById('aiSingleTemplates');
    const modelGallery = document.getElementById('aiModelGallery');
    
    if (mode === 'single') {
      description.innerHTML = '<strong>Single Image Mode:</strong> Upload one image and provide instructions (e.g., change background, remove objects, apply effects)';
      singleZone.classList.add('active');
      dualZone.classList.remove('active');
      singleTemplates.classList.add('active');
      modelGallery.classList.remove('active');
    } else {
      description.innerHTML = '<strong>Two Image Mode:</strong> Select a reference model image and upload your own image to apply styles or combine them';
      singleZone.classList.remove('active');
      dualZone.classList.add('active');
      singleTemplates.classList.remove('active');
      modelGallery.classList.add('active');
    }
    
    document.getElementById('aiResultContainer').style.display = 'none';
  };

  window.aiEditorUseTemplate = function(mode, prompt) {
    if (mode === 'single') {
      document.getElementById('aiInstructionSingle').value = prompt;
    }
  };

  const setupDragDrop = () => {
    const dropZoneSingle = document.getElementById('aiDropZoneSingle');
    const dropZone1 = document.getElementById('aiDropZone1');
    const dropZone2 = document.getElementById('aiDropZone2');

    [dropZoneSingle, dropZone1, dropZone2].forEach(zone => {
      if (!zone) return;
      
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });

      zone.addEventListener('dragleave', (e) => {
        zone.classList.remove('dragover');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        
        if (zone === dropZone1) {
          const modelData = e.dataTransfer.getData('modelData');
          if (modelData) {
            const model = JSON.parse(modelData);
            displayImage(1, model.url, null, true);
            imageData.box1 = { file: null, url: model.url, isModel: true };
          }
        } else {
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            const boxId = zone === dropZoneSingle ? 'single' : 2;
            processFile(files[0], boxId);
          }
        }
      });
    });
  };

  window.aiEditorTriggerFileInput = function(boxId) {
    if (boxId === 'single') {
      document.getElementById('aiFileInputSingle').click();
    } else {
      currentFileInput = boxId;
      document.getElementById('aiFileInput2').click();
    }
  };

  function processFile(file, boxId) {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        displayImage(boxId, e.target.result, file, false);
        if (boxId === 'single') {
          imageData.single = { file: file, url: e.target.result };
        } else {
          imageData[`box${boxId}`] = { file: file, url: e.target.result, isModel: false };
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function displayImage(boxId, url, file, isModel = false) {
    const idPrefix = boxId === 'single' ? 'Single' : boxId;
    const dropZone = document.getElementById(`aiDropZone${idPrefix}`);
    const preview = document.getElementById(`aiPreview${idPrefix}`);
    const text = dropZone.querySelector('.drop-zone-text');
    const removeBtn = dropZone.querySelector('.remove-btn');
    const uploadBtn = dropZone.querySelector('.upload-btn');
    
    preview.src = url;
    preview.style.display = 'block';
    text.style.display = 'none';
    removeBtn.style.display = 'block';
    if (uploadBtn) uploadBtn.style.display = 'none';
    dropZone.classList.add('has-image');
  }

  window.aiEditorRemoveImage = function(boxId) {
    const idPrefix = boxId === 'single' ? 'Single' : boxId;
    const dropZone = document.getElementById(`aiDropZone${idPrefix}`);
    const preview = document.getElementById(`aiPreview${idPrefix}`);
    const text = dropZone.querySelector('.drop-zone-text');
    const removeBtn = dropZone.querySelector('.remove-btn');
    const uploadBtn = dropZone.querySelector('.upload-btn');
    
    preview.src = '';
    preview.style.display = 'none';
    text.style.display = 'block';
    removeBtn.style.display = 'none';
    if (uploadBtn) uploadBtn.style.display = 'block';
    dropZone.classList.remove('has-image');
    
    if (boxId === 'single') {
      imageData.single = { file: null, url: null };
    } else {
      imageData[`box${boxId}`] = { file: null, url: null, isModel: false };
    }
  };

  async function uploadToCloudinary(file, url, isModel) {
    if (isModel && url) return url;

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CONFIG.CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CONFIG.UPLOAD_PRESET);

    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error('Cloudinary upload failed');
    }
  }

  window.aiEditorSubmitImages = async function() {
    const submitBtn = document.getElementById('aiSubmitBtn');
    const loadingOverlay = document.getElementById('aiLoadingOverlay');
    const loadingText = document.getElementById('aiLoadingText');
    
    if (currentMode === 'single') {
      if (!imageData.single.url) {
        alert('Please upload an image first.');
        return;
      }
      const instruction = document.getElementById('aiInstructionSingle').value.trim();
      if (!instruction) {
        alert('Please provide instructions for your image.');
        return;
      }
    } else {
      if (!imageData.box1.url || !imageData.box2.url) {
        alert('Please add both images before submitting.');
        return;
      }
      const instruction1 = document.getElementById('aiInstruction1').value.trim();
      const instruction2 = document.getElementById('aiInstruction2').value.trim();
      if (!instruction1 || !instruction2) {
        alert('Please provide instructions for both images.');
        return;
      }
    }

    submitBtn.disabled = true;
    loadingOverlay.style.display = 'flex';

    try {
      let payload;

      if (currentMode === 'single') {
        loadingText.textContent = 'Uploading image to cloud...';
        const imageUrl = await uploadToCloudinary(imageData.single.file, imageData.single.url, false);
        
        payload = {
          mode: 'single',
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          image: {
            url: imageUrl,
            instructions: document.getElementById('aiInstructionSingle').value.trim()
          }
        };
      } else {
        loadingText.textContent = 'Uploading images to cloud...';
        
        const [imageUrl1, imageUrl2] = await Promise.all([
          uploadToCloudinary(imageData.box1.file, imageData.box1.url, imageData.box1.isModel),
          uploadToCloudinary(imageData.box2.file, imageData.box2.url, imageData.box2.isModel)
        ]);

        payload = {
          mode: 'dual',
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          images: {
            model: {
              url: imageUrl1,
              instructions: document.getElementById('aiInstruction1').value.trim(),
              isModelImage: imageData.box1.isModel
            },
            product: {
              url: imageUrl2,
              instructions: document.getElementById('aiInstruction2').value.trim(),
              isModelImage: imageData.box2.isModel
            }
          }
        };
      }

      loadingText.textContent = 'Sending to AI service...';

      const response = await fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to submit to webhook');
      }

      const result = await response.json();
      displayResult(result);

    } catch (error) {
      console.error('Error:', error);
      alert('Error processing request: ' + error.message);
      document.getElementById('aiResultContainer').style.display = 'none';
    } finally {
      submitBtn.disabled = false;
      loadingOverlay.style.display = 'none';
    }
  };

  function displayResult(result) {
    const resultContainer = document.getElementById('aiResultContainer');
    const resultContent = document.getElementById('aiResultContent');

    let content = '';
    
    if (result.imageUrl || result.image_url) {
      const imageUrl = result.imageUrl || result.image_url;
      content = `
        <p><strong>Status:</strong> ✅ Successfully processed</p>
        ${result.message ? `<p><strong>Message:</strong> ${result.message}</p>` : ''}
        <img src="${imageUrl}" alt="Result" class="result-image">
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
          <button onclick="window.aiEditorDownloadImage('${imageUrl}')" class="submit-btn" style="padding: 10px 20px; font-size: 14px;">
            📥 Download
          </button>
          <button onclick="window.aiEditorResetAndEdit()" class="submit-btn" style="padding: 10px 20px; font-size: 14px; background: #f59e0b;">
            ✏️ Edit Again
          </button>
        </div>
      `;
    } else if (result.status || result.message) {
      content = `
        <p><strong>Status:</strong> ${result.status || 'Submitted'}</p>
        ${result.message ? `<p><strong>Message:</strong> ${result.message}</p>` : ''}
        ${result.requestId ? `<p><strong>Request ID:</strong> ${result.requestId}</p>` : ''}
        ${result.data ? `<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 10px;">${JSON.stringify(result.data, null, 2)}</pre>` : ''}
        <div style="margin-top: 20px;">
          <button onclick="window.aiEditorResetAndEdit()" class="submit-btn" style="padding: 10px 20px; font-size: 14px; background: #f59e0b;">
            ✏️ Try Again
          </button>
        </div>
      `;
    } else {
      content = `
        <p><strong>Response:</strong></p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(result, null, 2)}
        </pre>
        <div style="margin-top: 20px;">
          <button onclick="window.aiEditorResetAndEdit()" class="submit-btn" style="padding: 10px 20px; font-size: 14px; background: #f59e0b;">
            ✏️ Try Again
          </button>
        </div>
      `;
    }

    resultContent.innerHTML = content;
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  window.aiEditorDownloadImage = function(imageUrl) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `result_${Date.now()}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  window.aiEditorResetAndEdit = function() {
    if (currentMode === 'single') {
      document.getElementById('aiInstructionSingle').value = '';
    } else {
      document.getElementById('aiInstruction1').value = '';
      document.getElementById('aiInstruction2').value = '';
    }
    
    document.getElementById('aiResultContainer').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fileInputSingle = document.getElementById('aiFileInputSingle');
  const fileInput2 = document.getElementById('aiFileInput2');

  if (fileInputSingle) {
    fileInputSingle.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) processFile(file, 'single');
    });
  }

  if (fileInput2) {
    fileInput2.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) processFile(file, currentFileInput);
    });
  }

  initModelGallery();
  setupDragDrop();
}

function renderVideoUploadForm(container, userEmail, userName) {
  const WEBHOOK_URL = `https://aigent-staging.zuke.co.za/webhook/fbb44378-5d09-45f4-8393-19dbf91a317c?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`;
  
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'video-upload-wrapper';
  wrapper.innerHTML = `
    <div class="video-form-container">
      <div class="video-success-message" id="videoSuccessMessage" style="display: none;">
        Form submitted successfully! 🎉
      </div>
   
      <form id="videoContactForm">
        <div class="video-form-group">
          <input
            type="text"
            id="videoName"
            name="name"
            placeholder="Business Name"
            required
          >
        </div>
   
        <div class="video-option-card selected">
          <div class="video-option-title">Video Upload</div>
          <div class="video-option-subtitle">MP4 files only</div>
   
          <label for="videoFileInput" class="video-file-label">Choose Video</label>
          <input
            type="file"
            id="videoFileInput"
            name="file"
            class="video-file-input"
            accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
            required
          >
         
          <div class="video-file-info" id="videoFileInfo"></div>
        </div>
   
        <div class="video-form-group">
          <textarea
            id="videoNotes"
            name="notes"
            placeholder="Notes (optional)"
          ></textarea>
        </div>
   
        <button type="submit" class="video-submit-btn">
          <span>Submit</span>
        </button>
      </form>
    </div>
  `;
  
  container.appendChild(wrapper);
  
  const form = document.getElementById("videoContactForm");
  const fileInput = document.getElementById("videoFileInput");
  const fileInfo = document.getElementById("videoFileInfo");
  const successMessage = document.getElementById("videoSuccessMessage");

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert("Please select a video file only.");
        fileInput.value = "";
        fileInfo.textContent = "";
        return;
      }
      fileInfo.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
    } else {
      fileInfo.textContent = "";
    }
  });
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
  
    if (!fileInput.files[0]) {
      alert("Please select a video file to upload.");
      return;
    }
  
    try {
      const fileUrl = await uploadToCloudinary(fileInput.files[0]);
  
      const formData = new FormData();
      formData.append("name", document.getElementById("videoName").value);
      formData.append("notes", document.getElementById("videoNotes").value);
      formData.append("fileUrl", fileUrl);
  
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: formData
      });
     
      if (response.ok) {
        showSuccess();
      } else {
        throw new Error(`Webhook returned status ${response.status}`);
      }
  
    } catch (err) {
      console.error("Error:", err);
      alert("There was an error processing your submission. Please try again.");
    }
  });
  
  async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_preset");
  
    const response = await fetch("https://api.cloudinary.com/v1_1/dl0u8tzae/upload", {
      method: "POST",
      body: formData
    });
  
    const data = await response.json();
  
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error("Cloudinary upload failed");
    }
  }
  
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
  
  function showSuccess() {
    successMessage.style.display = "block";
    setTimeout(() => {
      successMessage.style.display = "none";
      form.reset();
      fileInfo.textContent = "";
    }, 3000);
  }
}

export async function initMarketingPage() {
  const auth0Client = await getAuth0Client();
  
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }

  const modal = document.getElementById("marketingModal");
  const modalTitle = document.getElementById("modalTitle");
  const iframe = document.getElementById("modalIframe");
  const closeBtn = document.getElementsByClassName("close")[0];

  // Function to show Coming Soon modal
  function showComingSoon(featureName) {
    const comingSoonHTML = `
      <div id="comingSoonModal" class="modal" style="display: block;">
        <div class="modal-content" style="max-width: 400px; text-align: center;">
          <span class="close" onclick="document.getElementById('comingSoonModal').remove(); document.body.style.overflow = 'auto';">&times;</span>
          <div style="padding: 30px 20px;">
            <div style="font-size: 64px; margin-bottom: 20px;">🛠️</div>
            <h2 style="margin: 0 0 15px 0; color: #2c3e50;">Coming Soon!</h2>
            <p style="color: #666; margin-bottom: 25px; line-height: 1.6;">
              <strong>${featureName}</strong> is currently in development and will be available soon.
            </p>
            <p style="color: #999; font-size: 14px; margin-bottom: 25px;">
              Stay tuned for exciting updates!
            </p>
            <button class="btn-primary" onclick="document.getElementById('comingSoonModal').remove(); document.body.style.overflow = 'auto';" style="width: 100%; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
              Got it!
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', comingSoonHTML);
    document.body.style.overflow = 'hidden';
  }

  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    if (!isAuthenticated) {
      console.error("User not authenticated");
      window.location.href = '/';
      return;
    }

    const user = await auth0Client.getUser();
    const userEmail = user.email || user.name || 'unknown';
    const userName = user.name || 'User';

    // Handle main card click - FIXED: Added click handler for the main card
    const mainCard = document.querySelector('.main-sim-card[data-category="store-management"]');
    if (mainCard) {
      mainCard.addEventListener('click', async function(e) {
        // Don't trigger if clicking the info icon
        if (e.target.closest('.main-sim-info-icon')) {
          return;
        }
        
        document.getElementById("marketingMainContent").style.display = "none";
        document.getElementById("socialMediaSubContent").style.display = "block";
        
        const socialMediaCardsDiv = document.getElementById("socialMediaCards");
        socialMediaCardsDiv.innerHTML = await loadSocialMediaCards(userEmail, userName);
        
        setupSocialMediaHandlers(userEmail, userName, modal, modalTitle, iframe);
      });
    }

    const mainPageButtons = document.querySelectorAll('#marketingMainContent .sim-action-btn[data-action]');
    mainPageButtons.forEach(button => {
      button.addEventListener('click', async function(e) {
        e.stopPropagation();
        const action = this.getAttribute('data-action');
        
        if (action === 'social-media') {
          document.getElementById("marketingMainContent").style.display = "none";
          document.getElementById("socialMediaSubContent").style.display = "block";
          
          const socialMediaCardsDiv = document.getElementById("socialMediaCards");
          socialMediaCardsDiv.innerHTML = await loadSocialMediaCards(userEmail, userName);
          
          setupSocialMediaHandlers(userEmail, userName, modal, modalTitle, iframe);
        } else if (action === 'email-marketing') {
          modalTitle.textContent = "Email Marketing";
          iframe.style.display = "block";
          iframe.src = `https://aigents.southafricanorth.azurecontainer.io/email-marketing?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`;
          modal.style.display = "block";
          document.body.style.overflow = 'hidden';
        } else if (action === 'analytics') {
          modalTitle.textContent = "Marketing Analytics";
          iframe.style.display = "block";
          iframe.src = `https://aigents.southafricanorth.azurecontainer.io/marketing-analytics?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`;
          modal.style.display = "block";
          document.body.style.overflow = 'hidden';
        }
      });
    });

    // Handle "Add Service" button with Coming Soon message
    const serviceBtn = document.getElementById('openServiceBtn');
    if (serviceBtn) {
      serviceBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showComingSoon('Add Service');
      });
    }

    window.backToMarketing = function() {
      document.getElementById("marketingMainContent").style.display = "block";
      document.getElementById("socialMediaSubContent").style.display = "none";
    }

    if (closeBtn) {
      closeBtn.onclick = function() {
        modal.style.display = "none";
        iframe.src = "";
        iframe.style.display = "block";
        const contentDiv = document.getElementById('modalContentDiv');
        if (contentDiv) contentDiv.remove();
        document.body.style.overflow = 'auto';
      }
    }

    window.addEventListener('click', function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
        iframe.src = "";
        iframe.style.display = "block";
        const contentDiv = document.getElementById('modalContentDiv');
        if (contentDiv) contentDiv.remove();
        document.body.style.overflow = 'auto';
      }
    });

  } catch (error) {
    console.error("Error in initMarketingPage:", error);
  }
}

function setupSocialMediaHandlers(userEmail, userName, modal, modalTitle, iframe) {
  const socialMediaActions = {
    postVideo: {
      title: "Post Video - Social Media Manager",
      renderContent: true
    },
    aiAgents: {
      title: "AI Agents - Social Media Automation",
      url: `https://aigents.southafricanorth.azurecontainer.io/social-agents?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
    },
    postImage: {
      title: "Post Image - Visual Content Creator",
      url: `https://aigents.southafricanorth.azurecontainer.io/image-post?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
    },
    textAIImage: {
      title: "AI Image Editor",
      renderAIEditor: true
    },
    createArticle: {
      title: "Article Creator - Long-form Content",
      url: `https://aigents.southafricanorth.azurecontainer.io/article-creator?Email=${encodeURIComponent(userEmail)}&Name=${encodeURIComponent(userName)}`
    }
  };

  const socialMediaButtons = document.querySelectorAll('#socialMediaCards .sim-action-btn[data-action]');
  socialMediaButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const action = this.getAttribute('data-action');
      const config = socialMediaActions[action];
      
      if (config) {
        modalTitle.textContent = config.title;
        
        if (config.renderAIEditor) {
          iframe.style.display = 'none';
          let contentDiv = document.getElementById('modalContentDiv');
          if (!contentDiv) {
            contentDiv = document.createElement('div');
            contentDiv.id = 'modalContentDiv';
            contentDiv.style.cssText = 'width: 100%; height: 600px; overflow: auto;';
            iframe.parentNode.insertBefore(contentDiv, iframe);
          }
          contentDiv.style.display = 'block';
          
          renderAIImageEditor(contentDiv, userEmail, userName);
        } else if (config.renderContent) {
          iframe.style.display = 'none';
          let contentDiv = document.getElementById('modalContentDiv');
          if (!contentDiv) {
            contentDiv = document.createElement('div');
            contentDiv.id = 'modalContentDiv';
            contentDiv.style.cssText = 'width: 100%; height: 500px; overflow: auto;';
            iframe.parentNode.insertBefore(contentDiv, iframe);
          }
          contentDiv.style.display = 'block';
          
          renderVideoUploadForm(contentDiv, userEmail, userName);
        } else {
          iframe.style.display = 'block';
          const contentDiv = document.getElementById('modalContentDiv');
          if (contentDiv) contentDiv.style.display = 'none';
          iframe.src = config.url;
        }
        
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    });
  });
}