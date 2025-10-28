// api/get-openai-config.js
module.exports = async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      return res.status(200).json({
        endpoint: process.env.AZURE_OPENAI_ENDPOINT || "https://zuke-make-automation.openai.azure.com/",
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini"
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get config' });
    }
  };