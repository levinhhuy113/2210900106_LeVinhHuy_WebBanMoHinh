const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { success, error } = require('../../../helpers/response');
const nodemailer = require('nodemailer');

const User = require('../../../models/user.model');
const UserToken = require('../../../models/userToken.model');
const RefreshToken = require('../../../models/refreshToken.model');
const minFullNameLength = parseInt(process.env.FULLNAME_MIN_LENGTH) || 2;
const maxFullNameLength = parseInt(process.env.FULLNAME_MAX_LENGTH) || 50;
const minPasswordLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 6;
const maxPasswordLength = parseInt(process.env.PASSWORD_MAX_LENGTH) || 20;

const { createAccessToken, createRefreshToken } = require('../../../utils/jwt');

class AuthController {

    // [POST] /api/login
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const userAgent = req.headers['user-agent'] || null;
            const ipAddress = req.ip;

            if (!email || !password) {
                return error(res, 400, 'Vui lòng nhập email và mật khẩu.');
            }

            // Tìm user
            const user = await User.findOne({ email });
            if (!user) return error(res, 401, 'Email hoặc mật khẩu không đúng.');

            // Kiểm tra verify email
            if (user.status === 0) {
                return error(res, 403, 'Tài khoản của bạn chưa được xác minh email. Vui lòng kiểm tra hộp thư và hoàn tất xác minh để tiếp tục.');
            }

            if (user.status === 2) {
                return error(res, 401, 'Tài khoản của bạn hiện đang tạm thời bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ thêm.');
            }

            // So khớp mật khẩu
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return error(res, 401, 'Email hoặc mật khẩu không đúng.');

            // === Tạo JWT access token ===
            const accessToken = createAccessToken({ user_id: user._id, role: user.role, email: user.email });
            const refreshToken = createRefreshToken({ user_id: user._id, role: user.role, email: user.email });

            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

            await RefreshToken.create({
                userId: user._id,
                token: refreshToken,
                userAgent,
                ipAddress,
                expiresAt
            });

            // === Set cookie ===
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 phút
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
            });

            return success(res, 200, 'Đăng nhập thành công!', {
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (err) {
            console.error('Login error:', err);
            return error(res, 500, 'Lỗi máy chủ. Vui lòng thử lại sau.', err.message);
        }
    }

    // [POST] /api/register
    async register(req, res) {
        try {
            const { fullName, email, password } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = await User.create({
                _id: uuidv4(),
                fullName,
                email,
                password: hashedPassword,
                status: 0,
                role: 1
            });

            const token = crypto.randomBytes(16).toString('hex');
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            await UserToken.create({
                userId: newUser._id,
                email: newUser.email,
                type: 'verify_email',
                token,
                expiresAt
            });

            const verifyLink = `${process.env.APP_URL}verify?token=${token}`;
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 465,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const mailOptions = {
                from: `"App Support" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Xác nhận tài khoản của bạn',
                text: `Bạn hoặc ai đó đã sử dụng email này để đăng ký tài khoản trên ứng dụng của chúng tôi.
Vui lòng click vào link để xác nhận tài khoản: ${verifyLink}
Nếu bạn không thực hiện đăng ký, hãy bỏ qua email này.`,
                html: `<p>Xin chào <b>${fullName}</b>,</p>
           <p>Bạn hoặc ai đó đã sử dụng email này để đăng ký tài khoản trên ứng dụng của chúng tôi.</p>
           <p>Để xác nhận tài khoản, vui lòng click vào link sau:</p>
           <a href="${verifyLink}" target="_blank">${verifyLink}</a>
           <p>Link sẽ hết hạn sau 15 phút.</p>
           <p><b>Lưu ý:</b> Nếu bạn không thực hiện đăng ký, vui lòng <u>không click vào link</u> và bỏ qua email này.</p>`
            };


            await transporter.sendMail(mailOptions);
            return success(
                res,
                201,
                'Đăng ký tài khoản thành công! Vui lòng kiểm tra email của bạn để kích hoạt tài khoản.'
            );

        } catch (err) {
            console.error('Register error:', err);
            return error(res, 500, 'Lỗi máy chủ. Vui lòng thử lại sau.', err.message);
        }
    }

    // [POST] /api/resend-verification
    async resendVerification(req, res) {
        try {
            const { email } = req.body;
            if (!email) return error(res, 400, 'Email không được để trống.');

            const user = await User.findOne({ email });
            if (!user) return error(res, 404, 'Tài khoản không tồn tại.');

            if (user.status === 1)
                return success(res, 200, 'Tài khoản đã được xác nhận. Bạn có thể đăng nhập.');

            if (user.status === 2) {
                return error(
                    res,
                    403,
                    'Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.'
                );
            }

            // Lấy token xác nhận mới nhất của user
            const record = await UserToken.findOne({ userId: user._id }).sort({ createdAt: -1 });

            const now = new Date();
            if (record && record.expiresAt > now) {
                const remaining = Math.ceil((record.expiresAt - now) / 60000); // phút còn lại
                return success(
                    res,
                    200,
                    `Email xác nhận đã được gửi trước đó. Vui lòng kiểm tra lại hộp thư của bạn hoặc thử gửi lại sau ${remaining} phút.`
                );
            }


            const token = crypto.randomBytes(16).toString('hex');
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

            await UserToken.create({
                userId: user._id,
                email: user.email,
                type: 'verify_email',
                token,
                expiresAt
            });

            // Gửi email
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 465,
                secure: true,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });

            const verifyLink = `${process.env.APP_URL}verify?token=${token}`;
            await transporter.sendMail({
                from: `"App Support" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Xác nhận tài khoản của bạn',
                html: `<p>Xin chào <b>${user.fullName}</b>,</p>
           <p>Bạn hoặc ai đó đã sử dụng email này để đăng ký tài khoản trên ứng dụng của chúng tôi.</p>
           <p>Để xác nhận tài khoản, vui lòng click vào link sau:</p>
           <a href="${verifyLink}" target="_blank">${verifyLink}</a>
           <p>Link này sẽ hết hạn sau 15 phút.</p>
           <p><b>Lưu ý:</b> Nếu bạn không thực hiện đăng ký, vui lòng <u>không click vào link</u> và bỏ qua email này.</p>`
            });


            return success(res, 201, 'Đã gửi lại email xác nhận. Vui lòng kiểm tra email.');
        } catch (err) {
            console.error(err);
            return error(res, 500, 'Lỗi máy chủ. Vui lòng thử lại sau.', err.message);
        }
    }

    // [POST] /api/request-reset-password
    async requestResetPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) return error(res, 400, 'Email không được để trống.');

            const user = await User.findOne({ email });
            if (!user) {
                return success(res, 200, 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.');
            }

            if (user.status === 0) {
                return error(
                    res,
                    403,
                    'Tài khoản chưa được xác minh email. Vui lòng xác minh trước khi đặt lại mật khẩu.'
                );
            }

            if (user.status === 2) {
                return error(
                    res,
                    403,
                    'Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.'
                );
            }

            const latestToken = await UserToken.findOne({
                userId: user._id,
                type: 'reset_password'
            }).sort({ createdAt: -1 });

            const now = new Date();
            if (latestToken && !latestToken.expiresAt && latestToken.expiresAt > now) {
                const remaining = Math.ceil((latestToken.expiresAt - now) / 60000);
                return success(
                    res,
                    200,
                    `Liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email hoặc thử lại sau ${remaining} phút.`
                );
            }

            const token = crypto.randomBytes(16).toString('hex');
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            await UserToken.create({
                userId: user._id,
                email: user.email,
                type: 'reset_password',
                token,
                expiresAt
            });

            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 465,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const resetLink = `${process.env.APP_URL}reset-password?token=${token}`;

            await transporter.sendMail({
                from: `"App Support" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Đặt lại mật khẩu',
                html: `
                <p>Xin chào <b>${user.fullName}</b>,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <p>Vui lòng click vào link bên dưới để tạo mật khẩu mới:</p>
                <a href="${resetLink}" target="_blank">${resetLink}</a>
                <p>Link này sẽ hết hạn sau <b>15 phút</b>.</p>
                <p><b>Lưu ý:</b> Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
            `
            });

            return success(res, 201, 'Liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email.');

        } catch (err) {
            console.error('Request reset password error:', err);
            return error(res, 500, 'Lỗi máy chủ. Vui lòng thử lại sau.');
        }
    }


    async logout(req, res) {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (refreshToken) {
                await RefreshToken.deleteOne({ token: refreshToken });
            }

            // Xoá cookie
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            return success(res, 200, 'Đăng xuất thành công!');
        } catch (err) {
            console.error('Logout error:', err);
            return error(res, 500, 'Lỗi máy chủ. Vui lòng thử lại sau.', err.message);
        }
    }

    async resetPassword(req, res) {
        try {
            const { email, token, password, confirmPassword } = req.body;

            if (!email || !token || !password || !confirmPassword) {
                return error(res, 400, 'Vui lòng nhập đầy đủ thông tin.');
            }

            if (password !== confirmPassword) {
                return error(res, 400, 'Mật khẩu xác nhận không khớp.');
            }

            if (password.length < minPasswordLength || password.length > maxPasswordLength) {
                return error(
                    res,
                    400,
                    `Mật khẩu phải từ ${minPasswordLength} đến ${maxPasswordLength} ký tự.`
                );
            }

            const record = await UserToken.findOne({
                email,
                token,
                type: 'reset_password'
            });

            if (!record) {
                return error(res, 400, 'Liên kết đặt lại mật khẩu không hợp lệ.');
            }

            if (record.verified) {
                return error(res, 400, 'Liên kết này đã được sử dụng.');
            }

            if (record.expiresAt < new Date()) {
                return error(res, 400, 'Liên kết đặt lại mật khẩu đã hết hạn.');
            }

            // === 3. Lấy user ===
            const user = await User.findById(record.userId);
            if (!user) {
                return error(res, 404, 'Tài khoản không tồn tại.');
            }

            if (user.status !== 1) {
                return error(
                    res,
                    403,
                    'Không thể đặt lại mật khẩu cho tài khoản này.'
                );
            }

            // === 4. Hash mật khẩu mới ===
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);


            user.password = hashedPassword;
            await user.save();

            record.verified = true;
            await record.save();
            // await UserToken.deleteMany({
            //     userId: user._id,
            //     type: 'reset_password',
            //     verified: false
            // });

            return success(res, 200, 'Đổi mật khẩu thành công. Bạn có thể đăng nhập ngay.');

        } catch (err) {
            console.error('Reset password error:', err);
            return error(res, 500, 'Lỗi máy chủ. Vui lòng thử lại sau.');
        }
    }
}

module.exports = new AuthController();
