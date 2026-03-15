const rateLimit = require('express-rate-limit');

/**
 * Global API Limiter
 * Balanced for general browsing and data fetching
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per window
    message: {
        success: false,
        message: "Bạn đang thực hiện quá nhiều yêu cầu, vui lòng thử lại sau 15 phút."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict Auth Limiter (Login, Register attempts)
 * Prevents brute force and account exhaustion
 */
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 login/register attempts per hour
    message: {
        success: false,
        message: "Quá nhiều nỗ lực đăng nhập/đăng ký. Vui lòng thử lại sau 1 giờ."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Very Strict OTP Limiter
 * Prevents SMS/Email spamming and infrastructure cost spikes
 */
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Only 5 OTP requests allowed per hour per IP
    skipSuccessfulRequests: false,
    message: {
        success: false,
        message: "Bạn đã yêu cầu quá nhiều mã OTP. Vui lòng kiểm tra lại email hoặc thử lại sau 1 giờ."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Notification & Support Action Limiter
 * Prevents spamming administrative or customer support channels
 */
const actionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 significant actions (like opening support tickets or submitting organizer requests)
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
