document.addEventListener('DOMContentLoaded', () => {
    const loginToggle = document.getElementById('loginToggle');
    const registerToggle = document.getElementById('registerToggle');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Chuyển đổi giữa Đăng Nhập và Đăng Ký
    loginToggle.addEventListener('click', () => {
        loginToggle.classList.add('active');
        registerToggle.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });

    registerToggle.addEventListener('click', () => {
        registerToggle.classList.add('active');
        loginToggle.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });

    // Xử lý Form Đăng Ký
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('regFullName').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const msgBox = document.getElementById('registerMessage');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, username, password })
            });
            const data = await res.json();

            if (res.ok) {
                msgBox.style.color = 'green';
                msgBox.innerText = 'Đăng ký thành công! Hãy chuyển sang Đăng Nhập.';
                msgBox.style.display = 'block';
                registerForm.reset();
            } else {
                msgBox.style.color = 'red';
                msgBox.innerText = data.message || 'Có lỗi xảy ra.';
                msgBox.style.display = 'block';
            }
        } catch (error) {
            msgBox.style.color = 'red';
            msgBox.innerText = 'Lỗi kết nối Server.';
            msgBox.style.display = 'block';
        }
    });

    // Xử lý Form Đăng Nhập
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const msgBox = document.getElementById('loginMessage');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                msgBox.style.color = 'green';
                msgBox.innerText = 'Đăng nhập thành công! Đang chuyển hướng...';
                msgBox.style.display = 'block';
                
                if (data.role === 'Admin' || data.role === 'Staff') {
                    // Xử lý lưu của Staff/Admin
                    localStorage.setItem('staffRole', data.role);
                    localStorage.setItem('staffName', data.user.FullName);
                    localStorage.setItem('staffUsername', data.user.Username);

                    setTimeout(() => {
                        if (data.role === 'Admin') {
                            window.location.href = 'admin-dashboard.html';
                        } else {
                            window.location.href = 'staff-dashboard.html';
                        }
                    }, 1000);
                } else {
                    // Xử lý lưu của Khách Hàng
                    localStorage.setItem('customerUsername', data.user.Username);
                    localStorage.setItem('customerName', data.user.FullName);

                    setTimeout(() => {
                        window.location.href = 'customer.html';
                    }, 1000);
                }
            } else {
                msgBox.style.color = 'red';
                msgBox.innerText = data.message || 'Sai tài khoản hoặc mật khẩu.';
                msgBox.style.display = 'block';
            }
        } catch (error) {
            msgBox.style.color = 'red';
            msgBox.innerText = 'Lỗi kết nối Server.';
            msgBox.style.display = 'block';
        }
    });
});
