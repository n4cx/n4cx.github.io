class HackerInterface {
    constructor() {
        this.currentSelection = 0;
        this.currentItems = [];
        this.sounds = {
            keypress: document.getElementById('keypress-sound'),
            select: document.getElementById('select-sound'),
            error: document.getElementById('error-sound')
        };
        this.init();
    }

    init() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        this.hideBoot();
        this.bindEvents();
        this.updateCurrentItems();
        this.checkLinkStatuses();
        setInterval(() => this.checkLinkStatuses(), 300000); // Check every 5 minutes
    }

    updateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            timeZone: 'UTC' 
        }) + ' UTC';
        document.getElementById('current-time').textContent = timeStr;
    }

    hideBoot() {
        setTimeout(() => {
            const bootSequence = document.getElementById('boot-sequence');
            const mainContent = document.getElementById('main-content');
            if (bootSequence) {
                bootSequence.style.display = 'none';
            }
            if (mainContent) {
                mainContent.style.opacity = '1';
            }
        }, 4500);
    }

    playSound(type) {
        if (this.sounds[type]) {
            this.sounds[type].currentTime = 0;
            this.sounds[type].play().catch(() => {
                // Ignore audio play errors (browser restrictions)
            });
        }
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });

        // Add click handlers for menu items
        document.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item, .database-card, .file-card');
            if (menuItem) {
                this.selectItem(menuItem);
            }

            const breacherLink = e.target.closest('.breacher-link');
            if (breacherLink) {
                e.stopPropagation();
                window.open(breacherLink.href, '_blank');
            }
        });
    }

    handleKeyPress(e) {
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.navigateUp();
                this.playSound('keypress');
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateDown();
                this.playSound('keypress');
                break;
            case 'Enter':
                e.preventDefault();
                this.selectCurrent();
                this.playSound('select');
                break;
            case 'Escape':
                e.preventDefault();
                this.goBack();
                this.playSound('keypress');
                break;
        }
    }

    updateCurrentItems() {
        // Get all selectable items on current page
        this.currentItems = Array.from(document.querySelectorAll(
            '.menu-item, .database-card, .file-card'
        ));
        
        // Reset selection
        this.currentSelection = 0;
        this.updateSelection();
    }

    navigateUp() {
        if (this.currentItems.length === 0) return;
        
        this.currentSelection = this.currentSelection > 0 
            ? this.currentSelection - 1 
            : this.currentItems.length - 1;
        
        this.updateSelection();
    }

    navigateDown() {
        if (this.currentItems.length === 0) return;
        
        this.currentSelection = this.currentSelection < this.currentItems.length - 1 
            ? this.currentSelection + 1 
            : 0;
        
        this.updateSelection();
    }

    updateSelection() {
        // Remove previous selection
        this.currentItems.forEach(item => item.classList.remove('selected'));
        
        // Add current selection
        if (this.currentItems[this.currentSelection]) {
            this.currentItems[this.currentSelection].classList.add('selected');
            this.currentItems[this.currentSelection].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    selectCurrent() {
        if (this.currentItems[this.currentSelection]) {
            this.selectItem(this.currentItems[this.currentSelection]);
        }
    }

    selectItem(item) {
        const url = item.dataset.url;
        if (url) {
            if (url.startsWith('http')) {
                // External link - download or open
                this.showLoadingEffect();
                window.open(url, '_blank');
            } else {
                // Internal navigation
                this.showLoadingEffect();
                setTimeout(() => {
                    window.location.href = url;
                }, 500);
            }
        }
    }

    goBack() {
        if (window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
            this.showLoadingEffect();
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 300);
        }
    }

    showLoadingEffect() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 18px;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="margin-bottom: 20px;">LOADING...</div>
                <div style="width: 200px; height: 2px; background: #333; margin: 0 auto;">
                    <div style="height: 100%; background: #00ff00; width: 0%; animation: progress 1s ease-in-out forwards;"></div>
                </div>
            </div>
        `;
        
        // Add progress animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes progress {
                to { width: 100%; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.remove();
            style.remove();
        }, 1500);
    }

    async checkLinkStatuses() {
        const statusElements = document.querySelectorAll('.status-indicator');
        const cards = document.querySelectorAll('[data-url]');
        
        for (const card of cards) {
            const url = card.dataset.url;
            if (url && url.startsWith('http')) {
                try {
                    // Use a CORS proxy to avoid cross-origin issues
                    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
                    const response = await fetch(`${proxyUrl}${url}`, {
                        method: 'HEAD',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    
                    const statusEl = card.querySelector('.status-indicator span');
                    if (statusEl) {
                        if (response.ok) {
                            statusEl.textContent = '● ONLINE';
                            statusEl.className = 'status-online';
                        } else {
                            statusEl.textContent = '● OFFLINE';
                            statusEl.className = 'status-offline';
                        }
                    }
                } catch (error) {
                    const statusEl = card.querySelector('.status-indicator span');
                    if (statusEl) {
                        statusEl.textContent = '● OFFLINE';
                        statusEl.className = 'status-offline';
                    }
                }
            }
        }
    }

    // Matrix rain effect (optional eye candy)
    initMatrixRain() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
            opacity: 0.1;
        `;
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = Array(Math.floor(columns)).fill(1);

        function draw() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#00ff00';
            ctx.font = fontSize + 'px Courier New';

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        setInterval(draw, 35);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const hackerInterface = new HackerInterface();
    
    // Optional: Enable matrix rain effect
    // hackerInterface.initMatrixRain();
});

// Add some hacker-style console messages
console.log(`
██████╗  █████╗ ██████╗ ██╗  ██╗███╗   ██╗███████╗████████╗
██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝████╗  ██║██╔════╝╚══██╔══╝
██║  ██║███████║██████╔╝█████╔╝ ██╔██╗ ██║█████╗     ██║   
██║  ██║██╔══██║██╔══██╗██╔═██╗ ██║╚██╗██║██╔══╝     ██║   
██████╔╝██║  ██║██║  ██║██║  ██╗██║ ╚████║███████╗   ██║   
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   

ACCESS GRANTED - Welcome to the Darknet Archive
System Status: OPERATIONAL
Security Level: MAXIMUM
Connection: ENCRYPTED

Use keyboard navigation for optimal security.
`);