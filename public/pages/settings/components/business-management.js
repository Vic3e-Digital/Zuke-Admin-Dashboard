import { Validators } from '../utils/validators.js';
import { Formatters } from '../utils/formatters.js';

export class BusinessManagementComponent {
  constructor(apiService, notificationManager) {
    this.api = apiService;
    this.notifications = notificationManager;
  }

  setupEventListeners(currentBusiness) {
    // Add manager
    const addBtn = document.querySelector('[onclick="addBusinessManager()"]');
    if (addBtn) {
      addBtn.onclick = () => this.addBusinessManager(currentBusiness);
    }

    // Toggle status
    const statusBtn = document.querySelector('[onclick="toggleBusinessStatus()"]');
    if (statusBtn) {
      statusBtn.onclick = () => this.toggleBusinessStatus(currentBusiness);
    }

    // Delete business
    const deleteBtn = document.querySelector('[onclick="confirmDeleteBusiness()"]');
    if (deleteBtn) {
      deleteBtn.onclick = () => this.confirmDeleteBusiness(currentBusiness);
    }

    // Close modal
    const closeBtn = document.querySelector('[onclick="closeBusinessManagement()"]');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeModal();
    }

    // Close on outside click
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('businessManagementModal');
      if (event.target === modal) {
        this.closeModal();
      }
    });
  }

  async addBusinessManager(currentBusiness) {
    try {
      const emailInput = document.getElementById('managerEmailInput');
      const email = emailInput.value.trim();

      if (!email) {
        this.notifications.show('Please enter an email address', 'error');
        return;
      }

      if (!Validators.isValidEmail(email)) {
        this.notifications.show('Please enter a valid email address', 'error');
        return;
      }

      // Check if already owner
      if (email === currentBusiness.personal_info?.email) {
        this.notifications.show('This email is the business owner', 'error');
        return;
      }

      // Check if already a manager
      const existingManagers = currentBusiness.managers || [];
      if (existingManagers.some(m => m.email === email)) {
        this.notifications.show('This user is already a manager', 'error');
        return;
      }

      this.notifications.show('Adding manager...', 'info');

      await this.api.sendBusinessWebhook('add_manager', currentBusiness._id, {
        businessName: currentBusiness.store_info?.name,
        manager_email: email
      });

      this.notifications.show('Manager added successfully!', 'success');
      emailInput.value = '';

      // Trigger reload
      window.dispatchEvent(new CustomEvent('settings-reload'));

    } catch (error) {
      console.error('Error adding manager:', error);
      this.notifications.show(`Failed to add manager: ${error.message}`, 'error');
    }
  }

  async removeBusinessManager(email, currentBusiness) {
    if (!confirm(`Remove ${email} as a manager?`)) {
      return;
    }

    try {
      this.notifications.show('Removing manager...', 'info');

      await this.api.sendBusinessWebhook('remove_manager', currentBusiness._id, {
        businessName: currentBusiness.store_info?.name,
        manager_email: email
      });

      this.notifications.show('Manager removed successfully!', 'success');

      // Trigger reload
      window.dispatchEvent(new CustomEvent('settings-reload'));

    } catch (error) {
      console.error('Error removing manager:', error);
      this.notifications.show(`Failed to remove manager: ${error.message}`, 'error');
    }
  }

  async toggleBusinessStatus(currentBusiness) {
    try {
      const statusToggle = document.getElementById('businessActiveToggle');
      const newStatus = statusToggle.checked ? 'active' : 'disabled';

      const confirmMsg = statusToggle.checked
        ? 'Enable this business? All automations will resume.'
        : 'Disable this business? All automations will be paused.';

      if (!confirm(confirmMsg)) {
        statusToggle.checked = !statusToggle.checked;
        return;
      }

      this.notifications.show('Updating business status...', 'info');

      await this.api.sendBusinessWebhook('update_status', currentBusiness._id, {
        businessName: currentBusiness.store_info?.name,
        status: newStatus
      });

      this.notifications.show(`Business ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully!`, 'success');

      // Update UI
      const statusBadge = document.getElementById('businessStatusBadge');
      if (statusBadge) {
        statusBadge.textContent = newStatus === 'active' ? 'Active' : 'Disabled';
        statusBadge.className = newStatus === 'active' ? 'status-badge connected' : 'status-badge';
      }

      // Trigger reload
      window.dispatchEvent(new CustomEvent('settings-reload'));

    } catch (error) {
      console.error('Error updating business status:', error);
      this.notifications.show(`Failed to update status: ${error.message}`, 'error');

      const statusToggle = document.getElementById('businessActiveToggle');
      statusToggle.checked = !statusToggle.checked;
    }
  }

  confirmDeleteBusiness(currentBusiness) {
    const businessName = currentBusiness.store_info?.name || 'this business';

    const confirmed = confirm(
      `⚠️ DELETE BUSINESS?\n\n` +
      `You are about to permanently delete "${businessName}".\n\n` +
      `This will:\n` +
      `• Remove all business data\n` +
      `• Disconnect all social media accounts\n` +
      `• Delete all automation settings\n` +
      `• Cannot be undone\n\n` +
      `Type the business name to confirm deletion.`
    );

    if (!confirmed) return;

    const typedName = prompt(`Type "${businessName}" to confirm deletion:`);

    if (typedName !== businessName) {
      this.notifications.show('Business name did not match. Deletion cancelled.', 'error');
      return;
    }

    this.deleteBusiness(currentBusiness);
  }

  async deleteBusiness(currentBusiness) {
    try {
      this.notifications.show('Deleting business...', 'info');

      await this.api.sendBusinessWebhook('delete_business', currentBusiness._id, {
        businessName: currentBusiness.store_info?.name
      });

      this.notifications.show('Business deleted successfully', 'success');

      this.closeModal();

      // Clear cache
      if (window.dataManager && window.dataManager.clearCache) {
        window.dataManager.clearCache();
      }

      // Redirect to dashboard
      setTimeout(() => {
        if (window.loadPage) {
          window.loadPage('dashboard');
        }
      }, 2000);

    } catch (error) {
      console.error('Error deleting business:', error);
      this.notifications.show(`Failed to delete business: ${error.message}`, 'error');
    }
  }

  closeModal() {
    const modal = document.getElementById('businessManagementModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}