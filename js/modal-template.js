// js/modal-template.js

(function() {
    // 1. 定义弹窗的 HTML 结构 (模板)
    const modalHTML = `
        <div id="contact-modal" class="modal-overlay">
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <div class="contact-modal-header">
                    <h2 class="modal-title">联系站长</h2>
                    <p class="modal-intro">
                        抱歉，站长微信当前添加频繁受限。为了能及时与您沟通，请选择以下最适合您的方式联系我：
                    </p>
                </div>
                <div class="contact-modal-grid">
                    <div class="contact-card-white">
                        <div class="card-header">
                            <i class="fab fa-telegram-plane card-icon"></i>
                            <h3 class="card-title">Telegram 群组</h3>
                        </div>
                        <p class="card-desc">推荐使用！点击直接加入我们的官方Telegram社群进行咨询和交流。</p>
                        <a href="contact.html" target="_blank" class="card-button">加入TG站长社群</a>
                    </div>
                    <div class="contact-card-white">
                        <div class="card-header">
                            <i class="fas fa-envelope-open-text card-icon"></i>
                            <h3 class="card-title">邮件联系</h3>
                        </div>
                        <p class="card-desc">发送您的需求和联系电话到我的邮箱，我会在第一时间主动联系您。</p>
                        <div class="card-infobox">terminos888@gmail.com</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 2. 定义弹窗的 CSS 样式
    const modalCSS = `
        body.modal-open { overflow: hidden; }
        .modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            display: flex; justify-content: center; align-items: center;
            z-index: 9999;
            opacity: 0; visibility: hidden; pointer-events: none;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        .modal-overlay.visible { opacity: 1; visibility: visible; pointer-events: auto; }
        .modal-content {
            background-color: #202123; color: #E5E7EB;
            border-radius: 16px; padding: 30px 40px; width: 90%; max-width: 800px;
            position: relative; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            transform: scale(0.9); transition: transform 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .modal-overlay.visible .modal-content { transform: scale(1); }
        .modal-close {
            position: absolute; top: 15px; right: 15px; width: 30px; height: 30px;
            background-color: rgba(255, 255, 255, 0.1); color: #fff; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; line-height: 1; cursor: pointer;
            transition: background-color 0.2s, transform 0.2s;
        }
        .modal-close:hover { background-color: rgba(255, 255, 255, 0.2); transform: rotate(90deg); }
        .contact-modal-header .modal-title {
            color: #3B82F6; text-shadow: none; font-size: 2rem; margin-bottom: 1rem; text-align: center;
        }
        .contact-modal-header .modal-intro {
            font-size: 1rem; color: #9CA3AF; max-width: 450px; margin: 0 auto 30px auto;
            text-align: center; line-height: 1.6;
        }
        .contact-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
        @media (max-width: 768px) { .contact-modal-grid { grid-template-columns: 1fr; } }
        .contact-card-white {
            background-color: #FFFFFF; color: #1F2937; padding: 25px; border-radius: 16px;
            display: flex; flex-direction: column; text-align: left;
        }
        .contact-card-white .card-header { display: flex; align-items: center; margin-bottom: 15px; }
        .contact-card-white .card-icon { color: #3B82F6; font-size: 20px; margin-right: 10px; }
        .contact-card-white .card-title { color: #111827; font-size: 18px; font-weight: 600; }
        .contact-card-white .card-desc { color: #6B7280; font-size: 14px; line-height: 1.6; flex-grow: 1; }
        .contact-card-white .card-button {
            display: block; margin-top: 20px; background-color: #3B82F6; color: #FFFFFF;
            text-align: center; padding: 12px; border-radius: 8px; text-decoration: none;
            font-weight: 500; transition: background-color 0.2s ease;
        }
        .contact-card-white .card-button:hover { background-color: #2563EB; }
        .contact-card-white .card-infobox {
            margin-top: 20px; background-color: #F3F4F6; color: #4B5563;
            text-align: center; padding: 12px; border-radius: 8px; font-family: monospace;
            font-size: 14px; user-select: all;
        }
    `;

    // 3. 在页面加载完成后，执行所有操作
    document.addEventListener('DOMContentLoaded', () => {
        // 注入 CSS
        const styleSheet = document.createElement("style");
        styleSheet.innerText = modalCSS;
        document.head.appendChild(styleSheet);

        // 注入 HTML
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 4. 获取元素并添加功能
        const contactModal = document.getElementById('contact-modal');
        const triggers = document.querySelectorAll('.contact-trigger');

        const openModal = () => {
            contactModal.classList.add('visible');
            document.body.classList.add('modal-open');
        };

        const closeModal = () => {
            contactModal.classList.remove('visible');
            document.body.classList.remove('modal-open');
        };

        // 绑定打开事件
        triggers.forEach(trigger => trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        }));
        
        // 绑定关闭事件 (使用事件委托)
        contactModal.addEventListener('click', (e) => {
            if (e.target === contactModal || e.target.classList.contains('modal-close')) {
                closeModal();
            }
        });

        // 绑定键盘Esc键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && contactModal.classList.contains('visible')) {
                closeModal();
            }
        });
    });
})();