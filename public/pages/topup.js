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

    // Load current wallet balance
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
      const balanceInRands = balance; // Already in Rands (R1 = 1 Credit)
      document.getElementById('topupCurrentBalance').textContent = `R${balanceInRands.toLocaleString()}`;
    }
  } catch (error) {
    console.error("Error loading balance:", error);
  }
}

// Helper function to get Paystack key from server
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

// Update custom amount display
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

// Main buy credits function (ONLY ONE VERSION)
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
    `You'll be redirected to Paystack for payment.`
  );
  
  if (!confirmed) return;

  try {
    // Get the Paystack key from your server
    const paystackKey = await getPaystackKey();
    
    if (!paystackKey) {
      alert('Payment service unavailable. Please try again later.');
      console.error('No Paystack key received from server');
      return;
    }

    console.log('Initializing Paystack payment...');

    const handler = PaystackPop.setup({
      key: paystackKey, // ✅ Dynamic key from server
      email: currentUser.email,
      amount: amountInCents,
      currency: 'ZAR',
      ref: `zuke_topup_${bundle}_${Date.now()}`,
      metadata: {
        custom_fields: [
          {
            display_name: "User Email",
            variable_name: "user_email",
            value: currentUser.email
          },
          {
            display_name: "Bundle Type",
            variable_name: "bundle_type",
            value: bundle
          },
          {
            display_name: "Credits",
            variable_name: "credits",
            value: credits.toString()
          },
          {
            display_name: "Transaction Type",
            variable_name: "transaction_type",
            value: "topup"
          }
        ]
      },
      callback: function(response) {
        console.log('Payment successful:', response);
        alert(`Payment successful! ${credits.toLocaleString()} credits will be added to your account shortly.`);
        
        // Reload balance after 2 seconds
        setTimeout(() => {
          loadTopupBalance();
          
          // Also reload main dashboard balance if function exists
          if (window.loadWalletBalance) {
            window.loadWalletBalance();
          }
        }, 2000);
      },
      onClose: function() {
        console.log('Payment window closed');
      }
    });
    
    handler.openIframe();
    
  } catch (error) {
    console.error('Error initiating payment:', error);
    alert('Error processing payment. Please try again.');
  }
};

// Buy custom amount of credits
window.buyCustomCredits = function() {
  const customInput = document.getElementById('customAmount');
  const amount = parseInt(customInput.value) || 0;
  
  if (amount < 100) { // ✅ Fixed: minimum is 100
    alert('Minimum purchase is 99 credits (R99)');
    return;
  }
  
  const amountInCents = amount * 100;
  buyCredits('custom', amount, amountInCents);
};