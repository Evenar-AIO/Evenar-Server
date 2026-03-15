const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || `"MasterTicket" <${SMTP_USER}>`;

const createTransporter = () => {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn('MAIL WARNING: SMTP credentials not set. Emails will be logged to console instead.');
        return null;
    }

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });
};

const sendEmail = async ({ to, subject, html, text }) => {
    const transporter = createTransporter();

    if (!transporter) {
        console.log('--- EMAIL MOCK (No SMTP Config) ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${text || 'HTML content'}`);
        console.log('------------------------------------');
        return { success: true, mocked: true };
    }

    try {
        const info = await transporter.sendMail({
            from: MAIL_FROM,
            to,
            subject,
            text,
            html,
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Send an approval email to the new organizer
 */
const sendOrganizerApprovalEmail = async (email, username, organizationName) => {
    const subject = 'Chúc mừng! Bạn đã trở thành Nhà tổ chức sự kiện tại MasterTicket';
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #7c3aed; margin: 0;">MasterTicket</h1>
                <p style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 2px;">Cổng thông tin sự kiện hàng đầu</p>
            </div>
            
            <div style="background-color: #f9f7ff; border-left: 4px solid #7c3aed; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
                <h2 style="color: #1f2937; margin-top: 0;">Xin chào, ${username}!</h2>
                <p style="font-size: 16px;">Chúng tôi rất vui mừng thông báo rằng hồ sơ đăng ký làm Nhà tổ chức cho <strong>${organizationName}</strong> của bạn đã được phê duyệt.</p>
            </div>

            <p>Bắt đầu từ bây giờ, bạn có thể truy cập vào Dashboard của Nhà tổ chức để:</p>
            <ul style="padding-left: 20px;">
                <li>Tạo và quản lý các sự kiện mới.</li>
                <li>Theo dõi doanh thu và số lượng vé bán ra theo thời gian thực.</li>
                <li>Quản lý danh sách khách hàng và phản hồi.</li>
                <li>Sử dụng các công cụ marketing chuyên nghiệp của chúng tôi.</li>
            </ul>

            <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" 
                   style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.2);">
                   Truy cập Dashboard ngay
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            
            <p style="font-size: 14px; color: #666;">Cảm ơn bạn đã tin tưởng và hợp tác cùng MasterTicket. Chúng tôi rất mong đợi những sự kiện tuyệt vời từ bạn!</p>
            
            <div style="font-size: 12px; color: #999; margin-top: 40px; text-align: center;">
                <p>© 2026 MasterTicket Team. Tất cả quyền được bảo lưu.</p>
                <p>Địa chỉ: 123 Đường Sự Kiện, TP. Hồ Chí Minh</p>
            </div>
        </div>
    `;

    return sendEmail({ to: email, subject, html });
};

/**
 * Send a rejection email with reason
 */
const sendOrganizerRejectionEmail = async (email, username, organizationName, reason) => {
    const subject = 'Thông tin về yêu cầu làm Nhà tổ chức sự kiện tại MasterTicket';
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #666; margin: 0;">MasterTicket</h1>
            </div>
            
            <h2 style="color: #1f2937;">Chào ${username},</h2>
            <p>Cảm ơn bạn đã dành thời gian đăng ký trở thành Nhà tổ chức cho <strong>${organizationName}</strong> tại MasterTicket.</p>
            
            <p>Sau khi xem xét kỹ lưỡng hồ sơ, chúng tôi rất tiếc phải thông báo rằng yêu cầu của bạn hiện chưa được phê duyệt.</p>

            <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px; border-radius: 4px; margin: 25px 0;">
                <strong style="color: #c53030; display: block; margin-bottom: 5px;">Lý do từ chối:</strong>
                <p style="margin: 0; color: #4a5568;">${reason || 'Thông tin cung cấp chưa đầy đủ hoặc không phù hợp với tiêu chí của chúng tôi.'}</p>
            </div>

            <p>Đừng nản lòng! Bạn có thể cập nhật lại thông tin hồ sơ theo lý do nêu trên và gửi lại yêu cầu phê duyệt bất cứ lúc nào.</p>

            <div style="text-align: center; margin: 35px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/become-organizer" 
                   style="background-color: #4a5568; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">
                   Xem lại yêu cầu
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 14px; color: #666;">Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
            
            <div style="font-size: 12px; color: #999; margin-top: 40px; text-align: center;">
                <p>© 2026 MasterTicket Team.</p>
            </div>
        </div>
    `;

    return sendEmail({ to: email, subject, html });
};

/**
 * Send OTP email for registration or reset
 */
const sendOtpEmail = async (email, otp) => {
    const subject = 'Mã xác thực tài khoản - MasterTicket';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #7c3aed; text-align: center;">Xác thực tài khoản</h2>
        <p>Chào bạn,</p>
        <p>Mã OTP của bạn là: <strong style="font-size: 24px; color: #7c3aed;">${otp}</strong></p>
        <p>Mã này có hiệu lực trong 10 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">Đây là email tự động, vui lòng không trả lời email này.</p>
      </div>
    `;

    return sendEmail({ to: email, subject, html });
};

module.exports = {
    sendEmail,
    sendOtpEmail,
    sendOrganizerApprovalEmail,
    sendOrganizerRejectionEmail
};
