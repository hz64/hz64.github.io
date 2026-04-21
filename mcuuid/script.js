// Minecraft UUID 查询工具
// 使用 Mojang API 和第三方皮肤服务

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
        this.elements.viewBody.addEventListener('click', () => {
            this.showBodyModal();
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
            
            // 检测 CORS/网络错误
            if (error.message === 'Failed to fetch') {
                errorMessage = '无法连接到 API 服务器。这可能是以下原因导致的：\n\n' +
                    '1. 直接打开了本地文件（file://）\n' +
                    '2. 浏览器安全策略阻止了跨域请求\n\n' +
                    '解决方法：\n' +
                    '• 使用本地服务器运行（推荐）\n' +
                    '• VS Code 安装 Live Server 插件\n' +
                    '• 或使用命令: npx serve 或 python -m http.server';
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
        // 使用 Mojang API
        const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
        
        if (response.status === 204) {
            throw new Error('未找到该用户，可能不是正版账号');
        }
        
        if (!response.ok) {
            throw new Error('查询失败，请稍后重试');
        }

        const data = await response.json();
        
        // 获取更多信息
        const profile = await this.getProfile(data.id);
        const nameHistory = await this.getNameHistory(data.id);

        return {
            name: data.name,
            uuid: this.formatUUID(data.id),
            uuidNoDashes: data.id.toLowerCase(),
            profile: profile,
            nameHistory: nameHistory
        };
    }

    // 通过 UUID 查询
    async queryByUUID(uuid) {
        const formattedUUID = this.formatUUID(uuid);
        const cleanUUID = this.unformatUUID(uuid);

        // 使用 Mojang API 获取用户名历史
        const response = await fetch(`https://api.mojang.com/user/profiles/${cleanUUID}/names`);
        
        if (response.status === 204) {
            throw new Error('未找到该 UUID');
        }
        
        if (!response.ok) {
            throw new Error('查询失败，请稍后重试');
        }

        const nameHistory = await response.json();
        const currentName = nameHistory[nameHistory.length - 1].name;

        // 获取更多信息
        const profile = await this.getProfile(cleanUUID);

        return {
            name: currentName,
            uuid: formattedUUID,
            uuidNoDashes: cleanUUID,
            profile: profile,
            nameHistory: nameHistory
        };
    }

    // 获取详细资料
    async getProfile(uuid) {
        try {
            const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn('获取详细资料失败:', e);
        }
        return null;
    }

    // 获取用户名历史
    async getNameHistory(uuid) {
        try {
            const response = await fetch(`https://api.mojang.com/user/profiles/${uuid}/names`);
            if (response.ok) {
                const data = await response.json();
                return data.map((item, index) => ({
                    name: item.name,
                    changedAt: item.changedToAt,
                    isCurrent: index === data.length - 1
                }));
            }
        } catch (e) {
            console.warn('获取用户名历史失败:', e);
        }
        return [];
    }

    // 显示结果
    displayResult(data) {
        // 头像
        this.elements.avatarImg.src = `https://crafatar.com/avatars/${data.uuidNoDashes}?size=120&overlay`;
        
        // 基本信息
        this.elements.username.textContent = data.name;
        this.elements.uuid.textContent = data.uuid;
        this.elements.uuidNoDashes.textContent = data.uuidNoDashes;

        // 皮肤预览
        this.elements.skinImg.src = `https://crafatar.com/renders/body/${data.uuidNoDashes}?scale=8&overlay`;
        
        // 下载皮肤链接
        this.elements.downloadSkin.href = `https://crafatar.com/skins/${data.uuidNoDashes}`;

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

        // 倒序显示，当前用户名在最上面
        [...history].reverse().forEach((item, index) => {
            const div = document.createElement('div');
            div.className = `name-history-item ${item.isCurrent ? 'current' : ''}`;
            
            const dateStr = item.changedAt 
                ? this.formatDate(item.changedAt)
                : '原始用户名';

            div.innerHTML = `
                <span class="name">${this.escapeHtml(item.name)}</span>
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

    // 显示全身预览
    showBodyModal() {
        if (!this.currentData) return;
        this.elements.bodyImg.src = `https://crafatar.com/renders/body/${this.currentData.uuidNoDashes}?scale=10&overlay`;
        this.elements.bodyModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // 隐藏全身预览
    hideBodyModal() {
        this.elements.bodyModal.classList.add('hidden');
        document.body.style.overflow = '';
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
