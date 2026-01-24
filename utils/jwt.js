const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const createAccessToken = (payload) =>
    jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

const createRefreshToken = (payload) =>
    jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

const verifyAccessToken = (token) =>
    jwt.verify(token, JWT_SECRET);

const verifyRefreshToken = (token) =>
    jwt.verify(token, JWT_REFRESH_SECRET);

module.exports = {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};