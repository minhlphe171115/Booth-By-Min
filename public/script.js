document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Hero Image Slider Logic (Dynamic)
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    const sliderWrapper = document.getElementById('dynamicSlider');
    let currentSlide = 0;
    let sliderImages = [];
    let slideInterval;

    async function loadHomepageImages() {
        try {
            const res = await fetch('/api/homepage-images');
            if (res.ok) {
                const images = await res.json();
                if (images.length > 0) {
                    sliderWrapper.innerHTML = ''; // Xóa nội dung cũ
                    images.forEach((img, index) => {
                        const imgElement = document.createElement('img');
                        imgElement.src = img.ImageUrl;
                        imgElement.className = index === 0 ? 'slider-img active' : 'slider-img';
                        imgElement.alt = 'Booth By Min';
                        sliderWrapper.appendChild(imgElement);
                    });
                    
                    sliderImages = document.querySelectorAll('.slider-img');
                    startSlider();
                }
            }
        } catch (error) {
            console.error('Lỗi load ảnh trang chủ', error);
        }
    }

    function showSlide(index) {
        if (!sliderImages || sliderImages.length === 0) return;
        sliderImages.forEach(img => img.classList.remove('active'));
        sliderImages[index].classList.add('active');
    }

    function startSlider() {
        if (!sliderImages || sliderImages.length === 0) return;
        
        prevBtn.addEventListener('click', () => {
            currentSlide = (currentSlide > 0) ? currentSlide - 1 : sliderImages.length - 1;
            showSlide(currentSlide);
        });

        nextBtn.addEventListener('click', () => {
            currentSlide = (currentSlide < sliderImages.length - 1) ? currentSlide + 1 : 0;
            showSlide(currentSlide);
        });
        
        // Tự động chuyển ảnh sau mỗi 5 giây
        if(slideInterval) clearInterval(slideInterval);
        slideInterval = setInterval(() => {
            currentSlide = (currentSlide < sliderImages.length - 1) ? currentSlide + 1 : 0;
            showSlide(currentSlide);
        }, 5000);
    }

    loadHomepageImages();

    // Render Packages (Gói Chụp)
    async function loadPublicPackages() {
        const grid = document.getElementById('publicPackagesGrid');
        if (!grid) return;
        
        try {
            const res = await fetch('/api/packages');
            if(res.ok) {
                const packages = await res.json();
                grid.innerHTML = '';
                if(packages.length === 0) {
                    grid.innerHTML = '<p style="text-align:center; width:100%;">Đang cập nhật các gói chụp...</p>';
                    return;
                }
                
                packages.forEach(pkg => {
                    const featuresHtml = pkg.Features ? 
                        pkg.Features.split('\n').map(f => `<li>${f}</li>`).join('') : 
                        '<li>Đang cập nhật tính năng...</li>';
                        
                    const bestSellerClass = pkg.IsBestSeller ? ' popular' : '';
                    const bestSellerBadge = pkg.IsBestSeller ? '<div class="badge">Best Seller</div>' : '';
                    const btnClass = pkg.IsBestSeller ? 'primary-btn' : 'secondary-btn';

                    grid.innerHTML += `
                        <div class="card${bestSellerClass}">
                            ${bestSellerBadge}
                            <h3>${pkg.Name}</h3>
                            <p class="price">${pkg.Price.toLocaleString('vi-VN')} VNĐ</p>
                            <ul>
                                ${featuresHtml}
                            </ul>
                            <a href="auth.html" class="btn ${btnClass}">Chọn gói này</a>
                        </div>
                    `;
                });
            }
        } catch (err) {
            grid.innerHTML = '<p style="text-align:center; width:100%;">Lỗi tải danh sách gói chụp.</p>';
        }
    }
    
    loadPublicPackages();

    // Xử lý Form Submit (Sẽ gửi đến Backend sau khi tạo)
    const bookingForm = document.getElementById('bookingForm');
    const formMessage = document.getElementById('formMessage');

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Ngăn chặn load lại trang mặc định

            // Lấy dữ liệu từ form
            const formData = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                date: document.getElementById('date').value,
                notes: document.getElementById('notes').value
            };

            // Hiển thị trạng thái đang gửi
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = 'Đang gửi...';
            submitBtn.disabled = true;

            try {
                // Gọi API backend
                const response = await fetch('/api/booking', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    // Thành công
                    formMessage.style.color = '#4CAF50'; // Màu xanh lá
                    formMessage.innerText = 'Cảm ơn bạn! Đặt lịch thành công. Chúng mình sẽ liên hệ sớm.';
                    formMessage.style.display = 'block';
                    bookingForm.reset(); // Xóa form
                } else {
                    // Lỗi từ server
                    formMessage.style.color = '#f44336'; // Màu đỏ
                    formMessage.innerText = result.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
                    formMessage.style.display = 'block';
                }
            } catch (error) {
                // Lỗi kết nối
                console.error('Error:', error);
                formMessage.style.color = '#f44336';
                formMessage.innerText = 'Không thể kết nối đến máy chủ. Hãy chắc chắn rằng bạn đã chạy Backend Server.';
                formMessage.style.display = 'block';
            } finally {
                // Khôi phục nút
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});
