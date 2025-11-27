// pages/topup.js
let auth0Client = null;
let currentUser = null;

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

export async function initTopupPage() {
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
    console.log("Top-up page loaded for:", currentUser.email);

    await loadTopupBalance();

  } catch (error) {
    console.error("Error in initTopupPage:", error);
  }
}

async function loadTopupBalance() {
  try {
    const response = await fetch(`/api/wallet?email=${encodeURIComponent(currentUser.email)}`);
    const data = await response.json();
    
    if (data.success && data.wallet) {
      const balance = data.wallet.balance || 0;
      document.getElementById('topupCurrentBalance').textContent = `R${balance.toLocaleString()}`;
    }
  } catch (error) {
    console.error("Error loading balance:", error);
  }
}

async function getPaystackKey() {
  try {
    const response = await fetch('/api/paystack-key');
    const data = await response.json();
    console.log('Fetched Paystack key:', data.key ? 'Success' : 'Failed');
    return data.key;
  } catch (error) {
    console.error('Error fetching Paystack key:', error);
    return null;
  }
}

window.updateCustomAmount = function(amount) {
  const customPrice = document.getElementById('customPrice');
  const customButton = document.getElementById('customBuyButton');
  
  const numAmount = parseInt(amount) || 0;
  
  if (numAmount >= 100) {
    customPrice.textContent = `R${numAmount.toLocaleString()}`;
    customButton.disabled = false;
  } else {
    customPrice.textContent = 'R0.00';
    customButton.disabled = true;
  }
};

window.buyCredits = async function(bundle, credits, amountInCents) {
  if (!currentUser) {
    alert('Please log in to purchase credits');
    return;
  }

  const amountInRands = credits;
  
  const confirmed = window.confirm(
    `Purchase ${bundle.toUpperCase()} bundle?\n\n` +
    `Credits: ${credits.toLocaleString()}\n` +
    `Price: R${amountInRands.toLocaleString()}\n\n` +
    `Click OK to proceed to secure payment.`
  );
  
  if (!confirmed) return;

  try {
    const paystackKey = await getPaystackKey();
    
    if (!paystackKey) {
      alert('Payment service unavailable. Please try again later.');
      console.error('No Paystack key received from server');
      return;
    }

    console.log('Initializing Paystack payment for:', {
      bundle,
      credits,
      amountInCents,
      email: currentUser.email
    });

    // Check if PaystackPop is available
    if (typeof PaystackPop === 'undefined') {
      alert('⚠️ Payment gateway is loading. Please try again in a moment.');
      console.error('PaystackPop is not loaded');
      return;
    }

    const handler = PaystackPop.setup({
      key: paystackKey,
      email: currentUser.email,
      amount: amountInCents,
      currency: 'ZAR',
      ref: `zuke_topup_${bundle}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        bundle_type: bundle,
        credits: credits,
        transaction_type: "topup",
        user_email: currentUser.email,
        user_id: currentUser.sub
      },
      callback: function(response) {
        console.log('✅ Payment successful:', response);
        addCreditsToWallet(credits, response.reference, bundle);
      },
      onClose: function() {
        console.log('Payment window closed');
        alert('Payment was cancelled.');
      }
    });

    handler.openIframe();
    
  } catch (error) {
    console.error('Error initiating payment:', error);
    alert('❌ Error processing payment. Please try again.');
  }
};

async function addCreditsToWallet(credits, reference, bundle) {
  try {
    // Show loading
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'loading-msg';
    loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 10000; text-align: center;';
    loadingMsg.innerHTML = `
      <div class="spinner" style="margin: 0 auto 20px; width: 40px; height: 40px; border: 4px solid #E0E0E0; border-top: 4px solid var(--primary-orange); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--dark-neutral);">Processing your purchase...</p>
    `;
    document.body.appendChild(loadingMsg);

    const response = await fetch('/api/add-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.email,
        credits: credits,
        paymentReference: reference,
        bundle: bundle,
        amount: credits
      })
    });
    
    const data = await response.json();
    
    // Remove loading
    loadingMsg.remove();
    
    if (data.success) {
      alert(
        `✅ Payment successful!\n\n` +
        `${credits.toLocaleString()} credits have been added to your account.\n\n` +
        `Reference: ${reference}`
      );
      
      // Reload balance
      setTimeout(() => {
        loadTopupBalance();
        
                if (window.loadWalletBalance) {
          window.loadWalletBalance();
        }
      }, 1000);
    } else {
      alert(
        `⚠️ Payment received but credits were not added.\n\n` +
        `Error: ${data.message}\n` +
        `Reference: ${reference}\n\n` +
        `Please contact support.`
      );
    }
  } catch (error) {
    console.error('Error adding credits:', error);
    
    // Remove loading message if exists
    const loadingMsg = document.getElementById('loading-msg');
    if (loadingMsg) loadingMsg.remove();
    
    alert(
      `⚠️ Error adding credits: ${error.message}\n\n` +
      `Reference: ${reference}\n\n` +
      `Please contact support with this reference.`
    );
  }
}

window.buyCustomCredits = function() {
  const customInput = document.getElementById('customAmount');
  const amount = parseInt(customInput.value) || 0;
  
  if (amount < 100) {
    alert('Minimum purchase is 100 credits (R100)');
    return;
  }
  
  const amountInCents = amount * 100;
  buyCredits('custom', amount, amountInCents);
};