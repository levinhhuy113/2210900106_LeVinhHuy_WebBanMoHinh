HƯỚNG DẪN CHẠY WEB NODE.JS (EXPRESS) + MONGODB (LOCAL)

1️⃣ CÀI MÔI TRƯỜNG
- Node.js >= 16 (khuyến nghị 18)
- MongoDB (local hoặc MongoDB Atlas / Compass)
- NPM

Kiểm tra môi trường:
node -v
npm -v


2️⃣ CLONE PROJECT & CÀI PACKAGE
git clone <repository-url>
cd model-store-website
npm install


3️⃣ TẠO FILE .ENV
Tạo file .env tại thư mục gốc dự án với nội dung sau:

PORT=3000
APP_URL=http://localhost:3000/

CONNECT_DB=mongodb://127.0.0.1:27017/my_app_db
# Hoặc MongoDB Atlas:
# CONNECT_DB=mongodb+srv://username:password@cluster.mongodb.net/my_app_db

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

FULLNAME_MIN_LENGTH=5
FULLNAME_MAX_LENGTH=50

PASSWORD_MIN_LENGTH=6
PASSWORD_MAX_LENGTH=20

VNP_TMN_CODE=
VNP_HASH_SECRET=
VNP_RETURN_URL=http://localhost:3000/payment/vnpay-return

4️⃣ CHẠY ỨNG DỤNG (DEVELOPMENT)
Chạy lệnh:
npm run dev

Lệnh này sẽ chạy song song:
- nodemon ./bin/www → chạy server Express
- sass public/scss/main.scss public/css/style.css --watch → tự động build CSS khi sửa SCSS


5️⃣ TRUY CẬP & KIỂM TRA
Truy cập ứng dụng tại:
http://localhost:3000

Kiểm tra nhanh:
- Server start không báo lỗi
- MongoDB kết nối thành công
- Trang web load bình thường
- CSS hiển thị đúng
- Các chức năng hoạt động ổn định