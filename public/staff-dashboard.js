window.updateOrderStatus = async function(id, status) {
    try {
        const staffName = localStorage.getItem('staffName') || localStorage.getItem('staffUsername');
        const res = await fetch(`/api/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, processedBy: staffName })
        });
        if (res.ok) {
            alert('Cập nhật trạng thái thành công');
            document.querySelector('[data-target="orders"]').click();
        } else {
            alert('Lỗi cập nhật');
        }
    } catch (err) {
        console.error(err);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra đăng nhập
    const staffRole = localStorage.getItem('staffRole');
    if (!staffRole) {
        window.location.href = 'auth.html';
        return;
    }

    // 1. Logic Sidebar Navigation
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    const sections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Xóa active hiện tại
            menuItems.forEach(m => m.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Thêm active cho mục được click
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Gọi API tương ứng khi chuyển tab
            if(targetId === 'orders') loadOrders();
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('staffRole');
        localStorage.removeItem('staffName');
        localStorage.removeItem('staffUsername');
        window.location.href = 'auth.html';
    });

    // Form lọc doanh thu tuỳ chỉnh
    const customStatsForm = document.getElementById('customStatsForm');
    if (customStatsForm) {
        customStatsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const startDate = document.getElementById('statStartDate').value;
            const endDate = document.getElementById('statEndDate').value;
            loadOrders(startDate, endDate);
        });
    }

    // 2. Fetch Data Functions
    async function loadOrders(startDate, endDate) {
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = '<tr><td colspan="7">Đang tải dữ liệu...</td></tr>';
        try {
            let url = '/api/admin/orders';
            if (startDate && endDate) {
                url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
            }
            const res = await fetch(url);
            if(res.ok) {
                const orders = await res.json();
                
                if (startDate && endDate) {
                    const totalRevenue = orders.reduce((sum, order) => {
                        if (['Chấp nhận', 'Đã thanh toán', 'Hoàn thành'].includes(order.Status)) {
                            return sum + (order.TotalAmount || 0);
                        }
                        return sum;
                    }, 0);
                    const customStatsAmount = document.getElementById('customStatsAmount');
                    const customStatsResult = document.getElementById('customStatsResult');
                    if (customStatsAmount && customStatsResult) {
                        customStatsAmount.innerText = totalRevenue.toLocaleString('vi-VN') + 'đ';
                        customStatsResult.style.display = 'block';
                    }
                }

                window.allOrders = orders;
                window.renderOrdersPage(1);
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="7">Lỗi kết nối Server</td></tr>';
        }
    }

    window.renderOrdersPage = function(page) {
        const tbody = document.getElementById('ordersTableBody');
        const pagination = document.getElementById('ordersPagination');
        const ordersPerPage = 10;
        
        if (window.allOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Chưa có đơn hàng nào.</td></tr>';
            if (pagination) pagination.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(window.allOrders.length / ordersPerPage);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        
        const start = (page - 1) * ordersPerPage;
        const pageOrders = window.allOrders.slice(start, start + ordersPerPage);
        
        tbody.innerHTML = '';

        pageOrders.forEach(order => {
                    let actionHtml = '';
                    if (order.Status === 'Chờ xác nhận' || order.Status === 'Chờ xử lý') {
                        actionHtml = `
                            <div style="margin-top: 5px; display: flex; gap: 8px;">
                                <button class="btn" style="padding: 6px 12px; background: linear-gradient(135deg, #a8dfb9, #88c99e); border: none; border-radius: 12px; color: white; cursor: pointer; box-shadow: 0 4px 10px rgba(136,201,158,0.3); font-size: 0.9em;" onclick="updateOrderStatus(${order.ID}, 'Chấp nhận')">Đã nhận</button>
                                <button class="btn" style="padding: 6px 12px; background: linear-gradient(135deg, #f5a9b2, #e38892); border: none; border-radius: 12px; color: white; cursor: pointer; box-shadow: 0 4px 10px rgba(227,136,146,0.3); font-size: 0.9em;" onclick="updateOrderStatus(${order.ID}, 'Từ chối')">Từ chối</button>
                            </div>
                        `;
                    } else {
                        actionHtml = `
                            <div style="margin-top: 5px;">
                                <span style="font-weight: bold; color: ${order.Status === 'Từ chối' ? '#e38892' : '#88c99e'}">${order.Status}</span>
                                ${order.ProcessedBy ? `<br><small style="color: #8e7f84;">Bởi: ${order.ProcessedBy}</small>` : ''}
                            </div>
                        `;
                    }

                    tbody.innerHTML += `
                        <tr>
                            <td>#${order.ID}</td>
                            <td>${order.FullName || order.Name}</td>
                            <td>${order.Phone || '-'}</td>
                            <td>${order.PackageName || 'Tùy chỉnh'}</td>
                            <td>${(order.TotalAmount || 0).toLocaleString('vi-VN')}đ</td>
                            <td>
                                ${(() => {
                                    const d = new Date(order.CreatedAt);
                                    const time = [
                                        String(d.getHours()).padStart(2, '0'),
                                        String(d.getMinutes()).padStart(2, '0'),
                                        String(d.getSeconds()).padStart(2, '0')
                                    ].join(':');
                                    const date = [
                                        String(d.getDate()).padStart(2, '0'),
                                        String(d.getMonth() + 1).padStart(2, '0'),
                                        d.getFullYear()
                                    ].join('/');
                                    return `${time}<br><span style="font-size: 0.9em; color: #666;">${date}</span>`;
                                })()}
                            </td>
                            <td>
                                <div><small>Thanh toán: ${order.PaymentMethod || 'Tiền mặt'}</small></div>
                                ${actionHtml}
                            </td>
                        </tr>
                    `;
                });
                
                // Render pagination buttons
                if (pagination) {
                    let paginationHtml = '';
                    if (totalPages > 1) {
                        paginationHtml += `<button class="btn" style="padding: 5px 10px;" onclick="renderOrdersPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>Trước</button>`;
                        paginationHtml += `<span style="align-self: center;">Trang ${page} / ${totalPages}</span>`;
                        paginationHtml += `<button class="btn" style="padding: 5px 10px;" onclick="renderOrdersPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>Sau</button>`;
                    }
                    pagination.innerHTML = paginationHtml;
                }
            };

    // Load initial data
    loadOrders();

    // Đổi mật khẩu
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            const staffUsername = localStorage.getItem('staffUsername');
            const msgBox = document.getElementById('passwordMessage');

            try {
                const res = await fetch('/api/staff/password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: staffUsername, newPassword })
                });
                const data = await res.json();
                
                if (res.ok) {
                    msgBox.style.color = 'green';
                    msgBox.innerText = 'Đổi mật khẩu thành công!';
                    msgBox.style.display = 'block';
                    changePasswordForm.reset();
                } else {
                    msgBox.style.color = 'red';
                    msgBox.innerText = data.message || 'Lỗi đổi mật khẩu.';
                    msgBox.style.display = 'block';
                }
            } catch (error) {
                msgBox.style.color = 'red';
                msgBox.innerText = 'Lỗi kết nối Server.';
                msgBox.style.display = 'block';
            }
        });
    }
});
