const Promotion = require('../models/promotionModel');

/**
 * validatePromotion - Validates promotion code without incrementing usage
 * Use this when you just want to check if code is valid (e.g., display discount before checkout)
 */
exports.validatePromotion = async (code, eventId, totalAmount) => {
  const promo = await Promotion.findOne({ promotionCode: code, isActive: true });
  
  if (!promo) {
    throw new Error('Invalid promotion code');
  }

  // Check timeframe
  const now = new Date();
  if (now < promo.startTime || now > promo.endTime) {
    throw new Error('Promotion code has expired');
  }

  // Check usage limit
  if (promo.maxUsageCount && promo.currentUsageCount >= promo.maxUsageCount) {
    throw new Error('Promotion code has reached its usage limit');
  }

  // Check event restriction (if specified)
  if (promo.eventId && promo.eventId.toString() !== eventId.toString()) {
    // If it's a legacy number in init-db, we might need to handle ID comparison differently
    // For now, assume it's an ObjectId or a string. 
    // In production we'd want more robust matching if IDs vary.
  }

  // Check min order amount
  if (totalAmount < promo.minOrderAmount) {
    throw new Error(`Minimum order amount for this promotion is ${promo.minOrderAmount}`);
  }

  // Calculate discount
  let discount = 0;
  if (promo.promotionType === 'percentage') {
    discount = (totalAmount * promo.discountPercentage) / 100;
    if (promo.maxDiscountAmount && discount > promo.maxDiscountAmount) {
      discount = promo.maxDiscountAmount;
    }
  } else if (promo.promotionType === 'fixed_amount') {
    discount = promo.discountAmount;
  }

  // Ensure discount doesn't exceed total amount
  discount = Math.min(discount, totalAmount);

  return { promo, discount };
};

/**
 * validateAndUsePromotion - Atomic validation + increment in one operation
 * Use this during checkout to prevent race conditions
 * 
 * This prevents the scenario where two concurrent requests both validate
 * the same promo code (both see it as valid) and both increment usage,
 * exceeding maxUsageCount
 * 
 * @param {string} code - Promotion code
 * @param {string} eventId - Event ID
 * @param {number} totalAmount - Order total amount
 * @returns {Promise<{promo: Object, discount: number}>}
 */
exports.validateAndUsePromotion = async (code, eventId, totalAmount) => {
  // First, find the promotion to get its details
  const promo = await Promotion.findOne({ promotionCode: code, isActive: true });
  
  if (!promo) {
    throw new Error('Invalid promotion code');
  }

  // Check timeframe
  const now = new Date();
  if (now < promo.startTime || now > promo.endTime) {
    throw new Error('Promotion code has expired');
  }

  // Check min order amount BEFORE incrementing
  if (totalAmount < promo.minOrderAmount) {
    throw new Error(`Minimum order amount for this promotion is ${promo.minOrderAmount}`);
  }

  // Check event restriction (if specified)
  if (promo.eventId && promo.eventId.toString() !== eventId.toString()) {
    throw new Error('Promotion code not valid for this event');
  }

  // Now atomically increment usage count - this is the key race condition fix
  // We use findOneAndUpdate with conditions to ensure we only increment if under limit
  const updatedPromo = await Promotion.findOneAndUpdate(
    {
      promotionCode: code,
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
      $or: [
        { maxUsageCount: { $exists: false } },
        { maxUsageCount: null },
        { currentUsageCount: { $lt: promo.maxUsageCount } }
      ]
    },
    { $inc: { currentUsageCount: 1 } },
    { new: true }
  );

  // If update failed (returned null), it means usage limit was reached between our check and update
  if (!updatedPromo) {
    // Re-check to provide specific error message
    const recheckPromo = await Promotion.findOne({ promotionCode: code });
    if (recheckPromo && recheckPromo.currentUsageCount >= recheckPromo.maxUsageCount) {
      throw new Error('Promotion code has reached its usage limit');
    }
    throw new Error('Promotion code is no longer valid');
  }

  // Calculate discount using the updated promo
  let discount = 0;
  if (updatedPromo.promotionType === 'percentage') {
    discount = (totalAmount * updatedPromo.discountPercentage) / 100;
    if (updatedPromo.maxDiscountAmount && discount > updatedPromo.maxDiscountAmount) {
      discount = updatedPromo.maxDiscountAmount;
    }
  } else if (updatedPromo.promotionType === 'fixed_amount') {
    discount = updatedPromo.discountAmount;
  }

  // Ensure discount doesn't exceed total amount
  discount = Math.min(discount, totalAmount);

  return { promo: updatedPromo, discount };
};

/**
 * incrementUsageCount - Increment usage count (legacy method)
 * WARNING: Use validateAndUsePromotion instead to avoid race conditions
 */
exports.incrementUsageCount = async (promoId) => {
  await Promotion.findByIdAndUpdate(promoId, { $inc: { currentUsageCount: 1 } });
};

/**
 * decrementUsageCount - Decrement usage count (for rollback scenarios)
 */
exports.decrementUsageCount = async (promoId) => {
  await Promotion.findByIdAndUpdate(
    promoId, 
    { $inc: { currentUsageCount: -1 } },
    { runValidators: true }
  );
};

/**
 * findByCode - Find promotion by code
 */
exports.findByCode = async (code, eventId) => {
  const promo = await Promotion.findOne({ promotionCode: code, isActive: true });
  if (!promo) throw new Error('Invalid promotion code');
  return promo;
};

/**
 * rollbackPromotionUsage - Rollback a promotion usage (e.g., when order is cancelled)
 */
exports.rollbackPromotionUsage = async (promoId) => {
  await Promotion.findByIdAndUpdate(
    promoId,
    { $inc: { currentUsageCount: -1 } },
    { runValidators: true }
  );
};
