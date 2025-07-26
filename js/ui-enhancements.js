// Additional UI functionality for the digital logic simulator
document.addEventListener('DOMContentLoaded', () => {
    // Copy Verilog code functionality
    const copyVerilogBtn = document.getElementById('copy-verilog-btn');
    if (copyVerilogBtn) {
        copyVerilogBtn.addEventListener('click', () => {
            const verilogCode = document.getElementById('verilog-code');
            if (verilogCode && verilogCode.value.trim()) {
                navigator.clipboard.writeText(verilogCode.value).then(() => {
                    // Show success feedback
                    const originalIcon = copyVerilogBtn.innerHTML;
                    copyVerilogBtn.innerHTML = '<i class="fas fa-check"></i>';
                    copyVerilogBtn.style.color = 'var(--success-color)';

                    setTimeout(() => {
                        copyVerilogBtn.innerHTML = originalIcon;
                        copyVerilogBtn.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    // Fallback for older browsers
                    verilogCode.select();
                    document.execCommand('copy');
                });
            }
        });
    }

    // Auto-hide sidebar functionality
    let sidebarTimeout;
    const leftSidebar = document.querySelector('.sidebar');
    const rightSidebar = document.querySelector('.results-sidebar');

    function setupAutoHideSidebar(sidebar) {
        if (!sidebar) return;

        sidebar.addEventListener('mouseenter', () => {
            clearTimeout(sidebarTimeout);
            sidebar.classList.add('expanded');
        });

        sidebar.addEventListener('mouseleave', () => {
            sidebarTimeout = setTimeout(() => {
                sidebar.classList.remove('expanded');
            }, 2000); // Hide after 2 seconds of no interaction
        });
    }

    setupAutoHideSidebar(leftSidebar);
    setupAutoHideSidebar(rightSidebar);

    // Smooth scrolling for sidebar content
    const scrollableElements = document.querySelectorAll('.sidebar-content, .results-content');
    scrollableElements.forEach(element => {
        element.style.scrollBehavior = 'smooth';
    });

    // Add loading animation for circuit generation
    function showLoadingAnimation(text = 'Processing...') {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-cog fa-spin fa-2x"></i>
                <p>${text}</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
        return loadingOverlay;
    }

    function hideLoadingAnimation(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    // Enhanced visual feedback for buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function (e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+/ or Cmd+/ to toggle between visual and code mode
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            if (window.verilogEditor) {
                const newMode = window.verilogEditor.currentMode === 'visual' ? 'code' : 'visual';
                window.verilogEditor.switchMode(newMode);
            }
        }

        // Ctrl+Enter or Cmd+Enter to generate (from code mode)
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (window.verilogEditor && window.verilogEditor.currentMode === 'code') {
                window.verilogEditor.generateCircuitFromCode();
            }
        }

        // Escape to close modals or autocomplete
        if (e.key === 'Escape') {
            const autocompletePopup = document.getElementById('autocomplete-popup');
            if (autocompletePopup && autocompletePopup.style.display !== 'none') {
                autocompletePopup.style.display = 'none';
            }
        }
    });

    // Responsive behavior for smaller screens
    function handleResponsive() {
        const isMobile = window.innerWidth <= 768;
        const sidebars = document.querySelectorAll('.sidebar, .results-sidebar');

        sidebars.forEach(sidebar => {
            if (isMobile) {
                sidebar.classList.add('mobile');
            } else {
                sidebar.classList.remove('mobile');
            }
        });
    }

    window.addEventListener('resize', handleResponsive);
    handleResponsive(); // Initial check

    // Enhanced error display with line highlighting
    function highlightErrorLine(lineNumber) {
        const verilogInput = document.getElementById('verilog-input');
        if (!verilogInput) return;

        const lines = verilogInput.value.split('\n');
        const lineStart = lines.slice(0, lineNumber - 1).join('\n').length + (lineNumber > 1 ? 1 : 0);
        const lineEnd = lineStart + lines[lineNumber - 1].length;

        verilogInput.setSelectionRange(lineStart, lineEnd);
        verilogInput.focus();
    }

    // Add click handlers for error items to jump to line
    document.addEventListener('click', (e) => {
        if (e.target.closest('.error-item')) {
            const errorItem = e.target.closest('.error-item');
            const errorText = errorItem.querySelector('.error-message').textContent;
            const lineMatch = errorText.match(/Line (\d+):/);

            if (lineMatch) {
                const lineNumber = parseInt(lineMatch[1]);
                highlightErrorLine(lineNumber);
            }
        }
    });

    // Initialize tooltips for better UX
    function initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[title]');

        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', function (e) {
                const tooltip = document.createElement('div');
                tooltip.className = 'custom-tooltip';
                tooltip.textContent = this.getAttribute('title');

                // Remove the default title to prevent double tooltips
                this.removeAttribute('title');
                this.setAttribute('data-original-title', tooltip.textContent);

                document.body.appendChild(tooltip);

                const rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
                tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';

                setTimeout(() => tooltip.classList.add('visible'), 10);
            });

            element.addEventListener('mouseleave', function () {
                const tooltip = document.querySelector('.custom-tooltip');
                if (tooltip) {
                    tooltip.remove();
                }

                // Restore the original title
                const originalTitle = this.getAttribute('data-original-title');
                if (originalTitle) {
                    this.setAttribute('title', originalTitle);
                }
            });
        });
    }

    initializeTooltips();

    // Status updates for better user feedback
    function updateStatus(message, type = 'info') {
        const statusElement = document.querySelector('.status-bar') || createStatusBar();

        statusElement.className = `status-bar ${type}`;
        statusElement.textContent = message;
        statusElement.style.display = 'block';

        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }
    }

    function createStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.className = 'status-bar';
        document.body.appendChild(statusBar);
        return statusBar;
    }

    // Make updateStatus globally available
    window.updateStatus = updateStatus;

    console.log('Digital Logic Simulator UI initialized successfully');
});
