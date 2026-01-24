        /* ================= Supabase 认证系统 (REST API 版本) ================= */
        const SUPABASE_URL = 'https://qzpvogxvlescfwpqahsn.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6cHZvZ3h2bGVzY2Z3cHFhaHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzMyMzMsImV4cCI6MjA4MzUwOTIzM30.2uadJyp_KJNxRuFm1NIkuRPrTzq0-lBfuH3gb20LXGc';
        
        // 站长邮箱
        const ADMIN_EMAIL = 'terminos888@gmail.com';
        const ADMIN_UUID = '71c4e4e1-a1b6-47f8-aaa8-c62ae020e1eb';
        
        // 留言系统变量
        var currentChannel = 'public';
        var messagesData = [];
        var currentPage = 0;
        var pageSize = 10;
        var hasMoreMessages = true;
        var replyToId = null;
        var replyToName = '';
        var selectedTag = null;
        var isRefreshing = false;
        var pendingMessageImage = null; // 待发送的图片URL
        
        // Token 刷新函数
        function refreshAccessToken() {
            return new Promise(function(resolve, reject) {
                var refreshToken = localStorage.getItem('nexus_refresh_token');
                if (!refreshToken) {
                    reject(new Error('No refresh token'));
                    return;
                }
                
                if (isRefreshing) {
                    // 如果正在刷新，等待一下再试
                    setTimeout(function() { resolve(); }, 1000);
                    return;
                }
                
                isRefreshing = true;
                
                fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        refresh_token: refreshToken
                    })
                })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Refresh failed');
                    }
                    return response.json();
                })
                .then(function(data) {
                    if (data.access_token) {
                        localStorage.setItem('nexus_access_token', data.access_token);
                        localStorage.setItem('nexus_refresh_token', data.refresh_token);
                        localStorage.setItem('nexus_user', JSON.stringify(data.user));
                        currentUser = data.user;
                        console.log('Token 刷新成功');
                        resolve(data.access_token);
                    } else {
                        throw new Error('No access token in response');
                    }
                })
                .catch(function(error) {
                    console.error('Token 刷新失败:', error);
                    // 刷新失败，清除登录状态
                    handleLogout();
                    reject(error);
                })
                .finally(function() {
                    isRefreshing = false;
                });
            });
        }
        
        // 带自动刷新的 fetch 封装
        function fetchWithAuth(url, options) {
            var accessToken = localStorage.getItem('nexus_access_token');
            
            if (!options) options = {};
            if (!options.headers) options.headers = {};
            
            options.headers['apikey'] = SUPABASE_KEY;
            options.headers['Authorization'] = 'Bearer ' + (accessToken || SUPABASE_KEY);
            
            return fetch(url, options).then(function(response) {
                if (response.status === 401 && accessToken) {
                    // Token 过期，尝试刷新
                    return refreshAccessToken().then(function(newToken) {
                        options.headers['Authorization'] = 'Bearer ' + newToken;
                        return fetch(url, options);
                    });
                }
                return response;
            });
        }
        
        // 页面加载时检查并刷新 token
        function checkAndRefreshToken() {
            var accessToken = localStorage.getItem('nexus_access_token');
            var refreshToken = localStorage.getItem('nexus_refresh_token');
            
            if (accessToken && refreshToken) {
                // 尝试用当前 token 获取用户信息
                fetch(SUPABASE_URL + '/auth/v1/user', {
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + accessToken
                    }
                })
                .then(function(response) {
                    if (response.status === 401) {
                        // Token 过期，刷新
                        return refreshAccessToken();
                    }
                    return response.json();
                })
                .then(function(data) {
                    if (data && data.id) {
                        currentUser = data;
                        localStorage.setItem('nexus_user', JSON.stringify(data));
                        updateAuthUI(true);
                    }
                })
                .catch(function(error) {
                    console.error('Token 验证失败:', error);
                });
            }
        }
        
        // 随机昵称生成器
        var nicknameAdjectives = ['快乐', '神秘', '赛博', '星际', '暗夜', '闪电', '量子', '幻影', '极光', '烈焰', '冰霜', '雷霆', '风暴', '梦幻', '自由', '无畏', '光速', '深空', '迷雾', '破晓'];
        var nicknameNouns = ['星球', '旅人', '水手', '骑士', '猎人', '行者', '使者', '守望', '飞鸟', '游侠', '精灵', '战士', '探索', '漫步', '流浪', '追风', '逐梦', '先锋', '领航', '开拓'];
        
        function generateRandomNickname() {
            var adj = nicknameAdjectives[Math.floor(Math.random() * nicknameAdjectives.length)];
            var noun = nicknameNouns[Math.floor(Math.random() * nicknameNouns.length)];
            var num = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
            return adj + noun + num;
        }
        
        // 检查昵称是否已存在
        function checkNicknameExists(nickname) {
            return fetch(SUPABASE_URL + '/rest/v1/profiles?full_name=eq.' + encodeURIComponent(nickname) + '&select=id', {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                return data && data.length > 0; // true = 已存在
            })
            .catch(function() {
                return false;
            });
        }
        
        // 生成唯一昵称（如果重复就重新生成）
        function generateUniqueNickname() {
            return new Promise(function(resolve) {
                var tryGenerate = function(attempts) {
                    if (attempts > 10) {
                        // 超过10次，加时间戳确保唯一
                        resolve('用户' + Date.now());
                        return;
                    }
                    var nickname = generateRandomNickname();
                    checkNicknameExists(nickname).then(function(exists) {
                        if (exists) {
                            tryGenerate(attempts + 1);
                        } else {
                            resolve(nickname);
                        }
                    });
                };
                tryGenerate(0);
            });
        }
        
        // 当前用户状态
        let currentUser = null;
        
        // 页面加载时检查登录状态
        document.addEventListener('DOMContentLoaded', function() {
            checkLoginStatus();
        });
        
        // 检查登录状态
        function checkLoginStatus() {
            const userData = localStorage.getItem('nexus_user');
            const accessToken = localStorage.getItem('nexus_access_token');
            const refreshToken = localStorage.getItem('nexus_refresh_token');
            
            if (userData && accessToken) {
                try {
                    currentUser = JSON.parse(userData);
                    updateAuthUI(true);
                    
                    // 后台验证token有效性并获取最新用户数据
                    fetchLatestUserData(accessToken);
                } catch (e) {
                    clearAuthData();
                    updateAuthUI(false);
                }
            } else if (refreshToken) {
                // 有refresh token但没有access token，尝试刷新
                refreshAccessToken().then(function() {
                    updateAuthUI(true);
                }).catch(function() {
                    clearAuthData();
                    updateAuthUI(false);
                });
            } else {
                updateAuthUI(false);
            }
        }
        
        // 获取最新用户数据
        function fetchLatestUserData(accessToken) {
            fetch(SUPABASE_URL + '/auth/v1/user', {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken
                }
            })
            .then(function(response) {
                if (response.status === 401) {
                    // Token过期，尝试刷新
                    return refreshAccessToken().then(function() {
                        updateAuthUI(true);
                    });
                }
                return response.json();
            })
            .then(function(data) {
                if (data && data.id) {
                    currentUser = data;
                    localStorage.setItem('nexus_user', JSON.stringify(data));
                    updateAuthUI(true);
                }
            })
            .catch(function(error) {
                console.error('获取用户数据失败:', error);
            });
        }
        
        // 清除认证数据
        function clearAuthData() {
            localStorage.removeItem('nexus_user');
            localStorage.removeItem('nexus_access_token');
            localStorage.removeItem('nexus_refresh_token');
            currentUser = null;
        }
        
        // 更新认证UI
        function updateAuthUI(isLoggedIn) {
            var authBtns = document.getElementById('authBtnsContainer');
            var userInfo = document.getElementById('userInfoContainer');
            
            if (isLoggedIn && currentUser) {
                authBtns.style.display = 'none';
                userInfo.style.display = 'block';
                
                // 从 profiles 表获取最新的用户资料（包括头像）
                fetchLatestProfile(currentUser.id);
                
                // 先用 user_metadata 显示，等 profiles 加载完会更新
                var avatar = document.getElementById('userAvatar');
                var userName = document.getElementById('userName');
                
                var displayName = '用户';
                var displayAvatar = '👤';
                
                if (currentUser.user_metadata) {
                    if (currentUser.user_metadata.full_name) {
                        displayName = currentUser.user_metadata.full_name;
                    }
                    if (currentUser.user_metadata.avatar) {
                        displayAvatar = currentUser.user_metadata.avatar;
                    }
                }
                
                if (displayName === '用户' && currentUser.email) {
                    displayName = currentUser.email.split('@')[0];
                }
                
                avatar.textContent = displayAvatar;
                userName.textContent = displayName;
            } else {
                authBtns.style.display = 'flex';
                userInfo.style.display = 'none';
            }
        }
        
        // 从 profiles 表获取最新用户资料
        function fetchLatestProfile(userId) {
            fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + userId + '&select=full_name,avatar_url', {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY
                }
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data && data.length > 0) {
                    var profile = data[0];
                    console.log('从profiles获取的资料:', profile);
                    
                    // 更新 currentUser 的 user_metadata
                    if (!currentUser.user_metadata) {
                        currentUser.user_metadata = {};
                    }
                    if (profile.full_name) {
                        currentUser.user_metadata.full_name = profile.full_name;
                    }
                    if (profile.avatar_url) {
                        currentUser.user_metadata.avatar_url = profile.avatar_url;
                    }
                    
                    // 更新localStorage
                    localStorage.setItem('nexus_user', JSON.stringify(currentUser));
                    
                    // 更新界面显示
                    var avatar = document.getElementById('userAvatar');
                    var userName = document.getElementById('userName');
                    
                    if (profile.avatar_url) {
                        var imgUrl = profile.avatar_url + '?t=' + Date.now();
                        avatar.innerHTML = '<img src="' + imgUrl + '" alt="头像">';
                    }
                    if (profile.full_name) {
                        userName.textContent = profile.full_name;
                    }
                }
            })
            .catch(function(err) {
                console.error('获取用户资料失败:', err);
            });
        }
        
        // 显示消息提示
        function showMessage(text, type) {
            type = type || 'info';
            const toast = document.getElementById('messageToast');
            const iconMap = {
                success: 'check-circle',
                error: 'exclamation-circle',
                warning: 'exclamation-triangle',
                info: 'info-circle'
            };
            toast.innerHTML = '<i class="fas fa-' + (iconMap[type] || 'info-circle') + '"></i> ' + text;
            toast.className = 'message-toast ' + type;
            
            setTimeout(function() { toast.classList.add('show'); }, 10);
            setTimeout(function() { toast.classList.remove('show'); }, 3500);
        }
        
        // 打开认证弹窗
        function openAuthModal(type) {
            var modalId = type + '-modal';
            var modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('visible');
                document.body.classList.add('modal-open');
            }
        }
        
        // 关闭认证弹窗
        function closeAuthModal(type) {
            var modalId = type + '-modal';
            var modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('visible');
                if (document.querySelectorAll('.modal-overlay.visible').length === 0) {
                    document.body.classList.remove('modal-open');
                }
            }
        }
        
        // 切换密码可见性
        function togglePassword(inputId, icon) {
            var input = document.getElementById(inputId);
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
        
        // 密码强度检测
        function checkPasswordStrength(password) {
            var bar1 = document.getElementById('strengthBar1');
            var bar2 = document.getElementById('strengthBar2');
            var bar3 = document.getElementById('strengthBar3');
            var text = document.getElementById('strengthText');
            
            bar1.className = 'strength-bar';
            bar2.className = 'strength-bar';
            bar3.className = 'strength-bar';
            
            if (!password) {
                text.textContent = '';
                return;
            }
            
            var strength = 0;
            if (password.length >= 6) strength++;
            if (password.length >= 10) strength++;
            if (/\d/.test(password)) strength++;
            if (/[a-zA-Z]/.test(password)) strength++;
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
            
            if (strength <= 2) {
                bar1.classList.add('weak');
                text.textContent = '密码强度：弱';
                text.style.color = '#ff4757';
            } else if (strength <= 4) {
                bar1.classList.add('medium');
                bar2.classList.add('medium');
                text.textContent = '密码强度：中';
                text.style.color = '#ffd700';
            } else {
                bar1.classList.add('strong');
                bar2.classList.add('strong');
                bar3.classList.add('strong');
                text.textContent = '密码强度：强';
                text.style.color = '#00ff88';
            }
        }
        
        // 表单验证
        function validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }
        
        function validatePhone(phone) {
            if (!phone) return true;
            return /^1[3-9]\d{9}$/.test(phone);
        }
        
        function setFieldError(groupId, hasError) {
            var group = document.getElementById(groupId);
            if (hasError) {
                group.classList.add('error');
            } else {
                group.classList.remove('error');
            }
        }
        
        // 切换到注册
        function switchToRegister() {
            closeAuthModal('login');
            setTimeout(function() { 
                openAuthModal('register');
                // 自动生成一个随机昵称
                fillRandomNickname();
            }, 200);
        }
        
        // 填充随机昵称
        function fillRandomNickname() {
            var input = document.getElementById('registerName');
            var btn = event ? event.target.closest('button') : null;
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            generateUniqueNickname().then(function(nickname) {
                input.value = nickname;
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-dice"></i> 随机';
                }
            });
        }
        
        // 切换到登录
        function switchToLogin() {
            closeAuthModal('register');
            setTimeout(function() { openAuthModal('login'); }, 200);
        }
        
        // 设置按钮加载状态
        function setButtonLoading(btnId, loading) {
            var btn = document.getElementById(btnId);
            if (loading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }
        
        // 登录处理 - 使用 Supabase Auth REST API
        function handleLogin() {
            var email = document.getElementById('loginEmail').value.trim();
            var password = document.getElementById('loginPassword').value;
            
            // 验证
            var hasError = false;
            
            if (!validateEmail(email)) {
                setFieldError('loginEmailGroup', true);
                hasError = true;
            } else {
                setFieldError('loginEmailGroup', false);
            }
            
            if (!password) {
                setFieldError('loginPasswordGroup', true);
                hasError = true;
            } else {
                setFieldError('loginPasswordGroup', false);
            }
            
            if (hasError) {
                showMessage('请检查输入信息', 'error');
                return;
            }
            
            setButtonLoading('loginSubmitBtn', true);
            
            // 调用 Supabase Auth API
            fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            })
            .then(function(response) {
                return response.json().then(function(data) {
                    return { ok: response.ok, data: data };
                });
            })
            .then(function(result) {
                if (!result.ok) {
                    var errorMsg = result.data.error_description || result.data.msg || result.data.message || '登录失败';
                    
                    // 更友好的错误提示
                    if (errorMsg.includes('Invalid login credentials')) {
                        showMessage('账号不存在或密码错误，请检查后重试', 'error');
                    } else if (errorMsg.includes('Email not confirmed')) {
                        showMessage('请先验证您的邮箱后再登录', 'warning');
                    } else if (errorMsg.includes('Too many requests') || errorMsg.includes('rate limit')) {
                        showMessage('操作过于频繁，请1分钟后再试', 'warning');
                    } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
                        showMessage('网络连接失败，请检查网络后重试', 'error');
                    } else {
                        showMessage('登录失败: ' + errorMsg, 'error');
                    }
                    setButtonLoading('loginSubmitBtn', false);
                    return;
                }
                
                // 登录成功
                currentUser = result.data.user;
                localStorage.setItem('nexus_user', JSON.stringify(result.data.user));
                localStorage.setItem('nexus_access_token', result.data.access_token);
                localStorage.setItem('nexus_refresh_token', result.data.refresh_token);
                
                showMessage('登录成功！欢迎回来', 'success');
                updateAuthUI(true);
                
                setTimeout(function() {
                    closeAuthModal('login');
                    setButtonLoading('loginSubmitBtn', false);
                    document.getElementById('loginEmail').value = '';
                    document.getElementById('loginPassword').value = '';
                }, 1000);
            })
            .catch(function(error) {
                console.error('登录错误:', error);
                showMessage('网络连接失败，请检查网络后重试', 'error');
                setButtonLoading('loginSubmitBtn', false);
            });
        }
        
        // 注册头像相关变量
        var registerAvatarUrl = null;  // 存储已上传的头像URL
        var isUploadingAvatar = false; // 是否正在上传
        
        // 预览并上传注册头像
        function previewRegisterAvatar(input) {
            if (input.files && input.files[0]) {
                var file = input.files[0];
                
                // 验证文件
                if (!file.type.startsWith('image/')) {
                    showMessage('请选择图片文件', 'error');
                    return;
                }
                if (file.size > 2 * 1024 * 1024) {
                    showMessage('图片大小不能超过2MB', 'error');
                    return;
                }
                
                // 先显示预览
                var reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('registerAvatarPreview').innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">';
                    document.getElementById('removeRegisterAvatarBtn').style.display = 'inline-block';
                };
                reader.readAsDataURL(file);
                
                // 立即上传头像
                uploadRegisterAvatarNow(file);
            }
        }
        
        // 立即上传头像
        function uploadRegisterAvatarNow(file) {
            isUploadingAvatar = true;
            var btn = document.getElementById('registerSubmitBtn');
            btn.disabled = true;
            btn.querySelector('.btn-text').textContent = '头像上传中...';
            
            var ext = file.name.split('.').pop();
            var filename = 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '.' + ext;
            
            fetch(SUPABASE_URL + '/storage/v1/object/avatars/' + filename, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Content-Type': file.type
                },
                body: file
            })
            .then(function(res) {
                if (!res.ok) throw new Error('上传失败');
                registerAvatarUrl = SUPABASE_URL + '/storage/v1/object/public/avatars/' + filename;
                showMessage('头像上传成功', 'success');
            })
            .catch(function(err) {
                console.error('头像上传失败:', err);
                showMessage('头像上传失败，请重试', 'error');
                registerAvatarUrl = null;
            })
            .finally(function() {
                isUploadingAvatar = false;
                btn.disabled = false;
                btn.querySelector('.btn-text').textContent = '注 册';
            });
        }
        
        // 移除注册头像
        function removeRegisterAvatar() {
            registerAvatarUrl = null;
            document.getElementById('registerAvatarPreview').innerHTML = '👤';
            document.getElementById('registerAvatarInput').value = '';
            document.getElementById('removeRegisterAvatarBtn').style.display = 'none';
        }
        
        // 注册处理 - 使用 Supabase Auth REST API
        function handleRegister() {
            var name = document.getElementById('registerName').value.trim();
            var email = document.getElementById('registerEmail').value.trim();
            var phone = document.getElementById('registerPhone').value.trim();
            var password = document.getElementById('registerPassword').value;
            var confirmPassword = document.getElementById('registerConfirm').value;
            
            // 验证
            var hasError = false;
            
            if (name.length < 2 || name.length > 20) {
                setFieldError('registerNameGroup', true);
                hasError = true;
            } else {
                setFieldError('registerNameGroup', false);
            }
            
            if (!validateEmail(email)) {
                setFieldError('registerEmailGroup', true);
                hasError = true;
            } else {
                setFieldError('registerEmailGroup', false);
            }
            
            if (!phone || !validatePhone(phone)) {
                setFieldError('registerPhoneGroup', true);
                hasError = true;
            } else {
                setFieldError('registerPhoneGroup', false);
            }
            
            if (password.length < 6) {
                setFieldError('registerPasswordGroup', true);
                hasError = true;
            } else {
                setFieldError('registerPasswordGroup', false);
            }
            
            if (password !== confirmPassword) {
                setFieldError('registerConfirmGroup', true);
                hasError = true;
            } else {
                setFieldError('registerConfirmGroup', false);
            }
            
            if (hasError) {
                showMessage('请检查输入信息', 'error');
                return;
            }
            
            setButtonLoading('registerSubmitBtn', true);
            
            // 先检查昵称是否已存在
            checkNicknameExists(name).then(function(exists) {
                if (exists) {
                    showMessage('该昵称已被使用，请换一个或点击随机生成', 'warning');
                    setFieldError('registerNameGroup', true);
                    setButtonLoading('registerSubmitBtn', false);
                    return;
                }
                
                // 昵称可用，继续注册
                doRegister(name, email, phone, password);
            }).catch(function() {
                // 检查失败，仍然尝试注册
                doRegister(name, email, phone, password);
            });
        }
        
        // 执行注册
        function doRegister(name, email, phone, password) {
            // 检查是否正在上传头像
            if (isUploadingAvatar) {
                showMessage('请等待头像上传完成', 'warning');
                setButtonLoading('registerSubmitBtn', false);
                return;
            }
            
            // 直接使用已上传的头像URL
            doRegisterWithAvatar(name, email, phone, password, registerAvatarUrl);
        }
        
        // 带头像URL的注册
        function doRegisterWithAvatar(name, email, phone, password, avatarUrl) {
            // 调用 Supabase Auth API 注册
            fetch(SUPABASE_URL + '/auth/v1/signup', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    data: {
                        full_name: name,
                        phone: phone,
                        avatar: '👤',
                        avatar_url: avatarUrl || null
                    }
                })
            })
            .then(function(response) {
                return response.json().then(function(data) {
                    return { ok: response.ok, status: response.status, data: data };
                });
            })
            .then(function(result) {
                if (!result.ok) {
                    var errorMsg = result.data.error_description || result.data.msg || result.data.message || '注册失败';
                    
                    if (errorMsg.includes('already registered') || errorMsg.includes('already been registered')) {
                        showMessage('该邮箱已被注册', 'warning');
                    } else if (errorMsg.includes('Password')) {
                        showMessage('密码不符合要求，请使用更强的密码', 'error');
                    } else {
                        showMessage(errorMsg, 'error');
                    }
                    setButtonLoading('registerSubmitBtn', false);
                    return;
                }
                
                // 注册成功，将用户信息写入 profiles 表（带头像）
                var userId = result.data.user ? result.data.user.id : null;
                if (userId) {
                    saveUserProfile(userId, name, email, phone, avatarUrl);
                }
                
                // 检查是否需要邮箱验证
                if (result.data.user && !result.data.session && !result.data.access_token) {
                    showMessage('注册成功！请检查邮箱完成验证后登录', 'success');
                } else if (result.data.access_token || result.data.session) {
                    // 直接登录成功
                    var userData = result.data.user;
                    var accessToken = result.data.access_token || (result.data.session && result.data.session.access_token);
                    var refreshToken = result.data.refresh_token || (result.data.session && result.data.session.refresh_token);
                    
                    currentUser = userData;
                    localStorage.setItem('nexus_user', JSON.stringify(userData));
                    localStorage.setItem('nexus_access_token', accessToken);
                    localStorage.setItem('nexus_refresh_token', refreshToken);
                    showMessage('注册成功！欢迎加入 NEXUS', 'success');
                    updateAuthUI(true);
                } else {
                    showMessage('注册成功！请登录', 'success');
                }
                
                setTimeout(function() {
                    closeAuthModal('register');
                    setButtonLoading('registerSubmitBtn', false);
                    document.getElementById('registerName').value = '';
                    document.getElementById('registerEmail').value = '';
                    document.getElementById('registerPhone').value = '';
                    document.getElementById('registerPassword').value = '';
                    document.getElementById('registerConfirm').value = '';
                    document.getElementById('strengthBar1').className = 'strength-bar';
                    document.getElementById('strengthBar2').className = 'strength-bar';
                    document.getElementById('strengthBar3').className = 'strength-bar';
                    document.getElementById('strengthText').textContent = '';
                    // 清理注册头像
                    removeRegisterAvatar();
                }, 1500);
            })
            .catch(function(error) {
                console.error('注册错误:', error);
                showMessage('注册失败: 网络错误，请稍后重试', 'error');
                setButtonLoading('registerSubmitBtn', false);
            });
        }
        
        // 保存用户资料到 profiles 表
        function saveUserProfile(userId, fullName, email, phone, avatarUrl) {
            var profileData = {
                id: userId,
                full_name: fullName,
                email_contact: email,
                phone_number: phone || null,
                avatar_url: avatarUrl || null
            };
            
            console.log('保存用户资料:', profileData);
            
            // 使用 upsert：如果存在就更新，不存在就插入
            fetch(SUPABASE_URL + '/rest/v1/profiles', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(profileData)
            })
            .then(function(response) {
                if (!response.ok) {
                    return response.text().then(function(text) {
                        console.error('保存用户资料失败:', text);
                    });
                } else {
                    console.log('用户资料保存成功');
                }
            })
            .catch(function(error) {
                console.error('保存用户资料错误:', error);
            });
        }
        
        // 退出登录
        function handleLogout() {
            var accessToken = localStorage.getItem('nexus_access_token');
            
            if (accessToken) {
                fetch(SUPABASE_URL + '/auth/v1/logout', {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + accessToken
                    }
                }).catch(function() {});
            }
            
            clearAuthData();
            updateAuthUI(false);
            showMessage('已安全退出登录', 'info');
        }
        
        // 打开设置弹窗时填充当前用户信息
        function openSettingsModal() {
            if (!currentUser) {
                showMessage('请先登录', 'warning');
                return;
            }
            
            var displayName = '';
            var avatar = '👤';
            var phone = '';
            var avatarUrl = '';
            
            if (currentUser.user_metadata) {
                if (currentUser.user_metadata.full_name) {
                    displayName = currentUser.user_metadata.full_name;
                }
                if (currentUser.user_metadata.avatar) {
                    avatar = currentUser.user_metadata.avatar;
                }
                if (currentUser.user_metadata.avatar_url) {
                    avatarUrl = currentUser.user_metadata.avatar_url;
                }
                if (currentUser.user_metadata.phone) {
                    phone = currentUser.user_metadata.phone;
                }
            }
            
            if (!displayName && currentUser.email) {
                displayName = currentUser.email.split('@')[0];
            }
            
            document.getElementById('settingsName').value = displayName;
            document.getElementById('settingsEmail').value = currentUser.email || '';
            document.getElementById('settingsPhone').value = phone;
            
            // 设置头像预览
            var avatarPreview = document.getElementById('avatarPreview');
            if (avatarUrl) {
                avatarPreview.innerHTML = '<img src="' + avatarUrl + '" alt="头像">';
                avatarPreview.setAttribute('data-type', 'image');
                avatarPreview.setAttribute('data-url', avatarUrl);
            } else {
                avatarPreview.innerHTML = avatar;
                avatarPreview.setAttribute('data-type', 'emoji');
                avatarPreview.removeAttribute('data-url');
            }
            
            // 设置头像选中状态
            var avatarOptions = document.querySelectorAll('.avatar-option');
            avatarOptions.forEach(function(opt) {
                opt.classList.remove('selected');
                if (!avatarUrl && opt.getAttribute('data-avatar') === avatar) {
                    opt.classList.add('selected');
                }
            });
            
            openAuthModal('settings');
        }
        
        // 头像选择（emoji）
        function selectAvatar(element) {
            document.querySelectorAll('.avatar-option').forEach(function(opt) {
                opt.classList.remove('selected');
            });
            element.classList.add('selected');
            
            // 更新预览
            var avatar = element.getAttribute('data-avatar');
            var avatarPreview = document.getElementById('avatarPreview');
            avatarPreview.innerHTML = avatar;
            avatarPreview.setAttribute('data-type', 'emoji');
            avatarPreview.removeAttribute('data-url');
        }
        
        // 上传头像变量
        var uploadedAvatarUrl = null;
        
        // 处理头像上传
        function handleAvatarUpload(event) {
            var file = event.target.files[0];
            if (!file) return;
            
            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                showMessage('请选择图片文件', 'error');
                return;
            }
            
            // 检查文件大小（最大2MB）
            if (file.size > 2 * 1024 * 1024) {
                showMessage('图片大小不能超过2MB', 'error');
                return;
            }
            
            // 显示上传中状态
            var avatarPreview = document.getElementById('avatarPreview');
            avatarPreview.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);"></i>';
            
            // 读取文件并预览
            var reader = new FileReader();
            reader.onload = function(e) {
                // 先显示本地预览
                avatarPreview.innerHTML = '<img src="' + e.target.result + '" alt="头像">';
                avatarPreview.setAttribute('data-type', 'image');
                
                // 上传到 Supabase Storage
                uploadAvatarToStorage(file);
            };
            reader.readAsDataURL(file);
        }
        
        // 设置头像上传状态
        var isUploadingSettingsAvatar = false;
        
        // 上传头像到 Supabase Storage
        function uploadAvatarToStorage(file) {
            var accessToken = localStorage.getItem('nexus_access_token');
            if (!accessToken || !currentUser) {
                showMessage('请先登录', 'error');
                return;
            }
            
            // 禁用保存按钮
            isUploadingSettingsAvatar = true;
            var saveBtn = document.getElementById('settingsSubmitBtn');
            saveBtn.disabled = true;
            saveBtn.querySelector('.btn-text').textContent = '头像上传中...';
            
            // 获取旧头像URL（用于删除）
            var oldAvatarUrl = null;
            if (currentUser.user_metadata && currentUser.user_metadata.avatar_url) {
                oldAvatarUrl = currentUser.user_metadata.avatar_url;
            }
            
            // 使用用户ID作为文件名，每次上传覆盖旧文件
            var fileExt = file.name.split('.').pop().toLowerCase();
            var fileName = currentUser.id + '.' + fileExt;
            
            // 先删除可能存在的旧头像（不同扩展名）
            var deleteOldAvatar = Promise.resolve();
            if (oldAvatarUrl) {
                var oldFileName = oldAvatarUrl.split('/').pop();
                if (oldFileName && oldFileName !== fileName) {
                    deleteOldAvatar = fetch(SUPABASE_URL + '/storage/v1/object/avatars/' + oldFileName, {
                        method: 'DELETE',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + accessToken
                        }
                    }).catch(function() { /* 忽略删除失败 */ });
                }
            }
            
            deleteOldAvatar.then(function() {
                return fetch(SUPABASE_URL + '/storage/v1/object/avatars/' + fileName, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + accessToken,
                        'Content-Type': file.type,
                        'x-upsert': 'true'
                    },
                    body: file
                });
            })
            .then(function(response) {
                if (!response.ok) {
                    return response.text().then(function(text) {
                        console.error('上传失败响应:', text);
                        throw new Error('上传失败: ' + text);
                    });
                }
                return response.json();
            })
            .then(function(data) {
                // 获取公开URL（添加时间戳防止缓存）
                uploadedAvatarUrl = SUPABASE_URL + '/storage/v1/object/public/avatars/' + fileName + '?t=' + Date.now();
                
                var avatarPreview = document.getElementById('avatarPreview');
                avatarPreview.setAttribute('data-url', uploadedAvatarUrl);
                avatarPreview.innerHTML = '<img src="' + uploadedAvatarUrl + '" alt="头像">';
                
                // 清除emoji选中状态
                document.querySelectorAll('.avatar-option').forEach(function(opt) {
                    opt.classList.remove('selected');
                });
                
                showMessage('头像上传成功，请点击保存', 'success');
            })
            .catch(function(error) {
                console.error('头像上传失败:', error);
                showMessage('头像上传失败: ' + error.message, 'error');
                
                // 恢复默认头像
                var avatarPreview = document.getElementById('avatarPreview');
                avatarPreview.innerHTML = '👤';
                avatarPreview.setAttribute('data-type', 'emoji');
            })
            .finally(function() {
                // 恢复保存按钮
                isUploadingSettingsAvatar = false;
                var saveBtn = document.getElementById('settingsSubmitBtn');
                saveBtn.disabled = false;
                saveBtn.querySelector('.btn-text').textContent = '保存修改';
            });
        }
        
        // 获取当前选中的头像
        function getSelectedAvatar() {
            var avatarPreview = document.getElementById('avatarPreview');
            var type = avatarPreview.getAttribute('data-type');
            
            if (type === 'image') {
                return { type: 'image', url: avatarPreview.getAttribute('data-url') };
            } else {
                var selected = document.querySelector('.avatar-option.selected');
                return { type: 'emoji', avatar: selected ? selected.getAttribute('data-avatar') : '👤' };
            }
        }
        
        // 修改用户资料
        function handleUpdateProfile() {
            var newName = document.getElementById('settingsName').value.trim();
            var newPhone = document.getElementById('settingsPhone').value.trim();
            var newAvatar = getSelectedAvatar();
            
            // 检查是否正在上传头像
            if (isUploadingSettingsAvatar) {
                showMessage('请等待头像上传完成', 'warning');
                return;
            }
            
            // 验证
            var hasError = false;
            
            if (newName.length < 2 || newName.length > 20) {
                setFieldError('settingsNameGroup', true);
                hasError = true;
            } else {
                setFieldError('settingsNameGroup', false);
            }
            
            if (newPhone && !validatePhone(newPhone)) {
                setFieldError('settingsPhoneGroup', true);
                hasError = true;
            } else {
                setFieldError('settingsPhoneGroup', false);
            }
            
            if (hasError) {
                showMessage('请检查输入信息', 'error');
                return;
            }
            
            var accessToken = localStorage.getItem('nexus_access_token');
            if (!accessToken) {
                showMessage('登录已过期，请重新登录', 'error');
                handleLogout();
                return;
            }
            
            setButtonLoading('settingsSubmitBtn', true);
            
            // 获取当前昵称
            var currentName = '';
            if (currentUser && currentUser.user_metadata && currentUser.user_metadata.full_name) {
                currentName = currentUser.user_metadata.full_name;
            }
            
            // 如果昵称改变了，检查唯一性
            if (newName !== currentName) {
                checkNicknameExists(newName).then(function(exists) {
                    if (exists) {
                        showMessage('该昵称已被使用，请换一个', 'warning');
                        setFieldError('settingsNameGroup', true);
                        setButtonLoading('settingsSubmitBtn', false);
                        return;
                    }
                    doUpdateProfile(newName, newPhone, newAvatar, accessToken);
                }).catch(function() {
                    doUpdateProfile(newName, newPhone, newAvatar, accessToken);
                });
            } else {
                doUpdateProfile(newName, newPhone, newAvatar, accessToken);
            }
        }
        
        // 执行更新资料
        function doUpdateProfile(newName, newPhone, newAvatar, accessToken) {
            // 处理头像数据
            var avatarEmoji = '👤';
            var avatarUrl = null;
            
            if (newAvatar.type === 'image') {
                avatarUrl = newAvatar.url;
            } else {
                avatarEmoji = newAvatar.avatar;
            }
            
            // 调用 Supabase Auth API 更新用户信息
            fetch(SUPABASE_URL + '/auth/v1/user', {
                method: 'PUT',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        full_name: newName,
                        avatar: avatarEmoji,
                        avatar_url: avatarUrl,
                        phone: newPhone
                    }
                })
            })
            .then(function(response) {
                return response.json().then(function(data) {
                    return { ok: response.ok, data: data };
                });
            })
            .then(function(result) {
                if (!result.ok) {
                    var errorMsg = result.data.error_description || result.data.msg || result.data.message || '更新失败';
                    if (errorMsg.includes('JWT') || errorMsg.includes('token') || errorMsg.includes('expired')) {
                        showMessage('登录已过期，请重新登录', 'error');
                        handleLogout();
                    } else if (errorMsg.includes('rate limit') || errorMsg.includes('Too many')) {
                        showMessage('操作过于频繁，请稍后再试', 'warning');
                    } else {
                        showMessage('更新失败: ' + errorMsg, 'error');
                    }
                    setButtonLoading('settingsSubmitBtn', false);
                    return;
                }
                
                // 更新本地存储的用户信息
                currentUser = result.data;
                localStorage.setItem('nexus_user', JSON.stringify(result.data));
                
                // 同步更新 profiles 表中的昵称
                if (currentUser && currentUser.id) {
                    updateProfilesTable(currentUser.id, newName, newPhone, avatarUrl);
                }
                
                showMessage('资料修改成功！', 'success');
                updateAuthUI(true);
                
                setTimeout(function() {
                    closeAuthModal('settings');
                    setButtonLoading('settingsSubmitBtn', false);
                }, 1000);
            })
            .catch(function(error) {
                console.error('更新资料错误:', error);
                showMessage('网络连接失败，请检查网络后重试', 'error');
                setButtonLoading('settingsSubmitBtn', false);
            });
        }
        
        // 更新 profiles 表（头像通过视图自动关联，无需更新 messages）
        function updateProfilesTable(userId, fullName, phone, avatarUrl) {
            var accessToken = localStorage.getItem('nexus_access_token');
            
            var updateData = {
                full_name: fullName,
                phone_number: phone || null,
                avatar_url: avatarUrl || null  // 始终更新头像字段
            };
            
            console.log('更新用户资料:', updateData);
            
            // 更新 profiles 表
            fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + userId, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(updateData)
            }).then(function(response) {
                if (response.ok) {
                    console.log('profiles表更新成功');
                } else {
                    response.text().then(function(text) {
                        console.error('更新profiles表失败:', text);
                    });
                }
            }).catch(function(error) {
                console.error('更新profiles表失败:', error);
            });
        }
        
        // 登录注册设置弹窗只能通过点击X关闭，不需要点击遮罩关闭

        /* ================= 1. 粒子背景逻辑 ================= */
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight;
        
        let particles = [];
        const mouse = { x: null, y: null, radius: 250 };

        window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
        
        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() * 1.5 - 0.75);
                this.speedY = (Math.random() * 1.5 - 0.75);
            }
            update() {
                this.x += this.speedX; this.y += this.speedY;
                if(this.x > canvas.width || this.x < 0) this.speedX *= -1;
                if(this.y > canvas.height || this.y < 0) this.speedY *= -1;
                
                const dx = mouse.x - this.x; const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                if(distance < mouse.radius) {
                    if (distance < 100) {
                         this.x -= dx/10; this.y -= dy/10;
                    }
                }
            }
            draw() {
                ctx.fillStyle = '#00f3ff'; ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
            }
        }

        function initParticles() {
            particles = []; 
            let numberOfParticles = (canvas.width * canvas.height) / 8000; 
            for(let i=0; i<numberOfParticles; i++) particles.push(new Particle());
        }

        function animateParticles() {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            connectParticles(); 
            requestAnimationFrame(animateParticles);
        }

        function connectParticles() {
            for(let a=0; a<particles.length; a++){
                for(let b=a; b<particles.length; b++){
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if(dist < 120) {
                        ctx.strokeStyle = `rgba(0, 243, 255, ${1 - dist/120})`;
                        ctx.lineWidth = 0.8; ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y); ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }
        initParticles(); animateParticles();
        window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; initParticles(); });

        /* ================= 3D 卡片悬浮特效 ================= */
        const cards = document.querySelectorAll('.holo-card');
        
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (centerY - y) / 10;
                const rotateY = (x - centerX) / 10;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
                card.style.borderColor = 'var(--primary)';
                card.style.zIndex = '10';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
                card.style.borderColor = 'var(--glass-border)';
                card.style.zIndex = '1';
            });
        });


        /* ================= 2. 音乐播放器 (纯手动模式) ================= */
        
        const playlist = [
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/-%E5%AD%A4%E7%8B%AC.mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/(%E9%BB%84%E6%98%8F).mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/%E6%89%93%E5%BC%80(%E3%81%A8).mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/%E6%BC%82%E6%B3%8A.mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/%E5%A4%B1%E6%84%8F-%E9%AB%98%E6%A2%A8%E5%BA%B7%E6%B2%BB.mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/%E5%86%8D%E4%B8%8D%E6%96%A9_%E7%99%BD(%E5%86%8D%E4%B8%8D%E6%96%A9%EF%BC%88%E3%82%82%E3%82%82%E3%81%A1%20%E3%82%B6%E3%83%96%E3%82%B6%EF%BC%89%20%EF%BC%86%20%E7%99%BD_%E3%83%8F%E3%82%AF_).mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/(%E5%8D%A1%E5%8D%A1%E8%A5%BF%E4%B8%8E%E5%B8%A6%E5%9C%9F).mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/563%E6%8F%92%E6%9B%B2.mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/%E7%AC%AC%E4%B8%83%E7%8F%AD.mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/%E8%90%BD%E8%91%89%E8%88%B9-%E9%AB%98%E6%A2%A8%E5%BA%B7%E6%B2%BB.mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/-%E8%96%84%E6%9A%AE.mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/-%20%E7%BA%A2%E8%8E%B2.mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/-%E5%A4%B1%E6%84%8F%20%E5%8A%A8%E6%BC%AB%E5%8E%9F%E5%A3%B0.mp3',
            // 'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/%E7%96%BE%E9%A3%8E%E4%BC%A0%20Ost2%20%E5%BD%A9%E9%9C%9E.mp3',
            'https://pub-24a821a3b60e4e7c9e58082c112dec4f.r2.dev/%E8%A4%AA%E9%BB%91%E7%B4%A0%20-%20%E6%A2%93%E6%B8%9D.mp3'
        ];
        
        let currentTrack = 0;
        const audio = document.getElementById('audioPlayer');
        const playBtn = document.getElementById('playBtn');
        const trackDisplay = document.getElementById('trackNameDisplay');
        const visualizer = document.getElementById('visualizer');
        let isPlaying = false; 

        function getFileName(url) {
            try { return decodeURIComponent(url.split('/').pop().replace('.mp3', '')); } catch(e){ return "Unknown"; }
        }

        function loadTrack(index) {
            currentTrack = (index + playlist.length) % playlist.length;
            audio.src = playlist[currentTrack];
            trackDisplay.textContent = getFileName(playlist[currentTrack]);
            
            // 只有当 isPlaying 为 true 时才自动播放（即用户已经开始播放了，切歌时才自动）
            if(isPlaying) {
                audio.play().catch(e => {
                    console.warn("Auto-play blocked or waiting for interaction");
                    isPlaying = false;
                    updateUI(false);
                });
            }
        }

        function togglePlay() {
            if(!audio.src) {
                loadTrack(currentTrack);
            }
            
            if(audio.paused) {
                audio.play().then(() => {
                    isPlaying = true;
                    updateUI(true);
                }).catch(err => {
                    console.error("Play failed:", err);
                });
            } else {
                audio.pause();
                isPlaying = false;
                updateUI(false);
            }
        }

        function updateUI(playing) {
            if(playing) {
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                visualizer.classList.remove('music-paused');
            } else {
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
                visualizer.classList.add('music-paused');
            }
        }

        function nextTrack() { 
            isPlaying = true; 
            loadTrack(currentTrack + 1); 
            updateUI(true); 
        }
        
        function prevTrack() { 
            isPlaying = true;
            loadTrack(currentTrack - 1); 
            updateUI(true); 
        }

        audio.addEventListener('ended', nextTrack);
        
        // 初始加载第一首歌，但不播放
        currentTrack = Math.floor(Math.random() * playlist.length);
        loadTrack(currentTrack);
        isPlaying = false;
        updateUI(false);

        /* ================= 3. 弹窗控制 ================= */
        function closeAllModals() {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('visible'));
            document.body.classList.remove('modal-open');
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }

        // 跳转会员专区
        function goToVip() {
            window.location.href = 'vip.html';
        }

        // 品牌网站弹窗
        function openWebsiteModal() {
            document.getElementById('websiteModal').classList.add('show');
            document.body.classList.add('modal-open');
        }
        function closeWebsiteModal() {
            document.getElementById('websiteModal').classList.remove('show');
            document.body.classList.remove('modal-open');
        }
        // 点击遮罩关闭
        document.getElementById('websiteModal').addEventListener('click', function(e) {
            if (e.target === this) closeWebsiteModal();
        });

        function openModal(id) {
            closeAllModals();
            setTimeout(() => {
                const m = document.getElementById(id + '-modal');
                if(m) { 
                    m.classList.add('visible'); 
                    document.body.classList.add('modal-open'); 
                }
            }, 10);
        }

        function closeModal(id) {
            const m = document.getElementById(id + '-modal');
            if(m) { 
                m.classList.remove('visible'); 
                if (document.querySelectorAll('.modal-overlay.visible').length === 0) {
                    document.body.classList.remove('modal-open');
                }
            }
        }

        document.querySelectorAll('.modal-overlay').forEach(ov => {
            ov.addEventListener('click', (e) => { 
                // 登录、注册、设置弹窗只能通过X按钮关闭
                var modalId = ov.id;
                if (modalId === 'login-modal' || modalId === 'register-modal' || modalId === 'settings-modal') {
                    return; // 不处理点击遮罩关闭
                }
                if(e.target === ov) {
                    ov.classList.remove('visible'); 
                    document.body.classList.remove('modal-open');
                }
            });
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === "Escape") {
                // ESC键也不关闭登录、注册、设置弹窗
                var loginModal = document.getElementById('login-modal');
                var registerModal = document.getElementById('register-modal');
                var settingsModal = document.getElementById('settings-modal');
                
                if ((loginModal && loginModal.classList.contains('visible')) ||
                    (registerModal && registerModal.classList.contains('visible')) ||
                    (settingsModal && settingsModal.classList.contains('visible'))) {
                    return; // 不处理ESC关闭
                }
                closeAllModals();
            }
        });

        /* ================= 通讯终端（留言系统） ================= */
        
        // 检查是否是站长
        function isAdmin() {
            return currentUser && (currentUser.id === ADMIN_UUID || currentUser.email === ADMIN_EMAIL);
        }
        
        // 切换频道
        var isLoadingChannel = false; // 防止重复加载
        
        function switchChannel(channel) {
            // 防止重复点击
            if (isLoadingChannel || currentChannel === channel) {
                return;
            }
            
            isLoadingChannel = true;
            currentChannel = channel;
            
            // 立即更新UI状态
            document.querySelectorAll('.comm-channel').forEach(function(btn) {
                btn.classList.remove('active');
                if (btn.dataset.channel === channel) {
                    btn.classList.add('active');
                }
            });
            
            // 显示加载中
            document.getElementById('messageList').innerHTML = '<div class="loading-messages"><i class="fas fa-spinner fa-spin"></i><span>正在切换频道...</span></div>';
            document.getElementById('loadMoreBtn').style.display = 'none';
            
            // 更新标题和描述
            var titleEl = document.getElementById('channelTitle');
            var descEl = document.getElementById('channelDesc');
            var inputArea = document.getElementById('messageInputArea');
            var tagSelector = document.getElementById('tagSelector');
            
            // 重置图片预览
            removeImage();
            
            if (channel === 'public') {
                titleEl.textContent = '公共频段 · PUBLIC CHANNEL';
                descEl.innerHTML = '<i class="fas fa-info-circle"></i> 因各平台限制严格、频繁封号，且私信无法留敏感内容。考虑到很多朋友没有TG/WhatsApp，站长特开放此留言区。有需求尽管留言，站长会通过注册手机联系你。';
                inputArea.style.display = 'block';
                tagSelector.style.display = 'flex';
                document.getElementById('loginHint').style.display = 'none';
                
                // 延迟加载，确保UI更新完成
                setTimeout(function() {
                    loadMessages();
                    isLoadingChannel = false;
                }, 100);
                
            } else if (channel === 'private') {
                titleEl.textContent = '加密信箱 · SECURE CHANNEL';
                if (isAdmin()) {
                    descEl.innerHTML = '<i class="fas fa-lock"></i> 私密通信频道，点击用户查看对话并回复。';
                } else {
                    descEl.innerHTML = '<i class="fas fa-lock"></i> 私密通信频道，只有你和站长可见。适合咨询敏感业务或私密问题。';
                }
                tagSelector.style.display = 'none';
                
                if (!currentUser) {
                    inputArea.style.display = 'none';
                    document.getElementById('messageList').innerHTML = '<div class="empty-messages"><i class="fas fa-lock"></i><p>请先登录后使用加密信箱</p></div>';
                    document.getElementById('loginHint').style.display = 'block';
                    isLoadingChannel = false;
                } else {
                    inputArea.style.display = 'block';
                    document.getElementById('loginHint').style.display = 'none';
                    setTimeout(function() {
                        loadDirectMessages();
                        isLoadingChannel = false;
                    }, 100);
                }
                
            } else if (channel === 'notice') {
                titleEl.textContent = '站务公告 · ANNOUNCEMENT';
                descEl.innerHTML = '<i class="fas fa-bullhorn"></i> 站长发布的重要通知和公告。';
                inputArea.style.display = isAdmin() ? 'block' : 'none';
                tagSelector.style.display = 'none';
                document.getElementById('loginHint').style.display = 'none';
                showMessage('公告功能开发中，敬请期待', 'info');
                document.getElementById('messageList').innerHTML = '<div class="empty-messages"><i class="fas fa-bullhorn"></i><p>暂无公告</p></div>';
                isLoadingChannel = false;
            }
        }
        
        // 选择标签
        function selectTag(btn) {
            var tag = btn.dataset.tag;
            
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                selectedTag = null;
            } else {
                document.querySelectorAll('.tag-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                selectedTag = tag;
            }
        }
        
        // 字数统计
        document.getElementById('messageInput').addEventListener('input', function() {
            document.getElementById('charCount').textContent = this.value.length;
        });
        
        // 加载留言
        var loadMessagesRequestId = 0; // 请求ID，用于取消旧请求
        
        function loadMessages(append) {
            // 检查是否还在公共频道
            if (currentChannel !== 'public') {
                return;
            }
            
            var thisRequestId = ++loadMessagesRequestId;
            
            if (!append) {
                currentPage = 0;
                messagesData = [];
                document.getElementById('messageList').innerHTML = '<div class="loading-messages"><i class="fas fa-spinner fa-spin"></i><span>正在接收信号...</span></div>';
            }
            
            var offset = currentPage * pageSize;
            
            // 从视图读取，自动关联 profiles 表获取最新头像
            var queryUrl = SUPABASE_URL + '/rest/v1/messages_with_profile?parent_id=is.null&order=is_pinned.desc,created_at.desc&limit=' + pageSize + '&offset=' + offset;
            
            fetchWithAuth(queryUrl, { method: 'GET' })
            .then(function(response) {
                // 检查请求是否已过期
                if (thisRequestId !== loadMessagesRequestId || currentChannel !== 'public') {
                    throw new Error('请求已取消');
                }
                if (!response.ok) {
                    throw new Error('加载失败: ' + response.status);
                }
                return response.json();
            })
            .then(function(messages) {
                if (thisRequestId !== loadMessagesRequestId || currentChannel !== 'public') {
                    throw new Error('请求已取消');
                }
                
                if (!messages || !Array.isArray(messages)) {
                    messages = [];
                }
                
                if (!append) {
                    messagesData = messages;
                } else {
                    messagesData = messagesData.concat(messages);
                }
                
                hasMoreMessages = messages.length === pageSize;
                
                // 获取所有回复（也从视图读取以获取最新头像）
                if (messages.length > 0) {
                    var parentIds = messages.map(function(m) { return m.id; }).join(',');
                    return fetchWithAuth(SUPABASE_URL + '/rest/v1/messages_with_profile?parent_id=in.(' + parentIds + ')&order=created_at.asc', {
                        method: 'GET'
                    }).then(function(res) { return res.json(); });
                }
                return [];
            })
            .then(function(replies) {
                if (thisRequestId !== loadMessagesRequestId || currentChannel !== 'public') {
                    return; // 静默忽略
                }
                renderMessages(messagesData, replies || [], append);
            })
            .catch(function(error) {
                if (error.message === '请求已取消') {
                    return; // 静默忽略取消的请求
                }
                console.error('加载留言失败:', error);
                if (currentChannel === 'public') {
                    document.getElementById('messageList').innerHTML = '<div class="empty-messages"><i class="fas fa-exclamation-triangle"></i><p>信号中断，请刷新重试</p></div>';
                }
            });
        }
        
        // 渲染留言
        function renderMessages(messages, replies, append) {
            var container = document.getElementById('messageList');
            var loadMoreBtn = document.getElementById('loadMoreBtn');
            
            if (!append) {
                container.innerHTML = '';
            }
            
            if (messages.length === 0 && !append) {
                container.innerHTML = '<div class="empty-messages"><i class="fas fa-satellite-dish"></i><p>暂无情报，成为第一个发言的人吧</p></div>';
                loadMoreBtn.style.display = 'none';
                return;
            }
            
            // 按 parent_id 分组回复
            var repliesMap = {};
            if (replies && replies.length > 0) {
                replies.forEach(function(reply) {
                    if (!repliesMap[reply.parent_id]) {
                        repliesMap[reply.parent_id] = [];
                    }
                    repliesMap[reply.parent_id].push(reply);
                });
            }
            
            messages.forEach(function(msg) {
                var msgReplies = repliesMap[msg.id] || [];
                var html = createMessageHTML(msg, msgReplies);
                container.insertAdjacentHTML('beforeend', html);
            });
            
            loadMoreBtn.style.display = hasMoreMessages ? 'block' : 'none';
            
            // 更新分页信息
            var paginationInfo = document.getElementById('paginationInfo');
            var totalShown = messagesData.length;
            if (totalShown > 0) {
                paginationInfo.innerHTML = '已加载 ' + totalShown + ' 条留言' + (hasMoreMessages ? '' : ' · 已全部加载');
            } else {
                paginationInfo.innerHTML = '';
            }
        }
        
        // 创建单条消息HTML
        // 生成头像HTML（只用avatar_url，从profiles表获取）
        function renderAvatar(avatarUrl, isAdmin, size) {
            size = size || 'normal';
            var sizeStyle = size === 'small' ? ' style="width:32px;height:32px;font-size:1em;"' : '';
            var adminClass = isAdmin ? ' admin' : '';
            
            if (avatarUrl) {
                return '<div class="message-avatar' + adminClass + '"' + sizeStyle + '><img src="' + avatarUrl + '?t=' + Date.now() + '" alt="头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>';
            } else {
                return '<div class="message-avatar' + adminClass + '"' + sizeStyle + '>👤</div>';
            }
        }
        
        function createMessageHTML(msg, replies) {
            var isAdminMsg = msg.is_admin;
            var isOwn = currentUser && currentUser.id === msg.user_id;
            var isPending = msg.status === 'pending';
            var isPinned = msg.is_pinned;
            
            var cardClass = 'message-card';
            if (isAdminMsg) cardClass += ' admin-message';
            if (isPending) cardClass += ' pending';
            if (isPinned) cardClass += ' pinned';
            
            var timeAgo = getTimeAgo(msg.created_at);
            
            var html = '<div class="' + cardClass + '" data-id="' + msg.id + '">';
            html += '<div class="message-header">';
            html += '<div class="message-user">';
            html += renderAvatar(msg.avatar_url, isAdminMsg, 'normal');
            html += '<div class="message-info">';
            html += '<div class="message-name' + (isAdminMsg ? ' admin' : '') + '">' + escapeHtml(msg.user_name);
            if (isAdminMsg) html += '<span class="admin-badge">站长</span>';
            if (isPinned) html += '<span class="pinned-badge"><i class="fas fa-thumbtack"></i> 置顶</span>';
            html += '</div>';
            html += '<div class="message-meta">';
            html += '<span>' + timeAgo + '</span>';
            if (msg.tag) html += '<span class="message-tag">' + escapeHtml(msg.tag) + '</span>';
            if (isPending) html += '<span class="message-status"><i class="fas fa-clock"></i> 待审核</span>';
            html += '</div></div></div>';
            
            // 操作按钮
            html += '<div class="message-actions">';
            html += '<button onclick="replyTo(\'' + msg.id + '\', \'' + escapeHtml(msg.user_name) + '\')"><i class="fas fa-comment"></i> 回复</button>';
            if (isOwn || isAdmin()) {
                html += '<button class="delete" onclick="deleteMessage(\'' + msg.id + '\')"><i class="fas fa-trash"></i> 删除</button>';
            }
            if (isAdmin() && !isPinned) {
                html += '<button onclick="pinMessage(\'' + msg.id + '\')"><i class="fas fa-thumbtack"></i> 置顶</button>';
            }
            if (isAdmin() && isPending) {
                html += '<button onclick="approveMessage(\'' + msg.id + '\')"><i class="fas fa-check"></i> 通过</button>';
            }
            html += '</div></div>';
            
            // 内容
            html += '<div class="message-content">';
            if (msg.content) {
                html += escapeHtml(msg.content);
            }
            // 显示图片
            if (msg.image_url) {
                html += '<img class="message-image" src="' + msg.image_url + '" alt="图片" onclick="openLightbox(\'' + msg.image_url + '\')">';
            }
            html += '</div>';
            
            // 回复列表
            if (replies && replies.length > 0) {
                html += '<div class="message-replies">';
                replies.forEach(function(reply) {
                    var replyIsAdmin = reply.is_admin;
                    var replyIsOwn = currentUser && currentUser.id === reply.user_id;
                    var replyTimeAgo = getTimeAgo(reply.created_at);
                    
                    html += '<div class="reply-card' + (replyIsAdmin ? ' admin-message' : '') + '" data-id="' + reply.id + '">';
                    html += '<div class="message-header">';
                    html += '<div class="message-user">';
                    html += renderAvatar(reply.avatar_url, replyIsAdmin, 'small');
                    html += '<div class="message-info">';
                    html += '<div class="message-name' + (replyIsAdmin ? ' admin' : '') + '">' + escapeHtml(reply.user_name);
                    if (replyIsAdmin) html += '<span class="admin-badge">站长</span>';
                    html += '</div>';
                    html += '<div class="message-meta"><span>' + replyTimeAgo + '</span>';
                    if (reply.status === 'pending') html += '<span class="message-status"><i class="fas fa-clock"></i> 待审核</span>';
                    html += '</div></div></div>';
                    html += '<div class="message-actions">';
                    html += '<button onclick="replyTo(\'' + reply.parent_id + '\', \'' + escapeHtml(reply.user_name) + '\')"><i class="fas fa-comment"></i> 回复</button>';
                    if (replyIsOwn || isAdmin()) {
                        html += '<button class="delete" onclick="deleteMessage(\'' + reply.id + '\')"><i class="fas fa-trash"></i> 删除</button>';
                    }
                    if (isAdmin() && reply.status === 'pending') {
                        html += '<button onclick="approveMessage(\'' + reply.id + '\')"><i class="fas fa-check"></i> 通过</button>';
                    }
                    html += '</div></div>';
                    html += '<div class="message-content"><span class="reply-to-hint">回复 @' + escapeHtml(msg.user_name) + '：</span>' + escapeHtml(reply.content);
                    if (reply.image_url) {
                        html += '<img class="message-image" src="' + reply.image_url + '" alt="图片" onclick="openLightbox(\'' + reply.image_url + '\')">';
                    }
                    html += '</div>';
                    html += '</div>';
                });
                html += '</div>';
            }
            
            html += '</div>';
            return html;
        }
        
        // 时间格式化
        function getTimeAgo(dateStr) {
            var date = new Date(dateStr);
            var now = new Date();
            var diff = Math.floor((now - date) / 1000);
            
            if (diff < 60) return '刚刚';
            if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
            if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
            if (diff < 604800) return Math.floor(diff / 86400) + '天前';
            
            return date.toLocaleDateString('zh-CN');
        }
        
        // HTML转义
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
        
        // 回复
        function replyTo(id, name) {
            if (!currentUser) {
                showMessage('请先登录后再回复', 'warning');
                openAuthModal('login');
                return;
            }
            
            replyToId = id;
            replyToName = name;
            
            document.getElementById('replyBar').style.display = 'flex';
            document.getElementById('replyToName').textContent = name;
            document.getElementById('messageInput').focus();
            document.getElementById('messageInput').placeholder = '回复 ' + name + '...';
        }
        
        // 取消回复
        function cancelReply() {
            replyToId = null;
            replyToName = '';
            document.getElementById('replyBar').style.display = 'none';
            document.getElementById('messageInput').placeholder = '输入情报...';
        }
        
        // 发布留言
        function submitMessage() {
            var content = document.getElementById('messageInput').value.trim();
            
            if (!currentUser) {
                showMessage('请先登录后再发布', 'warning');
                openAuthModal('login');
                return;
            }
            
            // 允许只发图片或只发文字
            if (!content && !pendingMessageImage) {
                showMessage('请输入内容或上传图片', 'warning');
                return;
            }
            
            if (content.length > 500) {
                showMessage('内容不能超过500字', 'warning');
                return;
            }
            
            var accessToken = localStorage.getItem('nexus_access_token');
            var isAdminUser = isAdmin();
            
            // 只存储必要字段，头像从 profiles 表关联获取
            var userName = '用户';
            if (currentUser.user_metadata && currentUser.user_metadata.full_name) {
                userName = currentUser.user_metadata.full_name;
            }
            
            var messageData = {
                user_id: currentUser.id,
                user_name: userName,
                content: content,
                image_url: pendingMessageImage || null,
                parent_id: replyToId || null,
                tag: replyToId ? null : selectedTag,
                status: 'approved',
                is_admin: isAdminUser
            };
            
            // 调试日志
            console.log('发送消息 - pendingMessageImage:', pendingMessageImage);
            console.log('发送消息 - messageData:', messageData);
            
            var btn = document.querySelector('.execute-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';
            
            fetch(SUPABASE_URL + '/rest/v1/messages', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(messageData)
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('发送失败');
                }
                return response.json();
            })
            .then(function(data) {
                document.getElementById('messageInput').value = '';
                document.getElementById('charCount').textContent = '0';
                cancelReply();
                removeImage(); // 清除图片
                
                // 清除选中的标签
                document.querySelectorAll('.tag-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                selectedTag = null;
                
                if (isAdminUser) {
                    showMessage('发送成功', 'success');
                } else {
                    showMessage('发送成功', 'success');
                }
                
                loadMessages();
            })
            .catch(function(error) {
                console.error('发送失败:', error);
                showMessage('发送失败，请重试', 'error');
            })
            .finally(function() {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i><span>执行 EXECUTE</span>';
            });
        }
        
        // 删除留言
        function deleteMessage(id) {
            if (!confirm('确定要删除这条留言吗？')) {
                return;
            }
            
            var accessToken = localStorage.getItem('nexus_access_token');
            
            fetch(SUPABASE_URL + '/rest/v1/messages?id=eq.' + id, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken
                }
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('删除失败');
                }
                showMessage('删除成功', 'success');
                loadMessages();
            })
            .catch(function(error) {
                console.error('删除失败:', error);
                showMessage('删除失败', 'error');
            });
        }
        
        // 置顶留言（站长功能）
        function pinMessage(id) {
            if (!isAdmin()) return;
            
            var accessToken = localStorage.getItem('nexus_access_token');
            
            fetch(SUPABASE_URL + '/rest/v1/messages?id=eq.' + id, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_pinned: true })
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('操作失败');
                }
                showMessage('已置顶', 'success');
                loadMessages();
            })
            .catch(function(error) {
                console.error('置顶失败:', error);
                showMessage('操作失败', 'error');
            });
        }
        
        // 审核通过（站长功能）
        function approveMessage(id) {
            if (!isAdmin()) return;
            
            var accessToken = localStorage.getItem('nexus_access_token');
            
            fetch(SUPABASE_URL + '/rest/v1/messages?id=eq.' + id, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'approved' })
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('操作失败');
                }
                showMessage('已通过审核', 'success');
                loadMessages();
            })
            .catch(function(error) {
                console.error('审核失败:', error);
                showMessage('操作失败', 'error');
            });
        }
        
        // 加载更多
        function loadMoreMessages() {
            currentPage++;
            loadMessages(true);
        }
        
        /* ================= 加密信箱（私信功能） ================= */
        
        var dmData = [];
        var dmPage = 0;
        var hasMoreDM = true;
        var dmUserList = []; // 站长用：用户列表
        var currentDMUserId = null; // 当前对话的用户ID
        var currentDMUserName = ''; // 当前对话的用户名
        
        // 加载私信
        function loadDirectMessages(append) {
            if (!currentUser) return;
            
            // 检查是否还在私信频道
            if (currentChannel !== 'private') {
                return;
            }
            
            if (!append) {
                dmPage = 0;
                dmData = [];
                document.getElementById('messageList').innerHTML = '<div class="loading-messages"><i class="fas fa-spinner fa-spin"></i><span>正在解密通信...</span></div>';
            }
            
            var accessToken = localStorage.getItem('nexus_access_token');
            
            if (isAdmin()) {
                // 站长：显示用户列表
                loadDMUserList();
            } else {
                // 普通用户：显示与站长的对话
                loadDMConversation(ADMIN_UUID, '站长');
            }
        }
        
        // 站长端：加载私信用户列表
        function loadDMUserList() {
            var accessToken = localStorage.getItem('nexus_access_token');
            
            // 查询所有发给站长的私信
            fetch(SUPABASE_URL + '/rest/v1/direct_messages?receiver_id=eq.' + ADMIN_UUID + '&order=created_at.desc', {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken
                }
            })
            .then(function(response) { return response.json(); })
            .then(function(messages) {
                // 按发送者分组
                var userMap = {};
                var unreadCount = 0;
                var userIds = [];
                
                messages.forEach(function(msg) {
                    if (!userMap[msg.sender_id]) {
                        userMap[msg.sender_id] = {
                            user_id: msg.sender_id,
                            user_name: msg.sender_name,
                            avatar_url: null,
                            last_message: msg.content,
                            last_time: msg.created_at,
                            unread: msg.is_read ? 0 : 1
                        };
                        userIds.push(msg.sender_id);
                    } else if (!msg.is_read) {
                        userMap[msg.sender_id].unread++;
                    }
                    if (!msg.is_read) unreadCount++;
                });
                
                // 批量查询用户头像
                if (userIds.length > 0) {
                    fetch(SUPABASE_URL + '/rest/v1/profiles?id=in.(' + userIds.join(',') + ')&select=id,avatar_url', {
                        method: 'GET',
                        headers: { 'apikey': SUPABASE_KEY }
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(profiles) {
                        profiles.forEach(function(p) {
                            if (userMap[p.id]) {
                                userMap[p.id].avatar_url = p.avatar_url;
                            }
                        });
                        dmUserList = Object.values(userMap);
                        renderDMUserList(dmUserList);
                    });
                } else {
                    dmUserList = [];
                    renderDMUserList(dmUserList);
                }
                
                updatePrivateBadge(unreadCount);
            })
            .catch(function(error) {
                console.error('加载用户列表失败:', error);
            });
        }
        
        // 渲染用户列表（站长视角）
        function renderDMUserList(users) {
            var container = document.getElementById('messageList');
            
            if (users.length === 0) {
                container.innerHTML = '<div class="empty-messages"><i class="fas fa-inbox"></i><p>暂无私信</p></div>';
                return;
            }
            
            var html = '<div class="dm-user-list">';
            users.forEach(function(user) {
                var timeStr = getTimeAgo(user.last_time);
                var avatarHtml = user.avatar_url 
                    ? '<img src="' + user.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                    : '👤';
                html += '<div class="dm-user-item" onclick="openDMConversation(\'' + user.user_id + '\', \'' + escapeHtml(user.user_name) + '\')">';
                html += '<div class="dm-user-avatar">' + avatarHtml + '</div>';
                html += '<div class="dm-user-info">';
                html += '<div class="dm-user-name">' + escapeHtml(user.user_name);
                if (user.unread > 0) {
                    html += '<span class="dm-unread-badge">' + user.unread + '</span>';
                }
                html += '</div>';
                html += '<div class="dm-user-preview">' + escapeHtml(user.last_message.substring(0, 30)) + (user.last_message.length > 30 ? '...' : '') + '</div>';
                html += '</div>';
                html += '<div class="dm-user-time">' + timeStr + '</div>';
                html += '</div>';
            });
            html += '</div>';
            
            container.innerHTML = html;
            document.getElementById('loadMoreBtn').style.display = 'none';
        }
        
        // 打开与某用户的对话（站长用）
        function openDMConversation(userId, userName) {
            currentDMUserId = userId;
            currentDMUserName = userName;
            loadDMConversation(userId, userName);
            
            // 显示返回按钮和操作按钮（站长视角）
            var headerHtml = '<i class="fas fa-arrow-left" style="cursor:pointer;margin-right:10px;" onclick="backToDMList()"></i> 与 <strong>' + escapeHtml(userName) + '</strong> 的对话';
            
            if (isAdmin()) {
                headerHtml += '<button onclick="toggleUserMembership(\'' + userId + '\', \'' + escapeHtml(userName) + '\')" style="margin-left:15px;background:linear-gradient(135deg,#ffd700,#ff8c00);border:none;padding:5px 12px;border-radius:5px;color:#000;font-weight:bold;cursor:pointer;font-size:0.8em;"><i class="fas fa-crown"></i> 开通会员</button>';
            }
            
            document.getElementById('channelDesc').innerHTML = headerHtml;
        }
        
        // 返回用户列表
        function backToDMList() {
            currentDMUserId = null;
            currentDMUserName = '';
            document.getElementById('channelDesc').innerHTML = '<i class="fas fa-lock"></i> 私密通信频道，点击用户查看对话并回复。';
            loadDMUserList();
        }
        
        // 站长开通/取消用户会员
        function toggleUserMembership(userId, userName) {
            if (!isAdmin()) {
                showMessage('无权限操作', 'error');
                return;
            }
            
            var accessToken = localStorage.getItem('nexus_access_token');
            
            // 先查询用户当前会员状态
            fetch(SUPABASE_URL + '/rest/v1/user_memberships?user_id=eq.' + userId, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken
                }
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var isPremium = data && data.length > 0 && data[0].membership_type === 'premium';
                var action = isPremium ? '取消' : '开通';
                
                if (!confirm(action + ' ' + userName + ' 的永久会员？')) {
                    return Promise.reject('cancelled');
                }
                
                if (isPremium) {
                    // 取消会员：更新为 free
                    return fetch(SUPABASE_URL + '/rest/v1/user_memberships?user_id=eq.' + userId, {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + accessToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            membership_type: 'free',
                            activated_at: null,
                            activated_by: null
                        })
                    }).then(function() { return '已取消 ' + userName + ' 的会员'; });
                } else {
                    // 开通会员：upsert
                    return fetch(SUPABASE_URL + '/rest/v1/user_memberships', {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + accessToken,
                            'Content-Type': 'application/json',
                            'Prefer': 'resolution=merge-duplicates'
                        },
                        body: JSON.stringify({
                            user_id: userId,
                            membership_type: 'premium',
                            activated_at: new Date().toISOString(),
                            activated_by: currentUser.id
                        })
                    }).then(function() { return '已为 ' + userName + ' 开通永久会员'; });
                }
            })
            .then(function(msg) {
                if (msg) showMessage(msg, 'success');
            })
            .catch(function(err) {
                if (err !== 'cancelled') {
                    console.error('操作失败:', err);
                    showMessage('操作失败', 'error');
                }
            });
        }
        
        // 加载与某用户的对话
        function loadDMConversation(targetUserId, targetUserName) {
            var accessToken = localStorage.getItem('nexus_access_token');
            var myId = currentUser.id;
            
            // 查询双方的消息
            var queryUrl = SUPABASE_URL + '/rest/v1/direct_messages?or=(and(sender_id.eq.' + myId + ',receiver_id.eq.' + targetUserId + '),and(sender_id.eq.' + targetUserId + ',receiver_id.eq.' + myId + '))&order=created_at.asc';
            
            fetch(queryUrl, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken
                }
            })
            .then(function(response) { return response.json(); })
            .then(function(messages) {
                // 查询对方的头像
                fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + targetUserId + '&select=avatar_url', {
                    method: 'GET',
                    headers: { 'apikey': SUPABASE_KEY }
                })
                .then(function(res) { return res.json(); })
                .then(function(profiles) {
                    var targetAvatarUrl = profiles.length > 0 ? profiles[0].avatar_url : null;
                    renderDMConversation(messages, targetUserName, targetAvatarUrl);
                })
                .catch(function() {
                    renderDMConversation(messages, targetUserName, null);
                });
                
                markDMAsRead(targetUserId);
            })
            .catch(function(error) {
                console.error('加载对话失败:', error);
            });
        }
        
        // 渲染对话
        function renderDMConversation(messages, targetUserName, targetAvatarUrl) {
            var container = document.getElementById('messageList');
            
            if (messages.length === 0) {
                container.innerHTML = '<div class="empty-messages"><i class="fas fa-envelope-open"></i><p>暂无消息，发送第一条吧</p></div>';
                return;
            }
            
            var html = '<div class="dm-chat-container">';
            messages.forEach(function(msg) {
                var isMine = msg.sender_id === currentUser.id;
                var timeStr = getTimeAgo(msg.created_at);
                var senderName = isMine ? '我' : (msg.is_admin_sent ? '<span class="admin-name">站长</span>' : escapeHtml(msg.sender_name));
                
                // 获取头像
                var avatarHtml = '';
                if (isMine) {
                    // 自己的头像
                    var myAvatarUrl = currentUser.user_metadata ? currentUser.user_metadata.avatar_url : null;
                    if (myAvatarUrl) {
                        avatarHtml = '<img src="' + myAvatarUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
                    } else {
                        avatarHtml = '👤';
                    }
                } else {
                    // 对方的头像
                    if (targetAvatarUrl) {
                        avatarHtml = '<img src="' + targetAvatarUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
                    } else {
                        avatarHtml = '👤';
                    }
                }
                
                html += '<div class="dm-bubble ' + (isMine ? 'dm-mine' : 'dm-other') + '">';
                if (!isMine) {
                    html += '<div class="dm-avatar' + (msg.is_admin_sent ? ' admin' : '') + '">' + avatarHtml + '</div>';
                }
                html += '<div class="dm-content-wrap">';
                html += '<div class="dm-sender">' + senderName + ' <span class="dm-time">' + timeStr + '</span></div>';
                html += '<div class="dm-text">';
                if (msg.content) {
                    html += escapeHtml(msg.content);
                }
                if (msg.image_url) {
                    html += '<img class="message-image" src="' + msg.image_url + '" alt="图片" onclick="openLightbox(\'' + msg.image_url + '\')" style="max-width:200px;margin-top:8px;border-radius:8px;cursor:pointer;">';
                }
                html += '</div>';
                html += '</div>';
                if (isMine) {
                    html += '<div class="dm-avatar' + (isAdmin() ? ' admin' : '') + '">' + avatarHtml + '</div>';
                }
                html += '</div>';
            });
            html += '</div>';
            
            container.innerHTML = html;
            container.scrollTop = container.scrollHeight;
            document.getElementById('loadMoreBtn').style.display = 'none';
        }
        
        // 标记私信为已读
        function markDMAsRead(senderId) {
            var accessToken = localStorage.getItem('nexus_access_token');
            var myId = currentUser.id;
            
            // 标记发给我的、来自senderId的未读消息为已读
            fetch(SUPABASE_URL + '/rest/v1/direct_messages?sender_id=eq.' + senderId + '&receiver_id=eq.' + myId + '&is_read=eq.false', {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_read: true })
            })
            .then(function() {
                // 更新角标
                checkUnreadDM();
            })
            .catch(function(e) { console.error('标记已读失败', e); });
        }
        
        // 发送私信
        function sendDirectMessage() {
            var content = document.getElementById('messageInput').value.trim();
            
            if (!currentUser) {
                showMessage('请先登录', 'warning');
                openAuthModal('login');
                return;
            }
            
            // 允许只发图片或只发文字
            if (!content && !pendingMessageImage) {
                showMessage('请输入内容或上传图片', 'warning');
                return;
            }
            
            var accessToken = localStorage.getItem('nexus_access_token');
            var isAdminUser = isAdmin();
            
            var userName = '用户';
            var userAvatar = '👤';
            if (currentUser.user_metadata) {
                userName = currentUser.user_metadata.full_name || userName;
                userAvatar = currentUser.user_metadata.avatar || userAvatar;
            }
            
            // 确定接收者
            var receiverId;
            if (isAdminUser) {
                // 站长回复：发给当前选中的用户
                if (!currentDMUserId) {
                    showMessage('请先选择要回复的用户', 'warning');
                    return;
                }
                receiverId = currentDMUserId;
            } else {
                // 普通用户：发给站长
                receiverId = ADMIN_UUID;
            }
            
            var dmData = {
                sender_id: currentUser.id,
                sender_name: userName,
                receiver_id: receiverId,
                content: content,
                image_url: pendingMessageImage || null,
                is_admin_sent: isAdminUser
            };
            
            // 调试日志
            console.log('发送私信 - pendingMessageImage:', pendingMessageImage);
            console.log('发送私信 - dmData:', dmData);
            
            var btn = document.querySelector('.execute-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加密发送中...';
            
            fetch(SUPABASE_URL + '/rest/v1/direct_messages', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(dmData)
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('发送失败');
                }
                return response.json();
            })
            .then(function(data) {
                document.getElementById('messageInput').value = '';
                document.getElementById('charCount').textContent = '0';
                removeImage(); // 清除图片
                showMessage('发送成功', 'success');
                
                // 刷新对话
                if (isAdminUser && currentDMUserId) {
                    loadDMConversation(currentDMUserId, currentDMUserName);
                } else {
                    loadDMConversation(ADMIN_UUID, '站长');
                }
            })
            .catch(function(error) {
                console.error('发送失败:', error);
                showMessage('发送失败，请重试', 'error');
            })
            .finally(function() {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i><span>执行 EXECUTE</span>';
            });
        }
        
        // 更新私信未读数角标
        function updatePrivateBadge(count) {
            var badge = document.getElementById('privateBadge');
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
        
        // 检查未读私信数量
        function checkUnreadDM() {
            if (!currentUser) return;
            
            var accessToken = localStorage.getItem('nexus_access_token');
            var myId = currentUser.id;
            
            // 查询发给我的未读消息
            fetch(SUPABASE_URL + '/rest/v1/direct_messages?receiver_id=eq.' + myId + '&is_read=eq.false&select=id', {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken
                }
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                updatePrivateBadge(data.length);
            })
            .catch(function(e) { console.error('检查未读失败', e); });
        }
        
        // 修改提交函数，根据频道决定发送方式
        var originalSubmitMessage = submitMessage;
        submitMessage = function() {
            if (currentChannel === 'private') {
                sendDirectMessage();
            } else {
                originalSubmitMessage();
            }
        };
        
        // 更新输入区域显示状态
        function updateInputAreaState() {
            var inputWrapper = document.querySelector('.input-wrapper');
            var loginHint = document.getElementById('loginHint');
            
            if (currentUser) {
                inputWrapper.style.display = 'block';
                loginHint.style.display = 'none';
            } else {
                inputWrapper.style.display = 'none';
                loginHint.style.display = 'block';
            }
        }
        
        // 页面加载时初始化留言板
        var authReady = false;
        var messagesInitialized = false;
        
        function initMessagesWhenReady() {
            if (messagesInitialized) return;
            messagesInitialized = true;
            updateInputAreaState();
            loadMessages();
            checkUnreadDM();
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            // 如果没有 token，直接加载（匿名访问）
            var accessToken = localStorage.getItem('nexus_access_token');
            if (!accessToken) {
                setTimeout(initMessagesWhenReady, 300);
            } else {
                // 有 token，等待认证完成后再加载，最多等2秒
                setTimeout(function() {
                    if (!messagesInitialized) {
                        initMessagesWhenReady();
                    }
                }, 2000);
            }
        });
        
        // 监听登录状态变化，更新输入区域
        var originalUpdateAuthUI = updateAuthUI;
        updateAuthUI = function(isLoggedIn) {
            originalUpdateAuthUI(isLoggedIn);
            authReady = true;
            updateInputAreaState();
            
            // 认证完成后加载留言
            if (!messagesInitialized) {
                initMessagesWhenReady();
            } else if (currentChannel === 'public') {
                // 已初始化过，只刷新
                loadMessages();
            }
            
            // 检查未读私信
            if (isLoggedIn) {
                checkUnreadDM();
            } else {
                updatePrivateBadge(0);
            }
        };

        // ================= 图片上传功能 =================
        
        // 处理图片选择
        function handleMessageImage(event) {
            var file = event.target.files[0];
            if (file) {
                processImageFile(file);
            }
        }
        
        // 处理图片文件
        function processImageFile(file) {
            if (!currentUser) {
                showMessage('请先登录', 'warning');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                showMessage('请选择图片文件', 'error');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showMessage('图片大小不能超过5MB', 'error');
                return;
            }
            
            // 显示本地预览
            var reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('imagePreview').src = e.target.result;
                document.getElementById('imagePreviewArea').style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            // 上传图片
            uploadMessageImage(file);
        }
        
        // 上传留言图片到Storage
        function uploadMessageImage(file) {
            var accessToken = localStorage.getItem('nexus_access_token');
            if (!accessToken || !currentUser) {
                showMessage('请先登录', 'error');
                return;
            }
            
            showMessage('图片上传中...', 'info');
            
            var fileExt = file.name.split('.').pop().toLowerCase();
            var fileName = 'msg_' + currentUser.id + '_' + Date.now() + '.' + fileExt;
            
            fetch(SUPABASE_URL + '/storage/v1/object/message-images/' + fileName, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': file.type,
                    'x-upsert': 'true'
                },
                body: file
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('上传失败');
                }
                return response.json();
            })
            .then(function(data) {
                pendingMessageImage = SUPABASE_URL + '/storage/v1/object/public/message-images/' + fileName;
                console.log('图片上传成功 - pendingMessageImage 已设置:', pendingMessageImage);
                showMessage('图片已准备好，点击发送', 'success');
            })
            .catch(function(error) {
                console.error('图片上传失败:', error);
                showMessage('图片上传失败', 'error');
                removeImage();
            });
        }
        
        // 移除待发送的图片
        function removeImage() {
            pendingMessageImage = null;
            document.getElementById('imagePreviewArea').style.display = 'none';
            document.getElementById('imagePreview').src = '';
            document.getElementById('messageImageInput').value = '';
        }
        
        // 拖拽上传
        var inputArea = document.getElementById('messageInputArea');
        
        inputArea.addEventListener('dragenter', function(e) {
            e.preventDefault();
            if (currentUser) {
                this.classList.add('dragging');
            }
        });
        
        inputArea.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        inputArea.addEventListener('dragleave', function(e) {
            if (e.target === this || !this.contains(e.relatedTarget)) {
                this.classList.remove('dragging');
            }
        });
        
        inputArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragging');
            
            if (!currentUser) {
                showMessage('请先登录', 'warning');
                return;
            }
            
            var files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                processImageFile(files[0]);
            }
        });
        
        // 粘贴图片
        document.getElementById('messageInput').addEventListener('paste', function(e) {
            var items = e.clipboardData.items;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    var file = items[i].getAsFile();
                    processImageFile(file);
                    e.preventDefault();
                    break;
                }
            }
        });
        
        // 图片灯箱
        function openLightbox(src) {
            var lightbox = document.getElementById('imageLightbox');
            document.getElementById('lightboxImage').src = src;
            lightbox.classList.add('show');
        }
        
        function closeLightbox() {
            document.getElementById('imageLightbox').classList.remove('show');
        }


// === 移动端导航脚本 ===
        function openMobileDrawer(side) {
            document.getElementById('mobileOverlay').classList.add('open');
            if (side === 'left') {
                document.getElementById('mobileDrawerLeft').classList.add('open');
            } else {
                document.getElementById('mobileDrawerRight').classList.add('open');
            }
            document.body.style.overflow = 'hidden';
        }
        
        function closeMobileDrawer() {
            document.getElementById('mobileOverlay').classList.remove('open');
            document.getElementById('mobileDrawerLeft').classList.remove('open');
            document.getElementById('mobileDrawerRight').classList.remove('open');
            document.body.style.overflow = '';
        }
