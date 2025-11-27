#!/bin/bash

# Creative Hub Contact Details System - Setup Verification Script
# This script verifies all components are properly installed and configured

echo "==================================="
echo "Zuke Creative Hub Setup Verification"
echo "==================================="
echo ""

# Check 1: Node modules installed
echo "✓ Checking dependencies..."
if npm list mailgun.js > /dev/null 2>&1; then
    echo "  ✅ mailgun.js installed"
else
    echo "  ❌ mailgun.js NOT installed"
    echo "     Run: npm install mailgun.js"
fi

if npm list form-data > /dev/null 2>&1; then
    echo "  ✅ form-data installed"
else
    echo "  ❌ form-data NOT installed"
    echo "     Run: npm install form-data"
fi

echo ""

# Check 2: Files created/modified
echo "✓ Checking files..."
if [ -f "api/mailgun.js" ]; then
    echo "  ✅ api/mailgun.js exists"
else
    echo "  ❌ api/mailgun.js NOT found"
fi

if grep -q "mailgunApi" server.js; then
    echo "  ✅ server.js imports mailgun"
else
    echo "  ❌ server.js doesn't import mailgun"
fi

if grep -q "window.requestModelDetails" public/pages/settings/components/creative-panel.js; then
    echo "  ✅ requestModelDetails function defined"
else
    echo "  ❌ requestModelDetails function NOT defined"
fi

if grep -q "data-model-name" public/pages/settings/components/creative-panel.js; then
    echo "  ✅ data-model-name attribute added"
else
    echo "  ❌ data-model-name attribute NOT found"
fi

echo ""

# Check 3: Environment variables
echo "✓ Checking environment variables..."
if [ -f ".env" ]; then
    if grep -q "MAILGUN_API_KEY" .env; then
        echo "  ✅ MAILGUN_API_KEY in .env"
    else
        echo "  ⚠️  MAILGUN_API_KEY not in .env (required for production)"
    fi
    
    if grep -q "MAILGUN_DOMAIN" .env; then
        echo "  ✅ MAILGUN_DOMAIN in .env"
    else
        echo "  ⚠️  MAILGUN_DOMAIN not in .env (required for production)"
    fi
    
    if grep -q "MAILGUN_FROM_EMAIL" .env; then
        echo "  ✅ MAILGUN_FROM_EMAIL in .env"
    else
        echo "  ⚠️  MAILGUN_FROM_EMAIL not in .env (optional)"
    fi
else
    echo "  ⚠️  .env file not found"
    echo "     Create .env with Mailgun credentials for testing"
fi

echo ""

# Check 4: Database requirements
echo "✓ Checking database collections..."
echo "  Note: Collections created automatically on first use"
echo "  Required collections:"
echo "    - user_wallets (for wallet transactions)"
echo "    - creative_models (for contact request logging)"

echo ""

# Summary
echo "==================================="
echo "Setup Verification Complete"
echo "==================================="
echo ""
echo "Next Steps:"
echo "1. Add Mailgun credentials to .env:"
echo "   MAILGUN_API_KEY=your-key"
echo "   MAILGUN_DOMAIN=mg.yourdomain.com"
echo "   MAILGUN_FROM_EMAIL=noreply@mg.yourdomain.com"
echo ""
echo "2. Start the server:"
echo "   npm run dev"
echo ""
echo "3. Test the system:"
echo "   - Open Creative Hub in dashboard"
echo "   - Click info icon on a model"
echo "   - Click 'Request' button on contact details"
echo "   - Verify R10 deducted and emails sent"
echo ""
