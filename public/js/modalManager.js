/**
 * Universal Modal Manager
 * Automatically adds minimize/maximize functionality to any modal on the page
 * No modifications needed to existing code
 */

class ModalManager {
  constructor(maxModals = 5) {
    this.maxModals = maxModals;
    this.openModals = new Map();
    this.initialized = false;
    this.taskbarElement = null;
    this.minimizedContainer = null;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    if (this.initialized) return;
    
    console.log('🎯 ModalManager initializing...');
    
    // Create taskbar element
    this.createTaskbar();
    
    // Find all modals and enhance them
    this.enhanceAllModals();
    
    // Watch for dynamically shown modals
    this.watchForVisibleModals();
    
    this.initialized = true;
    console.log('✅ ModalManager initialized successfully');
  }

  watchForVisibleModals() {
    // Use MutationObserver to detect when modals become visible
    const observer = new MutationObserver(() => {
      const modals = document.querySelectorAll('.modal');
      modals.forEach((modal, index) => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent && modal.offsetParent !== null) { // Modal is visible
          if (!modalContent.classList.contains('enhanced-modal')) {
            console.log(`⚡ Re-enhancing modal: ${modal.id || index}`);
            this.enhanceModal(modal, index);
          }
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true
    });
  }

  createTaskbar() {
    // Check if taskbar already exists
    if (document.getElementById('universalModalTaskbar')) {
      this.taskbarElement = document.getElementById('universalModalTaskbar');
      this.minimizedContainer = document.getElementById('minimizedModalsContainer');
      return;
    }

    // Create taskbar HTML
    const taskbarHTML = `
      <div id="universalModalTaskbar" style="
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #f8f9fa;
        border-top: 1px solid #ddd;
        padding: 10px 20px;
        display: none;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        z-index: 9999;
        max-height: 80px;
        overflow-y: auto;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      ">
        <span style="font-size: 12px; font-weight: bold; color: #666; white-space: nowrap;">Minimized:</span>
        <div id="minimizedModalsContainer" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;"></div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', taskbarHTML);
    this.taskbarElement = document.getElementById('universalModalTaskbar');
    this.minimizedContainer = document.getElementById('minimizedModalsContainer');
  }

  enhanceAllModals() {
    // Find all modal elements with class 'modal'
    const modals = document.querySelectorAll('.modal');
    
    console.log(`📱 Found ${modals.length} modal(s) to enhance`);
    
    modals.forEach((modal, index) => {
      this.enhanceModal(modal, index);
    });
  }

  enhanceModal(modal, index) {
    const modalContent = modal.querySelector('.modal-content');
    if (!modalContent) return;

    // Get the current title before doing anything
    const currentTitle = document.getElementById('modalTitle')?.textContent || 'Modal';
    
    // Check if already enhanced - if so, just update the title and skip re-enhancement
    if (modalContent.classList.contains('enhanced-modal')) {
      console.log('♻️ Modal already enhanced, updating title:', currentTitle);
      const h2 = modalContent.querySelector('.modal-header h2');
      if (h2) {
        h2.textContent = currentTitle;
      }
      return;
    }

    // First time enhancement - assign unique ID and enhance
    const uniqueId = `modal_${currentTitle.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    modal.id = uniqueId;
    console.log('🆔 Modal assigned unique ID:', modal.id, 'Title:', currentTitle);

    modalContent.classList.add('enhanced-modal');

    // Find or create modal header
    let modalHeader = modalContent.querySelector('.modal-header');
    const closeBtn = modalContent.querySelector('.close');

    // Get title text for taskbar
    let titleText = currentTitle;

    if (!modalHeader) {
      // Create header if it doesn't exist
      modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      modalHeader.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #eee;
        margin-bottom: 10px;
      `;

      // Create title element in header
      const titleElement = document.createElement('h2');
      titleElement.style.cssText = 'margin: 0;';
      titleElement.textContent = titleText;
      modalHeader.appendChild(titleElement);

      // Add button container
      const btnContainer = document.createElement('div');
      btnContainer.style.cssText = 'display: flex; gap: 5px;';

      // Add minimize button
      const minimizeBtn = document.createElement('button');
      minimizeBtn.className = 'modal-minimize-btn';
      minimizeBtn.innerHTML = '−';
      minimizeBtn.setAttribute('aria-label', 'Minimize modal');
      minimizeBtn.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        font-size: 18px;
        padding: 5px 10px;
        color: #666;
        transition: color 0.2s ease;
      `;
      minimizeBtn.addEventListener('mouseover', () => minimizeBtn.style.color = '#333');
      minimizeBtn.addEventListener('mouseout', () => minimizeBtn.style.color = '#666');

      btnContainer.appendChild(minimizeBtn);

      // Add or reuse close button
      if (closeBtn) {
        closeBtn.style.cssText = `
          cursor: pointer;
          font-size: 20px;
          padding: 5px 10px;
          color: #666;
          background: none;
          border: none;
          transition: color 0.2s ease;
        `;
        btnContainer.appendChild(closeBtn.cloneNode(true));
        closeBtn.remove();
      } else {
        const newCloseBtn = document.createElement('span');
        newCloseBtn.className = 'close';
        newCloseBtn.innerHTML = '&times;';
        newCloseBtn.style.cssText = `
          cursor: pointer;
          font-size: 20px;
          padding: 5px 10px;
          color: #666;
        `;
        btnContainer.appendChild(newCloseBtn);
      }

      modalHeader.appendChild(btnContainer);
      modalContent.insertBefore(modalHeader, modalContent.firstChild);
    } else {
      // Header exists, add buttons if not present
      if (!modalContent.querySelector('.modal-minimize-btn')) {
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 5px;';

        const minimizeBtn = document.createElement('button');
        minimizeBtn.className = 'modal-minimize-btn';
        minimizeBtn.innerHTML = '−';
        minimizeBtn.setAttribute('aria-label', 'Minimize modal');
        minimizeBtn.style.cssText = `
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 5px 10px;
          color: #666;
          transition: color 0.2s ease;
        `;
        minimizeBtn.addEventListener('mouseover', () => minimizeBtn.style.color = '#333');
        minimizeBtn.addEventListener('mouseout', () => minimizeBtn.style.color = '#666');

        btnContainer.appendChild(minimizeBtn);

        // Ensure close button is styled
        const closeBtn = modalHeader.querySelector('.close');
        if (closeBtn) {
          closeBtn.style.cssText = `
            cursor: pointer;
            font-size: 20px;
            padding: 5px 10px;
            color: #666;
            background: none;
            border: none;
            transition: color 0.2s ease;
          `;
        }

        modalHeader.appendChild(btnContainer);
      }
    }

    // Add event listeners
    this.attachModalListeners(modal, modalContent, titleText);
  }

  attachModalListeners(modal, modalContent, titleText = 'Modal') {
    const minimizeBtn = modalContent.querySelector('.modal-minimize-btn');
    const closeBtn = modalContent.querySelector('.close');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (this.openModals.size >= this.maxModals) {
          alert(`Maximum ${this.maxModals} minimized modals allowed. Close one before minimizing another.`);
          return;
        }

        this.minimizeModal(modal, titleText);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🔴 Closing modal:', modal.id);
        
        // If this modal is minimized, remove it from tracking
        const modalId = modal.id;
        if (modalId && this.openModals.has(modalId)) {
          console.log('🗑️ Removing minimized modal from tracking:', modalId);
          
          // Remove taskbar button
          const taskbarBtn = document.getElementById(`taskbar_${modalId}`);
          if (taskbarBtn) {
            taskbarBtn.remove();
          }
          
          // Remove from map
          this.openModals.delete(modalId);
          
          // Hide taskbar if empty
          if (this.minimizedContainer.children.length === 0) {
            this.taskbarElement.style.display = 'none';
          }
        }
        
        modal.style.display = 'none';
        
        // Clear modal content
        const iframe = modalContent.querySelector('iframe');
        if (iframe) iframe.src = '';
      });
    }

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('🔴 Closing modal via background click:', modal.id);
        
        // If this modal is minimized, remove it from tracking
        const modalId = modal.id;
        if (modalId && this.openModals.has(modalId)) {
          console.log('🗑️ Removing minimized modal from tracking:', modalId);
          
          // Remove taskbar button
          const taskbarBtn = document.getElementById(`taskbar_${modalId}`);
          if (taskbarBtn) {
            taskbarBtn.remove();
          }
          
          // Remove from map
          this.openModals.delete(modalId);
          
          // Hide taskbar if empty
          if (this.minimizedContainer.children.length === 0) {
            this.taskbarElement.style.display = 'none';
          }
        }
        
        modal.style.display = 'none';
        const iframe = modalContent.querySelector('iframe');
        if (iframe) iframe.src = '';
      }
    });
  }

  minimizeModal(modal, title) {
    // Create a truly unique ID for this specific minimize action (handles reused modal elements)
    // This ensures Modal 1 and Modal 2 get different IDs even if they use the same DOM element
    const instanceId = `modal_${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    console.log('📌 Minimizing modal with instance ID:', instanceId, 'Title:', title);

    // Store modal state with the unique instance ID
    this.openModals.set(instanceId, {
      id: instanceId,
      title: title,
      modal: modal,
      display: modal.style.display,
      timestamp: Date.now()
    });

    // Hide modal
    modal.style.display = 'none';

    // Show taskbar if needed
    if (this.minimizedContainer.children.length === 0) {
      this.taskbarElement.style.display = 'flex';
    }

    // Create taskbar button with the unique instance ID
    this.addTaskbarButton(instanceId, title);
  }

  addTaskbarButton(modalId, title) {
    const taskbarBtn = document.createElement('button');
    taskbarBtn.id = `taskbar_${modalId}`;
    taskbarBtn.style.cssText = `
      background: white;
      border: 1px solid #ddd;
      padding: 8px 15px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title.substring(0, 20);
    titleSpan.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis;';
    taskbarBtn.appendChild(titleSpan);

    const closeX = document.createElement('span');
    closeX.textContent = '×';
    closeX.style.cssText = `
      cursor: pointer;
      font-weight: bold;
      font-size: 16px;
      flex-shrink: 0;
    `;

    closeX.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('🗑️ Closing minimized modal:', modalId);
      this.closeMinimizedModal(modalId);
    });

    taskbarBtn.appendChild(closeX);

    // Restore on button click (but not on close X)
    taskbarBtn.addEventListener('click', (e) => {
      // Only restore if clicking on title, not the X button
      if (e.target === titleSpan || e.target === taskbarBtn) {
        console.log('📂 Restoring modal:', modalId);
        this.restoreModal(modalId);
      }
    });

    // Hover effects
    taskbarBtn.addEventListener('mouseover', () => {
      taskbarBtn.style.background = '#e8e8e8';
    });

    taskbarBtn.addEventListener('mouseout', () => {
      taskbarBtn.style.background = 'white';
    });

    this.minimizedContainer.appendChild(taskbarBtn);
  }

  restoreModal(modalId) {
    console.log('🔍 Attempting to restore modal:', modalId);
    console.log('📊 Open modals map:', Array.from(this.openModals.keys()));
    
    const modalData = this.openModals.get(modalId);
    if (!modalData) {
      console.error('❌ Modal not found in openModals map:', modalId);
      return;
    }

    console.log('✅ Modal found, showing it');
    
    // Show modal
    modalData.modal.style.display = 'block';

    // Remove taskbar button
    const taskbarBtn = document.getElementById(`taskbar_${modalId}`);
    if (taskbarBtn) {
      console.log('🗑️ Removing taskbar button');
      taskbarBtn.remove();
    }

    // Hide taskbar if no more modals
    if (this.minimizedContainer.children.length === 0) {
      console.log('👻 Hiding taskbar (no more minimized modals)');
      this.taskbarElement.style.display = 'none';
    }

    // Remove from tracking
    this.openModals.delete(modalId);
  }

  closeMinimizedModal(modalId) {
    const taskbarBtn = document.getElementById(`taskbar_${modalId}`);
    if (taskbarBtn) {
      taskbarBtn.remove();
    }

    if (this.minimizedContainer.children.length === 0) {
      this.taskbarElement.style.display = 'none';
    }

    this.openModals.delete(modalId);
  }
}

// Initialize the modal manager globally
window.modalManager = new ModalManager(5);
