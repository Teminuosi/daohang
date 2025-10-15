// js/modal-template.js - iframe 升级版

(function() {
    // 1. 定义包含 iframe 的弹窗 HTML 结构
    const modalHTML = `
        <div id="contact-modal" class="modal-overlay">
            <div class="modal-body-wrapper">
                <span class="modal-close">&times;</span>
                <div class="iframe-container">
                    <iframe id="contact-iframe" src="about:blank"></iframe>
                </div>
            </div>
        </div>
    `;

    // 2. 定义弹窗的 CSS 样式
    const modalCSS = `
        body.modal-open { overflow: hidden; }
        .modal-overlay#contact-modal {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            display: flex; justify-content: center; align-items: center;
            z-index: 9999;
            opacity: 0; visibility: hidden; pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .modal-overlay#contact-modal.visible { opacity: 1; visibility: visible; pointer-events: auto; }
        
        .modal-body-wrapper {
            position: relative;
            width: 90%;
            max-width: 800px;
            transform: scale(0.95);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .modal-overlay#contact-modal.visible .modal-body-wrapper {
             transform: scale(1);
             opacity: 1;
        }

        .modal-overlay#contact-modal .modal-close {
            position: absolute; top: -15px; right: -15px; width: 32px; height: 32px;
            background-color: #333; color: #fff; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.6rem; line-height: 1; cursor: pointer; z-index: 10;
            border: 2px solid #555;
            transition: background-color 0.2s, transform 0.2s;
        }
        .modal-overlay#contact-modal .modal-close:hover { background-color: #e53e3e; transform: rotate(90deg); }

        .iframe-container {
            width: 100%;
            height: 550px; /* 您可以根据 contact-modal.html 的内容调整高度 */
            background-color: #111317; /* iframe 加载前的背景色 */
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        #contact-iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    `;

    // 3. 在页面加载完成后，执行所有操作
    document.addEventListener('DOMContentLoaded', () => {
        // 注入 CSS 和 HTML
        const styleSheet = document.createElement("style");
        styleSheet.innerText = modalCSS;
        document.head.appendChild(styleSheet);
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 4. 获取元素并添加功能
        const contactModal = document.getElementById('contact-modal');
        const contactIframe = document.getElementById('contact-iframe');
        const triggers = document.querySelectorAll('.contact-trigger');
        const contactPageUrl = 'contact-modal.html'; // 关键：指定要加载的页面

        const openContactModal = () => {
            if (!contactModal || !contactIframe) return;
            contactIframe.src = contactPageUrl; // 加载页面
            contactModal.classList.add('visible');
            document.body.classList.add('modal-open');
        };

        const closeContactModal = () => {
            if (!contactModal || !contactIframe) return;
            contactModal.classList.remove('visible');
            document.body.classList.remove('modal-open');
            setTimeout(() => {
                contactIframe.src = 'about:blank'; // 卸载页面以节省资源
            }, 300);
        };

        // 绑定打开事件
        triggers.forEach(trigger => trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openContactModal();
        }));
        
        // 绑定关闭事件
        if (contactModal) {
            contactModal.addEventListener('click', (e) => {
                if (e.target === contactModal || e.target.classList.contains('modal-close')) {
                    closeContactModal();
                }
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && contactModal && contactModal.classList.contains('visible')) {
                closeContactModal();
            }
        });
    });
})();