# Cloudinary Integration - Code Reference

## Main Upload Function

```javascript
async function uploadToCloudinary(file, fieldName) {
  try {
    // 🔐 CONFIGURE THESE WITH YOUR CLOUDINARY CREDENTIALS:
    const cloudName = 'YOUR_CLOUDINARY_CLOUD_NAME';
    const uploadPreset = 'YOUR_CLOUDINARY_UPLOAD_PRESET';

    if (cloudName === 'YOUR_CLOUDINARY_CLOUD_NAME' || 
        uploadPreset === 'YOUR_CLOUDINARY_UPLOAD_PRESET') {
      throw new Error('❌ Cloudinary credentials not configured');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('public_id', `zuke-models/${fieldName}-${Date.now()}`);
    formData.append('folder', 'zuke-models');
    formData.append('resource_type', 'auto');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error('Cloudinary upload failed');
    }

    const data = await response.json();
    console.log(`✅ Uploaded to Cloudinary: ${fieldName}`, data.secure_url);
    return data.secure_url;

  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw error;
  }
}
```

---

## Form Submission with Image Upload

```javascript
async function submitRegistration() {
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Uploading images & submitting...';

  try {
    // Upload headshot to Cloudinary first
    let headshotUrl = null;
    if (headshotFile) {
      showStatus('⏳ Uploading headshot to Cloudinary...', 'uploading', 'phase3Status');
      headshotUrl = await uploadToCloudinary(headshotFile, 'headshot');
      if (!headshotUrl) {
        throw new Error('Failed to upload headshot');
      }
      showStatus('✅ Headshot uploaded successfully', 'success', 'phase3Status');
    }

    // Upload portfolio photos to Cloudinary
    const portfolioUrls = [];
    if (formData.portfolio.additionalPhotos && formData.portfolio.additionalPhotos.length > 0) {
      showStatus('⏳ Uploading portfolio photos...', 'uploading', 'phase3Status');
      for (let i = 0; i < formData.portfolio.additionalPhotos.length; i++) {
        const photoUrl = await uploadToCloudinary(
          formData.portfolio.additionalPhotos[i], 
          `portfolio-${i}`
        );
        if (photoUrl) {
          portfolioUrls.push(photoUrl);
        }
      }
      showStatus(`✅ ${portfolioUrls.length} portfolio photos uploaded`, 'success', 'phase3Status');
    }

    // Create registration data with Cloudinary URLs
    const registrationData = {
      personalInfo: {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        fullName: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        gender: document.getElementById('gender').value,
        dateOfBirth: document.getElementById('dateOfBirth').value,
        address: {
          city: document.getElementById('city').value,
          province: document.getElementById('province').value,
          country: document.getElementById('country').value,
          fullAddress: `${document.getElementById('city').value}, ${document.getElementById('province').value}, ${document.getElementById('country').value}`
        }
      },
      portfolio: {
        headshots: headshotUrl ? [headshotUrl] : [],
        additionalPhotos: portfolioUrls,
        socialMedia: {
          instagram: document.getElementById('instagram').value || null,
          twitter: document.getElementById('twitter').value || null,
          tiktok: document.getElementById('tiktok').value || null,
          facebook: document.getElementById('facebook').value || null
        }
      },
      professional: {
        skills: formData.professional.skills,
        talents: formData.professional.talents,
        hobbies: formData.professional.interests,
        interests: formData.professional.interests,
        bio: document.getElementById('bio').value || ''
      },
      agreements: {
        termsAgreed: document.getElementById('termsAgreed').checked,
        photoRelease: document.getElementById('photoRelease').checked,
        ageOfConsent: document.getElementById('ageOfConsent').checked,
        signature: 'digital-signature',
        dateSigned: new Date().toISOString()
      },
      metadata: {
        submissionDate: new Date().toISOString(),
        source: 'zuke-creative-portal',
        status: 'pending-review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    showStatus('⏳ Finalizing registration...', 'uploading', 'phase3Status');

    // Send to backend with Cloudinary URLs
    const response = await fetch('/api/creative-models/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const result = await response.json();
    
    showStatus(
      `✅ Registration submitted!\n\nThank you for joining Zuke Creative!\nYour application has been received and is under review.\nWe'll notify you via email (${registrationData.personalInfo.email}) once your profile is approved.`,
      'success',
      'phase3Status'
    );

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 3000);

  } catch (error) {
    console.error('Error submitting registration:', error);
    showStatus(error.message, 'error', 'phase3Status');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Complete Registration';
  }
}
```

---

## Headshot Upload Handler

```javascript
function handleHeadshotUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    showStatus('Please select an image file', 'error', 'phase2Status');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showStatus('File is too large (max 10MB)', 'error', 'phase2Status');
    return;
  }

  headshotFile = file;
  
  // Show local preview immediately
  const reader = new FileReader();
  reader.onload = (e) => {
    headshotPreview.src = e.target.result;
    headshotPreview.style.display = 'block';
    headshotBox.classList.add('has-image');
    removeHeadshotBtn.style.display = 'inline-block';
    showStatus(
      `✅ Headshot selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)\nWill be uploaded to Cloudinary when you submit.`,
      'success',
      'phase2Status'
    );
  };
  reader.readAsDataURL(file);
}
```

---

## Portfolio Upload Handler

```javascript
function handlePortfolioUpload(files) {
  if (!files || files.length === 0) return;

  const maxPhotos = 5;
  const totalPhotos = formData.portfolio.additionalPhotos.length + files.length;

  if (totalPhotos > maxPhotos) {
    showStatus(
      `You can only upload up to ${maxPhotos} portfolio photos. Currently have ${formData.portfolio.additionalPhotos.length}, trying to add ${files.length}.`,
      'error',
      'phase2Status'
    );
    return;
  }

  let successCount = 0;
  for (let file of files) {
    if (!file.type.startsWith('image/')) {
      showStatus('Please select only image files', 'error', 'phase2Status');
      continue;
    }

    if (file.size > 10 * 1024 * 1024) {
      showStatus(`File ${file.name} is too large (max 10MB)`, 'error', 'phase2Status');
      continue;
    }

    // Store file for later upload
    formData.portfolio.additionalPhotos.push(file);
    successCount++;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.createElement('div');
      preview.style.cssText = 'position: relative; border-radius: 8px; overflow: hidden; background: #f0f0f0; aspect-ratio: 1/1;';
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Portfolio preview" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" class="remove-image-btn" style="display: block;" onclick="removePortfolioPhoto(this)">Remove</button>
      `;
      portfolioGrid.appendChild(preview);
      portfolioPlaceholder.style.display = 'none';
      updateProgress();
    };
    reader.readAsDataURL(file);
  }

  if (successCount > 0) {
    showStatus(
      `✅ ${successCount} photo(s) selected. Will be uploaded to Cloudinary when you submit.`,
      'success',
      'phase2Status'
    );
  }
}

// Remove individual portfolio photo
window.removePortfolioPhoto = function(btn) {
  btn.parentElement.remove();
  formData.portfolio.additionalPhotos = [];
  if (portfolioGrid.children.length === 0) {
    portfolioPlaceholder.style.display = 'flex';
  }
  updateProgress();
};
```

---

## Read Images from MongoDB

```javascript
// In creative-panel.js - fetchAvailableModels()

const models = data.models.map(doc => {
  // Get headshot from portfolio - could be array or single object
  let headshot = null;
  if (doc.portfolio?.headshots) {
    if (Array.isArray(doc.portfolio.headshots) && doc.portfolio.headshots.length > 0) {
      // If array, get the first one (URL string)
      const first = doc.portfolio.headshots[0];
      headshot = typeof first === 'string' ? first : first.url || first.imageUrl;
    } else if (typeof doc.portfolio.headshots === 'string') {
      headshot = doc.portfolio.headshots;
    }
  }

  return {
    id: doc._id,
    name: doc.personalInfo?.fullName || 'Unknown',
    description: doc.professional?.bio || 'Professional model',
    type: doc.personalInfo?.gender || 'model',
    imageUrl: headshot,  // ← Cloudinary URL stored here!
    email: doc.personalInfo?.email,
    phone: doc.personalInfo?.phone,
    location: doc.personalInfo?.address?.city,
    status: doc.metadata?.status || 'pending-review'
  };
});
```

---

## Display Images in Grid

```javascript
// In creative-panel.js - renderModelsList()

<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px;">
  ${filteredModels.map(model => `
    <div style="border-radius: 12px; overflow: hidden;">
      <div style="aspect-ratio: 1/1; background: #f5f5f5;">
        ${model.imageUrl 
          ? `<img src="${model.imageUrl}" alt="${model.name}" style="width: 100%; height: 100%; object-fit: cover;">`
          : `<div style="font-size: 48px; padding: 60px 20px;">👤</div>`
        }
      </div>
      <div style="padding: 12px; text-align: center;">
        <div style="font-weight: 600;">${model.name}</div>
        <div style="font-size: 12px; color: #999;">${model.type}</div>
      </div>
    </div>
  `).join('')}
</div>
```

---

## Cloudinary API Response Example

When upload succeeds, you get:

```json
{
  "public_id": "zuke-models/headshot-1700000000000",
  "version": 1700000000,
  "signature": "abc123...",
  "width": 1920,
  "height": 1080,
  "format": "jpg",
  "resource_type": "image",
  "created_at": "2024-01-15T10:30:00Z",
  "tags": [],
  "bytes": 2048576,
  "type": "upload",
  "etag": "abc123...",
  "placeholder": false,
  "url": "http://res.cloudinary.com/dxyz1234abc/image/upload/v1700000000/zuke-models/headshot-1700000000000.jpg",
  "secure_url": "https://res.cloudinary.com/dxyz1234abc/image/upload/v1700000000/zuke-models/headshot-1700000000000.jpg",
  "folder": "zuke-models",
  "original_filename": "headshot-123456"
}
```

You extract and store: `data.secure_url` (the HTTPS URL) in MongoDB.

---

## Environment-Safe Configuration

For production, consider moving credentials:

```javascript
// Instead of hardcoded in HTML:
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

// But for client-side upload presets are public anyway:
// Upload presets are NOT sensitive - they're read-only operations
// The security comes from folder restrictions on the preset itself
```

---

## Testing in Console

```javascript
// Test upload function directly:
const testFile = document.getElementById('headshotInput').files[0];
uploadToCloudinary(testFile, 'test-photo').then(url => {
  console.log('Uploaded URL:', url);
}).catch(err => {
  console.error('Upload failed:', err);
});
```

