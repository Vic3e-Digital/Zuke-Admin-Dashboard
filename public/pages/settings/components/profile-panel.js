import { Validators } from '../utils/validators.js';
import { Formatters } from '../utils/formatters.js';

export class ProfilePanelComponent {
  constructor(apiService, authService, cloudinaryService, notificationManager) {
    this.api = apiService;
    this.auth = authService;
    this.cloudinary = cloudinaryService;
    this.notifications = notificationManager;
    this.isEditingProfile = false;
    this.originalProfilePicture = '';
  }

  async render(currentBusiness) {
    await this.populateUserProfile();
    this.populateBusinessProfile(currentBusiness);
    this.setupEventListeners(currentBusiness);
  }

  async populateUserProfile() {
    try {
      const user = await this.auth.getUser();

      if (user) {
        this.setElementContent('profilePicture', user.picture || '/images/default-avatar.png', 'src');
        this.setElementContent('profileName', user.name || 'N/A');
        this.setElementContent('profileEmail', user.email || 'N/A');
        this.setElementContent('profileSub', user.sub || 'N/A');
        this.setElementContent('profileEmailVerified', user.email_verified ? 'Yes ✓' : 'No ✗');
        
        if (user.updated_at) {
          this.setElementContent('profileUpdated', Formatters.formatDate(user.updated_at));
        }
      }
    } catch (error) {
      console.error('Error loading Auth0 user profile:', error);
    }
  }

  populateBusinessProfile(currentBusiness) {
    if (!currentBusiness) return;

    this.setElementContent('businessProfileId', currentBusiness._id || 'N/A');
    this.setElementContent('businessProfileName', currentBusiness.store_info?.name || 'N/A');
    this.setElementContent('businessProfileEmail', currentBusiness.personal_info?.email || 'N/A');
    this.setElementContent('businessProfilePhone', currentBusiness.personal_info?.phone || 'N/A');
    this.setElementContent('businessProfileAddress', currentBusiness.store_info?.address || 'N/A');

    // Category handling
    const categories = currentBusiness.store_info?.category;
    if (Array.isArray(categories)) {
      this.setElementContent('businessProfileCategory', categories.join(', '));
    } else if (categories) {
      this.setElementContent('businessProfileCategory', categories);
    } else {
      this.setElementContent('businessProfileCategory', 'N/A');
    }

    // Dates
    if (currentBusiness.created_at) {
      this.setElementContent('businessProfileCreated', Formatters.formatDate(currentBusiness.created_at));
    }
    if (currentBusiness.updated_at) {
      this.setElementContent('businessProfileUpdated', Formatters.formatDate(currentBusiness.updated_at));
    }

    // Logo
    const businessProfileLogo = document.getElementById('businessProfileLogo');
    if (businessProfileLogo && currentBusiness.media_files?.store_logo) {
      businessProfileLogo.src = currentBusiness.media_files.store_logo;
      businessProfileLogo.style.display = 'block';
    }

    // Managers
    this.populateManagers(currentBusiness);
  }

  populateManagers(currentBusiness) {
    const managers = currentBusiness.managers || [];
    const owner = currentBusiness.personal_info?.email;
    
    const managerNames = [];
    if (owner) managerNames.push(`${owner} (Owner)`);
    
    managers.filter(m => m && m.email).forEach(manager => {
      managerNames.push(manager.email);
    });

    this.setElementContent('businessManagers', 
      managerNames.length > 0 ? managerNames.join(', ') : 'N/A');
  }

  setupEventListeners(currentBusiness) {
    // Profile picture upload
    const profilePictureInput = document.getElementById('profilePictureInput');
    if (profilePictureInput && !profilePictureInput._listenerAdded) {
      profilePictureInput.addEventListener('change', (e) => this.handleFileSelect(e));
      profilePictureInput._listenerAdded = true;
    }

    // Edit profile button
    const editBtn = document.querySelector('.section-title-row .btn-secondary');
    if (editBtn) {
      editBtn.onclick = () => this.toggleEditProfile();
    }

    // Save/Cancel buttons
    const saveBtn = document.querySelector('[onclick="saveProfileChanges()"]');
    const cancelBtn = document.querySelector('[onclick="cancelProfileEdit()"]');
    
    if (saveBtn) saveBtn.onclick = () => this.saveProfileChanges();
    if (cancelBtn) cancelBtn.onclick = () => this.cancelProfileEdit();

    // Business management
    const managementBtn = document.querySelector('[onclick="openBusinessManagement()"]');
    if (managementBtn) {
      managementBtn.onclick = () => this.openBusinessManagement(currentBusiness);
    }
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validation = Validators.isValidFile(file);
    if (!validation.valid) {
      this.notifications.show(validation.error, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('profilePicturePreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  toggleEditProfile() {
    const viewMode = document.getElementById('profileViewMode');
    const editMode = document.getElementById('profileEditMode');
    const editBtn = document.querySelector('.section-title-row .btn-secondary');
  
    this.isEditingProfile = !this.isEditingProfile;
  
    if (this.isEditingProfile) {
      // Switch to edit mode
      viewMode.style.display = 'none';
      editMode.style.display = 'block';
      editBtn.textContent = 'Cancel';
  
      // Populate edit form
      const profileName = document.getElementById('profileName').textContent;
      const profileEmail = document.getElementById('profileEmail').textContent;
      const profilePicture = document.getElementById('profilePicture').src;
  
      document.getElementById('profileNameInput').value = profileName;
      document.getElementById('profileEmailInput').value = profileEmail;
      document.getElementById('profilePicturePreview').src = profilePicture;
      this.originalProfilePicture = profilePicture;
    } else {
      // Switch back to view mode
      viewMode.style.display = 'block';
      editMode.style.display = 'none';
      editBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit Profile
      `;
    }
  }

  cancelProfileEdit() {
    this.toggleEditProfile();
    document.getElementById('profilePicturePreview').src = this.originalProfilePicture;
  }

  async saveProfileChanges() {
    try {
      this.notifications.show('Updating profile...', 'info');

      const name = document.getElementById('profileNameInput').value;
      const pictureFile = document.getElementById('profilePictureInput').files[0];

      if (!Validators.isNotEmpty(name)) {
        this.notifications.show('Name cannot be empty', 'error');
        return;
      }

      let pictureUrl = this.originalProfilePicture;

      // Upload picture if provided
      if (pictureFile) {
        this.notifications.show('Uploading image...', 'info');
        pictureUrl = await this.cloudinary.uploadImage(pictureFile, 'user-profiles');
      }

      // Get user info
      const user = await this.auth.getUser();

      // Save to server
      await this.api.updateUserProfile(user.sub, {
        name: name,
        picture: pictureUrl
      });

      // Update UI
      document.getElementById('profileName').textContent = name;
      document.getElementById('profilePicture').src = pictureUrl;

      // Update header avatar if exists
      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) {
        userAvatar.innerHTML = `<img src="${pictureUrl}" alt="Profile" class="profile-img">`;
      }

      this.notifications.show('Profile updated successfully!', 'success');
      this.toggleEditProfile();

    } catch (error) {
      console.error('Error updating profile:', error);
      this.notifications.show(`Failed to update profile: ${error.message}`, 'error');
    }
  }

  openBusinessManagement(currentBusiness) {
    const modal = document.getElementById('businessManagementModal');
    modal.style.display = 'block';

    // Load managers
    this.loadBusinessManagers(currentBusiness);

    // Set business status
    const statusToggle = document.getElementById('businessActiveToggle');
    if (currentBusiness.status) {
      statusToggle.checked = currentBusiness.status === 'active';
    }
  }

  async loadBusinessManagers(currentBusiness) {
    try {
      const managersList = document.getElementById('managersList');

      const managers = currentBusiness.managers || [];
      const owner = currentBusiness.personal_info?.email;

      // Filter out empty objects
      const validManagers = managers.filter(m => m && m.email);

      // Check if truly empty
      if (validManagers.length === 0 && !owner) {
        managersList.innerHTML = `
          <p style="text-align: center; color: #666; padding: 20px; margin: 0;">
            No managers assigned yet
          </p>
        `;
        return;
      }

      let managersHTML = '';

      // Show owner
      if (owner) {
        managersHTML += `
          <div class="manager-item">
            <div class="manager-info">
              <div class="manager-avatar">${Formatters.sanitizeHTML(owner.charAt(0).toUpperCase())}</div>
              <div class="manager-details">
                <p style="font-weight: 600; margin: 0 0 2px 0;">Owner</p>
                <p class="manager-email">${Formatters.sanitizeHTML(owner)}</p>
              </div>
            </div>
            <span class="status-badge connected">Owner</span>
          </div>
        `;
      }

      // Add valid managers
      validManagers.forEach(manager => {
        managersHTML += `
          <div class="manager-item">
            <div class="manager-info">
              <div class="manager-avatar">${Formatters.sanitizeHTML((manager.email || '?').charAt(0).toUpperCase())}</div>
              <div class="manager-details">
                <p style="font-weight: 600; margin: 0 0 2px 0;">${Formatters.sanitizeHTML(manager.name || 'Manager')}</p>
                <p class="manager-email">${Formatters.sanitizeHTML(manager.email)}</p>
              </div>
            </div>
            <button class="btn-danger btn-sm" data-manager-email="${manager.email}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        `;
      });

      managersList.innerHTML = managersHTML;

      // Attach remove handlers
      managersList.querySelectorAll('.btn-danger').forEach(btn => {
        btn.onclick = () => this.removeBusinessManager(btn.dataset.managerEmail, currentBusiness);
      });

    } catch (error) {
      console.error('Error loading managers:', error);
      this.notifications.show('Failed to load managers', 'error');
    }
  }

  setElementContent(id, value, property = 'textContent') {
    const element = document.getElementById(id);
    if (element) {
      element[property] = value;
    }
  }
}