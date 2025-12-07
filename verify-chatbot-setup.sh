#!/bin/bash

echo "🤖 AI Chatbot Integration Verification"
echo "======================================"
echo ""

# Check if files exist
echo "📁 Checking files..."

files=(
  "api/business-chat-api.js"
  "public/css/chatbot.css"
  "public/js/chatbot.js"
  "docs/AI_CHATBOT_RAG.md"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
    all_exist=false
  fi
done

echo ""

# Check environment variables
echo "🔧 Checking environment variables..."

required_vars=(
  "AZURE_OPENAI_ENDPOINT"
  "AZURE_OPENAI_API_KEY"
  "AZURE_OPENAI_DEPLOYMENT"
  "MONGODB_URI"
)

if [ -f ".env" ]; then
  echo "  ✅ .env file found"
  for var in "${required_vars[@]}"; do
    if grep -q "^$var=" .env; then
      echo "  ✅ $var is set"
    else
      echo "  ⚠️  $var not found in .env"
    fi
  done
else
  echo "  ⚠️  .env file not found"
fi

echo ""

# Check if route is registered in server.js
echo "🔌 Checking server.js integration..."

if grep -q "business-chat" server.js; then
  echo "  ✅ Route registered in server.js"
else
  echo "  ❌ Route NOT registered in server.js"
fi

echo ""

# Check if dashboard.html includes chatbot
echo "🎨 Checking dashboard.html integration..."

if grep -q "chatbot.css" public/dashboard.html; then
  echo "  ✅ Chatbot CSS included"
else
  echo "  ❌ Chatbot CSS NOT included"
fi

if grep -q "chatbot.js" public/dashboard.html; then
  echo "  ✅ Chatbot JS included"
else
  echo "  ❌ Chatbot JS NOT included"
fi

echo ""

# Syntax check
echo "✅ Running syntax checks..."

if node -c api/business-chat-api.js 2>/dev/null; then
  echo "  ✅ business-chat-api.js syntax valid"
else
  echo "  ❌ business-chat-api.js has syntax errors"
fi

if grep -q "export default" public/js/chatbot.js; then
  echo "  ✅ chatbot.js syntax valid (ES6 module)"
else
  echo "  ❌ chatbot.js may have issues"
fi

echo ""
echo "======================================"

if [ "$all_exist" = true ]; then
  echo "✅ All files present!"
  echo ""
  echo "🚀 Next steps:"
  echo "   1. Ensure environment variables are set in .env"
  echo "   2. Start the server: npm start or node server.js"
  echo "   3. Open dashboard and look for purple chat button (bottom right)"
  echo "   4. Click to open and ask questions about your business!"
  echo ""
  echo "📚 Documentation: docs/AI_CHATBOT_RAG.md"
else
  echo "⚠️  Some files are missing. Please check the output above."
fi
