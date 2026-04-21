// Minecraft UUID 查询工具
// 使用 Mojang API 和第三方皮肤服务

// 导入 3D 皮肤渲染库
let skinview3d;

// 动态导入皮肤渲染库
async function loadSkinview3d() {
    try {
        skinview3d = await import('https://cdn.jsdelivr.net/npm/skinview3d@3.4.1/+esm');
        console.log('3D 皮肤渲染库加载成功');
    } catch (error) {
        console.warn('3D 皮肤渲染库加载失败:', error);
        skinview3d = null;
    }
}

// 页面加载时尝试加载库
window.addEventListener('load', loadSkinview3d);

class MCUUIDQuery {
    constructor() {
        this.elements = {
            usernameInput: document.getElementById('usernameInput'),
            searchBtn: document.getElementById('searchBtn'),
            searchType: document.getElementsByName('searchType'),
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            errorMessage: document.getElementById('errorMessage'),
            result: document.getElementById('result'),
            avatarImg: document.getElementById('avatarImg'),
            username: document.getElementById('username'),
            uuid: document.getElementById('uuid'),
            uuidNoDashes: document.getElementById('uuidNoDashes'),
            skinImg: document.getElementById('skinImg'),
            downloadSkin: document.getElementById('downloadSkin'),
            downloadAvatar: document.getElementById('downloadAvatar'),
            viewBody: document.getElementById('viewBody'),
            bodyModal: document.getElementById('bodyModal'),
            bodyImg: document.getElementById('bodyImg'),
            nameHistory: document.getElementById('nameHistory'),
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage')
        };

        this.currentData = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkUrlParams();
    }

    bindEvents() {
        // 搜索按钮点击
        this.elements.searchBtn.addEventListener('click', () => this.handleSearch());

        // 回车键搜索
        this.elements.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // 复制按钮
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.copyToClipboard(target);
            });
        });

        // 下载头像
        this.elements.downloadAvatar.addEventListener('click', () => {
            this.downloadImage(this.elements.avatarImg.src, `avatar_${this.currentData?.name}.png`);
        });

        // 查看全身
        this.elements.viewBody.addEventListener('click', async () => {
            await this.showBodyModal();
        });

        // 关闭模态框
        this.elements.bodyModal.querySelector('.modal-close').addEventListener('click', () => {
            this.hideBodyModal();
        });

        this.elements.bodyModal.addEventListener('click', (e) => {
            if (e.target === this.elements.bodyModal) {
                this.hideBodyModal();
            }
        });

        // ESC 关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.bodyModal.classList.contains('hidden')) {
                this.hideBodyModal();
            }
        });
    }

    // 检查 URL 参数
    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const p = params.get('p');
        const uuid = params.get('uuid');

        if (p) {
            this.elements.usernameInput.value = p;
            this.setSearchType('username');
            this.handleSearch();
        } else if (uuid) {
            this.elements.usernameInput.value = uuid;
            this.setSearchType('uuid');
            this.handleSearch();
        }
    }

    // 设置搜索类型
    setSearchType(type) {
        this.elements.searchType.forEach(radio => {
            radio.checked = radio.value === type;
        });
    }

    // 获取当前搜索类型
    getSearchType() {
        for (const radio of this.elements.searchType) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return 'username';
    }

    // 处理搜索
    async handleSearch() {
        const input = this.elements.usernameInput.value.trim();
        
        if (!input) {
            this.showError('请输入用户名或 UUID');
            return;
        }

        const searchType = this.getSearchType();
        
        this.showLoading();
        this.hideError();
        this.hideResult();

        try {
            let data;
            if (searchType === 'uuid') {
                // 验证 UUID 格式
                if (!this.isValidUUID(input)) {
                    throw new Error('UUID 格式不正确');
                }
                data = await this.queryByUUID(input);
            } else {
                data = await this.queryByUsername(input);
            }

            this.currentData = data;
            this.displayResult(data);
            this.updateUrl(data.name);
        } catch (error) {
            let errorMessage = error.message || '查询失败，请稍后重试';
            
            // 检测网络错误
            if (error.message === 'Failed to fetch') {
                errorMessage = '网络连接失败\n\n' +
                    '可能原因：\n' +
                    '• 网络连接不稳定\n' +
                    '• CORS 代理服务暂时不可用\n\n' +
                    '请检查网络连接后重试';
            }
            
            this.showError(errorMessage);
            console.error('查询错误:', error);
        } finally {
            this.hideLoading();
        }
    }

    // 验证 UUID 格式
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/;
        return uuidRegex.test(uuid);
    }

    // 格式化 UUID（添加横线）
    formatUUID(uuid) {
        const clean = uuid.replace(/-/g, '').toLowerCase();
        if (clean.length !== 32) return uuid;
        return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
    }

    // 移除 UUID 横线
    unformatUUID(uuid) {
        return uuid.replace(/-/g, '').toLowerCase();
    }

    // 通过用户名查询
    async queryByUsername(username) {
        // 使用 ashcon.app API（免费、支持 CORS、无限使用）
        const response = await fetch(
            `https://api.ashcon.app/mojang/v2/user/${encodeURIComponent(username)}`
        );
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('未找到该用户，可能不是正版账号');
            }
            throw new Error('查询失败，请稍后重试');
        }
        
        const profile = await response.json();
        
        // 转换为统一格式
        return {
            name: profile.username,
            uuid: profile.uuid,
            uuidNoDashes: profile.uuid.replace(/-/g, ''),
            profile: profile,
            nameHistory: profile.username_history || []
        };
    }

    // 通过 UUID 查询
    async queryByUUID(uuid) {
        const formattedUUID = this.formatUUID(uuid);
        const cleanUUID = this.unformatUUID(uuid);

        // ashcon.app 支持 UUID 查询
        const response = await fetch(
            `https://api.ashcon.app/mojang/v2/user/${cleanUUID}`
        );
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('未找到该 UUID');
            }
            throw new Error('查询失败，请稍后重试');
        }
        
        const profile = await response.json();
        
        return {
            name: profile.username,
            uuid: formattedUUID,
            uuidNoDashes: cleanUUID,
            profile: profile,
            nameHistory: profile.username_history || []
        };
    }

    // 显示结果
    displayResult(data) {
        // 头像 - 使用 mc-heads.net 的人脸渲染（helm 包含头盔层）
        this.elements.avatarImg.src = `https://www.mc-heads.net/avatar/${data.uuidNoDashes}`;
        
        // 皮肤预览 - 使用 mc-heads.net 的全身渲染
        this.elements.skinImg.src = `https://www.mc-heads.net/player/${data.uuidNoDashes}`;
        
        // 下载皮肤链接 - 使用 mc-heads.net
        this.elements.downloadSkin.href = `https://www.mc-heads.net/download/${data.uuidNoDashes}`;
        
        // 基本信息
        this.elements.username.textContent = data.name;
        this.elements.uuid.textContent = data.uuid;
        this.elements.uuidNoDashes.textContent = data.uuidNoDashes;

        // 用户名历史
        this.displayNameHistory(data.nameHistory);

        this.showResult();
    }

    // 显示用户名历史
    displayNameHistory(history) {
        const container = this.elements.nameHistory;
        container.innerHTML = '';

        if (!history || history.length === 0) {
            container.innerHTML = '<p class="no-data">暂无历史记录</p>';
            return;
        }

        // ashcon API 返回的格式: [{username: "name"}, ...]
        // 倒序显示，当前用户名在最上面
        const reversedHistory = [...history].reverse();
        
        reversedHistory.forEach((item, index) => {
            const div = document.createElement('div');
            const isCurrent = index === 0; // 倒序后第一个是当前的
            div.className = `name-history-item ${isCurrent ? 'current' : ''}`;
            
            // ashcon API 不返回 changedAt，只显示用户名
            const dateStr = index === history.length - 1 
                ? '原始用户名' 
                : '';

            const username = item.username || item.name || 'Unknown';

            div.innerHTML = `
                <span class="name">${this.escapeHtml(username)}</span>
                <span class="date">${dateStr}</span>
            `;
            
            container.appendChild(div);
        });
    }

    // 格式化日期
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示 3D 皮肤预览
    async showBodyModal() {
        if (!this.currentData) return;
        
        // 显示模态框
        this.elements.bodyModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // 初始化 3D 渲染器
        const container = document.getElementById('skin3dContainer');
        container.innerHTML = '';
        
        // 确保皮肤渲染库已加载
        if (!skinview3d) {
            await loadSkinview3d();
        }
        
        if (skinview3d) {
            // 使用 3D 渲染
            try {
                // 清理之前的实例
                if (this.skin3dInstance) {
                    this.skin3dInstance.dispose();
                    this.skin3dInstance = null;
                }
                
                // 创建 skinview3d 实例
                const skinViewer = new skinview3d.SkinViewer({
                    domElement: container,
                    width: 400,
                    height: 400,
                    skinUrl: `https://www.mc-heads.net/download/${this.currentData.uuidNoDashes}`
                });
                
                // 添加动画
                const waveAnimation = skinview3d.WaveAnimation;
                skinViewer.animation = new waveAnimation();
                
                // 添加控制
                const control = new skinview3d.OrbitControls(skinViewer);
                control.enableRotate = true;
                control.enableZoom = true;
                control.enablePan = false;
                
                // 保存实例以便清理
                this.skin3dInstance = skinViewer;
                
                console.log('3D 皮肤预览创建成功');
            } catch (error) {
                console.error('3D 渲染失败:', error);
                // 回退到 2D 预览
                this.show2DBodyPreview();
            }
        } else {
            // 回退到 2D 预览
            this.show2DBodyPreview();
        }
    }

    // 2D 皮肤预览（备用）
    show2DBodyPreview() {
        if (!this.currentData) return;
        
        const container = document.getElementById('skin3dContainer');
        container.innerHTML = `
            <img 
                src="https://www.mc-heads.net/player/${this.currentData.uuidNoDashes}/600" 
                alt="2D 皮肤预览"
                style="width: 100%; height: 100%; object-fit: contain;"
            >
        `;
    }

    // 隐藏 3D 皮肤预览
    hideBodyModal() {
        this.elements.bodyModal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // 清理 3D 渲染器
        if (this.skin3dInstance) {
            this.skin3dInstance.dispose();
            this.skin3dInstance = null;
        }
    }

    // 复制到剪贴板
    async copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        const text = element.textContent;

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('已复制到剪贴板');
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                this.showToast('已复制到剪贴板');
            } catch (e) {
                this.showToast('复制失败，请手动复制');
            }
            
            document.body.removeChild(textarea);
        }
    }

    // 下载图片
    downloadImage(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('开始下载...');
    }

    // 更新 URL（不刷新页面）
    updateUrl(username) {
        const url = new URL(window.location);
        url.searchParams.set('p', username);
        window.history.pushState({}, '', url);
    }

    // 显示/隐藏元素
    showLoading() {
        this.elements.loading.classList.remove('hidden');
    }

    hideLoading() {
        this.elements.loading.classList.add('hidden');
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.error.classList.remove('hidden');
    }

    hideError() {
        this.elements.error.classList.add('hidden');
    }

    showResult() {
        this.elements.result.classList.remove('hidden');
        // 滚动到结果区域
        setTimeout(() => {
            this.elements.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    hideResult() {
        this.elements.result.classList.add('hidden');
    }

    // 显示 Toast
    showToast(message) {
        this.elements.toastMessage.textContent = message;
        this.elements.toast.classList.remove('hidden');

        setTimeout(() => {
            this.elements.toast.classList.add('hidden');
        }, 2000);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new MCUUIDQuery();
});

// 处理浏览器返回按钮
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('p') && !params.has('uuid')) {
        location.reload();
    }
});

/*
API 列表：

1. Minecraft 账号查询 API:
   - https://api.ashcon.app/mojang/v2/user/{username} - 通过用户名查询
   - https://api.ashcon.app/mojang/v2/user/{uuid} - 通过 UUID 查询

2. 皮肤服务 API:
   - https://www.mc-heads.net/avatar/{uuid} - 头像（人脸）
   - https://www.mc-heads.net/player/{uuid} - 全身皮肤预览
   - https://www.mc-heads.net/player/{uuid}/600 - 全身皮肤预览（大图）
   - https://www.mc-heads.net/download/{uuid} - 下载皮肤文件

3. 3D 皮肤渲染库:
   - https://cdn.jsdelivr.net/npm/skinview3d@3.4.1/+esm - skinview3d 库

4. 浏览器 API:
   - Clipboard API - 复制到剪贴板
   - History API - 更新 URL 参数
   - DOM API - 操作页面元素
*/
