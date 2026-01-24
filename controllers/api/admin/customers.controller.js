const { success, error } = require('../../../helpers/response');
const nodemailer = require('nodemailer');

const User = require('../../../models/user.model');

class CustomersController {
    async toggleStatus(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return error(res, 404, 'Người dùng không tồn tại');
            }

            if (user.role === 0) {
                return error(res, 403, 'Không thể khóa tài khoản quản trị viên');
            }

            if (user.status == 0) {
                return error(res, 400, 'Tài khoản này chưa xác minh Gmail');
            }

            user.status = user.status === 1 ? 2 : 1;
            await user.save();

            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 465,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const isLocked = user.status === 0;

            const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER;
            const appName = process.env.APP_NAME || 'Hệ thống';

            const mailOptions = {
                from: `"${appName} – Bộ phận hỗ trợ" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: isLocked
                    ? `[Thông báo quan trọng] Tài khoản của bạn đã bị khóa`
                    : `Tài khoản của bạn đã được mở khóa`,
                text: isLocked
                    ? `Xin chào ${user.fullName},

Chúng tôi xin thông báo rằng tài khoản của bạn trên hệ thống "${appName}" đã bị TẠM THỜI KHÓA bởi quản trị viên.

Việc khóa tài khoản có thể xuất phát từ một trong các lý do sau:
- Phát hiện hoạt động bất thường hoặc vi phạm điều khoản sử dụng
- Yêu cầu xác minh bổ sung thông tin
- Quyết định quản trị trong quá trình rà soát hệ thống

Trong thời gian tài khoản bị khóa, bạn sẽ KHÔNG thể đăng nhập hoặc sử dụng các dịch vụ liên quan.

⚠️ Nếu bạn cho rằng đây là NHẦM LẪN hoặc bạn không thực hiện bất kỳ hành vi nào liên quan, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi qua email:
${supportEmail}

Chúng tôi sẽ kiểm tra và phản hồi trong thời gian sớm nhất.

Lưu ý:
- Email này được gửi tự động, vui lòng không trả lời trực tiếp.
- Nếu bạn không nhận ra hoạt động nào liên quan, tài khoản của bạn vẫn được bảo vệ an toàn.

Trân trọng,
${appName}`
                    : `Xin chào ${user.fullName},

Chúng tôi xin thông báo rằng tài khoản của bạn trên hệ thống "${appName}" đã được MỞ KHÓA.

Bạn hiện có thể đăng nhập và sử dụng các dịch vụ như bình thường.

Nếu trước đó bạn đã liên hệ bộ phận hỗ trợ, xin cảm ơn bạn đã kiên nhẫn chờ đợi.
Trong trường hợp bạn vẫn gặp bất kỳ vấn đề nào, vui lòng liên hệ:
${supportEmail}

Trân trọng,
${appName}`,
                html: isLocked
                    ? `
        <p>Xin chào <b>${user.fullName}</b>,</p>

        <p>
            Chúng tôi xin thông báo rằng tài khoản của bạn trên hệ thống
            <b>${appName}</b> đã <b style="color:#c0392b">tạm thời bị khóa</b>
            bởi quản trị viên.
        </p>

        <p><b>Lý do có thể bao gồm:</b></p>
        <ul>
            <li>Phát hiện hoạt động bất thường hoặc vi phạm điều khoản sử dụng</li>
            <li>Yêu cầu xác minh bổ sung thông tin</li>
            <li>Rà soát hệ thống theo quy trình quản trị</li>
        </ul>

        <p>
            Trong thời gian này, bạn sẽ <b>không thể đăng nhập hoặc sử dụng dịch vụ</b>.
        </p>

        <p style="color:#d35400">
            <b>⚠ Nếu bạn cho rằng đây là nhầm lẫn</b> hoặc bạn không thực hiện bất kỳ hành vi nào liên quan,
            vui lòng liên hệ với bộ phận hỗ trợ qua email:
            <a href="mailto:${supportEmail}">${supportEmail}</a>
        </p>

        <p>
            Chúng tôi sẽ kiểm tra và phản hồi trong thời gian sớm nhất.
        </p>

        <hr />

        <p style="font-size:13px;color:#777">
            Email này được gửi tự động. Nếu bạn không nhận ra hoạt động nào liên quan,
            vui lòng yên tâm rằng tài khoản của bạn vẫn được bảo vệ an toàn.
        </p>

        <p>Trân trọng,<br><b>${appName}</b></p>
        `
                    : `
        <p>Xin chào <b>${user.fullName}</b>,</p>

        <p>
            Chúng tôi xin thông báo rằng tài khoản của bạn trên hệ thống
            <b>${appName}</b> đã <b style="color:#27ae60">được mở khóa</b>.
        </p>

        <p>
            Bạn hiện có thể đăng nhập và sử dụng các dịch vụ như bình thường.
        </p>

        <p>
            Nếu bạn vẫn gặp bất kỳ vấn đề nào hoặc cần hỗ trợ thêm,
            vui lòng liên hệ với chúng tôi qua email:
            <a href="mailto:${supportEmail}">${supportEmail}</a>
        </p>

        <p>Trân trọng,<br><b>${appName}</b></p>
        `
            };


            await transporter.sendMail(mailOptions);

            return success(res, 200, 'Cập nhật trạng thái tài khoản thành công', {
                id: user._id,
                status: user.status
            });

        } catch (err) {
            console.error('Toggle user status error:', err);
            return error(res, 500, 'Có lỗi xảy ra khi cập nhật trạng thái tài khoản');
        }
    }
}

module.exports = new CustomersController();
