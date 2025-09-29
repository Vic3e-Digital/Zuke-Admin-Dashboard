// pages/image-upload.js
let auth0Client = null;
let selectedFiles = [];
let uploadedUrls = [];

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

export async function initImageUploadPage() {
  const auth0Client = await getAuth0Client();
  
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }

  const modal = document.getElementById("uploadModal");
  const closeBtn = document.getElementsByClassName("close")[0];
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');

  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    if (!isAuthenticated) {
      console.error("User not authenticated");
      window.location.href = '/';
      return;
    }

    // Open modal button
    const openBtn = document.getElementById("openUploadModalBtn");
    if (openBtn) {
      openBtn.onclick = function(e) {
        e.stopPropagation();
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
      }
    }

    // Setup drag and drop
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
    });

    // Close handlers
    if (closeBtn) {
      closeBtn.onclick = function() {
        closeModal();
      }
    }

    window.addEventListener('click', function(event) {
      if (event.target == modal) {
        closeModal();
      }
    });

  } catch (error) {
    console.error("Error in initImageUploadPage:", error);
  }
}

function handleFiles(files) {
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreviewGrid = document.getElementById('imagePreviewGrid');
  const submitBtn = document.getElementById('submitBtn');

  for (let file of files) {
    if (!window.CLOUDINARY_CONFIG.acceptedFormats.includes(file.type)) {
      alert(`${file.name} is not a supported image format`);
      continue;
    }

    if (file.size > window.CLOUDINARY_CONFIG.maxFileSize) {
      alert(`${file.name} exceeds the maximum file size of 10MB`);
      continue;
    }

    selectedFiles.push(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewItem = document.createElement('div');
      previewItem.className = 'image-preview-item';
      previewItem.innerHTML = `
        <img src="${e.target.result}" alt="${file.name}">
        <button class="remove-btn" onclick="removeImage('${file.name}')">×</button>
      `;
      imagePreviewGrid.appendChild(previewItem);
    };
    reader.readAsDataURL(file);
  }

  if (selectedFiles.length > 0) {
    imagePreviewContainer.style.display = 'block';
    submitBtn.disabled = false;
  }
}

window.removeImage = function(fileName) {
  selectedFiles = selectedFiles.filter(file => file.name !== fileName);
  
  // Rebuild preview grid
  const imagePreviewGrid = document.getElementById('imagePreviewGrid');
  imagePreviewGrid.innerHTML = '';
  
  selectedFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewItem = document.createElement('div');
      previewItem.className = 'image-preview-item';
      previewItem.innerHTML = `
        <img src="${e.target.result}" alt="${file.name}">
        <button class="remove-btn" onclick="removeImage('${file.name}')">×</button>
      `;
      imagePreviewGrid.appendChild(previewItem);
    };
    reader.readAsDataURL(file);
  });

  if (selectedFiles.length === 0) {
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('submitBtn').disabled = true;
  }
};

window.clearUploads = function() {
  selectedFiles = [];
  uploadedUrls = [];
  document.getElementById('imagePreviewGrid').innerHTML = '';
  document.getElementById('imagePreviewContainer').style.display = 'none';
  document.getElementById('instructions').value = '';
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('fileInput').value = '';
};

window.submitImages = async function() {
  const instructions = document.getElementById('instructions').value.trim();
  
  if (!instructions) {
    alert('Please enter instructions');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  submitBtn.disabled = true;
  uploadProgress.style.display = 'block';

  try {
    // Get user info for the webhook
    const user = await auth0Client.getUser();
    const currentBusiness = window.dataManager.getSelectedBusinessOrFirst();

    // Upload images to Cloudinary
    uploadedUrls = [];
    const totalFiles = selectedFiles.length;
    let uploadedCount = 0;

    for (let file of selectedFiles) {
      progressText.textContent = `Uploading image ${uploadedCount + 1} of ${totalFiles}...`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', window.CLOUDINARY_CONFIG.uploadPreset);
      formData.append('folder', `businesses/${currentBusiness?._id || 'general'}`);

      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CONFIG.cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData
          }
        );

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const data = await response.json();
        uploadedUrls.push({
          url: data.secure_url,
          public_id: data.public_id,
          format: data.format,
          width: data.width,
          height: data.height,
          size: data.bytes,
          original_filename: file.name
        });

        uploadedCount++;
        const progress = (uploadedCount / totalFiles) * 100;
        progressFill.style.width = `${progress}%`;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    if (uploadedUrls.length === 0) {
      throw new Error('No images were uploaded successfully');
    }

    // Send to webhook
    progressText.textContent = 'Sending data to webhook...';
    
    const webhookData = {
      timestamp: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name
      },
      business: {
        id: currentBusiness?._id,
        name: currentBusiness?.store_info?.name
      },
      images: uploadedUrls,
      instructions: instructions,
      metadata: {
        totalImages: uploadedUrls.length,
        uploadedAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
    };

    // Replace with your actual webhook URL
    const WEBHOOK_URL = 'https://your-webhook-url.com/endpoint';
    
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    if (!webhookResponse.ok) {
      throw new Error('Failed to send data to webhook');
    }

    // Success!
    progressText.textContent = 'Success! All images uploaded.';
    progressFill.style.width = '100%';
    
    // Show success message
    setTimeout(() => {
      alert(`Successfully uploaded ${uploadedUrls.length} images!`);
      closeModal();
      clearUploads();
    }, 1500);

  } catch (error) {
    console.error('Error during submission:', error);
    alert('Error: ' + error.message);
    submitBtn.disabled = false;
    uploadProgress.style.display = 'none';
  }
};

function closeModal() {
  const modal = document.getElementById('uploadModal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
  
  // Reset progress
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('progressFill').style.width = '0%';
}

// Export function to get uploaded URLs (useful for other features)
window.getUploadedUrls = function() {
  return uploadedUrls;
};