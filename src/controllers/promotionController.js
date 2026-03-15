const promotionService = require('../services/promotionService');

exports.validateCode = async (req, res) => {
  try {
    const { code, eventId, totalAmount } = req.body;
    if (!code || !eventId || !totalAmount) {
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
    res.status(400).json({ valid: false, error: error.message });
  }
};
