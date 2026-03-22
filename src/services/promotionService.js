const Promotion = require('../models/promotionModel');
const Event = require('../models/Event');
const mongoose = require('mongoose');

/**
 * validatePromotion - Validates promotion code without incrementing usage
 * Use this when you just want to check if code is valid (e.g., display discount before checkout)
 */
exports.validatePromotion = async (code, eventId, totalAmount) => {
  const promo = await Promotion.findOne({ promotionCode: code, isActive: true });
  
  if (!promo) {
    throw new Error('Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa.');
  }

  // Check timeframe
  const now = new Date();
  if (now < promo.startTime) {
    throw new Error('Chương trình khuyến mãi này chưa bắt đầu.');
  }
  if (now > promo.endTime) {
    throw new Error('Mã giảm giá này đã hết hạn sử dụng.');
  }

  // Check usage limit
  if (promo.maxUsageCount && promo.currentUsageCount >= promo.maxUsageCount) {
    throw new Error('Mã giảm giá đã hết lượt sử dụng.');
  }

  // Check event restriction (if specified)
  if (promo.eventId) {
    const promoEventIdStr = promo.eventId.toString();
    const targetEventIdStr = eventId.toString();

    // Basic string check
    if (promoEventIdStr !== targetEventIdStr) {
      // Robust check: if we have an ObjectId, check the event's legacyId too
      if (mongoose.Types.ObjectId.isValid(targetEventIdStr)) {
        const event = await Event.findById(targetEventIdStr);
        if (event) {
          const isLegacyMatch = event.legacyId && event.legacyId.toString() === promoEventIdStr;
          const isIdMatch = event._id.toString() === promoEventIdStr;
          
          if (!isLegacyMatch && !isIdMatch) {
            throw new Error('Mã giảm giá này không áp dụng cho sự kiện hiện tại.');
          }
        } else {
          throw new Error('Mã giảm giá này không áp dụng cho sự kiện hiện tại.');
        }
      } else {
        throw new Error('Mã giảm giá này không áp dụng cho sự kiện hiện tại.');
      }
    }
  }

  // Check min order amount
  if (totalAmount < promo.minOrderAmount) {
    throw new Error(`Đơn hàng tối thiểu để sử dụng mã này là ${promo.minOrderAmount.toLocaleString()} VNĐ.`);
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
    throw new Error('Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa.');
  }

  // Check timeframe
  const now = new Date();
  if (now < promo.startTime) {
    throw new Error('Chương trình khuyến mãi này chưa bắt đầu.');
  }
  if (now > promo.endTime) {
    throw new Error('Mã giảm giá này đã hết hạn sử dụng.');
  }

  // Check min order amount BEFORE incrementing
  if (totalAmount < promo.minOrderAmount) {
    throw new Error(`Đơn hàng tối thiểu để sử dụng mã này là ${promo.minOrderAmount.toLocaleString()} VNĐ.`);
  }

  // Check event restriction (if specified)
  if (promo.eventId) {
    const promoEventIdStr = promo.eventId.toString();
    const targetEventIdStr = eventId.toString();

    if (promoEventIdStr !== targetEventIdStr) {
      if (mongoose.Types.ObjectId.isValid(targetEventIdStr)) {
        const event = await Event.findById(targetEventIdStr);
        if (event) {
          const isLegacyMatch = event.legacyId && event.legacyId.toString() === promoEventIdStr;
          const isIdMatch = event._id.toString() === promoEventIdStr;
          
          if (!isLegacyMatch && !isIdMatch) {
            throw new Error('Mã giảm giá này không áp dụng cho sự kiện hiện tại.');
          }
        } else {
          throw new Error('Mã giảm giá này không áp dụng cho sự kiện hiện tại.');
        }
      } else {
        throw new Error('Mã giảm giá này không áp dụng cho sự kiện hiện tại.');
      }
    }
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
      throw new Error('Mã giảm giá đã hết lượt sử dụng.');
    }
    throw new Error('Mã giảm giá không còn hiệu lực.');
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
  void eventId;
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
