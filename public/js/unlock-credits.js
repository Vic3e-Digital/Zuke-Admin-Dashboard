// Unlock Credits Page JavaScript
(function() {
    'use strict';

    let currentBusinessId = null;
    let currentUserEmail = null;

    // Initialize the page
    async function init() {
        console.log('Initializing Unlock Credits page...');
        
        try {
            // Wait for auth0Client to be available
            if (!window.auth0Client) {
                console.log('Waiting for auth0Client...');
                await new Promise(resolve => {
                    const checkAuth = setInterval(() => {
                        if (window.auth0Client) {
                            clearInterval(checkAuth);
                            resolve();
                        }
                    }, 100);
                });
            }

            // Get user from Auth0
            const user = await window.auth0Client.getUser();
            currentUserEmail = user?.email;

            // Wait for dataManager to be available
            if (!window.dataManager) {
                console.log('Waiting for dataManager...');
                await new Promise(resolve => {
                    const checkData = setInterval(() => {
                        if (window.dataManager) {
                            clearInterval(checkData);
                            resolve();
                        }
                    }, 100);
                });
            }

            // Get business from dataManager
            const business = window.dataManager.getSelectedBusinessOrFirst();
            currentBusinessId = business?._id;

            console.log('User email:', currentUserEmail);
            console.log('Business ID:', currentBusinessId);

            if (!currentBusinessId || !currentUserEmail) {
                console.error('Missing business ID or user email');
                showError('Unable to load checklist. Please select a business first.');
                return;
            }

            loadChecklist();
        } catch (error) {
            console.error('Error initializing unlock credits:', error);
            showError('Unable to initialize page. Please try again.');
        }
    }

    // Load checklist from API
    async function loadChecklist() {
        const loadingState = document.getElementById('loadingState');
        const checklistContainer = document.getElementById('checklistContainer');
        const emptyState = document.getElementById('emptyState');

        try {
            loadingState.style.display = 'block';
            checklistContainer.style.display = 'none';
            emptyState.style.display = 'none';

            const response = await fetch(`/api/unlock-credits?businessId=${currentBusinessId}&email=${currentUserEmail}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load checklist');
            }

            console.log('Checklist loaded:', data);

            // Update progress header
            updateProgressHeader(data.checklist.progress, data.checklist.total_credits_earned);

            // Render checklist cards
            renderChecklistCards(data.checklist.items);

            loadingState.style.display = 'none';
            
            // Show empty state if all completed
            if (data.checklist.progress.completed === data.checklist.progress.total) {
                emptyState.style.display = 'block';
            } else {
                checklistContainer.style.display = 'grid';
            }

        } catch (error) {
            console.error('Error loading checklist:', error);
            loadingState.style.display = 'none';
            showError(error.message || 'Failed to load checklist');
        }
    }

    // Update progress header
    function updateProgressHeader(progress, earnedCredits) {
        const progressText = document.getElementById('progressText');
        const earnedElement = document.getElementById('earnedCredits');
        const potentialElement = document.getElementById('potentialCredits');
        const progressBar = document.getElementById('progressBar');

        if (progressText) {
            progressText.textContent = `${progress.completed}/${progress.total}`;
        }

        if (earnedElement) {
            earnedElement.textContent = `R${earnedCredits}`;
        }

        if (potentialElement) {
            potentialElement.textContent = `R${progress.potential_credits || 150}`;
        }

        if (progressBar) {
            progressBar.style.width = `${progress.percentage}%`;
        }
    }

    // Render checklist cards
    function renderChecklistCards(items) {
        const container = document.getElementById('checklistContainer');
        container.innerHTML = '';

        items.forEach(item => {
            const card = createChecklistCard(item);
            container.appendChild(card);
        });
    }

    // Create a single checklist card
    function createChecklistCard(item) {
        const card = document.createElement('div');
        card.className = 'checklist-card';
        
        if (item.unlocked) {
            card.classList.add('unlocked');
        } else if (item.completed) {
            card.classList.add('completed');
        }

        // Status badge
        let statusBadge = '';
        if (item.unlocked) {
            statusBadge = '<span class="status-badge unlocked">✓ Unlocked</span>';
        } else if (item.completed) {
            statusBadge = '<span class="status-badge completed">Ready</span>';
        } else {
            statusBadge = '<span class="status-badge pending">Pending</span>';
        }

        // Button
        let button = '';
        if (item.unlocked) {
            button = `
                <button class="unlock-btn success" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Claimed
                </button>
            `;
        } else if (item.canUnlock) {
            button = `
                <button class="unlock-btn primary" onclick="window.unlockCredits.unlockItem('${item.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                    </svg>
                    Unlock Now
                </button>
            `;
        } else {
            button = `
                <button class="unlock-btn secondary" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Complete Task
                </button>
            `;
        }

        card.innerHTML = `
            ${statusBadge}
            <span class="card-icon">${item.icon}</span>
            <h3 class="card-title">${item.title}</h3>
            <p class="card-description">${item.description}</p>
            <div class="card-footer">
                <div class="card-reward">
                    <span class="reward-label">Reward</span>
                    <span class="reward-amount">R${item.reward}</span>
                </div>
                ${button}
            </div>
        `;

        return card;
    }

    // Unlock credits for an item
    async function unlockItem(itemId) {
        console.log('Unlocking item:', itemId);

        try {
            // Show loading state on button
            const buttons = document.querySelectorAll('.unlock-btn.primary');
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.innerHTML = '<span>Processing...</span>';
            });

            const response = await fetch('/api/unlock-credits/unlock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    businessId: currentBusinessId,
                    email: currentUserEmail,
                    itemId: itemId
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to unlock credits');
            }

            console.log('Credits unlocked:', data);

            // Show success message
            showSuccess(`🎉 Congratulations! You've earned R${data.item.reward}!`);

            // Reload wallet balance
            if (window.loadWalletBalance) {
                window.loadWalletBalance();
            }

            // Reload checklist after 1 second
            setTimeout(() => {
                loadChecklist();
            }, 1000);

        } catch (error) {
            console.error('Error unlocking credits:', error);
            showError(error.message || 'Failed to unlock credits');
            
            // Reload checklist to reset button states
            setTimeout(() => {
                loadChecklist();
            }, 1000);
        }
    }

    // Show success message
    function showSuccess(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                toast.remove();
                style.remove();
            }, 300);
        }, 4000);
    }

    // Show error message
    function showError(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Expose functions globally
    window.unlockCredits = {
        init: init,
        unlockItem: unlockItem
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
