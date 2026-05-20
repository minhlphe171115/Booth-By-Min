require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { connectToDatabase, sql } = require('./dbConfig');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Multer để lưu ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'qr-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json()); // Để đọc được dữ liệu JSON từ Frontend
app.use(express.urlencoded({ extended: true }));

// Phục vụ các file tĩnh (Frontend HTML, CSS, JS) từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Khởi tạo Database
async function initDatabase() {
    try {
        const pool = await connectToDatabase();

        // Tạo các bảng nếu chưa tồn tại
        const createTableQuery = `
            IF OBJECT_ID('Bookings', 'U') IS NULL
            CREATE TABLE Bookings (
                ID INT PRIMARY KEY IDENTITY(1,1),
                Name NVARCHAR(255) NOT NULL,
                Phone NVARCHAR(50) NOT NULL,
                BookingDate DATE NOT NULL,
                Notes NVARCHAR(MAX),
                PackageName NVARCHAR(255),
                TotalAmount INT,
                Status NVARCHAR(50) DEFAULT N'Chờ xử lý',
                CreatedAt DATETIME DEFAULT GETDATE(),
                Username NVARCHAR(255)
            );

            IF OBJECT_ID('Users', 'U') IS NULL
            CREATE TABLE Users (
                ID INT PRIMARY KEY IDENTITY(1,1),
                FullName NVARCHAR(255) NOT NULL,
                Username NVARCHAR(255) NOT NULL UNIQUE,
                Password NVARCHAR(255) NOT NULL,
                Phone NVARCHAR(50),
                CreatedAt DATETIME DEFAULT GETDATE()
            );

            IF OBJECT_ID('Packages', 'U') IS NULL
            CREATE TABLE Packages (
                ID INT PRIMARY KEY IDENTITY(1,1),
                Name NVARCHAR(255) NOT NULL,
                Price INT NOT NULL,
                CreatedAt DATETIME DEFAULT GETDATE()
            );

            IF OBJECT_ID('Staffs', 'U') IS NULL
            CREATE TABLE Staffs (
                ID INT PRIMARY KEY IDENTITY(1,1),
                FullName NVARCHAR(255) NOT NULL,
                Username NVARCHAR(255) NOT NULL UNIQUE,
                Password NVARCHAR(255) NOT NULL,
                Role NVARCHAR(50) DEFAULT 'Admin',
                CreatedAt DATETIME DEFAULT GETDATE()
            );

            IF OBJECT_ID('Feedbacks', 'U') IS NULL
            CREATE TABLE Feedbacks (
                ID INT PRIMARY KEY IDENTITY(1,1),
                Username NVARCHAR(255) NOT NULL,
                Message NVARCHAR(MAX) NOT NULL,
                CreatedAt DATETIME DEFAULT GETDATE()
            );

            IF OBJECT_ID('Settings', 'U') IS NULL
            CREATE TABLE Settings (
                ID INT PRIMARY KEY IDENTITY(1,1),
                KeyName NVARCHAR(50) UNIQUE,
                KeyValue NVARCHAR(MAX)
            );

            IF OBJECT_ID('HomepageImages', 'U') IS NULL
            CREATE TABLE HomepageImages (
                ID INT PRIMARY KEY IDENTITY(1,1),
                ImageUrl NVARCHAR(MAX) NOT NULL,
                DisplayOrder INT DEFAULT 0
            );

            IF COL_LENGTH('Bookings', 'PaymentMethod') IS NULL
            BEGIN
                ALTER TABLE Bookings ADD PaymentMethod NVARCHAR(50) DEFAULT N'Tiền mặt';
            END

            IF COL_LENGTH('Bookings', 'ProcessedBy') IS NULL
            BEGIN
                ALTER TABLE Bookings ADD ProcessedBy NVARCHAR(255);
            END

            IF COL_LENGTH('Packages', 'Features') IS NULL
            BEGIN
                ALTER TABLE Packages ADD Features NVARCHAR(MAX) DEFAULT N'';
            END

            IF COL_LENGTH('Packages', 'IsBestSeller') IS NULL
            BEGIN
                ALTER TABLE Packages ADD IsBestSeller BIT DEFAULT 0;
            END
        `;

        await pool.request().query(createTableQuery);

        // Seed QR code if missing
        const qrResult = await pool.request().query("SELECT * FROM Settings WHERE KeyName='QRCodeUrl'");
        if (qrResult.recordset.length === 0) {
            await pool.request().query("INSERT INTO Settings (KeyName, KeyValue) VALUES ('QRCodeUrl', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MoMoThanhToanGiaLap')");
        }

        // Seed default images if missing
        const imagesResult = await pool.request().query("SELECT * FROM HomepageImages");
        if (imagesResult.recordset.length === 0) {
            await pool.request().query(`
                INSERT INTO HomepageImages (ImageUrl, DisplayOrder) VALUES 
                ('https://instagram.fsgn2-5.fna.fbcdn.net/v/t51.82787-15/670773389_17941512555178388_7267557262647696631_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=104&ig_cache_key=Mzg3MzYwNzcxNDI1NzEwNjE5Nw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTIxNS5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=KGl7aPvedZEQ7kNvwE9O25J&_nc_oc=AdoCwEwhjUjrHu09Y4mlAUzAuub01fpnrGO0MNO0VX0z1X3ndtgN7-nrnX2XIwH2xfA&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fsgn2-5.fna&_nc_gid=teVhWX5jOgA_sjJsFmS-1g&_nc_ss=7a22e&oh=00_Af4jNkx6h0S8qrV49RwQVxei4sa1DDXGfChG1Eqb8AeTsw&oe=6A011EA5', 1),
                ('https://instagram.fsgn2-3.fna.fbcdn.net/v/t51.82787-15/669839094_17941512585178388_3803293513647211432_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=107&ig_cache_key=Mzg3MzYwNzcxNjY3Mjk2Mjg2Nw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTIxNS5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=-6ilSeEFpCMQ7kNvwFr4upD&_nc_oc=AdrsNMXBBjFo77F7rKq8OQSDwjISJSbmzw7sl3t_Hht35T321yJP_39zXE6mRzG9U9A&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fsgn2-3.fna&_nc_gid=teVhWX5jOgA_sjJsFmS-1g&_nc_ss=7a22e&oh=00_Af6CZ_mi--7rIbM0cn1-lITsvSSDiMtm1fmc5cB_eOH1dg&oe=6A011F97', 2),
                ('https://instagram.fsgn2-10.fna.fbcdn.net/v/t51.82787-15/670563922_17941512600178388_8979590816459611135_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=109&ig_cache_key=Mzg3MzYwNzcyMTc5ODQzOTA5Mw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTIxNS5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=QfltHQ-aNKoQ7kNvwFG2vDn&_nc_oc=AdqeKdk3UTW0J762sC7l2KCyxlqx2PhpItTm3TQ88MnAKw4XsFwhHM_OKXkUjwJ8dVk&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fsgn2-10.fna&_nc_gid=teVhWX5jOgA_sjJsFmS-1g&_nc_ss=7a22e&oh=00_Af7w_-oT3ghMyjEX1M-HLUir3Ps7wWgGYkqDiwuOjol40Q&oe=6A01027E', 3)
            `);
        }

        // Thêm Admin mặc định nếu chưa có
        const adminResult = await pool.request().query("SELECT * FROM Staffs WHERE Username='boothbymin'");
        if (adminResult.recordset.length === 0) {
            await pool.request().query("INSERT INTO Staffs (FullName, Username, Password, Role) VALUES (N'Admin Booth By Min', 'boothbymin', '123', 'Admin')");
        }

        console.log('✅ Khởi tạo các bảng thành công trên SQL Server.');
    } catch (err) {
        console.error('Lỗi khởi tạo Database:', err);
    }
}

// Gọi hàm khởi tạo DB khi server chạy
initDatabase();

// --- API ROUTES --- //

// API Đặt lịch
app.post('/api/booking', async (req, res) => {
    try {
        const { name, phone, date, notes } = req.body;

        if (!name || !phone || !date) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc.' });
        }

        const pool = await connectToDatabase();

        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('phone', sql.NVarChar, phone)
            .input('date', sql.Date, date)
            .input('notes', sql.NVarChar, notes || '')
            .query('INSERT INTO Bookings (Name, Phone, BookingDate, Notes) VALUES (@name, @phone, @date, @notes)');

        res.status(200).json({ message: 'Đặt lịch thành công!' });
    } catch (error) {
        console.error('Lỗi khi lưu đặt lịch:', error);
        res.status(500).json({ message: 'Lỗi server. Không thể lưu lịch đặt.' });
    }
});

// API Đăng Ký
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, username, password } = req.body;

        if (!fullName || !username || !password) {
            return res.status(400).json({ message: 'Vui lòng điền đủ thông tin.' });
        }

        const pool = await connectToDatabase();

        // Kiểm tra trùng trong Users
        const checkUser = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT ID FROM Users WHERE Username = @username');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });
        }

        // Kiểm tra trùng trong Staffs
        const checkStaff = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT ID FROM Staffs WHERE Username = @username');

        if (checkStaff.recordset.length > 0) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });
        }

        await pool.request()
            .input('fullName', sql.NVarChar, fullName)
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query('INSERT INTO Users (FullName, Username, Password) VALUES (@fullName, @username, @password)');

        res.status(200).json({ message: 'Đăng ký thành công!' });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký.' });
    }
});

// API Đăng Nhập Gộp (Unified Login)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập tài khoản và mật khẩu.' });
        }

        const pool = await connectToDatabase();

        // 1. Kiểm tra Nhân viên/Admin trước
        const staffRes = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query('SELECT ID, FullName, Username, Role FROM Staffs WHERE Username = @username AND Password = @password');

        if (staffRes.recordset.length > 0) {
            const user = staffRes.recordset[0];
            return res.status(200).json({ message: 'Đăng nhập thành công', role: user.Role, user });
        }

        // 2. Kiểm tra Khách hàng
        const userRes = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query('SELECT ID, FullName, Username FROM Users WHERE Username = @username AND Password = @password');

        if (userRes.recordset.length > 0) {
            const user = userRes.recordset[0];
            return res.status(200).json({ message: 'Đăng nhập thành công', role: 'Customer', user });
        }

        // Nếu không có trong cả 2 bảng
        res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập.' });
    }
});

// --- CUSTOMER APIs ---

// Lấy thông tin user
app.get('/api/user/profile/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const pool = await connectToDatabase();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT FullName, Username, Phone FROM Users WHERE Username = @username');
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error' });
    }
});

// Cập nhật thông tin user
app.put('/api/user/profile', async (req, res) => {
    try {
        const { username, fullName, phone, password } = req.body;
        const pool = await connectToDatabase();
        if (password) {
            await pool.request()
                .input('fullName', sql.NVarChar, fullName)
                .input('phone', sql.NVarChar, phone)
                .input('password', sql.NVarChar, password)
                .input('username', sql.NVarChar, username)
                .query('UPDATE Users SET FullName = @fullName, Phone = @phone, Password = @password WHERE Username = @username');
        } else {
            await pool.request()
                .input('fullName', sql.NVarChar, fullName)
                .input('phone', sql.NVarChar, phone)
                .input('username', sql.NVarChar, username)
                .query('UPDATE Users SET FullName = @fullName, Phone = @phone WHERE Username = @username');
        }
        res.json({ message: 'Cập nhật thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật' });
    }
});

// Gửi góp ý
app.post('/api/user/feedback', async (req, res) => {
    try {
        const { username, message } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('message', sql.NVarChar, message)
            .query('INSERT INTO Feedbacks (Username, Message) VALUES (@username, @message)');
        res.json({ message: 'Cảm ơn bạn đã góp ý!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi gửi góp ý' });
    }
});

// Lấy lịch sử đặt lịch
app.get('/api/user/bookings/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const pool = await connectToDatabase();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM Bookings WHERE Username = @username ORDER BY CreatedAt DESC');
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy lịch sử' });
    }
});

// Đặt lịch kèm username (Từ dashboard)
app.post('/api/user/booking', async (req, res) => {
    try {
        const { username, name, phone, date, packageName, totalAmount, status, paymentMethod } = req.body;
        const pool = await connectToDatabase();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('name', sql.NVarChar, name)
            .input('phone', sql.NVarChar, phone)
            .input('date', sql.Date, date)
            .input('packageName', sql.NVarChar, packageName)
            .input('totalAmount', sql.Int, totalAmount)
            .input('status', sql.NVarChar, status)
            .input('paymentMethod', sql.NVarChar, paymentMethod || 'Tiền mặt')
            .query(`
                INSERT INTO Bookings (Username, Name, Phone, BookingDate, PackageName, TotalAmount, Status, PaymentMethod)
                OUTPUT INSERTED.ID
                VALUES (@username, @name, @phone, @date, @packageName, @totalAmount, @status, @paymentMethod)
            `);
        res.status(200).json({ message: 'Đặt lịch thành công!', bookingId: result.recordset[0].ID });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi đặt lịch.' });
    }
});

// --- ADMIN APIs ---

// 1. Lấy thống kê Dashboard
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        const pool = await connectToDatabase();

        const todayQuery = `SELECT ISNULL(SUM(TotalAmount), 0) as RevenueDay FROM Bookings WHERE CAST(CreatedAt as DATE) = CAST(GETDATE() as DATE) AND Status IN (N'Chấp nhận', N'Đã thanh toán', N'Hoàn thành')`;
        const monthQuery = `SELECT ISNULL(SUM(TotalAmount), 0) as RevenueMonth FROM Bookings WHERE FORMAT(CreatedAt, 'yyyy-MM') = FORMAT(GETDATE(), 'yyyy-MM') AND Status IN (N'Chấp nhận', N'Đã thanh toán', N'Hoàn thành')`;
        const yearQuery = `SELECT ISNULL(SUM(TotalAmount), 0) as RevenueYear FROM Bookings WHERE YEAR(CreatedAt) = YEAR(GETDATE()) AND Status IN (N'Chấp nhận', N'Đã thanh toán', N'Hoàn thành')`;

        const rDay = await pool.request().query(todayQuery);
        const rMonth = await pool.request().query(monthQuery);
        const rYear = await pool.request().query(yearQuery);

        res.json({
            revenueDay: rDay.recordset[0].RevenueDay,
            revenueMonth: rMonth.recordset[0].RevenueMonth,
            revenueYear: rYear.recordset[0].RevenueYear
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi lấy thống kê' });
    }
});

// API lấy thống kê tuỳ chỉnh theo ngày
app.get('/api/admin/stats/custom', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ message: 'Vui lòng chọn ngày bắt đầu và kết thúc.' });

        const pool = await connectToDatabase();
        const query = `
            SELECT ISNULL(SUM(TotalAmount), 0) as Revenue 
            FROM Bookings 
            WHERE CAST(CreatedAt as DATE) >= CAST(@startDate as DATE) 
              AND CAST(CreatedAt as DATE) <= CAST(@endDate as DATE) 
              AND Status IN (N'Chấp nhận', N'Đã thanh toán', N'Hoàn thành')`;

        const result = await pool.request()
            .input('startDate', sql.NVarChar, startDate)
            .input('endDate', sql.NVarChar, endDate)
            .query(query);

        res.json({ revenue: result.recordset[0].Revenue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi lấy thống kê tuỳ chỉnh' });
    }
});

// 2. Lấy danh sách Đơn hàng
app.get('/api/admin/orders', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const pool = await connectToDatabase();

        let query = 'SELECT * FROM Bookings ';
        let request = pool.request();

        if (startDate && endDate) {
            query += 'WHERE CreatedAt >= @startDate AND CreatedAt <= @endDate ';
            request.input('startDate', sql.DateTime, new Date(startDate));
            request.input('endDate', sql.DateTime, new Date(endDate));
        }
        query += 'ORDER BY CreatedAt DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách đơn hàng' });
    }
});

// 3. Quản lý Gói Chụp (Packages)
app.get('/api/packages', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Packages ORDER BY ID');
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách gói' });
    }
});

app.post('/api/packages', async (req, res) => {
    try {
        const { name, price, features, isBestSeller } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('price', sql.Int, price)
            .input('features', sql.NVarChar, features || '')
            .input('isBestSeller', sql.Bit, isBestSeller ? 1 : 0)
            .query('INSERT INTO Packages (Name, Price, Features, IsBestSeller) VALUES (@name, @price, @features, @isBestSeller)');
        res.json({ message: 'Thêm gói thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi thêm gói' });
    }
});

app.put('/api/packages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, features, isBestSeller } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('price', sql.Int, price)
            .input('features', sql.NVarChar, features || '')
            .input('isBestSeller', sql.Bit, isBestSeller ? 1 : 0)
            .query('UPDATE Packages SET Name=@name, Price=@price, Features=@features, IsBestSeller=@isBestSeller WHERE ID=@id');
        res.json({ message: 'Cập nhật gói thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật gói' });
    }
});

app.delete('/api/packages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Packages WHERE ID = @id');
        res.json({ message: 'Xóa gói thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa gói' });
    }
});

// 4. Quản lý Nhân viên (Staffs)
app.get('/api/admin/staffs', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT ID, FullName, Username, Role FROM Staffs ORDER BY ID');
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách nhân viên' });
    }
});

// --- Bổ sung API Staff / Admin ---

// Đăng nhập Staff / Admin
app.post('/api/staff/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập tài khoản và mật khẩu.' });
        }
        const pool = await connectToDatabase();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query('SELECT ID, FullName, Username, Role FROM Staffs WHERE Username = @username AND Password = @password');

        if (result.recordset.length > 0) {
            res.status(200).json({ message: 'Đăng nhập thành công', user: result.recordset[0] });
        } else {
            res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }
    } catch (error) {
        console.error('Lỗi đăng nhập staff:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập.' });
    }
});

// Cập nhật trạng thái đơn hàng (Dùng cho Admin/Staff)
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, processedBy } = req.body;
        if (!status) return res.status(400).json({ message: 'Thiếu trạng thái.' });

        const pool = await connectToDatabase();
        await pool.request()
            .input('status', sql.NVarChar, status)
            .input('processedBy', sql.NVarChar, processedBy || null)
            .input('id', sql.Int, id)
            .query('UPDATE Bookings SET Status = @status, ProcessedBy = @processedBy WHERE ID = @id');

        res.status(200).json({ message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái đơn hàng:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái.' });
    }
});

// Đổi mật khẩu Staff / Admin
app.put('/api/staff/password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        if (!username || !newPassword) return res.status(400).json({ message: 'Thiếu thông tin.' });

        const pool = await connectToDatabase();
        await pool.request()
            .input('password', sql.NVarChar, newPassword)
            .input('username', sql.NVarChar, username)
            .query('UPDATE Staffs SET Password = @password WHERE Username = @username');

        res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu.' });
    }
});

// --- NEW APIs cho Phân Luồng ---

// API Settings (QR Code)
app.get('/api/settings/qr', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query("SELECT KeyValue FROM Settings WHERE KeyName='QRCodeUrl'");
        res.json({ qrUrl: result.recordset.length > 0 ? result.recordset[0].KeyValue : '' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy QR' });
    }
});

app.put('/api/settings/qr', async (req, res) => {
    try {
        const { qrUrl } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('qrUrl', sql.NVarChar, qrUrl)
            .query("UPDATE Settings SET KeyValue = @qrUrl WHERE KeyName='QRCodeUrl'");
        res.json({ message: 'Cập nhật QR thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật QR' });
    }
});

// API Tải ảnh QR (Local Upload)
app.post('/api/upload/qr', upload.single('qrImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng chọn file ảnh.' });
        }
        const fileUrl = '/uploads/' + req.file.filename;

        const pool = await connectToDatabase();
        await pool.request()
            .input('qrUrl', sql.NVarChar, fileUrl)
            .query("UPDATE Settings SET KeyValue = @qrUrl WHERE KeyName='QRCodeUrl'");

        res.json({ message: 'Tải ảnh QR thành công!', qrUrl: fileUrl });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi tải ảnh' });
    }
});

// API Lấy danh sách góp ý (Feedbacks) cho Admin
app.get('/api/admin/feedbacks', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Feedbacks ORDER BY CreatedAt DESC');
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách góp ý' });
    }
});

// API Homepage Images
app.get('/api/homepage-images', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query("SELECT * FROM HomepageImages ORDER BY DisplayOrder");
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy ảnh' });
    }
});

app.post('/api/homepage-images', async (req, res) => {
    try {
        const { imageUrl, displayOrder } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('imageUrl', sql.NVarChar, imageUrl)
            .input('displayOrder', sql.Int, displayOrder || 0)
            .query("INSERT INTO HomepageImages (ImageUrl, DisplayOrder) VALUES (@imageUrl, @displayOrder)");
        res.json({ message: 'Thêm ảnh thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi thêm ảnh' });
    }
});

app.delete('/api/homepage-images/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        await pool.request().input('id', sql.Int, id).query("DELETE FROM HomepageImages WHERE ID = @id");
        res.json({ message: 'Xóa ảnh thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa ảnh' });
    }
});

// API Staff Permissions
app.post('/api/admin/staffs', async (req, res) => {
    try {
        const { username } = req.body;
        const pool = await connectToDatabase();

        // Kiểm tra xem user có tồn tại không
        const userRes = await pool.request()
            .input('username', sql.NVarChar, username)
            .query("SELECT FullName, Password FROM Users WHERE Username = @username");

        if (userRes.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng này trong hệ thống.' });
        }

        const user = userRes.recordset[0];

        // Kiểm tra xem đã là staff chưa
        const staffRes = await pool.request()
            .input('username', sql.NVarChar, username)
            .query("SELECT ID FROM Staffs WHERE Username = @username");

        if (staffRes.recordset.length > 0) {
            return res.status(400).json({ message: 'Tài khoản này đã là Nhân viên/Admin.' });
        }

        // Thêm vào bảng Staffs
        await pool.request()
            .input('fullName', sql.NVarChar, user.FullName)
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, user.Password)
            .input('role', sql.NVarChar, 'Staff')
            .query("INSERT INTO Staffs (FullName, Username, Password, Role) VALUES (@fullName, @username, @password, @role)");

        res.json({ message: 'Nâng cấp nhân viên thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi thêm nhân viên' });
    }
});

app.put('/api/admin/staffs/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('role', sql.NVarChar, role)
            .input('id', sql.Int, id)
            .query("UPDATE Staffs SET Role = @role WHERE ID = @id");
        res.json({ message: 'Cập nhật quyền thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật quyền' });
    }
});

app.delete('/api/admin/staffs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        await pool.request().input('id', sql.Int, id).query("DELETE FROM Staffs WHERE ID = @id");
        res.json({ message: 'Xóa nhân viên thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa nhân viên' });
    }
});

// API Check Booking Status (Polling for User)
app.get('/api/bookings/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        const result = await pool.request().input('id', sql.Int, id).query("SELECT Status FROM Bookings WHERE ID = @id");
        if (result.recordset.length > 0) {
            res.json({ status: result.recordset[0].Status });
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy trạng thái đơn' });
    }
});

// Chạy Server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`Giao diện Frontend có thể truy cập tại: http://localhost:${PORT}/index.html`);
});
