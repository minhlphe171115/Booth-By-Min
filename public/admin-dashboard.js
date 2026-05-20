window.deleteStaff = async function(id) {
    if(!confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;
    try {
        const res = await fetch(`/api/admin/staffs/${id}`, { method: 'DELETE' });
        if(res.ok) { alert('Đã xóa'); document.querySelector('[data-target="staff"]').click(); }
        else alert('Lỗi xóa');
    } catch(err) { console.error(err); }
};

window.updateStaffRole = async function(id, role) {
    try {
        const res = await fetch(`/api/admin/staffs/${id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
        });
        if(res.ok) alert('Cập nhật quyền thành công');
        else alert('Lỗi cập nhật');
    } catch(err) { console.error(err); }
};

window.deletePackage = async function(id) {
    if(!confirm('Bạn có chắc chắn muốn xóa gói này?')) return;
    try {
        const res = await fetch(`/api/packages/${id}`, { method: 'DELETE' });
        if(res.ok) { alert('Đã xóa'); document.querySelector('[data-target="packages"]').click(); }
        else alert('Lỗi xóa');
    } catch(err) { console.error(err); }
};

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
            if(targetId === 'dashboard') loadDashboardStats();
            if(targetId === 'orders') loadOrders();
            if(targetId === 'packages') loadPackages();
            if(targetId === 'staff') loadStaff();
            if(targetId === 'homepage') loadHomepageImages();
            if(targetId === 'qr') loadQrCode();
            if(targetId === 'feedbacks') loadFeedbacks();
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('staffRole');
        localStorage.removeItem('staffName');
        localStorage.removeItem('staffUsername');
        window.location.href = 'auth.html';
    });

    // 2. Fetch Data Functions (Mock hoặc gọi API thật)
    async function loadDashboardStats() {
        try {
            const res = await fetch('/api/admin/dashboard');
            if(res.ok) {
                const data = await res.json();
                document.getElementById('revenueDay').innerText = data.revenueDay.toLocaleString('vi-VN') + 'đ';
                document.getElementById('revenueMonth').innerText = data.revenueMonth.toLocaleString('vi-VN') + 'đ';
                document.getElementById('revenueYear').innerText = data.revenueYear.toLocaleString('vi-VN') + 'đ';
            }
        } catch (error) {
            console.log('Chưa có API dashboard');
        }
    }

    const customStatsForm = document.getElementById('customStatsForm');
    if (customStatsForm) {
        customStatsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const startDate = document.getElementById('statStartDate').value;
            const endDate = document.getElementById('statEndDate').value;
            loadOrders(startDate, endDate);
        });
    }

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
        const isStaff = (localStorage.getItem('staffRole') || 'Admin') === 'Staff';

        pageOrders.forEach(order => {
                    let actionHtml = '';
                    if (isStaff) {
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
                    } else {
                        actionHtml = `
                            <div style="margin-top: 5px;">
                                <span style="font-weight: bold; color: ${order.Status === 'Từ chối' ? '#e38892' : (order.Status === 'Chấp nhận' ? '#88c99e' : '#aaa')}">${order.Status}</span>
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

    window.editPackage = function(id, name, price, features, isBestSeller) {
        document.getElementById('packageModalTitle').innerText = 'Sửa Gói Chụp';
        document.getElementById('editPackageId').value = id;
        document.getElementById('newPackageName').value = name;
        document.getElementById('newPackagePrice').value = price;
        document.getElementById('newPackageFeatures').value = features;
        document.getElementById('newPackageBestSeller').checked = !!isBestSeller;
        document.getElementById('addPackageModal').style.display = 'block';
    };

    async function loadPackages() {
        const tbody = document.getElementById('packagesTableBody');
        tbody.innerHTML = '<tr><td colspan="5">Đang tải dữ liệu...</td></tr>';
        try {
            const res = await fetch('/api/packages');
            if(res.ok) {
                const packages = await res.json();
                tbody.innerHTML = '';
                if(packages.length === 0) tbody.innerHTML = '<tr><td colspan="5">Chưa có gói nào.</td></tr>';
                packages.forEach(pkg => {
                    const featuresDisplay = pkg.Features ? pkg.Features.replace(/\n/g, '<br>') : '-';
                    const bestSellerBadge = pkg.IsBestSeller ? '<br><span style="color:var(--primary-pink);font-weight:bold;font-size:0.8em">Best Seller</span>' : '';
                    tbody.innerHTML += `
                        <tr>
                            <td>#${pkg.ID}</td>
                            <td>${pkg.Name}${bestSellerBadge}</td>
                            <td>${pkg.Price.toLocaleString('vi-VN')}đ</td>
                            <td style="font-size: 0.9em; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${featuresDisplay}</td>
                            <td style="display: flex; gap: 5px;">
                                <button class="btn" style="background:#f0ad4e; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;" onclick="editPackage(${pkg.ID}, '${pkg.Name.replace(/'/g, "\\'")}', ${pkg.Price}, '${(pkg.Features || '').replace(/\n/g, '\\n').replace(/'/g, "\\'")}', ${pkg.IsBestSeller})">Sửa</button>
                                <button class="btn danger-btn" onclick="deletePackage(${pkg.ID})">Xóa</button>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5">Lỗi kết nối Server</td></tr>';
        }
    }

    async function loadStaff() {
        const tbody = document.getElementById('staffTableBody');
        tbody.innerHTML = '<tr><td colspan="5">Đang tải dữ liệu...</td></tr>';
        try {
            const res = await fetch('/api/admin/staffs');
            if(res.ok) {
                const staffs = await res.json();
                tbody.innerHTML = '';
                if(staffs.length === 0) tbody.innerHTML = '<tr><td colspan="5">Chưa có nhân viên nào.</td></tr>';
                staffs.forEach(staff => {
                    tbody.innerHTML += `
                        <tr>
                            <td>#${staff.ID}</td>
                            <td>${staff.FullName}</td>
                            <td>${staff.Username}</td>
                            <td>
                                <select onchange="updateStaffRole(${staff.ID}, this.value)" style="padding: 5px; border-radius: 5px;">
                                    <option value="Staff" ${staff.Role === 'Staff' ? 'selected' : ''}>Staff</option>
                                    <option value="Admin" ${staff.Role === 'Admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </td>
                            <td>
                                <button class="btn danger-btn" onclick="deleteStaff(${staff.ID})">Xóa</button>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5">Lỗi kết nối Server</td></tr>';
        }
    }

    async function loadHomepageImages() {
        const tbody = document.getElementById('imagesTableBody');
        tbody.innerHTML = '<tr><td colspan="4">Đang tải dữ liệu...</td></tr>';
        try {
            const res = await fetch('/api/homepage-images');
            if(res.ok) {
                const images = await res.json();
                tbody.innerHTML = '';
                if(images.length === 0) tbody.innerHTML = '<tr><td colspan="4">Chưa có ảnh nào.</td></tr>';
                images.forEach(img => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${img.DisplayOrder}</td>
                            <td><img src="${img.ImageUrl}" alt="Homepage" style="max-height: 50px; border-radius: 5px;"></td>
                            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${img.ImageUrl}</td>
                            <td>
                                <button class="btn danger-btn" onclick="deleteImage(${img.ID})">Xóa</button>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4">Lỗi kết nối Server</td></tr>';
        }
    }

    window.deleteImage = async function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa ảnh này?')) return;
        try {
            const res = await fetch(`/api/homepage-images/${id}`, { method: 'DELETE' });
            if (res.ok) loadHomepageImages();
        } catch (err) {
            alert('Lỗi xóa ảnh');
        }
    };

    const addImageForm = document.getElementById('addImageForm');
    if (addImageForm) {
        addImageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const imageUrl = document.getElementById('newImageUrl').value;
            const displayOrder = document.getElementById('imageOrder').value;
            try {
                const res = await fetch('/api/homepage-images', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl, displayOrder: parseInt(displayOrder) })
                });
                if (res.ok) {
                    addImageForm.reset();
                    loadHomepageImages();
                } else {
                    alert('Lỗi thêm ảnh');
                }
            } catch (err) {
                alert('Lỗi kết nối Server');
            }
        });
    }

    async function loadQrCode() {
        try {
            const res = await fetch('/api/settings/qr');
            if (res.ok) {
                const data = await res.json();
                document.getElementById('currentQrImage').src = data.qrUrl || 'https://via.placeholder.com/200?text=Chưa+Có+QR';
                document.getElementById('qrUrlInput').value = data.qrUrl || '';
            }
        } catch (error) {
            console.error('Lỗi load QR');
        }
    }

    const uploadQrForm = document.getElementById('uploadQrForm');
    if (uploadQrForm) {
        uploadQrForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('qrFileInput');
            if (fileInput.files.length === 0) return alert('Vui lòng chọn file');
            
            const formData = new FormData();
            formData.append('qrImage', fileInput.files[0]);
            
            try {
                const res = await fetch('/api/upload/qr', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    alert('Tải ảnh QR thành công!');
                    uploadQrForm.reset();
                    loadQrCode();
                } else {
                    alert('Lỗi tải ảnh');
                }
            } catch (err) { alert('Lỗi kết nối Server'); }
        });
    }

    const updateQrForm = document.getElementById('updateQrForm');
    if (updateQrForm) {
        updateQrForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const qrUrl = document.getElementById('qrUrlInput').value;
            try {
                const res = await fetch('/api/settings/qr', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qrUrl })
                });
                if (res.ok) {
                    alert('Cập nhật link QR thành công!');
                    loadQrCode();
                } else {
                    alert('Lỗi cập nhật link QR');
                }
            } catch (err) {
                alert('Lỗi kết nối Server');
            }
        });
    }

    async function loadFeedbacks() {
        const tbody = document.getElementById('feedbacksTableBody');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="3">Đang tải dữ liệu...</td></tr>';
        try {
            const res = await fetch('/api/admin/feedbacks');
            if(res.ok) {
                const feedbacks = await res.json();
                tbody.innerHTML = '';
                if(feedbacks.length === 0) tbody.innerHTML = '<tr><td colspan="3">Chưa có góp ý nào.</td></tr>';
                feedbacks.forEach(fb => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${new Date(fb.CreatedAt).toLocaleString('vi-VN')}</td>
                            <td><strong style="color: var(--primary-pink);">${fb.Username}</strong></td>
                            <td style="max-width:300px; white-space:pre-wrap;">${fb.Message}</td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="3">Lỗi kết nối Server</td></tr>';
        }
    }

    // Load initial data cho Admin
    loadDashboardStats();

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

    // Modal Add Staff
    const addStaffBtn = document.getElementById('addStaffBtn');
    const addStaffModal = document.getElementById('addStaffModal');
    const closeStaffModal = document.querySelector('.close-staff-modal');
    const addStaffForm = document.getElementById('addStaffForm');

    if(addStaffBtn && addStaffModal) {
        addStaffBtn.addEventListener('click', () => addStaffModal.style.display = 'block');
        closeStaffModal.addEventListener('click', () => addStaffModal.style.display = 'none');
        window.addEventListener('click', (e) => { if (e.target == addStaffModal) addStaffModal.style.display = 'none'; });

        addStaffForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('newStaffUsername').value;

            try {
                const res = await fetch('/api/admin/staffs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('Nâng cấp thành Staff thành công!');
                    addStaffForm.reset();
                    addStaffModal.style.display = 'none';
                    document.querySelector('[data-target="staff"]').click(); // Reload list
                } else {
                    alert(data.message || 'Lỗi thêm nhân viên');
                }
            } catch (err) { alert('Lỗi kết nối Server'); }
        });
    }

    // Modal Add Package
    const addPackageBtn = document.getElementById('addPackageBtn');
    const addPackageModal = document.getElementById('addPackageModal');
    const closePackageModal = document.querySelector('.close-package-modal');
    const addPackageForm = document.getElementById('addPackageForm');

    if(addPackageBtn && addPackageModal) {
        addPackageBtn.addEventListener('click', () => {
            document.getElementById('packageModalTitle').innerText = 'Thêm Gói Chụp Mới';
            document.getElementById('editPackageId').value = '';
            addPackageForm.reset();
            addPackageModal.style.display = 'block';
        });
        closePackageModal.addEventListener('click', () => addPackageModal.style.display = 'none');
        window.addEventListener('click', (e) => { if (e.target == addPackageModal) addPackageModal.style.display = 'none'; });

        addPackageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editPackageId').value;
            const name = document.getElementById('newPackageName').value;
            const price = document.getElementById('newPackagePrice').value;
            const features = document.getElementById('newPackageFeatures').value;
            const isBestSeller = document.getElementById('newPackageBestSeller').checked;

            try {
                const method = id ? 'PUT' : 'POST';
                const url = id ? `/api/packages/${id}` : '/api/packages';
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, price: parseInt(price), features, isBestSeller })
                });
                if (res.ok) {
                    alert(id ? 'Cập nhật gói thành công!' : 'Thêm gói thành công!');
                    addPackageForm.reset();
                    addPackageModal.style.display = 'none';
                    document.querySelector('[data-target="packages"]').click(); // Reload list
                } else {
                    alert('Lỗi khi lưu gói');
                }
            } catch (err) { alert('Lỗi kết nối Server'); }
        });
    }
});
