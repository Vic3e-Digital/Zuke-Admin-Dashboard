// pages/pricing.js
let auth0Client = null;
let currentUser = null;
let isYearly = false;
let selectedPlan = null;
let selectedPaymentMethod = null;
let autoRenew = false; // Default to false - hidden for future development

const plans = [
  {
    id: 'ignite',
    name: 'Ignite',
    description: 'For users starting out in their business',
    monthlyPrice: 99,
    yearlyPrice: 990
  },
  {
    id: 'spark',
    name: 'Spark',
    description: 'For hustlers building momentum with full creative tools',
    monthlyPrice: 599,
    yearlyPrice: 5990
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For brands ready to scale with advanced analytics',
    monthlyPrice: 6999,
    yearlyPrice: 69990
  },
  {
    id: 'blaze',
    name: 'Blaze',
    description: 'For enterprises needing unlimited AI employees',
    monthlyPrice: 39999,
    yearlyPrice: 399990
  }
];

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

export async function initPricingPage() {
  const auth0Client = await getAuth0Client();
  if (!auth0Client) {
    console.error("Failed to get Auth0 client");
    return;
  }

  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
      console.error("User not authenticated");
      window.location.href = '/';
      return;
    }

    currentUser = await auth0Client.getUser();
    console.log("Pricing page loaded for:", currentUser.email);

    await loadWalletBalance();
    renderPlans();
    setupBillingToggle();
    setupFAQs();
    setupPlanSelection();
    setupPaymentSelection();
    setupPromoCode();
    setupNavigation();
    await loadCurrentPlan();

  } catch (error) {
    console.error("Error in initPricingPage:", error);
  }
}

async function loadWalletBalance() {
  try {
    const response = await fetch(`/api/wallet?email=${encodeURIComponent(currentUser.email)}`);
    const data = await response.json();
    
    if (data.success && data.wallet) {
      const balance = data.wallet.balance || 0;
      document.getElementById('currentBalance').textContent = `R${balance.toLocaleString()}`;
      document.getElementById('walletInfo').style.display = 'block';
    }
  } catch (error) {
    console.error("Error loading wallet balance:", error);
  }
}

async function loadCurrentPlan() {
  try {
    const response = await fetch(`/api/wallet?email=${encodeURIComponent(currentUser.email)}`);
    const data = await response.json();
    
    if (data.success && data.wallet && data.hasActivePlan) {
      const wallet = data.wallet;
      const currentPlan = wallet.current_plan?.toLowerCase();
      
      if (currentPlan && currentPlan !== 'free') {
        const planCard = document.querySelector(`[data-plan="${currentPlan}"]`);
        if (planCard) {
          const daysRemaining = wallet.subscription_end_date ? 
            Math.ceil((new Date(wallet.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
          
          planCard.classList.add('current-plan');
          
          const badge = document.createElement('div');
          badge.className = 'current-plan-badge';
          badge.innerHTML = `Current (${daysRemaining}d)<br><small style="font-size: 9px;">${wallet.auto_renew ? 'Auto-renew ON' : 'Auto-renew OFF'}</small>`;
          planCard.appendChild(badge);
          
          planCard.style.pointerEvents = 'none';
        }
        
        // Show cancel subscription option if auto-renew is on
        if (wallet.auto_renew) {
          showCancelOption();
        }
      }
    }
  } catch (error) {
    console.error("Error loading current plan:", error);
  }
}

function showCancelOption() {
  const cancelHTML = `
    <div class="cancel-subscription-section" style="margin-top: 30px; padding: 20px; background: #FFF8F0; border: 1px solid var(--primary-orange); border-radius: 8px; text-align: center;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: var(--dark-neutral);">Manage Subscription</h3>
      <p style="margin: 0 0 15px 0; font-size: 13px; color: var(--text-secondary);">You can cancel your subscription at any time. You'll keep access until the end of your billing period.</p>
      <button onclick="cancelSubscription()" style="padding: 10px 24px; background: #DC3545; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer;">Cancel Subscription</button>
    </div>
  `;
  
  const plansColumn = document.querySelector('.plans-column');
  if (plansColumn) {
    plansColumn.insertAdjacentHTML('beforeend', cancelHTML);
  }
}

window.cancelSubscription = async function() {
  const confirmed = confirm(
    "Are you sure you want to cancel your subscription?\n\n" +
    "You'll continue to have access until the end of your current billing period.\n\n" +
    "Click OK to cancel."
  );
  
  if (!confirmed) return;
  
  try {
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ Subscription cancelled successfully.\n\nYou'll have access until: ${new Date(data.access_until).toLocaleDateString()}`);
      window.location.reload();
    } else {
      alert(`❌ Failed to cancel subscription: ${data.error}`);
    }
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    alert('❌ Error cancelling subscription. Please try again.');
  }
};

function renderPlans() {
  const container = document.getElementById('planOptions');
  container.innerHTML = '';
  
  plans.forEach(plan => {
    const monthlyPrice = plan.monthlyPrice;
    const yearlyPrice = plan.yearlyPrice;
    const threeMonthPrice = monthlyPrice * 3;
    const savings = (monthlyPrice * 12) - yearlyPrice;
    
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.setAttribute('data-plan', plan.id);
    
    const pricePerMonth = Math.round(threeMonthPrice / 3);
    const yearlyPricePerMonth = Math.round(yearlyPrice / 12);
    
    card.innerHTML = `
      <div class="plan-radio"></div>
      <div class="plan-content">
        <div class="plan-name">${plan.name} <span style="color: var(--text-secondary); font-weight: 500; font-size: 0.85em;">(R${pricePerMonth}pm)</span></div>
        <div class="plan-description">${plan.description}</div>
      </div>
      <div class="plan-pricing">
        <div class="plan-price monthly-price">
          R${threeMonthPrice.toLocaleString()} <small>/3mo</small>
        </div>
        <div class="plan-price yearly-price" style="display: none;">
          R${yearlyPrice.toLocaleString()} <small>/year</small>
        </div>
        <div class="plan-price-strike yearly-price" style="display: none;">
          Save R${savings.toLocaleString()}
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function setupBillingToggle() {
  const toggle = document.getElementById('billingToggle');
  
  toggle.addEventListener('click', () => {
    isYearly = !isYearly;
    toggle.classList.toggle('yearly');
    
    document.querySelectorAll('.monthly-price').forEach(el => {
      el.style.display = isYearly ? 'none' : 'block';
    });
    document.querySelectorAll('.yearly-price').forEach(el => {
      el.style.display = isYearly ? 'block' : 'none';
    });
  });
}

function setupFAQs() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const answer = question.nextElementSibling;
      const isActive = question.classList.contains('active');
      
      document.querySelectorAll('.faq-question').forEach(q => {
        q.classList.remove('active');
        q.nextElementSibling.classList.remove('active');
      });
      
      if (!isActive) {
        question.classList.add('active');
        answer.classList.add('active');
      }
    });
  });
}

function setupPlanSelection() {
  const planOptions = document.getElementById('planOptions');
  const continueBtn = document.getElementById('continueBtn');
  
  planOptions.addEventListener('click', (e) => {
    const card = e.target.closest('.plan-card:not(.current-plan)');
    if (!card) return;
    
    document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
    
    card.classList.add('selected');
    selectedPlan = card.getAttribute('data-plan');
    
    continueBtn.disabled = false;
  });
  
  continueBtn.addEventListener('click', () => {
    if (selectedPlan) {
      showStep2();
    }
  });
}

function setupPaymentSelection() {
  const paymentMethods = document.querySelectorAll('.payment-card');
  const proceedBtn = document.getElementById('proceedPaymentBtn');
  const promoCodeSection = document.getElementById('promoCodeSection');
  
  paymentMethods.forEach(card => {
    card.addEventListener('click', () => {
      paymentMethods.forEach(c => c.classList.remove('selected'));
      
      card.classList.add('selected');
      selectedPaymentMethod = card.getAttribute('data-method');
      
      // Show promo code section only if invitation method selected
      if (selectedPaymentMethod === 'invitation') {
        promoCodeSection.style.display = 'block';
        proceedBtn.disabled = true; // Require code application
      } else {
        promoCodeSection.style.display = 'none';
        proceedBtn.disabled = false;
      }
    });
  });
  
  proceedBtn.addEventListener('click', () => {
    if (selectedPaymentMethod && selectedPlan) {
      processPayment();
    }
  });
}

function setupPromoCode() {
  const promoInput = document.getElementById('promoCodeInput');
  const applyBtn = document.getElementById('applyPromoBtn');
  const promoMessage = document.getElementById('promoMessage');
  const proceedBtn = document.getElementById('proceedPaymentBtn');
  
  if (!promoInput || !applyBtn) return;
  
  // Promotional codes mapping
  const promoCodes = {
    'ZUKEXAFAA': { plan: 'ignite', description: 'AFAA Ignite Plan Access' },
    'ZUKEXREDISCOVERMECOACHING': { plan: 'ignite', description: 'Rediscover Me Coaching Ignite Access' },
    'ZUKEXSPARK': { plan: 'spark', description: 'Spark Plan Promotional Access' }
  };
  
  // Auto-uppercase as user types
  promoInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });
  
  // Apply promo code
  applyBtn.addEventListener('click', async () => {
    const code = promoInput.value.trim().toUpperCase();
    
    if (!code) {
      showPromoMessage('Please enter a promotional code', 'error');
      return;
    }
    
    applyBtn.disabled = true;
    applyBtn.textContent = 'Checking...';
    
    try {
      // Check if code exists in our promo codes
      const promoDetails = promoCodes[code];
      
      if (!promoDetails) {
        showPromoMessage('Invalid promotional code', 'error');
        proceedBtn.disabled = true;
        applyBtn.disabled = false;
        applyBtn.textContent = 'Apply';
        return;
      }
      
      // Check if selected plan matches the promo code plan
      if (promoDetails.plan !== selectedPlan) {
        const planName = plans.find(p => p.id === promoDetails.plan)?.name || promoDetails.plan;
        showPromoMessage(`This code is only valid for the ${planName} plan`, 'error');
        proceedBtn.disabled = true;
        applyBtn.disabled = false;
        applyBtn.textContent = 'Apply';
        return;
      }
      
      // Validate with backend
      const response = await fetch('/api/validate-promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code,
          email: currentUser.email,
          planId: selectedPlan,
          isYearly,
          description: promoDetails.description
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showPromoMessage(`✓ Code applied! ${promoDetails.description}`, 'success');
        // Update the summary to show free access
        const plan = plans.find(p => p.id === selectedPlan);
        const summaryElement = document.getElementById('selectedPlanSummary');
        if (summaryElement && plan) {
          summaryElement.innerHTML = `
            <h3>You've selected:</h3>
            <div class="plan-detail">
              ${plan.name} - ${isYearly ? 'Yearly' : '3-Month'}
            </div>
            <div style="margin-top: 10px; color: #27ae60; font-weight: 700;">
              ✓ Free with promotional code
            </div>
          `;
        }
        // Store the validated code for processing
        window.validatedPromoCode = code;
        // Enable proceed button
        proceedBtn.disabled = false;
      } else {
        showPromoMessage(result.message || 'Code validation failed', 'error');
        proceedBtn.disabled = true;
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      showPromoMessage('Error validating code. Please try again.', 'error');
      proceedBtn.disabled = true;
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = 'Apply';
    }
  });
  
  // Allow Enter key to apply
  promoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applyBtn.click();
    }
  });
}

function showPromoMessage(message, type) {
  const promoMessage = document.getElementById('promoMessage');
  promoMessage.textContent = message;
  promoMessage.className = `promo-message ${type}`;
}

function updatePricingWithDiscount(discountPercent) {
  // Update the selected plan summary to show discounted price
  const plan = plans.find(p => p.id === selectedPlan);
  if (!plan) return;
  
  const basePrice = isYearly ? plan.yearlyPrice : (plan.monthlyPrice * 3);
  const discountedPrice = basePrice * (1 - discountPercent / 100);
  
  const summaryElement = document.getElementById('selectedPlanSummary');
  if (summaryElement) {
    summaryElement.innerHTML = `
      <h3>You selected</h3>
      <div class="plan-detail">${plan.name} - ${isYearly ? 'Yearly' : '3-Month'}</div>
      <div style="margin-top: 10px;">
        <span style="text-decoration: line-through; color: #999;">R${basePrice.toLocaleString()}</span>
        <span style="font-size: 24px; font-weight: 700; color: var(--primary-orange); margin-left: 10px;">
          R${discountedPrice.toLocaleString()}
        </span>
      </div>
    `;
  }
}

function setupNavigation() {
  const backBtn = document.getElementById('backBtn');
  
  backBtn.addEventListener('click', () => {
    showStep1();
  });
  
  document.getElementById('showComparison')?.addEventListener('click', (e) => {
    e.preventDefault();
    showComparisonModal();
  });
}

function showStep1() {
  document.getElementById('step1').classList.add('active');
  document.getElementById('step2').classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showStep2() {
  const plan = plans.find(p => p.id === selectedPlan);
  if (!plan) return;
  
  const price = isYearly ? plan.yearlyPrice : (plan.monthlyPrice * 3);
  const period = isYearly ? 'per year' : 'every 3 months';
  
  document.getElementById('selectedPlanSummary').innerHTML = `
    <h3>You've selected:</h3>
    <div class="plan-detail">
      ${plan.name} - R${price.toLocaleString()} ${period}
    </div>
  `;
  
  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
  
  document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('proceedPaymentBtn').disabled = true;
  selectedPaymentMethod = null;
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function processPayment() {
  const plan = plans.find(p => p.id === selectedPlan);
  if (!plan) return;
  
  const monthlyPrice = plan.monthlyPrice;
  const yearlyPrice = plan.yearlyPrice;
  const threeMonthPrice = monthlyPrice * 3;
  const displayPrice = isYearly ? yearlyPrice : threeMonthPrice;
  const billingPeriod = isYearly ? 'yearly' : '3-month cycle';
  
  // Default to false - auto-renewal hidden for future development
  autoRenew = false;
  
  // Debugging - log the values
  console.log('Payment Calculation:', {
    plan: plan.name,
    monthlyPrice,
    threeMonthPrice,
    yearlyPrice,
    displayPrice,
    isYearly,
    autoRenew
  });

  try {
    const firstName = currentUser.given_name || currentUser.name?.split(' ')[0] || '';
    const lastName = currentUser.family_name || currentUser.name?.split(' ').slice(1).join(' ') || '';
    const phone = currentUser.phone_number || '';
    
    if (selectedPaymentMethod === 'paystack') {
      // Use Paystack Inline/Popup for dynamic amount control
      const amountInKobo = Math.round(displayPrice * 100); // Convert to kobo (cents)
      
      console.log('Initializing Paystack Inline Payment:', {
        plan: plan.name,
        displayPrice,
        amountInKobo,
        email: currentUser.email,
        billingPeriod,
        autoRenew
      });
      
      // Check if PaystackPop is available
      if (typeof PaystackPop === 'undefined') {
        alert('⚠️ Paystack payment gateway is loading. Please try again in a moment.');
        console.error('PaystackPop is not loaded. Make sure you included the script: <script src="https://js.paystack.co/v1/inline.js"></script>');
        return;
      }
      
      // Store pending subscription in localStorage for the callback
      localStorage.setItem('pendingSubscription', JSON.stringify({
        plan: selectedPlan,
        planName: plan.name,
        isYearly: isYearly,
        amount: displayPrice,
        amountInKobo: amountInKobo,
        billingPeriod: billingPeriod,
        autoRenew: autoRenew,
        timestamp: Date.now()
      }));
      
      // Get Paystack key from backend
      let paystackKey = null;
      try {
        const keyResponse = await fetch('/api/paystack-key');
        const keyData = await keyResponse.json();
        if (keyData.key) {
          paystackKey = keyData.key;
        } else {
          throw new Error('Failed to get Paystack key');
        }
      } catch (error) {
        console.error('Could not fetch Paystack key:', error);
        alert('⚠️ Payment system configuration error. Please contact support.');
        return;
      }
      
      // Initialize Paystack using new API (constructor instead of setup)
      const paystackInstance = new PaystackPop();
      
      paystackInstance.newTransaction({
        key: paystackKey,
        email: currentUser.email,
        amount: amountInKobo, // Amount in kobo
        currency: 'ZAR',
        ref: 'ZUKE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        metadata: {
          plan: selectedPlan,
          plan_name: plan.name,
          billing: billingPeriod,
          auto_renew: autoRenew,
          user_id: currentUser.sub,
          original_amount: displayPrice,
          first_name: firstName,
          last_name: lastName,
          phone: phone
        },
        onSuccess: (transaction) => {
          // Payment successful - verify and activate subscription
          console.log('✅ Payment successful! Reference:', transaction.reference);
          console.log('Full transaction:', transaction);
          
          verifyPaymentAndActivate({
            plan: selectedPlan,
            isYearly: isYearly,
            amount: displayPrice,
            reference: transaction.reference,
            planName: plan.name,
            billingPeriod: billingPeriod,
            autoRenew: autoRenew
          });
        },
        onError: (error) => {
          console.error('Payment error:', error);
          alert('⚠️ Payment failed: ' + error.message);
          localStorage.removeItem('pendingSubscription');
        },
        onClose: () => {
          console.log('Payment modal closed');
          alert('Payment was cancelled. Your subscription is not active.');
          // Clear the pending subscription from localStorage
          localStorage.removeItem('pendingSubscription');
        }
      });
      
    } else if (selectedPaymentMethod === 'payfast') {
      alert('PayFast integration coming soon! Please use Paystack for now.');
      
    } else if (selectedPaymentMethod === 'invitation') {
      // Use the validated promo code from the form
      const code = window.validatedPromoCode;
      if (!code) {
        alert('⚠️ Please apply a valid promotional code first.');
        return;
      }
      
      document.getElementById('proceedPaymentBtn').disabled = true;
      document.getElementById('proceedPaymentBtn').textContent = 'Activating...';
      
      try {
        const response = await fetch('/api/activate-promo-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.email,
            code: code,
            plan: selectedPlan,
            planName: plan.name,
            isYearly: isYearly,
            amount: 0, // Free with promo code
            autoRenew: false, // Promo codes don't auto-renew
            userId: currentUser.sub
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert('✅ Promotional code applied successfully!\n\nYour ' + plan.name + ' plan is now active.');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 1500);
        } else {
          alert(`❌ ${data.message || 'Failed to activate promotional subscription.'}`);
          document.getElementById('proceedPaymentBtn').disabled = false;
          document.getElementById('proceedPaymentBtn').textContent = 'Proceed to Payment';
        }
      } catch (error) {
        console.error('Error activating promotional subscription:', error);
        alert('❌ Error activating subscription. Please try again.');
        document.getElementById('proceedPaymentBtn').disabled = false;
        document.getElementById('proceedPaymentBtn').textContent = 'Proceed to Payment';
      }
    }
    
  } catch (error) {
    console.error('Error processing payment:', error);
    alert('❌ Error processing payment. Please try again.');
  }
}

function showComparisonModal() {
  const comparisonHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;" id="comparisonModal">
      <div style="background: white; border-radius: 8px; max-width: 1000px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="margin: 0; color: var(--dark-neutral); font-size: 24px; font-weight: 700;">Plan Comparison</h2>
          <button onclick="document.getElementById('comparisonModal').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #999; line-height: 1; padding: 0; width: 28px; height: 28px;">×</button>
        </div>
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; min-width: 700px;">
            <thead>
              <tr style="background: var(--light-bg);">
                <th style="padding: 14px; text-align: left; font-weight: 700; font-size: 13px; color: var(--dark-neutral);">Feature</th>
                <th style="padding: 14px; text-align: center; font-weight: 700; font-size: 13px; color: var(--dark-neutral);">Ignite</th>
                <th style="padding: 14px; text-align: center; font-weight: 700; font-size: 13px; color: var(--dark-neutral);">Spark</th>
                <th style="padding: 14px; text-align: center; font-weight: 700; font-size: 13px; color: var(--dark-neutral); background: #FFF8F0;">Growth</th>
                <th style="padding: 14px; text-align: center; font-weight: 700; font-size: 13px; color: var(--dark-neutral);">Blaze</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">Marketplace Access</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">Business Development</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">Creative Tools</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--text-secondary); font-size: 12px;">Limited</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">Marketing Tools</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--text-secondary); font-size: 12px;">Limited</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">Analytics Dashboard</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">AI Employees</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: var(--text-secondary); font-size: 12px;">Limited</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--dark-neutral); font-size: 12px; font-weight: 600;">Unlimited</td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">Priority Support</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: var(--primary-orange); font-size: 16px;">✓</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">Custom Integrations</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">Dedicated Account Manager</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
              </tr>
              <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">White Label Options</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; background: #FFFBF5; color: #DC3545; font-size: 16px;">✗</td>
                <td style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--primary-orange); font-size: 16px;">✓</td>
              </tr>
              <tr style="background: var(--light-bg);">
                <td style="padding: 16px 14px; font-weight: 700; font-size: 13px; color: var(--dark-neutral);">3-Month Price</td>
                <td style="padding: 16px 14px; text-align: center; font-weight: 700; font-size: 15px; color: var(--dark-neutral);">R297</td>
                <td style="padding: 16px 14px; text-align: center; font-weight: 700; font-size: 15px; color: var(--dark-neutral);">R1,797</td>
                <td style="padding: 16px 14px; text-align: center; font-weight: 700; font-size: 15px; background: #FFF8F0; color: var(--primary-orange);">R20,997</td>
                <td style="padding: 16px 14px; text-align: center; font-weight: 700; font-size: 15px; color: var(--dark-neutral);">R119,997</td>
              </tr>
              <tr style="background: var(--light-bg);">
                <td style="padding: 16px 14px; font-weight: 700; font-size: 13px; color: var(--dark-neutral);">Yearly Price</td>
                <td style="padding: 16px 14px; text-align: center; font-weight: 700; font-size: 15px; color: var(--dark-neutral);">R990</td>
                <td style="padding: 16px 14px; text-align: center; font-weight: 700; font-size: 15px; color: var(--dark-neutral);">R5,990</td>
                <td style="padding: 16px 14px; text-align: center; font-weight: 700; font-size: 15px; background: #FFF8F0; color: var(--primary-orange);">R69,990</td>
                <td style="padding: 16px 14px; text-align: center; font-weight: 700; font-size: 15px; color: var(--dark-neutral);">R399,990</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 32px; text-align: center;">
          <button onclick="document.getElementById('comparisonModal').remove()" style="padding: 12px 32px; background: linear-gradient(135deg, var(--primary-orange), var(--alt-orange)); color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s;">Close</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', comparisonHTML);
  
  document.getElementById('comparisonModal').addEventListener('click', (e) => {
    if (e.target.id === 'comparisonModal') {
      e.target.remove();
    }
  });
}

window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  
  if (paymentStatus === 'success') {
    const pendingSubscription = localStorage.getItem('pendingSubscription');
    if (pendingSubscription) {
      const subscription = JSON.parse(pendingSubscription);
      verifyPaymentAndActivate(subscription);
      localStorage.removeItem('pendingSubscription');
    }
  } else if (paymentStatus === 'cancelled') {
    alert('⚠️ Payment was cancelled. Please try again if you wish to subscribe.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

async function verifyPaymentAndActivate(paymentData) {
  try {
    console.log('Verifying payment and activating subscription:', paymentData);
    
    // Show loading message
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'loading-msg';
    loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 10000; text-align: center;';
    loadingMsg.innerHTML = `
      <div class="spinner" style="margin: 0 auto 20px; width: 40px; height: 40px; border: 4px solid #E0E0E0; border-top: 4px solid var(--primary-orange); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--dark-neutral);">Activating your subscription...</p>
    `;
    document.body.appendChild(loadingMsg);
    
    // Prepare the data for the backend
    const subscriptionData = {
      email: currentUser.email,
      plan: paymentData.plan,
      planName: paymentData.planName,
      isYearly: paymentData.isYearly,
      amount: paymentData.amount,
      paymentReference: paymentData.reference,
      paymentMethod: 'paystack',
      billingPeriod: paymentData.billingPeriod,
      autoRenew: paymentData.autoRenew,
      userId: currentUser.sub
    };
    
    console.log('Sending to backend:', subscriptionData);
    
    // Call your backend to verify and activate the subscription
    const response = await fetch('/api/activate-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionData)
    });
    
    const data = await response.json();
    
    // Remove loading message
    loadingMsg.remove();
    
    if (data.success) {
      // Calculate days until expiry
      const endDate = new Date(data.subscription.endDate);
      const daysUntilExpiry = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      
      // Show success message
      const successMessage = 
        `✅ Payment successful!\n\n` +
        `Your ${paymentData.planName} subscription has been activated!\n\n` +
        `Details:\n` +
        `• Plan: ${paymentData.planName}\n` +
        `• Billing: ${paymentData.billingPeriod}\n` +
        `• Auto-Renewal: ${paymentData.autoRenew ? 'ENABLED' : 'DISABLED'}\n` +
        `• Valid for: ${daysUntilExpiry} days\n` +
        `• Reference: ${paymentData.reference}\n\n` +
        `Redirecting to dashboard...`;
      
      alert(successMessage);
      console.log('Subscription activated successfully:', data);
      
      // Clear pending subscription
      localStorage.removeItem('pendingSubscription');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 2000);
    } else {
      alert(
        `⚠️ Payment received but subscription activation failed.\n\n` +
        `Error: ${data.message || 'Unknown error'}\n` +
        `Reference: ${paymentData.reference}\n\n` +
        `Please contact support with this reference number.`
      );
      console.error('Subscription activation failed:', data);
    }
  } catch (error) {
    console.error('Error activating subscription:', error);
    
    // Remove loading message if exists
    const loadingMsg = document.getElementById('loading-msg');
    if (loadingMsg) loadingMsg.remove();
    
    alert(
      `⚠️ Error activating subscription: ${error.message}\n\n` +
      `Reference: ${paymentData.reference}\n\n` +
      `Please contact support with this reference number.`
    );
  }
}

if (typeof window !== 'undefined') {
  window.pricingModule = {
    initPricingPage,
    showComparisonModal
  };
}