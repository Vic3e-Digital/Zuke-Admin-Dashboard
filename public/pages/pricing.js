// pages/pricing.js
let auth0Client = null;
let currentUser = null;
let isYearly = false;

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

    // Load current wallet balance
    await loadWalletBalance();

    // Setup billing toggle
    setupBillingToggle();

    // Load current plan if exists
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
      const balanceInRands = balance; // Already in Rands (R1 = 1 Credit)
      document.getElementById('currentBalance').textContent = `R${balanceInRands.toLocaleString()}`;
      document.getElementById('walletInfo').style.display = 'block';
    }
  } catch (error) {
    console.error("Error loading wallet balance:", error);
  }
}

// async function loadCurrentPlan() {
//   try {
//     // Get current business to check plan
//     const currentBusiness = window.dataManager.getSelectedBusinessOrFirst();
//     if (!currentBusiness) return;

//     const currentPlan = currentBusiness.processing_status?.plan?.toLowerCase();
//     if (currentPlan) {
//       // Mark current plan
//       const planCard = document.querySelector(`[data-plan="${currentPlan}"]`);
//       if (planCard) {
//         const badge = document.createElement('div');
//         badge.className = 'current-plan-badge';
//         badge.textContent = 'Current Plan';
//         planCard.insertBefore(badge, planCard.firstChild);
        
//         const button = planCard.querySelector('.plan-cta');
//         button.textContent = 'Current Plan';
//         button.disabled = true;
//         button.style.opacity = '0.6';
//         button.style.cursor = 'not-allowed';
//       }
//     }
//   } catch (error) {
//     console.error("Error loading current plan:", error);
//   }
// }
async function loadCurrentPlan() {
    try {
      const response = await fetch(`/api/wallet?email=${encodeURIComponent(currentUser.email)}`);
      const data = await response.json();
      
      if (data.success && data.wallet && data.hasActivePlan) {
        const wallet = data.wallet;
        const currentPlan = wallet.current_plan?.toLowerCase();
        
        if (currentPlan && currentPlan !== 'free') {
          // Mark current plan
          const planCard = document.querySelector(`[data-plan="${currentPlan}"]`);
          if (planCard) {
            const daysRemaining = wallet.subscription_end_date ? 
              Math.ceil((new Date(wallet.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
            
            const badge = document.createElement('div');
            badge.className = 'current-plan-badge';
            badge.innerHTML = `
              <div>Current Plan</div>
              <div style="font-size: 12px; opacity: 0.9;">${daysRemaining} days remaining</div>
            `;
            planCard.insertBefore(badge, planCard.firstChild);
            
            const button = planCard.querySelector('.plan-cta');
            button.textContent = 'Current Plan';
            button.disabled = true;
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
          }
        }
      }
    } catch (error) {
      console.error("Error loading current plan:", error);
    }
  }

function setupBillingToggle() {
  const toggle = document.getElementById('billingToggle');
  
  toggle.addEventListener('click', () => {
    isYearly = !isYearly;
    toggle.classList.toggle('yearly');
    
    // Update all prices
    document.querySelectorAll('.monthly-price').forEach(el => {
      el.style.display = isYearly ? 'none' : 'inline';
    });
    document.querySelectorAll('.yearly-price').forEach(el => {
      el.style.display = isYearly ? 'inline' : 'none';
    });
  });
}

window.selectPlan = async function(planName, monthlyPrice, yearlyPrice) {
  if (!currentUser) {
    alert('Please log in to select a plan');
    return;
  }

  // Paystack payment page link
  const paystackPaymentPage = 'https://paystack.shop/pay/ia50euu-ap_test_1724915856605';
  
  // Calculate 3-month cycle price
  const price = isYearly ? yearlyPrice : monthlyPrice;
  const threeMonthPrice = monthlyPrice * 3; // Always use monthly price for 3-month cycles
  const amountInCents = threeMonthPrice * 1; // Convert to cents (kobo)
  
  const billingPeriod = isYearly ? 'yearly' : '3-month cycle';
  const displayPrice = isYearly ? yearlyPrice : threeMonthPrice;
  
  // Show confirmation
  const confirmed = window.confirm(
    `Subscribe to ${planName.toUpperCase()} plan?\n\n` +
    `Billing: ${billingPeriod}\n` +
    `Amount: R${displayPrice} ${isYearly ? 'per year' : 'every 3 months'}\n` +
    `(R${monthlyPrice}/month × 3 months)\n\n` +
    `You'll be redirected to Paystack to complete your payment.`
  );
  
  if (!confirmed) return;

  try {
    // Extract first and last name from Auth0 user object
    const firstName = currentUser.given_name || currentUser.name?.split(' ')[0] || '';
    const lastName = currentUser.family_name || currentUser.name?.split(' ').slice(1).join(' ') || '';
    const phone = currentUser.phone_number || '';
    
    // Build the Paystack URL with pre-populated fields
    const params = new URLSearchParams({
      email: currentUser.email,
      amount: amountInCents.toString(), // Amount in cents
      first_name: firstName,
      last_name: lastName
    });
    
    // Add phone if available
    if (phone) {
      params.append('phone', phone);
    }
    
    const paymentUrl = `${paystackPaymentPage}?${params.toString()}`;
    
    console.log('Redirecting to Paystack payment page:', paymentUrl);
    console.log('Amount details:', {
      monthlyPrice,
      threeMonthPrice,
      amountInCents,
      billingPeriod
    });
    
    // Redirect to Paystack payment page
    window.location.href = paymentUrl;
    
  } catch (error) {
    console.error('Error redirecting to payment:', error);
    alert('Error processing payment. Please try again.');
  }
};