Hướng dẫn Deploy Web Node.js (Express) + MongoDB

1️⃣ Cài môi trường
Node.js
MongoDB Atlas hoặc Compass

2️⃣ Clone project & cài package
git clone <repo>
cd project
npm install

3️⃣ Tạo file .env
# ===============================
# SERVER
# ===============================
PORT=3000
APP_URL=http://localhost:3000/

# ===============================
# DATABASE
# ===============================
CONNECT_DB=mongodb://127.0.0.1:27017/my_app_db
# Hoặc MongoDB Atlas:
# CONNECT_DB=mongodb+srv://username:password@cluster.mongodb.net/my_app_db

# ===============================
# SMTP (Gửi email)
# ===============================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# ===============================
# AUTH / JWT
# ===============================
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

# ===============================
# VALIDATION CONFIG
# ===============================
FULLNAME_MIN_LENGTH=5
FULLNAME_MAX_LENGTH=50

PASSWORD_MIN_LENGTH=6
PASSWORD_MAX_LENGTH=20

# ===============================
# VNPAY
# ===============================
VNP_TMN_CODE=
VNP_HASH_SECRET=
VNP_RETURN_URL=http://localhost:3000/payment/vnpay-return

4️⃣Chạy ứng dụng (Development)
Chạy chế độ development
npm run dev

Lệnh này sẽ thực hiện:
nodemon ./bin/www → chạy server Express
sass public/scss/main.scss public/css/style.css --watch → tự động build CSS khi sửa SCSS