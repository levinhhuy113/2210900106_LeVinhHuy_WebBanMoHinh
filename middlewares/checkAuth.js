const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../utils/jwt');

const { success, error } = require('../helpers/response');

const User = require('../models/user.model');
const Cart = require('../models/cart.model');
const RefreshToken = require('../models/refreshToken.model');
const { JWT_SECRET, JWT_EXPIRES_IN, COOKIE_MAX_AGE } = process.env;

const { asyncHandler } = require('../utils/index');

const redirectIfAuthenticated = (req, res, next) => {
    if (req.user) return res.redirect('/');
    next();
};

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 10, // Tối đa 10 lần login trong 15 phút
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        return error(res, 404, 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút.');
    }
});

const attachUserIfLoggedIn = asyncHandler(async (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    // ==========================
    // 1. THỬ VERIFY ACCESS TOKEN
    // ==========================
    if (accessToken) {
        try {
            const decoded = verifyAccessToken(accessToken);

            const user = await User.findById(decoded.user_id)
                .select('_id fullName avatarUrl email role status')
                .lean();

            user.cartQuantity = await getCartQuantityByUserId(user._id);

            if (user && user.status === 1) {
                req.user = user;
                res.locals.user = user;
            }

            return next();
        } catch (err) {
            // access token hết hạn → chuyển sang refresh
        }
    }

    // ============================================
    // 2. KHÔNG CÓ ACCESS TOKEN HOẶC ACCESS TOKEN HẾT HẠN
    // THỬ DÙNG REFRESH TOKEN
    // ============================================
    if (!refreshToken) return next();

    let decodedRefresh;
    try {
        decodedRefresh = verifyRefreshToken(refreshToken);
    } catch (err) {
        return next(); // refresh token không hợp lệ
    }

    // ===== Kiểm tra refresh token trong database =====
    const tokenInDB = await RefreshToken.findOne({
        token: refreshToken,
        userId: decodedRefresh.user_id,
        userAgent: req.get('User-Agent'),
    });

    if (!tokenInDB || tokenInDB.expiresAt < Date.now()) {
        return next(); // refresh token hết hạn / không tồn tại
    }

    // ===== Lấy user =====
    const user = await User.findById(decodedRefresh.user_id)
        .select('_id fullName avatarUrl email role status')
        .lean();

    if (!user || user.status === 0) {
        return next(); // User bị khóa
    }

    // ===== Tạo access token mới =====
    const newAccessToken = createAccessToken({
        user_id: user._id,
        role: user.role,
        email: user.email
    });

    res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: COOKIE_MAX_AGE || 15 * 60 * 1000
    });

    const cart = await Cart.findOne({ userId: user._id }).lean();
    const cartQuantity = cart?.products?.length || 0;
    user.cartQuantity = cartQuantity;

    req.user = user;
    res.locals.user = user;


    next();
});

const authUser = asyncHandler(async (req, res, next) => {

    if (!req.user) {
        if (req.originalUrl.startsWith("/api")) {
            return error(res, 403, 'Bạn cần đăng nhập để tiếp tục!');
        }
        return res.redirect('/login');
    }
    if (req.user.status === 0) {
        return res.redirect('/403');
    }

    next();
});

const authAdmin = asyncHandler(async (req, res, next) => {

    if (!req.user) {
        return res.redirect('/login');
    }

    if (req.user.status === 0) {
        return res.redirect('/403');
    }

    if (req.user.role !== 0) {
        return res.redirect('/403');
    }

    next();
});

async function getCartQuantityByUserId(userId) {
    if (!userId) return 0;

    const cart = await Cart.findOne({ userId })
        .select('products')
        .lean();

    return cart?.products?.length || 0;
}

module.exports = {
    redirectIfAuthenticated,
    loginLimiter,
    attachUserIfLoggedIn,
    authUser,
    authAdmin,
};