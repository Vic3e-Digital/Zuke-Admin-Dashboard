const { ObjectId } = require('mongodb');

class ValidationMiddleware {
  static validateBusinessId(req, res, next) {
    const { businessId } = req.params;

    if (!businessId || !businessId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business ID format'
      });
    }

    next();
  }

  static validatePlatform(req, res, next) {
    const { platform } = req.params;
    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'youtube'];

    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be one of: facebook, instagram, linkedin, youtube'
      });
    }

    next();
  }

  static validateUpdateBody(req, res, next) {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body cannot be empty'
      });
    }

    next();
  }
}

module.exports = ValidationMiddleware;