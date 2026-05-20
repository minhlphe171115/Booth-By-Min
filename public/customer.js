document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra đăng nhập
    const username = localStorage.getItem('customerUsername');
    if (!username) {
        window.location.href = 'auth.html';
        return;
    }
    
    document.getElementById('displayCustomerName').innerText = localStorage.getItem('customerName');

    // 2. Logic Sidebar Navigation
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    const sections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(m => m.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'book') loadPackages();
            if (targetId === 'history') loadHistory();
            if (targetId === 'profile') loadProfile();
        });
    });

    // Đăng xuất
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('customerUsername');
        localStorage.removeItem('customerName');
        window.location.href = 'index.html';
    });

    // ================= DATA FETCHING =================
    let currentUserProfile = null;

    async function loadProfile() {
        const res = await fetch(`/api/user/profile/${username}`);
        if (res.ok) {
            currentUserProfile = await res.json();
            document.getElementById('profileUsername').value = currentUserProfile.Username;
            document.getElementById('profileFullName').value = currentUserProfile.FullName;
            document.getElementById('profilePhone').value = currentUserProfile.Phone || '';
        } else {
            alert('Phiên đăng nhập đã cũ do hệ thống vừa được nâng cấp. Vui lòng đăng nhập lại!');
            localStorage.removeItem('customerUsername');
            localStorage.removeItem('customerName');
            window.location.href = 'auth.html';
        }
    }

    async function loadPackages() {
        const grid = document.getElementById('packagesGrid');
        grid.innerHTML = '<p style="text-align:center; width:100%;">Đang tải danh sách gói chụp...</p>';
        try {
            const res = await fetch('/api/packages');
            if (res.ok) {
                const packages = await res.json();
                grid.innerHTML = '';
                if (packages.length === 0) {
                    grid.innerHTML = '<p style="text-align:center; width:100%;">Chưa có gói chụp nào.</p>';
                    return;
                }
                packages.forEach(pkg => {
                    const featuresHtml = pkg.Features ? 
                        pkg.Features.split('\n').map(f => `<li>${f}</li>`).join('') : 
                        '<li>Đang cập nhật tính năng...</li>';
                        
                    const bestSellerStyle = pkg.IsBestSeller ? 'position:relative; border-color: var(--primary-pink); box-shadow: 0 12px 30px rgba(210, 148, 165, 0.2);' : '';
                    const bestSellerBadge = pkg.IsBestSeller ? '<div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); background: linear-gradient(135deg, #e3a9b8, var(--primary-pink)); color:white; padding: 5px 15px; border-radius:20px; font-size:12px; font-weight:bold;">Best Seller</div>' : '';
                    const btnClass = pkg.IsBestSeller ? 'primary-btn' : 'logout-btn';
                    
                    grid.innerHTML += `
                        <div class="pkg-card" style="${bestSellerStyle}">
                            ${bestSellerBadge}
                            <h3>${pkg.Name}</h3>
                            <p>${pkg.Price.toLocaleString('vi-VN')}đ</p>
                            <ul style="text-align:left; margin: 15px 0; padding-left: 20px; line-height: 1.8; font-size: 14px; color: var(--text-gray);">
                                ${featuresHtml}
                            </ul>
                            <button class="btn ${btnClass}" onclick="openPaymentModal('${pkg.Name.replace(/'/g, "\\'")}', ${pkg.Price})" style="width:100%; margin-top:10px;">Chọn Gói Này</button>
                        </div>
                    `;
                });
            }
        } catch (e) {
            grid.innerHTML = '<p style="text-align:center; width:100%;">Lỗi tải gói chụp</p>';
        }
    }

    window.allCustomerBookings = [];

    async function loadHistory() {
        const tbody = document.getElementById('historyTableBody');
        const res = await fetch(`/api/user/bookings/${username}`);
        if (res.ok) {
            const bookings = await res.json();
            window.allCustomerBookings = bookings;
            window.renderCustomerHistoryPage(1);
        }
    }

    window.renderCustomerHistoryPage = function(page) {
        const tbody = document.getElementById('historyTableBody');
        const pagination = document.getElementById('historyPagination');
        const itemsPerPage = 10;
        
        if (window.allCustomerBookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Bạn chưa có đơn đặt lịch nào.</td></tr>';
            if (pagination) pagination.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(window.allCustomerBookings.length / itemsPerPage);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        
        const start = (page - 1) * itemsPerPage;
        const pageBookings = window.allCustomerBookings.slice(start, start + itemsPerPage);
        
        tbody.innerHTML = '';
        pageBookings.forEach(b => {
            const d = new Date(b.CreatedAt);
            const timeStr = [
                String(d.getHours()).padStart(2, '0'),
                String(d.getMinutes()).padStart(2, '0'),
                String(d.getSeconds()).padStart(2, '0')
            ].join(':');
            const dateStr = [
                String(d.getDate()).padStart(2, '0'),
                String(d.getMonth() + 1).padStart(2, '0'),
                d.getFullYear()
            ].join('/');
            const formattedTime = `${timeStr}<br><span style="font-size: 0.9em; color: #666;">${dateStr}</span>`;

            tbody.innerHTML += `
                <tr>
                    <td>#${b.ID}</td>
                    <td>${b.PackageName || 'Không xác định'}</td>
                    <td>${formattedTime}</td>
                    <td>${(b.TotalAmount || 0).toLocaleString('vi-VN')}đ</td>
                    <td><span style="color: ${b.Status === 'Chấp nhận' || b.Status === 'Đã thanh toán' ? 'green' : (b.Status==='Hoàn thành'?'blue': (b.Status==='Từ chối'?'red':'orange'))}">${b.Status}</span></td>
                </tr>
            `;
        });
        
        if (pagination) {
            let paginationHtml = '';
            if (totalPages > 1) {
                paginationHtml += `<button class="btn" style="padding: 5px 10px;" onclick="renderCustomerHistoryPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>Trước</button>`;
                paginationHtml += `<span style="align-self: center;">Trang ${page} / ${totalPages}</span>`;
                paginationHtml += `<button class="btn" style="padding: 5px 10px;" onclick="renderCustomerHistoryPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>Sau</button>`;
            }
            pagination.innerHTML = paginationHtml;
        }
    };

    // ================= ACTIONS =================
    
    // Cập nhật Profile
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('profileFullName').value;
        const phone = document.getElementById('profilePhone').value;
        const password = document.getElementById('profilePassword').value;
        const profileMsg = document.getElementById('profileMessage');

        const res = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, fullName, phone, password })
        });
        
        if (res.ok) {
            profileMsg.style.display = 'block';
            profileMsg.style.color = 'green';
            profileMsg.innerText = 'Cập nhật thông tin thành công!';
            
            localStorage.setItem('customerName', fullName);
            document.getElementById('displayCustomerName').innerText = fullName;
            
            // Cập nhật lại thông tin in-memory để dùng cho lúc đặt lịch
            if (currentUserProfile) {
                currentUserProfile.FullName = fullName;
                currentUserProfile.Phone = phone;
            } else {
                currentUserProfile = { FullName: fullName, Phone: phone };
            }

            // Ẩn thông báo sau 3 giây
            setTimeout(() => profileMsg.style.display = 'none', 3000);
        } else {
            profileMsg.style.display = 'block';
            profileMsg.style.color = 'red';
            profileMsg.innerText = 'Cập nhật thất bại. Vui lòng thử lại!';
        }
    });

    // Góp ý
    document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('feedbackMessage').value;
        const feedbackMsg = document.getElementById('feedbackSuccessMsg');
        
        const res = await fetch('/api/user/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, message })
        });
        if (res.ok) {
            feedbackMsg.style.display = 'block';
            document.getElementById('feedbackForm').reset();
            setTimeout(() => feedbackMsg.style.display = 'none', 3000);
        }
    });

    // ================= PAYMENT MODAL =================
    const modal = document.getElementById('paymentModal');
    let selectedPackage = {};
    let qrUrlLoaded = '';

    // Lấy QR 1 lần
    async function fetchQrCode() {
        try {
            const res = await fetch('/api/settings/qr');
            if (res.ok) {
                const data = await res.json();
                qrUrlLoaded = data.qrUrl;
                document.getElementById('qrCodeImage').src = qrUrlLoaded || 'https://via.placeholder.com/200?text=Chưa+Có+QR';
            }
        } catch(e) {}
    }
    fetchQrCode();

    window.openPaymentModal = function(name, price) {
        selectedPackage = { name, price };
        document.getElementById('modalPackageName').innerText = name;
        document.getElementById('modalPrice').innerText = price.toLocaleString('vi-VN') + 'đ';
        document.getElementById('bookingDate').valueAsDate = new Date();
        document.getElementById('paymentMethod').value = 'Tiền mặt';
        document.getElementById('qrCodeSection').style.display = 'none';
        document.getElementById('pollingMessage').style.display = 'none';
        document.getElementById('confirmPaymentBtn').disabled = false;
        document.getElementById('confirmPaymentBtn').innerText = 'Gửi Yêu Cầu Thanh Toán';
        modal.classList.add('active');
    };

    document.getElementById('paymentMethod').addEventListener('change', (e) => {
        if (e.target.value === 'Chuyển khoản') {
            document.getElementById('qrCodeSection').style.display = 'block';
        } else {
            document.getElementById('qrCodeSection').style.display = 'none';
        }
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    document.getElementById('confirmPaymentBtn').addEventListener('click', async () => {
        const date = document.getElementById('bookingDate').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        if (!date) return alert('Vui lòng chọn ngày chụp!');
        
        if (!currentUserProfile) await loadProfile();
        
        const payload = {
            username: username,
            name: currentUserProfile.FullName,
            phone: currentUserProfile.Phone || 'Chưa cập nhật',
            date: date,
            packageName: selectedPackage.name,
            totalAmount: selectedPackage.price,
            status: 'Chờ xác nhận',
            paymentMethod: paymentMethod
        };

        const res = await fetch('/api/user/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            const bookingId = data.bookingId;
            
            document.getElementById('pollingMessage').style.display = 'block';
            document.getElementById('confirmPaymentBtn').disabled = true;
            document.getElementById('confirmPaymentBtn').innerText = 'Đang xử lý...';

            // Start Polling
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/bookings/${bookingId}/status`);
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        if (statusData.status === 'Chấp nhận' || statusData.status === 'Đã thanh toán') {
                            clearInterval(pollInterval);
                            alert('🎉 Thanh toán thành công! Bạn có thể vào phòng chụp ngay.');
                            modal.classList.remove('active');
                            document.querySelector('[data-target="history"]').click();
                        } else if (statusData.status === 'Từ chối') {
                            clearInterval(pollInterval);
                            alert('❌ Đơn hàng của bạn đã bị từ chối. Vui lòng liên hệ nhân viên.');
                            modal.classList.remove('active');
                            document.querySelector('[data-target="history"]').click();
                        }
                    }
                } catch(e) {}
            }, 3000);
            
        } else {
            alert('Có lỗi xảy ra, vui lòng thử lại.');
        }
    });

    // Khởi tạo ban đầu
    loadProfile();
    loadPackages();
});
