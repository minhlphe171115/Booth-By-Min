document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('staffLoginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const msgBox = document.getElementById('loginMessage');

        try {
            const res = await fetch('/api/staff/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                msgBox.style.color = 'green';
                msgBox.innerText = 'Đăng nhập thành công! Đang chuyển hướng...';
                msgBox.style.display = 'block';
                
                // Lưu role và thông tin vào localStorage
                localStorage.setItem('staffRole', data.user.Role);
                localStorage.setItem('staffName', data.user.FullName);
                localStorage.setItem('staffUsername', data.user.Username);

                setTimeout(() => {
                    if (data.user.Role === 'Admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'staff-dashboard.html';
                    }
                }, 1000);
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
