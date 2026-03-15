const promotionService = require('../services/promotionService');

exports.validateCode = async (req, res) => {
  try {
    const { code, eventId, totalAmount } = req.body;
    
    req.log.info({ code, eventId, totalAmount }, 'Validating promotion code');

    if (!code || !eventId || totalAmount === undefined) {
      return res.status(400).json({ error: 'code, eventId, and totalAmount are required' });
    }

    const { promo, discount } = await promotionService.validatePromotion(code, eventId, totalAmount);
    
    res.status(200).json({
      valid: true,
      promotionCode: promo.promotionCode,
      discount,
      promotionName: promo.promotionName
    });
  } catch (error) {
    req.log.warn({ error: error.message, code: req.body.code }, 'Promotion validation failed');
    res.status(400).json({ valid: false, error: error.message });
  }
};
