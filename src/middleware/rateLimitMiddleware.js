const rateLimit = require('express-rate-limit');

/**
 * Global API Limiter
 * Balanced for general browsing and data fetching
 */
const skipIfDisabled = () => process.env.DISABLE_RATE_LIMIT === 'true';

/**
 * Global API Limiter
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    skip: skipIfDisabled,
    message: {
        success: false,
        message: "Bạn đang thực hiện quá nhiều yêu cầu, vui lòng thử lại sau 15 phút."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict Auth Limiter
 */
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    skip: skipIfDisabled,
    message: {
        success: false,
        message: "Quá nhiều nỗ lực đăng nhập/đăng ký. Vui lòng thử lại sau 1 giờ."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Very Strict OTP Limiter
 */
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    skip: skipIfDisabled,
    message: {
        success: false,
        message: "Bạn đã yêu cầu quá nhiều mã OTP. Vui lòng kiểm tra lại email hoặc thử lại sau 1 giờ."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Notification & Support Action Limiter
 */
const actionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    skip: skipIfDisabled,
    message: {
        success: false,
        message: "Hành động quá nhanh. Vui lòng đợi một lát trước khi gửi yêu cầu tiếp theo."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    apiLimiter,
    authLimiter,
    otpLimiter,
    actionLimiter
};
