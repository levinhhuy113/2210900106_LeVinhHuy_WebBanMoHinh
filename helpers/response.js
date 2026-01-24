// response.helper.js

/**
 * Response thành công
 * @param {object} res - Express response object
 * @param {number} code - HTTP status code (200, 201...)
 * @param {string} message - Thông báo
 * @param {any} data - Dữ liệu trả về
 */
const success = (res, code = 200, message = 'Success', data = null) => {
  return res.status(code).json({
    code,
    success: true,
    message,
    data,
    errors: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Response lỗi / không thành công
 * @param {object} res - Express response object
 * @param {number} code - HTTP status code (400, 401, 500...)
 * @param {string} message - Thông báo lỗi
 * @param {any} errors - Chi tiết lỗi (ví dụ validate)
 */
const error = (res, code = 400, message = 'Error', errors = null) => {
  return res.status(code).json({
    code,
    success: false,
    message,
    data: null,
    errors,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = { success, error };
