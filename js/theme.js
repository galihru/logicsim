// Theme Management System for Digital Logic Simulator
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.themeBtn = document.getElementById('theme-btn');
        this.htmlElement = document.documentElement;

        this.init();
    }

    init() {
        // Load saved theme from localStorage
        this.loadSavedTheme();

        // Bind theme toggle button
        if (this.themeBtn) {
            this.themeBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Listen for system theme changes
        this.watchSystemTheme();

        // Update theme button icon
        this.updateThemeButton();
    }

    loadSavedTheme() {
        const savedTheme = localStorage.getItem('digital-logic-theme');

        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('digital-logic-theme', theme);
        this.updateThemeButton();

        // Dispatch theme change event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: theme }
        }));
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);

        // Add visual feedback
        this.addToggleAnimation();
    }

    updateThemeButton() {
        if (!this.themeBtn) return;

        const icon = this.themeBtn.querySelector('i');
        if (icon) {
            if (this.currentTheme === 'light') {
                icon.className = 'fas fa-moon';
                this.themeBtn.title = 'Switch to Dark Mode';
            } else {
                icon.className = 'fas fa-sun';
                this.themeBtn.title = 'Switch to Light Mode';
            }
        }
    }

    addToggleAnimation() {
        if (!this.themeBtn) return;

        this.themeBtn.classList.add('theme-switching');

        setTimeout(() => {
            this.themeBtn.classList.remove('theme-switching');
        }, 300);
    }

    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a theme
            const hasManualTheme = localStorage.getItem('digital-logic-theme');
            if (!hasManualTheme) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    isDarkMode() {
        return this.currentTheme === 'dark';
    }

    // Method to get theme colors for dynamic styling
    getThemeColors() {
        const root = getComputedStyle(this.htmlElement);

        return {
            primary: root.getPropertyValue('--primary-color').trim(),
            secondary: root.getPropertyValue('--secondary-color').trim(),
            accent: root.getPropertyValue('--accent-color').trim(),
            background: root.getPropertyValue('--bg-color').trim(),
            surface: root.getPropertyValue('--card-bg').trim(),
            text: root.getPropertyValue('--text-color').trim(),
            textSecondary: root.getPropertyValue('--text-secondary').trim(),
            border: root.getPropertyValue('--border-color').trim(),
            success: root.getPropertyValue('--success-color').trim(),
            warning: root.getPropertyValue('--warning-color').trim(),
            error: root.getPropertyValue('--error-color').trim()
        };
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Keyboard shortcut for theme toggle (Ctrl/Cmd + Shift + T)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        if (window.themeManager) {
            window.themeManager.toggleTheme();
        }
    }
});
