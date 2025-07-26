// Digital Logic Simulator - Modern Edition
class DigitalLogicSimulator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.gates = [];
        this.wires = [];
        this.inputs = [];
        this.outputs = [];
        this.selectedGate = null;
        this.connectionMode = false;
        this.sourcePin = null;
        this.gateCounter = 0;

        // Hide loading immediately on initialization
        this.hideLoading();

        this.initializeTheme();
        this.initializeEventListeners();
        this.initializeDragAndDrop();
        this.updateCounters();
    }

    initializeTheme() {
        // Theme management
        const themeBtn = document.getElementById('theme-btn');
        const savedTheme = localStorage.getItem('theme') || 'light';

        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);

        themeBtn?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeIcon(newTheme);

            // Dispatch theme change event for tooltips
            document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));

            // Add smooth transition effect
            document.body.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                document.body.style.transition = '';
            }, 300);
        });
    }

    updateThemeIcon(theme) {
        const themeBtn = document.getElementById('theme-btn');
        const icon = themeBtn?.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    updateCounters() {
        const gateCount = document.getElementById('gate-count');
        const wireCount = document.getElementById('wire-count');

        if (gateCount) {
            gateCount.textContent = `${this.gates.length} gates`;
        }
        if (wireCount) {
            wireCount.textContent = `${this.wires.length} wires`;
        }
    }

    initializeEventListeners() {
        // Button event listeners
        document.getElementById('simulate-btn').addEventListener('click', () => this.simulate());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('generate-verilog-btn').addEventListener('click', () => this.generateVerilog());
        document.getElementById('save-btn').addEventListener('click', () => this.saveDesign());
        document.getElementById('load-btn').addEventListener('click', () => this.loadDesign());
        document.getElementById('copy-verilog-btn').addEventListener('click', () => this.copyVerilogCode());
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('auto-arrange-btn').addEventListener('click', () => this.autoArrangeGates());

        // Color picker event listeners
        this.initializeColorPicker();

        // Canvas click handler
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Keyboard event handlers
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelConnectionMode();
            }
            if (e.key === 'Delete' && this.selectedGate) {
                this.deleteGate(this.selectedGate);
            }
        });

        // Window resize handler
        window.addEventListener('resize', () => this.updateWires());

        // Tour button event listener
        document.getElementById('start-tour-btn')?.addEventListener('click', () => {
            if (window.websiteTour) {
                window.websiteTour.reset();
                setTimeout(() => window.websiteTour.start(), 500);
            }
        });

        // Control buttons event listeners
        document.getElementById('simulate-btn')?.addEventListener('click', () => this.simulate());
        document.getElementById('auto-arrange-btn')?.addEventListener('click', () => this.autoArrangeGates());
        document.getElementById('clear-btn')?.addEventListener('click', () => this.clearCanvas());
        document.getElementById('generate-verilog-btn')?.addEventListener('click', () => this.generateVerilog());
        document.getElementById('save-btn')?.addEventListener('click', () => this.saveDesign());
        document.getElementById('load-btn')?.addEventListener('click', () => this.loadDesign());
    }

    initializeColorPicker() {
        // Set current wire color
        this.currentWireColor = '#48bb78';

        // Color preset handlers
        const colorPresets = document.querySelectorAll('.color-preset');
        colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                // Remove selected class from all presets
                colorPresets.forEach(p => p.classList.remove('selected'));

                // Add selected class to clicked preset
                preset.classList.add('selected');

                // Update current wire color
                this.currentWireColor = preset.dataset.color;
                this.updateCurrentColorDisplay();
            });
        });

        // Custom color picker handler
        const customColorPicker = document.getElementById('custom-wire-color');
        customColorPicker.addEventListener('change', (e) => {
            // Remove selected class from all presets
            colorPresets.forEach(p => p.classList.remove('selected'));

            // Update current wire color
            this.currentWireColor = e.target.value;
            this.updateCurrentColorDisplay();
        });

        // Initialize first preset as selected
        if (colorPresets.length > 0) {
            colorPresets[0].classList.add('selected');
        }
        this.updateCurrentColorDisplay();
    }

    updateCurrentColorDisplay() {
        const currentColorIndicator = document.getElementById('current-wire-color');
        if (currentColorIndicator) {
            currentColorIndicator.style.backgroundColor = this.currentWireColor;
        }
    }

    initializeDragAndDrop() {
        // Make gate items draggable
        const gateItems = document.querySelectorAll('.gate-item');
        gateItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.gateType);
            });
        });

        // Canvas drop zone
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.canvas.classList.add('drag-over');
        });

        this.canvas.addEventListener('dragleave', () => {
            this.canvas.classList.remove('drag-over');
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.canvas.classList.remove('drag-over');

            const gateType = e.dataTransfer.getData('text/plain');
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.createGate(gateType, x, y);
        });
    }

    createGate(type, x, y) {
        // Free positioning - place exactly where user drops without adjustment
        const gateWidth = 80;
        const gateHeight = 50;

        // Only prevent going outside canvas bounds, but don't auto-center
        const canvasRect = this.canvas.getBoundingClientRect();
        const safeX = Math.max(0, Math.min(x, canvasRect.width - gateWidth));
        const safeY = Math.max(0, Math.min(y, canvasRect.height - gateHeight));

        const gate = {
            id: `gate_${this.gateCounter++}`,
            type: type,
            x: safeX,
            y: safeY,
            inputs: [],
            outputs: [],
            inputValues: [],
            outputValues: [],
            element: null,
            width: 80,
            height: 50
        };        // Define gate properties
        switch (type) {
            case 'INPUT':
                gate.inputs = [];
                gate.outputs = ['out'];
                gate.inputValues = [];
                gate.outputValues = [0];
                gate.width = 70;
                gate.height = 40;
                break;
            case 'OUTPUT':
                gate.inputs = ['in'];
                gate.outputs = [];
                gate.inputValues = [0];
                gate.outputValues = [];
                gate.width = 70;
                gate.height = 40;
                break;
            case 'NOT':
                gate.inputs = ['in'];
                gate.outputs = ['out'];
                gate.inputValues = [0];
                gate.outputValues = [0];
                gate.width = 60;
                gate.height = 40;
                break;
            case 'AND':
            case 'OR':
            case 'NAND':
            case 'NOR':
            case 'XOR':
            case 'XNOR':
                gate.inputs = ['in1', 'in2'];
                gate.outputs = ['out'];
                gate.inputValues = [0, 0];
                gate.outputValues = [0];
                gate.width = 80;
                gate.height = 50;
                break;
        }

        this.gates.push(gate);
        this.renderGate(gate);
        this.updateInputControls();
        this.updateCounters();
    }

    renderGate(gate) {
        console.log('=== RENDER GATE STARTED ===');
        console.log('Rendering gate:', gate);

        const element = document.createElement('div');
        element.className = 'gate-element';
        element.style.left = gate.x + 'px';
        element.style.top = gate.y + 'px';
        element.style.width = gate.width + 'px';
        element.style.height = gate.height + 'px';
        element.textContent = gate.type;
        element.dataset.gateId = gate.id;

        console.log('Gate element created:', element);
        console.log('Element styles:', {
            left: element.style.left,
            top: element.style.top,
            width: element.style.width,
            height: element.style.height
        });

        // Force visibility and positioning
        element.style.position = 'absolute';
        element.style.display = 'flex';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        element.style.zIndex = '10';
        element.style.background = 'white';
        element.style.border = '2px solid #667eea';
        element.style.borderRadius = '8px';
        element.style.padding = '12px';
        element.style.cursor = 'move';
        element.style.userSelect = 'none';
        element.style.textAlign = 'center';
        element.style.fontWeight = '600';
        element.style.fontSize = '0.9rem';
        element.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
        element.style.color = '#1a202c';

        // Add styling based on gate type
        element.classList.add(gate.type.toLowerCase() + '-gate');

        // Add value display for visual feedback
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'gate-value-display';
        valueDisplay.style.position = 'absolute';
        valueDisplay.style.top = '-15px';
        valueDisplay.style.right = '5px';
        valueDisplay.style.fontSize = '12px';
        valueDisplay.style.fontWeight = 'bold';
        valueDisplay.style.color = '#667eea';
        valueDisplay.style.background = 'white';
        valueDisplay.style.padding = '2px 6px';
        valueDisplay.style.borderRadius = '10px';
        valueDisplay.style.border = '1px solid #e2e8f0';
        valueDisplay.style.display = 'none';
        element.appendChild(valueDisplay);

        // Make gate draggable
        element.addEventListener('mousedown', (e) => this.startDragGate(e, gate));
        element.addEventListener('dblclick', () => this.deleteGate(gate));

        // Add input/output pins
        this.addPins(element, gate);

        gate.element = element;

        console.log('Adding element to canvas...');
        console.log('Canvas:', this.canvas);

        this.canvas.appendChild(element);

        console.log('Element added to canvas. Canvas children now:', this.canvas.children.length);
        console.log('Element in DOM:', element.parentElement === this.canvas);
        console.log('Element computed style:', {
            display: window.getComputedStyle(element).display,
            visibility: window.getComputedStyle(element).visibility,
            opacity: window.getComputedStyle(element).opacity,
            position: window.getComputedStyle(element).position,
            zIndex: window.getComputedStyle(element).zIndex,
            left: element.style.left,
            top: element.style.top,
            width: element.style.width,
            height: element.style.height
        });
        console.log('Canvas style:', {
            position: window.getComputedStyle(this.canvas).position,
            overflow: window.getComputedStyle(this.canvas).overflow,
            width: this.canvas.offsetWidth,
            height: this.canvas.offsetHeight
        });
    }

    addPins(element, gate) {
        // Add input pins
        gate.inputs.forEach((input, index) => {
            const pin = document.createElement('div');
            pin.className = 'pin input';
            pin.style.top = (gate.height / 2 - 8 + index * 16) + 'px';
            pin.style.left = '-8px';
            pin.dataset.pinType = 'input';
            pin.dataset.pinIndex = index;
            pin.dataset.gateId = gate.id;

            // Add pin label
            const label = document.createElement('span');
            label.className = 'pin-label';
            label.textContent = index + 1;
            label.style.position = 'absolute';
            label.style.left = '-20px';
            label.style.top = '-2px';
            label.style.fontSize = '10px';
            label.style.color = '#666';
            pin.appendChild(label);

            // Add hover effect
            pin.addEventListener('mouseenter', () => {
                pin.style.transform = 'scale(1.5)';
                pin.style.background = '#667eea';
                pin.style.zIndex = '1000';
            });

            pin.addEventListener('mouseleave', () => {
                if (!pin.classList.contains('active')) {
                    pin.style.transform = 'scale(1)';
                    pin.style.background = '#cbd5e0';
                    pin.style.zIndex = 'auto';
                }
            });

            pin.addEventListener('click', (e) => this.handlePinClick(e, gate, 'input', index));
            element.appendChild(pin);
        });

        // Add output pins
        gate.outputs.forEach((output, index) => {
            const pin = document.createElement('div');
            pin.className = 'pin output';
            pin.style.top = (gate.height / 2 - 8 + index * 16) + 'px';
            pin.style.right = '-8px';
            pin.dataset.pinType = 'output';
            pin.dataset.pinIndex = index;
            pin.dataset.gateId = gate.id;

            // Add pin label
            const label = document.createElement('span');
            label.className = 'pin-label';
            label.textContent = 'O';
            label.style.position = 'absolute';
            label.style.right = '-15px';
            label.style.top = '-2px';
            label.style.fontSize = '10px';
            label.style.color = '#666';
            pin.appendChild(label);

            // Add hover effect
            pin.addEventListener('mouseenter', () => {
                pin.style.transform = 'scale(1.5)';
                pin.style.background = '#48bb78';
                pin.style.zIndex = '1000';
            });

            pin.addEventListener('mouseleave', () => {
                if (!pin.classList.contains('active')) {
                    pin.style.transform = 'scale(1)';
                    pin.style.background = '#cbd5e0';
                    pin.style.zIndex = 'auto';
                }
            });

            pin.addEventListener('click', (e) => this.handlePinClick(e, gate, 'output', index));
            element.appendChild(pin);
        });
    }

    startDragGate(e, gate) {
        if (e.target.classList.contains('pin')) return;

        this.selectedGate = gate;
        gate.element.classList.add('selected');

        const startX = e.clientX - gate.x;
        const startY = e.clientY - gate.y;

        // Add visual feedback during drag
        gate.element.style.zIndex = '1000';
        gate.element.style.opacity = '0.8';

        const mouseMoveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const newX = e.clientX - rect.left - startX;
            const newY = e.clientY - rect.top - startY;

            // Free movement - no grid snapping
            gate.x = Math.max(10, Math.min(rect.width - gate.width - 10, newX));
            gate.y = Math.max(10, Math.min(rect.height - gate.height - 10, newY));

            gate.element.style.left = gate.x + 'px';
            gate.element.style.top = gate.y + 'px';

            // Update wires in real-time
            this.updateWires();
        };

        const mouseUpHandler = () => {
            // Remove visual feedback
            gate.element.style.zIndex = 'auto';
            gate.element.style.opacity = '1';
            gate.element.classList.remove('selected');
            this.selectedGate = null;

            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);

        e.preventDefault();
    } handlePinClick(e, gate, pinType, pinIndex) {
        e.stopPropagation();
        e.preventDefault();

        if (!this.connectionMode) {
            // Start connection
            this.sourcePin = { gate, pinType, pinIndex };
            this.connectionMode = true;
            e.target.classList.add('active');
            e.target.style.background = '#667eea';
            e.target.style.transform = 'scale(1.5)';

            // Show connection instructions
            this.showConnectionInstructions(pinType);

            // Add temporary wire preview
            this.addTemporaryWirePreview(e);
        } else {
            // Complete connection
            const targetPin = { gate, pinType, pinIndex };

            if (this.isValidConnection(this.sourcePin, targetPin)) {
                this.createConnection(this.sourcePin, targetPin);
                this.showMessage('Connection created successfully!', 'success');
            } else {
                this.showMessage('Invalid connection! Connect output to input only.', 'error');
            }

            this.cancelConnectionMode();
        }
    }

    isValidConnection(sourcePin, targetPin) {
        // Check if connecting different pin types
        if (sourcePin.pinType === targetPin.pinType) {
            return false;
        }

        // Check if not connecting to same gate
        if (sourcePin.gate.id === targetPin.gate.id) {
            return false;
        }

        // Ensure we have output -> input
        const outputPin = sourcePin.pinType === 'output' ? sourcePin : targetPin;
        const inputPin = sourcePin.pinType === 'input' ? sourcePin : targetPin;

        if (outputPin.pinType !== 'output' || inputPin.pinType !== 'input') {
            return false;
        }

        // Allow multiple outputs from one source (jumper support)
        // But only one input per target pin
        const existingConnection = this.wires.find(wire =>
            wire.targetGate === inputPin.gate.id &&
            wire.targetPinIndex === inputPin.pinIndex
        );

        return !existingConnection;
    } cancelConnectionMode() {
        this.connectionMode = false;

        // Remove active class from all pins
        document.querySelectorAll('.pin.active').forEach(pin => {
            pin.classList.remove('active');
            pin.style.background = '#cbd5e0';
            pin.style.transform = 'scale(1)';
        });

        this.sourcePin = null;
        this.hideMessage();
        this.removeTemporaryWirePreview();
    }

    showConnectionInstructions(pinType) {
        const message = pinType === 'output'
            ? 'Now click on an INPUT pin to complete connection'
            : 'Now click on an OUTPUT pin to complete connection';
        this.showMessage(message, 'info');
    }

    addTemporaryWirePreview(e) {
        // Add temporary wire that follows mouse
        document.addEventListener('mousemove', this.updateTemporaryWire.bind(this));
    }

    updateTemporaryWire(e) {
        // Implementation for temporary wire preview (optional)
    }

    removeTemporaryWirePreview() {
        document.removeEventListener('mousemove', this.updateTemporaryWire.bind(this));
    }

    showMessage(text, type = 'info') {
        let messageDiv = document.getElementById('connection-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'connection-message';
            messageDiv.style.position = 'fixed';
            messageDiv.style.top = '20px';
            messageDiv.style.right = '20px';
            messageDiv.style.padding = '15px 20px';
            messageDiv.style.borderRadius = '8px';
            messageDiv.style.color = 'white';
            messageDiv.style.fontWeight = 'bold';
            messageDiv.style.zIndex = '10000';
            messageDiv.style.transition = 'all 0.3s ease';
            document.body.appendChild(messageDiv);
        }

        messageDiv.textContent = text;
        messageDiv.className = `message-${type}`;

        // Set background color based on type
        switch (type) {
            case 'success': messageDiv.style.background = '#48bb78'; break;
            case 'error': messageDiv.style.background = '#f56565'; break;
            case 'info': messageDiv.style.background = '#667eea'; break;
        }

        messageDiv.style.display = 'block';
        messageDiv.style.opacity = '1';

        // Auto-hide after 3 seconds for success messages
        if (type === 'success') {
            setTimeout(() => this.hideMessage(), 3000);
        }
    }

    hideMessage() {
        const messageDiv = document.getElementById('connection-message');
        if (messageDiv) {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }
    }

    createConnection(sourcePin, targetPin) {
        // Ensure correct direction (output to input)
        if (sourcePin.pinType === 'input') {
            [sourcePin, targetPin] = [targetPin, sourcePin];
        }

        // Check if connection already exists
        const existingWire = this.wires.find(wire =>
            wire.sourceGate === sourcePin.gate.id &&
            wire.sourcePinIndex === sourcePin.pinIndex &&
            wire.targetGate === targetPin.gate.id &&
            wire.targetPinIndex === targetPin.pinIndex
        );

        if (existingWire) {
            this.showMessage('Connection already exists!', 'error');
            return;
        }

        // Generate wire color - use current selected color or default
        const wireColor = this.currentWireColor || '#48bb78';

        const wire = {
            sourceGate: sourcePin.gate.id,
            sourcePinIndex: sourcePin.pinIndex,
            targetGate: targetPin.gate.id,
            targetPinIndex: targetPin.pinIndex,
            element: null,
            color: wireColor,
            active: false
        };

        this.wires.push(wire);
        this.renderWire(wire);
        this.updateCounters();
    } renderWire(wire) {
        const sourceGate = this.gates.find(g => g.id === wire.sourceGate);
        const targetGate = this.gates.find(g => g.id === wire.targetGate);

        if (!sourceGate || !targetGate) return;

        // Calculate wire coordinates
        const sourceX = sourceGate.x + sourceGate.width;
        const sourceY = sourceGate.y + sourceGate.height / 2 + wire.sourcePinIndex * 16;
        const targetX = targetGate.x;
        const targetY = targetGate.y + targetGate.height / 2 + wire.targetPinIndex * 16;

        // Create SVG wire
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'wire');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';

        // Create main wire path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Calculate smooth curve
        const deltaX = targetX - sourceX;
        const controlOffset = Math.max(50, Math.abs(deltaX) * 0.5);
        const controlX1 = sourceX + controlOffset;
        const controlX2 = targetX - controlOffset;

        const d = `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY}, ${controlX2} ${targetY}, ${targetX} ${targetY}`;

        path.setAttribute('d', d);
        path.setAttribute('stroke', wire.color || '#48bb78');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.style.pointerEvents = 'stroke';
        path.style.cursor = 'pointer';

        // Add double-click to delete
        path.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (confirm('Delete this connection?')) {
                this.deleteWire(wire);
            }
        });

        // Add hover effect
        path.addEventListener('mouseenter', () => {
            path.setAttribute('stroke-width', '5');
            path.style.filter = 'drop-shadow(0 0 6px currentColor)';
        });

        path.addEventListener('mouseleave', () => {
            path.setAttribute('stroke-width', '3');
            path.style.filter = 'none';
        });

        // Add connection points
        const sourcePoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        sourcePoint.setAttribute('cx', sourceX);
        sourcePoint.setAttribute('cy', sourceY);
        sourcePoint.setAttribute('r', '4');
        sourcePoint.setAttribute('fill', wire.color || '#48bb78');
        sourcePoint.setAttribute('stroke', 'white');
        sourcePoint.setAttribute('stroke-width', '2');

        const targetPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        targetPoint.setAttribute('cx', targetX);
        targetPoint.setAttribute('cy', targetY);
        targetPoint.setAttribute('r', '4');
        targetPoint.setAttribute('fill', wire.color || '#48bb78');
        targetPoint.setAttribute('stroke', 'white');
        targetPoint.setAttribute('stroke-width', '2');

        svg.appendChild(path);
        svg.appendChild(sourcePoint);
        svg.appendChild(targetPoint);

        wire.element = svg;
        this.canvas.appendChild(svg);
    }

    updateWires() {
        this.wires.forEach(wire => {
            const sourceGate = this.gates.find(g => g.id === wire.sourceGate);
            const targetGate = this.gates.find(g => g.id === wire.targetGate);

            if (sourceGate && targetGate && wire.element) {
                // Remove old wire and create new one with updated positions
                if (wire.element.parentNode) {
                    this.canvas.removeChild(wire.element);
                }
                this.renderWire(wire);
            }
        });
    }

    deleteWire(wire) {
        // Remove wire from canvas
        if (wire.element && wire.element.parentNode) {
            wire.element.style.opacity = '0';
            wire.element.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (wire.element && wire.element.parentNode) {
                    this.canvas.removeChild(wire.element);
                }
            }, 300);
        }

        // Remove wire from array
        this.wires = this.wires.filter(w => w !== wire);

        this.showMessage('Connection deleted', 'info');
        this.updateCounters();
    }

    deleteGate(gate) {
        if (confirm(`Delete ${gate.type} gate?`)) {
            // Remove wires connected to this gate with animation
            const connectedWires = this.wires.filter(wire =>
                wire.sourceGate === gate.id || wire.targetGate === gate.id
            );

            connectedWires.forEach(wire => {
                if (wire.element) {
                    wire.element.style.opacity = '0';
                    wire.element.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        if (wire.element && wire.element.parentNode) {
                            this.canvas.removeChild(wire.element);
                        }
                    }, 300);
                }
            });

            // Remove wires from array
            this.wires = this.wires.filter(wire =>
                wire.sourceGate !== gate.id && wire.targetGate !== gate.id
            );

            // Animate gate removal
            gate.element.style.transform = 'scale(0)';
            gate.element.style.opacity = '0';
            gate.element.style.transition = 'all 0.3s ease';

            setTimeout(() => {
                // Remove gate
                this.gates = this.gates.filter(g => g.id !== gate.id);
                if (gate.element && gate.element.parentNode) {
                    this.canvas.removeChild(gate.element);
                }
                this.updateInputControls();
                this.updateCounters();
            }, 300);

            this.showMessage(`${gate.type} gate deleted`, 'info');
        }
    }

    updateInputControls() {
        const inputControlsDiv = document.getElementById('input-values');
        inputControlsDiv.innerHTML = '';

        const inputGates = this.gates.filter(gate => gate.type === 'INPUT');

        if (inputGates.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-plus-circle"></i>
                <p>Add input gates to control values</p>
            `;
            inputControlsDiv.appendChild(emptyState);
            return;
        }

        inputGates.forEach((gate, index) => {
            const controlDiv = document.createElement('div');
            controlDiv.className = 'input-toggle';

            const label = document.createElement('span');
            label.textContent = `Input ${index + 1}`;
            label.style.fontWeight = 'bold';
            label.style.color = '#4a5568';

            // Add current value display
            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'input-value-display';
            valueDisplay.textContent = `(${gate.outputValues[0]})`;
            valueDisplay.style.marginLeft = '8px';
            valueDisplay.style.fontSize = '14px';
            valueDisplay.style.fontWeight = 'bold';
            valueDisplay.style.color = gate.outputValues[0] ? '#48bb78' : '#f56565';

            const toggleSwitch = document.createElement('div');
            toggleSwitch.className = 'toggle-switch';
            if (gate.outputValues[0]) toggleSwitch.classList.add('active');

            const slider = document.createElement('div');
            slider.className = 'toggle-slider';
            toggleSwitch.appendChild(slider);

            toggleSwitch.addEventListener('click', () => {
                // Animate the toggle
                toggleSwitch.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    toggleSwitch.style.transform = 'scale(1)';
                }, 150);

                gate.outputValues[0] = gate.outputValues[0] ? 0 : 1;
                toggleSwitch.classList.toggle('active');

                // Update value display
                valueDisplay.textContent = `(${gate.outputValues[0]})`;
                valueDisplay.style.color = gate.outputValues[0] ? '#48bb78' : '#f56565';

                this.updateGateDisplay(gate);

                // Show feedback message
                this.showMessage(`Input ${index + 1} set to ${gate.outputValues[0]}`, 'info');
            });

            controlDiv.appendChild(label);
            controlDiv.appendChild(valueDisplay);
            controlDiv.appendChild(toggleSwitch);
            inputControlsDiv.appendChild(controlDiv);
        });
    }

    updateGateDisplay(gate) {
        if (gate.type === 'INPUT') {
            gate.element.style.background = gate.outputValues[0] ? '#48bb78' : '#cbd5e0';
        } else if (gate.type === 'OUTPUT') {
            gate.element.style.background = gate.inputValues[0] ? '#48bb78' : '#cbd5e0';
        }
    }

    simulate() {
        // Only show loading if there are gates to simulate
        if (this.gates.length === 0) {
            alert('Please add some gates to the canvas before simulating.');
            return;
        }

        const totalGates = this.gates.length;
        const totalWires = this.wires.length;
        this.showLoading(`Simulating ${totalGates} gates, ${totalWires} connections...`);

        setTimeout(() => {
            try {
                // Reset all gate values
                this.gates.forEach(gate => {
                    if (gate.type !== 'INPUT') {
                        gate.inputValues.fill(0);
                        gate.outputValues.fill(0);
                    }
                });

                // Add simulation class to all gates
                this.gates.forEach(gate => {
                    gate.element.classList.add('simulating');
                });

                // Propagate signals with animation
                this.animatedPropagation();
            } catch (error) {
                console.error('Simulation error:', error);
                this.hideLoading();
                alert('Simulation failed: ' + error.message);
            }
        }, 500);
    }

    async animatedPropagation() {
        // Multiple iterations to handle complex circuits
        for (let iteration = 0; iteration < 15; iteration++) {
            // Update progress message
            const progressElement = document.getElementById('simulation-progress');
            if (progressElement) {
                const messageElement = progressElement.querySelector('.progress-text');
                if (messageElement) {
                    messageElement.textContent = `Signal propagation: Wave ${iteration + 1}/15`;
                }
            }

            let changed = false;
            const animationPromises = [];

            // Animate signal propagation through ALL wires
            for (const wire of this.wires) {
                const sourceGate = this.gates.find(g => g.id === wire.sourceGate);
                const targetGate = this.gates.find(g => g.id === wire.targetGate);

                if (sourceGate && targetGate) {
                    const oldValue = targetGate.inputValues[wire.targetPinIndex];
                    const newValue = sourceGate.outputValues[wire.sourcePinIndex];

                    // Always animate wire transmission regardless of value change
                    if (wire.element) {
                        const animationPromise = this.animateValueThroughWire(wire, newValue);
                        animationPromises.push(animationPromise);
                    }

                    // Update input value
                    if (oldValue !== newValue) {
                        targetGate.inputValues[wire.targetPinIndex] = newValue;
                        changed = true;
                    }
                }
            }

            // Wait for all wire animations to complete
            await Promise.all(animationPromises);

            // Process ALL gates with animation
            const gateAnimationPromises = [];
            this.gates.forEach(gate => {
                if (gate.type !== 'INPUT') {
                    const oldOutput = [...gate.outputValues];
                    this.calculateGateOutput(gate);

                    // Always animate gate processing for visual feedback
                    const gateAnimationPromise = this.animateGateProcessing(gate);
                    gateAnimationPromises.push(gateAnimationPromise);

                    if (JSON.stringify(oldOutput) !== JSON.stringify(gate.outputValues)) {
                        changed = true;
                    }
                }
            });

            // Wait for all gate animations to complete
            await Promise.all(gateAnimationPromises);

            // Visual delay between iterations
            await this.delay(300);

            if (!changed) break;
        }

        // Update progress message for final phase
        const progressElement = document.getElementById('simulation-progress');
        if (progressElement) {
            const messageElement = progressElement.querySelector('.progress-text');
            if (messageElement) {
                messageElement.textContent = 'Finalizing simulation results...';
            }
        }

        // Update visual feedback
        this.gates.forEach(gate => {
            this.updateGateDisplay(gate);
            gate.element.classList.remove('simulating');
        });

        this.updateWireDisplay();
        this.generateTruthTable();
        this.displaySimulationResults();

        this.hideLoading();
    }

    async animateValueThroughWire(wire, value) {
        const sourceGate = this.gates.find(g => g.id === wire.sourceGate);
        const targetGate = this.gates.find(g => g.id === wire.targetGate);

        if (!sourceGate || !targetGate || !wire.element) return;

        // Calculate wire coordinates - same as renderWire()
        const sourceX = sourceGate.x + sourceGate.width;
        const sourceY = sourceGate.y + sourceGate.height / 2 + wire.sourcePinIndex * 16;
        const targetX = targetGate.x;
        const targetY = targetGate.y + targetGate.height / 2 + wire.targetPinIndex * 16;

        // Create animated value indicator with better styling
        const valueIndicator = document.createElement('div');
        valueIndicator.className = 'value-indicator';
        valueIndicator.textContent = value;
        valueIndicator.style.position = 'absolute';
        valueIndicator.style.left = sourceX + 'px';
        valueIndicator.style.top = sourceY + 'px';
        valueIndicator.style.background = value ? '#48bb78' : '#f56565';
        valueIndicator.style.color = 'white';
        valueIndicator.style.borderRadius = '50%';
        valueIndicator.style.width = '20px';
        valueIndicator.style.height = '20px';
        valueIndicator.style.display = 'flex';
        valueIndicator.style.alignItems = 'center';
        valueIndicator.style.justifyContent = 'center';
        valueIndicator.style.fontSize = '12px';
        valueIndicator.style.fontWeight = 'bold';
        valueIndicator.style.zIndex = '1000';
        valueIndicator.style.boxShadow = '0 3px 8px rgba(0,0,0,0.3)';
        valueIndicator.style.border = '2px solid white';
        valueIndicator.style.transform = 'scale(1.1)';
        valueIndicator.style.transition = 'none'; // Remove CSS transition, use JS animation

        this.canvas.appendChild(valueIndicator);

        // Use the SAME curve calculation as renderWire()
        const deltaX = targetX - sourceX;
        const controlOffset = Math.max(50, Math.abs(deltaX) * 0.5);
        const controlX1 = sourceX + controlOffset;
        const controlX2 = targetX - controlOffset;

        // Animate along the exact SVG path using cubic bezier curve
        const steps = 20; // More steps for smoother animation
        const duration = 1500; // Total animation duration in ms
        const stepDelay = duration / steps;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;

            // Cubic Bezier curve: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
            // P₀ = (sourceX, sourceY), P₁ = (controlX1, sourceY), P₂ = (controlX2, targetY), P₃ = (targetX, targetY)
            const oneMinusT = 1 - t;
            const oneMinusT2 = oneMinusT * oneMinusT;
            const oneMinusT3 = oneMinusT2 * oneMinusT;
            const t2 = t * t;
            const t3 = t2 * t;

            const x = oneMinusT3 * sourceX +
                3 * oneMinusT2 * t * controlX1 +
                3 * oneMinusT * t2 * controlX2 +
                t3 * targetX;

            const y = oneMinusT3 * sourceY +
                3 * oneMinusT2 * t * sourceY +
                3 * oneMinusT * t2 * targetY +
                t3 * targetY;

            // Smooth movement with requestAnimationFrame
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    if (valueIndicator.parentNode) {
                        valueIndicator.style.left = (x - 10) + 'px'; // Center the indicator
                        valueIndicator.style.top = (y - 10) + 'px';

                        // Add pulsing effect at midpoint
                        if (i === Math.floor(steps / 2)) {
                            valueIndicator.style.transform = 'scale(1.3)';
                            valueIndicator.style.boxShadow = '0 0 15px currentColor';
                        } else if (i === steps) {
                            valueIndicator.style.transform = 'scale(1.4)';
                            valueIndicator.style.boxShadow = '0 0 20px currentColor';
                        }
                    }
                    setTimeout(resolve, stepDelay);
                });
            });
        }

        // Highlight the wire during animation
        const path = wire.element.querySelector('path');
        if (path) {
            const originalStroke = path.getAttribute('stroke');
            const originalWidth = path.getAttribute('stroke-width');
            path.setAttribute('stroke', value ? '#48bb78' : '#f56565');
            path.setAttribute('stroke-width', '5');
            path.style.filter = 'drop-shadow(0 0 8px currentColor)';

            // Pulse effect
            setTimeout(() => {
                if (path) {
                    path.setAttribute('stroke', originalStroke);
                    path.setAttribute('stroke-width', originalWidth);
                    path.style.filter = 'none';
                }
            }, 800);
        }

        // Wait for final position
        await this.delay(200);

        // Pulse effect before removal
        valueIndicator.style.transform = 'scale(0.8)';
        valueIndicator.style.opacity = '0.8';

        await this.delay(150);

        // Remove the indicator with fade
        valueIndicator.style.opacity = '0';
        valueIndicator.style.transform = 'scale(0)';
        valueIndicator.style.transition = 'all 0.2s ease';

        await this.delay(200);

        if (valueIndicator.parentNode) {
            valueIndicator.parentNode.removeChild(valueIndicator);
        }
    }

    async animateGateProcessing(gate) {
        const valueDisplay = gate.element.querySelector('.gate-value-display');

        // Show processing animation with more dramatic effect
        gate.element.style.transform = 'scale(1.15)';
        gate.element.style.background = '#fef5e7';
        gate.element.style.borderColor = '#f6ad55';
        gate.element.style.boxShadow = '0 0 20px rgba(246, 173, 85, 0.6)';
        gate.element.style.transition = 'all 0.3s ease';

        // Show input and output values with better styling
        if (valueDisplay) {
            valueDisplay.style.display = 'block';
            valueDisplay.style.transition = 'all 0.3s ease';

            // For logic gates, show input → output transformation
            if (gate.type !== 'INPUT' && gate.type !== 'OUTPUT') {
                const inputStr = gate.inputValues.join(',');
                valueDisplay.textContent = `${inputStr}→${gate.outputValues[0]}`;
                valueDisplay.style.background = gate.outputValues[0] ? '#48bb78' : '#f56565';
                valueDisplay.style.color = 'white';
                valueDisplay.style.fontSize = '11px';
                valueDisplay.style.padding = '3px 8px';
                valueDisplay.style.borderRadius = '12px';
                valueDisplay.style.border = '2px solid white';
                valueDisplay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            } else if (gate.type === 'OUTPUT') {
                valueDisplay.textContent = gate.inputValues[0] || 0;
                valueDisplay.style.background = gate.inputValues[0] ? '#48bb78' : '#f56565';
                valueDisplay.style.color = 'white';
            } else {
                valueDisplay.textContent = gate.outputValues[0];
                valueDisplay.style.background = gate.outputValues[0] ? '#48bb78' : '#f56565';
                valueDisplay.style.color = 'white';
            }
        }

        // Processing delay with pulse effect
        await this.delay(200);

        // Pulse effect
        gate.element.style.transform = 'scale(1.05)';
        await this.delay(200);

        gate.element.style.transform = 'scale(1.15)';
        await this.delay(200);

        // Reset animation
        gate.element.style.transform = 'scale(1)';
        gate.element.style.background = '';
        gate.element.style.borderColor = '';
        gate.element.style.boxShadow = '';

        // Keep value display visible longer for better readability
        await this.delay(300);

        if (valueDisplay) {
            setTimeout(() => {
                valueDisplay.style.opacity = '0.8';
                setTimeout(() => {
                    valueDisplay.style.display = 'none';
                    valueDisplay.style.opacity = '1';
                }, 2000);
            }, 1500);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    calculateGateOutput(gate) {
        switch (gate.type) {
            case 'INPUT':
                // Input values are set by user, no calculation needed
                break;
            case 'OUTPUT':
                // Output displays input value
                break;
            case 'NOT':
                gate.outputValues[0] = gate.inputValues[0] ? 0 : 1;
                break;
            case 'AND':
                gate.outputValues[0] = gate.inputValues[0] && gate.inputValues[1] ? 1 : 0;
                break;
            case 'OR':
                gate.outputValues[0] = gate.inputValues[0] || gate.inputValues[1] ? 1 : 0;
                break;
            case 'NAND':
                gate.outputValues[0] = gate.inputValues[0] && gate.inputValues[1] ? 0 : 1;
                break;
            case 'NOR':
                gate.outputValues[0] = gate.inputValues[0] || gate.inputValues[1] ? 0 : 1;
                break;
            case 'XOR':
                gate.outputValues[0] = gate.inputValues[0] !== gate.inputValues[1] ? 1 : 0;
                break;
            case 'XNOR':
                gate.outputValues[0] = gate.inputValues[0] === gate.inputValues[1] ? 1 : 0;
                break;
        }
    }

    updateWireDisplay() {
        this.wires.forEach(wire => {
            const sourceGate = this.gates.find(g => g.id === wire.sourceGate);
            if (sourceGate && wire.element) {
                const wireGroup = wire.element.querySelector('.wire-group');
                if (wireGroup) {
                    const path = wireGroup.querySelector('.wire-path');
                    const shadowPath = wireGroup.querySelector('.wire-shadow');
                    const connectionPoints = wireGroup.querySelectorAll('.connection-point');

                    const isActive = sourceGate.outputValues[wire.sourcePinIndex];
                    wire.active = isActive;

                    if (isActive) {
                        // Active state - brighter, animated
                        path.setAttribute('stroke', wire.color);
                        path.setAttribute('stroke-width', '4');
                        path.style.filter = 'drop-shadow(0 0 8px currentColor) brightness(1.2)';

                        // Animate connection points
                        connectionPoints.forEach(point => {
                            point.style.animation = 'pulse 1s infinite';
                            point.setAttribute('fill', wire.color);
                        });

                        // Add flow animation
                        path.style.strokeDasharray = '8, 4';
                        path.style.strokeDashoffset = '0';
                        path.style.animation = 'wireFlow 1s linear infinite';

                    } else {
                        // Inactive state - dimmed
                        const dimColor = this.adjustColorBrightness(wire.color, -0.4);
                        path.setAttribute('stroke', dimColor);
                        path.setAttribute('stroke-width', '3');
                        path.style.filter = 'none';
                        path.style.animation = 'none';
                        path.style.strokeDasharray = 'none';

                        connectionPoints.forEach(point => {
                            point.style.animation = 'none';
                            point.setAttribute('fill', dimColor);
                        });
                    }
                }
            }
        });
    }

    adjustColorBrightness(color, factor) {
        // Convert hex to RGB, adjust brightness, convert back
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const newR = Math.max(0, Math.min(255, r + (r * factor)));
        const newG = Math.max(0, Math.min(255, g + (g * factor)));
        const newB = Math.max(0, Math.min(255, b + (b * factor)));

        return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
    }

    generateTruthTable() {
        const inputGates = this.gates.filter(gate => gate.type === 'INPUT').sort((a, b) => a.id - b.id);
        const outputGates = this.gates.filter(gate => gate.type === 'OUTPUT').sort((a, b) => a.id - b.id);
        const logicGates = this.gates.filter(gate => !['INPUT', 'OUTPUT'].includes(gate.type)).sort((a, b) => a.id - b.id);

        if (inputGates.length === 0) {
            document.getElementById('truth-table').innerHTML = '<div class="truth-table-container"><div class="truth-table-wrapper"><p style="padding: 20px; text-align: center; color: var(--text-secondary);">Add input gates to generate truth table</p></div></div>';
            return;
        }

        const numInputs = inputGates.length;
        const numCombinations = Math.pow(2, numInputs);

        // Initialize pagination if not exists
        if (!this.truthTablePagination) {
            this.truthTablePagination = {
                currentPage: 1,
                rowsPerPage: Math.min(16, numCombinations), // Default to 16 rows or total if less
                totalRows: numCombinations
            };
        } else {
            this.truthTablePagination.totalRows = numCombinations;
        }

        this.renderTruthTable(inputGates, outputGates, logicGates);
    }

    renderTruthTable(inputGates, outputGates, logicGates) {
        const pagination = this.truthTablePagination;
        const totalPages = Math.ceil(pagination.totalRows / pagination.rowsPerPage);
        const startRow = (pagination.currentPage - 1) * pagination.rowsPerPage;
        const endRow = Math.min(startRow + pagination.rowsPerPage, pagination.totalRows);

        let containerHTML = '<div class="truth-table-container">';

        containerHTML += `
            <div class="truth-table-header">
                <div class="truth-table-controls">
                    <div class="truth-table-pagination">
                        <button class="truth-table-nav-btn" onclick="simulator.changeTruthTablePage(-1)" ${pagination.currentPage <= 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i> Prev
                        </button>
                        <span class="truth-table-info">Page ${pagination.currentPage} of ${totalPages}</span>
                        <button class="truth-table-nav-btn" onclick="simulator.changeTruthTablePage(1)" ${pagination.currentPage >= totalPages ? 'disabled' : ''}>
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <select class="truth-table-select" onchange="simulator.changeTruthTableRowsPerPage(this.value)">
                        <option value="8" ${pagination.rowsPerPage === 8 ? 'selected' : ''}>8 rows</option>
                        <option value="16" ${pagination.rowsPerPage === 16 ? 'selected' : ''}>16 rows</option>
                        <option value="32" ${pagination.rowsPerPage === 32 ? 'selected' : ''}>32 rows</option>
                        <option value="64" ${pagination.rowsPerPage === 64 ? 'selected' : ''}>64 rows</option>
                        <option value="${pagination.totalRows}" ${pagination.rowsPerPage >= pagination.totalRows ? 'selected' : ''}>All</option>
                    </select>
                </div>
            </div>
        `;

        // Scrollable table wrapper
        containerHTML += '<div class="truth-table-wrapper">';

        let tableHTML = '<table class="truth-table"><thead><tr>';

        // Input headers
        inputGates.forEach((gate, index) => {
            tableHTML += `<th class="input-header">Input ${index + 1}</th>`;
        });

        // Logic gate headers
        logicGates.forEach((gate, index) => {
            tableHTML += `<th class="logic-header">${gate.type} ${index + 1}</th>`;
        });

        // Output headers
        outputGates.forEach((gate, index) => {
            tableHTML += `<th class="output-header">Output ${index + 1}</th>`;
        });

        tableHTML += '</tr></thead><tbody>';

        // Generate rows for current page
        for (let i = startRow; i < endRow; i++) {
            tableHTML += '<tr>';

            // Set input values and display them
            for (let j = 0; j < inputGates.length; j++) {
                const value = (i >> (inputGates.length - 1 - j)) & 1;
                inputGates[j].outputValues[0] = value;
                const cellClass = value ? 'input-cell-true' : 'input-cell-false';
                tableHTML += `<td class="${cellClass}">${value}</td>`;
            }

            // Simulate circuit with current inputs (without animation)
            this.simulateForTruthTable();

            // Display logic gate outputs
            logicGates.forEach(gate => {
                const value = gate.outputValues[0] || 0;
                const cellClass = value ? 'logic-cell-true' : 'logic-cell-false';
                tableHTML += `<td class="${cellClass}">${value}</td>`;
            });

            // Display final outputs
            outputGates.forEach(gate => {
                const value = gate.inputValues[0] || 0;
                const cellClass = value ? 'output-cell-true' : 'output-cell-false';
                tableHTML += `<td class="${cellClass}">${value}</td>`;
            });

            tableHTML += '</tr>';
        }

        tableHTML += '</tbody></table>';

        containerHTML += tableHTML + '</div>'; // Close wrapper

        // Footer with summary
        containerHTML += `
            <div class="truth-table-footer">
                <div class="truth-table-footer-content">
                    <div>
                        <strong>Showing rows ${startRow + 1}-${endRow} of ${pagination.totalRows}</strong>
                    </div>
                    <div class="truth-table-summary">
                        <span><strong>Inputs:</strong> ${inputGates.length}</span>
                        <span><strong>Logic Gates:</strong> ${logicGates.length}</span>
                        <span><strong>Outputs:</strong> ${outputGates.length}</span>
                        <span><strong>Wires:</strong> ${this.wires.length}</span>
                    </div>
                </div>
            </div>
        `;

        containerHTML += '</div>'; // Close container

        document.getElementById('truth-table').innerHTML = containerHTML;
    }

    changeTruthTablePage(direction) {
        if (!this.truthTablePagination) return;

        const pagination = this.truthTablePagination;
        const totalPages = Math.ceil(pagination.totalRows / pagination.rowsPerPage);
        const newPage = pagination.currentPage + direction;

        if (newPage >= 1 && newPage <= totalPages) {
            pagination.currentPage = newPage;
            this.generateTruthTable();
        }
    }

    changeTruthTableRowsPerPage(newRowsPerPage) {
        if (!this.truthTablePagination) return;

        this.truthTablePagination.rowsPerPage = parseInt(newRowsPerPage);
        this.truthTablePagination.currentPage = 1; // Reset to first page
        this.generateTruthTable();
    }

    simulateForTruthTable() {
        // Similar to simulate() but without visual updates
        for (let iteration = 0; iteration < 10; iteration++) {
            let changed = false;

            this.wires.forEach(wire => {
                const sourceGate = this.gates.find(g => g.id === wire.sourceGate);
                const targetGate = this.gates.find(g => g.id === wire.targetGate);

                if (sourceGate && targetGate) {
                    const newValue = sourceGate.outputValues[wire.sourcePinIndex];
                    if (targetGate.inputValues[wire.targetPinIndex] !== newValue) {
                        targetGate.inputValues[wire.targetPinIndex] = newValue;
                        changed = true;
                    }
                }
            });

            this.gates.forEach(gate => {
                if (gate.type !== 'INPUT') {
                    const oldOutput = [...gate.outputValues];
                    this.calculateGateOutput(gate);
                    if (JSON.stringify(oldOutput) !== JSON.stringify(gate.outputValues)) {
                        changed = true;
                    }
                }
            });

            if (!changed) break;
        }
    }

    displaySimulationResults() {
        const output = document.getElementById('simulation-output');
        const inputGates = this.gates.filter(gate => gate.type === 'INPUT').sort((a, b) => a.id - b.id);
        const outputGates = this.gates.filter(gate => gate.type === 'OUTPUT').sort((a, b) => a.id - b.id);
        const logicGates = this.gates.filter(gate => !['INPUT', 'OUTPUT'].includes(gate.type)).sort((a, b) => a.id - b.id);

        let resultHTML = '<div class="simulation-results">';

        // Current state header
        resultHTML += '<h3 style="color: #2d3748; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">🔄 Current Simulation State</h3>';

        // Input values section
        if (inputGates.length > 0) {
            resultHTML += '<div style="margin-bottom: 20px; padding: 15px; background: #e6fffa; border-radius: 8px; border-left: 4px solid #38b2ac;">';
            resultHTML += '<h4 style="color: #234e52; margin: 0 0 12px 0;">📥 Input Values</h4>';
            inputGates.forEach((gate, index) => {
                const value = gate.outputValues[0];
                const statusColor = value ? '#38b2ac' : '#e53e3e';
                const statusIcon = value ? '🟢' : '🔴';
                resultHTML += `<div style="margin: 8px 0; display: flex; align-items: center;">
                    <span style="font-weight: bold; color: #2d3748;">Input ${index + 1}:</span>
                    <span style="margin-left: 10px; color: ${statusColor}; font-weight: bold; font-size: 16px;">${statusIcon} ${value}</span>
                </div>`;
            });
            resultHTML += '</div>';
        }

        // Logic gates section
        if (logicGates.length > 0) {
            resultHTML += '<div style="margin-bottom: 20px; padding: 15px; background: #fef5e7; border-radius: 8px; border-left: 4px solid #d69e2e;">';
            resultHTML += '<h4 style="color: #744210; margin: 0 0 12px 0;">⚙️ Logic Gate Processing</h4>';
            logicGates.forEach((gate, index) => {
                const inputValues = gate.inputValues.join(', ');
                const outputValue = gate.outputValues[0] || 0;
                const statusColor = outputValue ? '#d69e2e' : '#e53e3e';
                const statusIcon = outputValue ? '🟢' : '🔴';
                resultHTML += `<div style="margin: 8px 0; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: bold; color: #2d3748;">${gate.type} Gate ${index + 1}:</span>
                        <span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${outputValue}</span>
                    </div>
                    <div style="margin-top: 4px; font-size: 12px; color: #718096;">
                        Inputs: [${inputValues}] → Output: ${outputValue}
                    </div>
                </div>`;
            });
            resultHTML += '</div>';
        }

        // Output values section
        if (outputGates.length > 0) {
            resultHTML += '<div style="margin-bottom: 20px; padding: 15px; background: #f0fff4; border-radius: 8px; border-left: 4px solid #38a169;">';
            resultHTML += '<h4 style="color: #22543d; margin: 0 0 12px 0;">📤 Final Outputs</h4>';
            outputGates.forEach((gate, index) => {
                const value = gate.inputValues[0] || 0;
                const statusColor = value ? '#38a169' : '#e53e3e';
                const statusIcon = value ? '🟢' : '🔴';
                resultHTML += `<div style="margin: 8px 0; display: flex; align-items: center;">
                    <span style="font-weight: bold; color: #2d3748;">Output ${index + 1}:</span>
                    <span style="margin-left: 10px; color: ${statusColor}; font-weight: bold; font-size: 16px;">${statusIcon} ${value}</span>
                </div>`;
            });
            resultHTML += '</div>';
        }

        // Circuit summary
        resultHTML += '<div style="padding: 15px; background: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">';
        resultHTML += '<h4 style="color: #2d3748; margin: 0 0 10px 0;">📊 Circuit Summary</h4>';
        resultHTML += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; color: #4a5568;">
            <div><strong>Total Components:</strong> ${this.gates.length}</div>
            <div><strong>Connections:</strong> ${this.wires.length}</div>
            <div><strong>Circuit Depth:</strong> ${Math.max(...Object.values(this.calculateGateLevels()), 0) + 1}</div>
            <div><strong>Simulation Time:</strong> ${new Date().toLocaleTimeString()}</div>
        </div>`;
        resultHTML += '</div>';

        resultHTML += '</div>';
        output.innerHTML = resultHTML;
    }

    generateVerilog() {
        let verilogCode = '// Generated Verilog Code\n';
        verilogCode += '// Digital Logic Simulator\n\n';

        const inputGates = this.gates.filter(gate => gate.type === 'INPUT');
        const outputGates = this.gates.filter(gate => gate.type === 'OUTPUT');
        const logicGates = this.gates.filter(gate => gate.type !== 'INPUT' && gate.type !== 'OUTPUT');

        // Module declaration
        verilogCode += 'module digital_circuit (\n';

        // Input declarations
        if (inputGates.length > 0) {
            const inputs = inputGates.map((gate, index) => `input_${index + 1}`).join(', ');
            verilogCode += `    input ${inputs},\n`;
        }

        // Output declarations
        if (outputGates.length > 0) {
            const outputs = outputGates.map((gate, index) => `output_${index + 1}`).join(', ');
            verilogCode += `    output ${outputs}\n`;
        }

        verilogCode += ');\n\n';

        // Wire declarations
        if (logicGates.length > 0) {
            logicGates.forEach(gate => {
                verilogCode += `    wire ${gate.id}_out;\n`;
            });
            verilogCode += '\n';
        }

        // Gate instantiations
        logicGates.forEach(gate => {
            const inputs = this.getGateInputs(gate);

            switch (gate.type) {
                case 'NOT':
                    verilogCode += `    not (${gate.id}_out, ${inputs[0]});\n`;
                    break;
                case 'AND':
                    verilogCode += `    and (${gate.id}_out, ${inputs[0]}, ${inputs[1]});\n`;
                    break;
                case 'OR':
                    verilogCode += `    or (${gate.id}_out, ${inputs[0]}, ${inputs[1]});\n`;
                    break;
                case 'NAND':
                    verilogCode += `    nand (${gate.id}_out, ${inputs[0]}, ${inputs[1]});\n`;
                    break;
                case 'NOR':
                    verilogCode += `    nor (${gate.id}_out, ${inputs[0]}, ${inputs[1]});\n`;
                    break;
                case 'XOR':
                    verilogCode += `    xor (${gate.id}_out, ${inputs[0]}, ${inputs[1]});\n`;
                    break;
                case 'XNOR':
                    verilogCode += `    xnor (${gate.id}_out, ${inputs[0]}, ${inputs[1]});\n`;
                    break;
            }
        });

        // Output assignments
        outputGates.forEach((gate, index) => {
            const sourceWire = this.getOutputSource(gate);
            verilogCode += `    assign output_${index + 1} = ${sourceWire};\n`;
        });

        verilogCode += '\nendmodule\n';

        document.getElementById('verilog-code').value = verilogCode;
    }

    getGateInputs(gate) {
        const inputs = [];

        gate.inputs.forEach((input, index) => {
            const wire = this.wires.find(w =>
                w.targetGate === gate.id && w.targetPinIndex === index
            );

            if (wire) {
                const sourceGate = this.gates.find(g => g.id === wire.sourceGate);
                if (sourceGate.type === 'INPUT') {
                    const inputIndex = this.gates.filter(g => g.type === 'INPUT').indexOf(sourceGate);
                    inputs.push(`input_${inputIndex + 1}`);
                } else {
                    inputs.push(`${sourceGate.id}_out`);
                }
            } else {
                inputs.push('1\'b0'); // Default to 0 if not connected
            }
        });

        return inputs;
    }

    getOutputSource(outputGate) {
        const wire = this.wires.find(w =>
            w.targetGate === outputGate.id && w.targetPinIndex === 0
        );

        if (wire) {
            const sourceGate = this.gates.find(g => g.id === wire.sourceGate);
            if (sourceGate.type === 'INPUT') {
                const inputIndex = this.gates.filter(g => g.type === 'INPUT').indexOf(sourceGate);
                return `input_${inputIndex + 1}`;
            } else {
                return `${sourceGate.id}_out`;
            }
        }

        return '1\'b0'; // Default to 0 if not connected
    }

    saveDesign() {
        const design = {
            gates: this.gates.map(gate => ({
                id: gate.id,
                type: gate.type,
                x: gate.x,
                y: gate.y,
                outputValues: gate.outputValues
            })),
            wires: this.wires.map(wire => ({
                sourceGate: wire.sourceGate,
                sourcePinIndex: wire.sourcePinIndex,
                targetGate: wire.targetGate,
                targetPinIndex: wire.targetPinIndex
            }))
        };

        const dataStr = JSON.stringify(design, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'digital_circuit_design.json';
        link.click();
    }

    loadDesign() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const design = JSON.parse(e.target.result);
                        this.clearCanvas();
                        this.loadDesignData(design);
                    } catch (error) {
                        alert('Error loading design file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }

    loadDesignData(design) {
        // Load gates
        design.gates.forEach(gateData => {
            const gate = {
                id: gateData.id,
                type: gateData.type,
                x: gateData.x,
                y: gateData.y,
                inputs: [],
                outputs: [],
                inputValues: [],
                outputValues: gateData.outputValues || [],
                element: null
            };

            // Set gate properties based on type
            switch (gate.type) {
                case 'INPUT':
                    gate.inputs = [];
                    gate.outputs = ['out'];
                    gate.inputValues = [];
                    if (gate.outputValues.length === 0) gate.outputValues = [0];
                    break;
                case 'OUTPUT':
                    gate.inputs = ['in'];
                    gate.outputs = [];
                    gate.inputValues = [0];
                    gate.outputValues = [];
                    break;
                case 'NOT':
                    gate.inputs = ['in'];
                    gate.outputs = ['out'];
                    gate.inputValues = [0];
                    if (gate.outputValues.length === 0) gate.outputValues = [0];
                    break;
                default:
                    gate.inputs = ['in1', 'in2'];
                    gate.outputs = ['out'];
                    gate.inputValues = [0, 0];
                    if (gate.outputValues.length === 0) gate.outputValues = [0];
                    break;
            }

            this.gates.push(gate);
            this.renderGate(gate);
        });

        // Update gate counter
        this.gateCounter = Math.max(...this.gates.map(g => parseInt(g.id.split('_')[1]))) + 1;

        // Load wires
        design.wires.forEach(wireData => {
            const wire = {
                sourceGate: wireData.sourceGate,
                sourcePinIndex: wireData.sourcePinIndex,
                targetGate: wireData.targetGate,
                targetPinIndex: wireData.targetPinIndex,
                element: null
            };

            this.wires.push(wire);
            this.renderWire(wire);
        });

        this.updateInputControls();
    }

    clearCanvas() {
        this.gates.forEach(gate => {
            if (gate.element) {
                this.canvas.removeChild(gate.element);
            }
        });

        this.wires.forEach(wire => {
            if (wire.element) {
                this.canvas.removeChild(wire.element);
            }
        });

        this.gates = [];
        this.wires = [];
        this.gateCounter = 0;

        document.getElementById('input-values').innerHTML = '';
        document.getElementById('truth-table').innerHTML = '';
        document.getElementById('simulation-output').textContent = '';
        document.getElementById('verilog-code').value = '';
    }

    copyVerilogCode() {
        const verilogCode = document.getElementById('verilog-code');
        verilogCode.select();
        document.execCommand('copy');

        // Show feedback
        const btn = document.getElementById('copy-verilog-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }

    showModal(message) {
        const modal = document.getElementById('connection-modal');
        modal.querySelector('p').textContent = message;
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('connection-modal').style.display = 'none';
    }

    showLoading(message = 'Processing simulation...') {
        let loadingElement = document.getElementById('simulation-progress');

        if (!loadingElement) {
            // Create new loading overlay for top-right corner
            loadingElement = document.createElement('div');
            loadingElement.id = 'simulation-progress';
            loadingElement.innerHTML = `
                <div class="progress-content">
                    <div class="progress-spinner"></div>
                    <div class="progress-info">
                        <div class="progress-text">${message}</div>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
            `;

            // Styling
            loadingElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 280px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(8px);
                font-family: Inter, sans-serif;
            `;

            // Progress content styling
            const style = document.createElement('style');
            style.textContent = `
                .progress-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .progress-spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid var(--bg-muted);
                    border-top: 3px solid var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                .progress-info {
                    flex: 1;
                }
                
                .progress-text {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 8px;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 6px;
                    background: var(--bg-muted);
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
                    border-radius: 3px;
                    width: 0%;
                    animation: progress-animation 3s ease-in-out infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes progress-animation {
                    0%, 100% { width: 10%; }
                    50% { width: 90%; }
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(loadingElement);
        }

        // Update message
        const messageElement = loadingElement.querySelector('.progress-text');
        if (messageElement) {
            messageElement.textContent = message;
        }

        // Show with animation
        setTimeout(() => {
            loadingElement.style.opacity = '1';
            loadingElement.style.transform = 'translateX(0)';
        }, 10);

        // Safety timeout - auto hide after 15 seconds
        setTimeout(() => {
            this.hideLoading();
        }, 15000);
    }

    hideLoading() {
        const loadingElement = document.getElementById('simulation-progress');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            loadingElement.style.transform = 'translateX(100%)';

            setTimeout(() => {
                if (loadingElement.parentNode) {
                    loadingElement.parentNode.removeChild(loadingElement);
                }
            }, 300);
        }
    }

    // Clear all gates and wires from canvas
    clearAllGatesAndWires() {
        // Remove all gate elements from canvas
        this.gates.forEach(gate => {
            if (gate.element && gate.element.parentNode) {
                this.canvas.removeChild(gate.element);
            }
        });

        // Remove all wire elements from canvas
        this.wires.forEach(wire => {
            if (wire.element && wire.element.parentNode) {
                this.canvas.removeChild(wire.element);
            }
        });

        // Clear arrays
        this.gates = [];
        this.wires = [];
        this.gateCounter = 0;

        // Update UI
        this.updateCounters();
        this.updateInputControls();
    }

    // Create circuit from parsed Verilog code
    createCircuitFromParsedData(circuit) {
        console.log('=== CREATE CIRCUIT FROM PARSED DATA STARTED ===');
        console.log('Circuit data received:', circuit);

        // Check canvas availability
        if (!this.canvas) {
            console.error('Canvas not available!');
            return;
        }
        console.log('Canvas available:', this.canvas);

        // Clear existing circuit first
        console.log('Clearing existing circuit...');
        this.clearAllGatesAndWires();
        console.log('Circuit cleared. Current gates count:', this.gates.length);

        const gatePositions = this.calculateOptimalLayout(circuit);
        const createdGates = {};

        console.log('Gate positions calculated:', gatePositions);

        // Create input gates
        console.log('=== CREATING INPUT GATES ===');
        circuit.inputs.forEach((inputName, index) => {
            const pos = gatePositions.inputs[index];
            console.log(`Creating INPUT gate for ${inputName} at position:`, pos);
            this.createGate('INPUT', pos.x, pos.y);
            const gate = this.gates[this.gates.length - 1];
            createdGates[inputName] = gate;
            console.log(`Created INPUT gate:`, gate);
            console.log('Gate element in DOM:', gate.element);
        });

        // Create output gates
        console.log('=== CREATING OUTPUT GATES ===');
        circuit.outputs.forEach((outputName, index) => {
            const pos = gatePositions.outputs[index];
            console.log(`Creating OUTPUT gate for ${outputName} at position:`, pos);
            this.createGate('OUTPUT', pos.x, pos.y);
            const gate = this.gates[this.gates.length - 1];
            createdGates[outputName] = gate;
            console.log(`Created OUTPUT gate:`, gate);
            console.log('Gate element in DOM:', gate.element);
        });

        // Create logic gates (only non-WIRE types)
        console.log('=== CREATING LOGIC GATES ===');
        const logicGates = circuit.gates.filter(g => g.type !== 'WIRE');
        logicGates.forEach((gateInfo, index) => {
            const pos = gatePositions.logic[index];
            console.log(`Creating ${gateInfo.type} gate for ${gateInfo.output} at position:`, pos);
            this.createGate(gateInfo.type, pos.x, pos.y);
            const gate = this.gates[this.gates.length - 1];
            createdGates[gateInfo.output] = gate;
            console.log(`Created ${gateInfo.type} gate:`, gate);
            console.log('Gate element in DOM:', gate.element);
        });

        console.log('All created gates:', createdGates);
        console.log('Total gates after creation:', this.gates.length);

        // Check if gates are actually rendered
        console.log('Canvas children count:', this.canvas.children.length);
        console.log('Canvas children:', Array.from(this.canvas.children));

        // Wait for DOM updates, then create connections
        setTimeout(() => {
            console.log('Creating connections...');
            this.createConnectionsFromCircuit(circuit, createdGates);
        }, 200);
    }

    calculateOptimalLayout(circuit) {
        const canvasRect = this.canvas.getBoundingClientRect();
        console.log('Canvas dimensions:', canvasRect);

        const margin = 50;
        const gateSpacing = 120;
        const layerSpacing = 200;

        // Ensure we have minimum dimensions
        const canvasWidth = Math.max(canvasRect.width, 800);
        const canvasHeight = Math.max(canvasRect.height, 400);

        // Calculate layers for better organization
        const inputLayer = margin;
        const logicLayer = inputLayer + layerSpacing;
        const outputLayer = logicLayer + layerSpacing;

        const positions = {
            inputs: [],
            outputs: [],
            logic: []
        };

        // Position inputs vertically on the left
        circuit.inputs.forEach((input, index) => {
            const y = margin + index * gateSpacing;
            positions.inputs.push({
                x: inputLayer,
                y: Math.min(y, canvasHeight - 100) // Ensure within canvas
            });
            console.log(`Input ${input} positioned at:`, positions.inputs[index]);
        });

        // Position logic gates in the middle
        circuit.gates.forEach((gate, index) => {
            const y = margin + index * gateSpacing;
            positions.logic.push({
                x: logicLayer,
                y: Math.min(y, canvasHeight - 100) // Ensure within canvas
            });
            console.log(`Logic gate ${gate.type} positioned at:`, positions.logic[index]);
        });

        // Position outputs vertically on the right
        circuit.outputs.forEach((output, index) => {
            const y = margin + index * gateSpacing;
            positions.outputs.push({
                x: Math.min(outputLayer, canvasWidth - 150), // Ensure within canvas
                y: Math.min(y, canvasHeight - 100) // Ensure within canvas
            });
            console.log(`Output ${output} positioned at:`, positions.outputs[index]);
        });

        console.log('Final positions:', positions);
        return positions;
    }

    createConnectionsFromCircuit(circuit, createdGates) {
        console.log('Creating connections from circuit:', circuit, createdGates);

        // First, handle logic gate connections
        circuit.gates.forEach(gateInfo => {
            if (gateInfo.type === 'WIRE') {
                // Handle direct wire assignments (assign y1 = and_out)
                const sourceSignal = gateInfo.inputs[0];
                const targetSignal = gateInfo.output;

                console.log(`Processing WIRE: ${targetSignal} = ${sourceSignal}`);

                const sourceGate = createdGates[sourceSignal];
                const targetGate = createdGates[targetSignal];

                if (sourceGate && targetGate) {
                    console.log(`Connecting WIRE: ${sourceSignal} -> ${targetSignal}`);
                    const sourcePin = {
                        gate: sourceGate,
                        pinType: 'output',
                        pinIndex: 0
                    };

                    const targetPin = {
                        gate: targetGate,
                        pinType: 'input',
                        pinIndex: 0
                    };

                    this.createConnection(sourcePin, targetPin);
                }
            } else {
                // Handle logic gate connections
                const outputGate = createdGates[gateInfo.output];

                console.log(`Processing ${gateInfo.type} gate: ${gateInfo.output}, inputs:`, gateInfo.inputs);

                gateInfo.inputs.forEach((inputSignal, inputIndex) => {
                    const sourceGate = createdGates[inputSignal];

                    console.log(`Connecting input ${inputIndex}: ${inputSignal} -> ${gateInfo.output}`);

                    if (sourceGate && outputGate) {
                        // Find the output pin from source gate (usually index 0)
                        const sourcePin = {
                            gate: sourceGate,
                            pinType: 'output',
                            pinIndex: 0
                        };

                        // Find the input pin on target gate
                        const targetPin = {
                            gate: outputGate,
                            pinType: 'input',
                            pinIndex: inputIndex
                        };

                        // Create the connection
                        console.log(`Creating connection:`, sourcePin, targetPin);
                        this.createConnection(sourcePin, targetPin);
                    } else {
                        console.log(`Could not find gates for connection: ${inputSignal} -> ${gateInfo.output}`);
                        console.log(`Source gate:`, sourceGate, `Target gate:`, outputGate);
                    }
                });
            }
        });

        // Auto-arrange for better visualization
        setTimeout(() => {
            this.autoArrangeGates();
            this.showMessage('Circuit generated successfully from Verilog code!', 'success');
            this.updateCounters();
            this.updateInputControls();
        }, 300);
    } handleCanvasClick(e) {
        if (this.connectionMode && !e.target.classList.contains('pin')) {
            // Cancel connection mode if clicking on empty canvas
            this.cancelConnectionMode();
        }
    }

    autoArrangeGates() {
        if (this.gates.length === 0) return;

        // Analyze circuit topology for intelligent layout
        const inputs = this.gates.filter(g => g.type === 'INPUT');
        const outputs = this.gates.filter(g => g.type === 'OUTPUT');
        const logicGates = this.gates.filter(g => !['INPUT', 'OUTPUT'].includes(g.type));

        // Calculate canvas size based on number of gates
        const canvasRect = this.canvas.getBoundingClientRect();
        const totalGates = this.gates.length;
        const maxGatesPerColumn = Math.max(3, Math.ceil(Math.sqrt(totalGates)));

        // Dynamic spacing based on canvas size and gate count
        const startX = 80;
        const startY = 60;
        const verticalSpacing = Math.max(120, Math.min(200, (canvasRect.height - 200) / maxGatesPerColumn));
        const horizontalSpacing = Math.max(200, Math.min(300, (canvasRect.width - 300) / Math.max(1, outputs.length ? 4 : 3)));

        // Calculate gate levels based on connections (depth analysis)
        const gateLevels = this.calculateGateLevels();
        const maxLevel = Math.max(...Object.values(gateLevels), 0);

        // Arrange inputs on the left (level 0)
        inputs.forEach((gate, index) => {
            gate.x = startX;
            gate.y = startY + index * verticalSpacing;

            if (gate.element) {
                gate.element.style.left = gate.x + 'px';
                gate.element.style.top = gate.y + 'px';
                gate.element.style.transition = 'all 0.5s ease';
            }
        });

        // Arrange logic gates by levels (depth-based positioning)
        const gatesByLevel = {};
        logicGates.forEach(gate => {
            const level = gateLevels[gate.id] || 1;
            if (!gatesByLevel[level]) gatesByLevel[level] = [];
            gatesByLevel[level].push(gate);
        });

        // Position gates level by level with better distribution
        Object.keys(gatesByLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
            const levelGates = gatesByLevel[level];
            const levelY = startY;

            levelGates.forEach((gate, index) => {
                gate.x = startX + parseInt(level) * horizontalSpacing;
                gate.y = levelY + index * verticalSpacing;

                if (gate.element) {
                    gate.element.style.left = gate.x + 'px';
                    gate.element.style.top = gate.y + 'px';
                    gate.element.style.transition = 'all 0.5s ease';
                }
            });
        });

        // Arrange outputs on the right (final level) 
        const outputStartX = startX + (maxLevel + 1) * horizontalSpacing;
        outputs.forEach((gate, index) => {
            gate.x = Math.min(outputStartX, canvasRect.width - 150); // Ensure outputs stay in canvas
            gate.y = startY + index * verticalSpacing;

            if (gate.element) {
                gate.element.style.left = gate.x + 'px';
                gate.element.style.top = gate.y + 'px';
                gate.element.style.transition = 'all 0.5s ease';
            }
        });

        // Update all wire connections after positioning
        setTimeout(() => {
            this.updateWires();
        }, 100);

        this.showMessage(`Smart arrangement: ${inputs.length} INPUT → ${Object.keys(gatesByLevel).length} LEVELS → ${outputs.length} OUTPUT`, 'success');
    }

    calculateGateLevels() {
        const levels = {};
        const visited = new Set();

        // Initialize inputs at level 0
        this.gates.filter(g => g.type === 'INPUT').forEach(gate => {
            levels[gate.id] = 0;
        });

        // Calculate levels using topological sorting
        const calculateLevel = (gateId) => {
            if (visited.has(gateId)) return levels[gateId] || 0;
            visited.add(gateId);

            const gate = this.gates.find(g => g.id === gateId);
            if (!gate || gate.type === 'INPUT') return levels[gateId] || 0;

            // Find input wires to this gate
            const inputWires = this.wires.filter(w => w.targetGate === gateId);
            let maxInputLevel = 0;

            inputWires.forEach(wire => {
                const sourceLevel = calculateLevel(wire.sourceGate);
                maxInputLevel = Math.max(maxInputLevel, sourceLevel);
            });

            levels[gateId] = maxInputLevel + 1;
            return levels[gateId];
        };

        // Calculate levels for all gates
        this.gates.forEach(gate => {
            if (gate.type !== 'INPUT') {
                calculateLevel(gate.id);
            }
        });

        return levels;
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Hide loading overlay immediately when page loads
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.remove('show');
        loadingElement.style.display = 'none';
    }

    // Initialize simulator and make it globally accessible
    window.simulator = new DigitalLogicSimulator();

    // Initialize adaptive tooltips
    initializeAdaptiveTooltips();

    // Update copyright year automatically
    updateCopyrightYear();

    // Safety timeout to ensure loading is always hidden
    setTimeout(() => {
        if (loadingElement) {
            loadingElement.classList.remove('show');
            loadingElement.style.display = 'none';
        }
    }, 1000);
});

// ===== COPYRIGHT YEAR UPDATE =====
function updateCopyrightYear() {
    const currentYearElement = document.getElementById('current-year');
    if (currentYearElement) {
        const currentYear = new Date().getFullYear();
        currentYearElement.textContent = currentYear;
    }
}

// ===== ADAPTIVE TOOLTIP SYSTEM =====
function initializeAdaptiveTooltips() {
    // Remove any existing custom tooltips that might be causing conflicts
    const existingTooltips = document.querySelectorAll('.custom-tooltip, .tooltip');
    existingTooltips.forEach(tooltip => {
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    });

    const elementsWithTooltip = document.querySelectorAll('[title]');

    elementsWithTooltip.forEach(element => {
        // Store original title
        const originalTitle = element.getAttribute('title');
        element.setAttribute('data-tooltip', originalTitle);

        // Remove default browser tooltip
        element.removeAttribute('title');

        let tooltipTimeout;

        element.addEventListener('mouseenter', (e) => {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                showAdaptiveTooltip(element, originalTitle);
            }, 300); // Reduced delay for better responsiveness
        });

        element.addEventListener('mouseleave', () => {
            clearTimeout(tooltipTimeout);
            hideAdaptiveTooltip(element);
        });

        // Handle focus for accessibility
        element.addEventListener('focus', () => {
            showAdaptiveTooltip(element, originalTitle);
        });

        element.addEventListener('blur', () => {
            hideAdaptiveTooltip(element);
        });
    });
} function showAdaptiveTooltip(element, text) {
    // Remove any existing tooltip
    hideAdaptiveTooltip(element);

    // Create tooltip container
    const tooltip = document.createElement('div');
    tooltip.className = 'adaptive-tooltip';

    // Create arrow element
    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow';

    // Create text content
    const content = document.createElement('div');
    content.className = 'tooltip-content';
    content.textContent = text;

    tooltip.appendChild(content);
    tooltip.appendChild(arrow);

    // Style tooltip with enhanced positioning
    tooltip.style.cssText = `
        position: fixed;
        z-index: 10000;
        background: var(--bg-primary);
        color: var(--text-primary);
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 500;
        line-height: 1.4;
        max-width: 220px;
        word-wrap: break-word;
        white-space: normal;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        border: 1px solid var(--border-color);
        opacity: 0;
        transform: scale(0.9);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
    `;

    // Arrow styling
    arrow.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        transform: rotate(45deg);
    `;

    // Dark theme support
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
        tooltip.style.background = '#f8fafc';
        tooltip.style.color = '#1a202c';
        tooltip.style.borderColor = '#e2e8f0';
        arrow.style.background = '#f8fafc';
        arrow.style.borderColor = '#e2e8f0';
    }

    document.body.appendChild(tooltip);

    // Calculate optimal position with better logic
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
    };

    const padding = 12; // Safety padding from viewport edges
    let position = 'bottom'; // Default to bottom
    let left, top, arrowLeft, arrowTop;

    // Calculate horizontal center position
    const elementCenterX = rect.left + rect.width / 2;
    const tooltipHalfWidth = tooltipRect.width / 2;

    // Try bottom position first (preferred)
    if (rect.bottom + tooltipRect.height + padding < viewport.height) {
        position = 'bottom';
        top = rect.bottom + 8;

        // Center horizontally, but keep within viewport
        if (elementCenterX - tooltipHalfWidth < padding) {
            left = padding;
            arrowLeft = Math.max(10, elementCenterX - padding - 5);
        } else if (elementCenterX + tooltipHalfWidth > viewport.width - padding) {
            left = viewport.width - tooltipRect.width - padding;
            arrowLeft = Math.min(tooltipRect.width - 15, elementCenterX - left - 5);
        } else {
            left = elementCenterX - tooltipHalfWidth;
            arrowLeft = tooltipHalfWidth - 5;
        }

        arrowTop = -5;
        arrow.style.borderBottom = 'none';
        arrow.style.borderRight = 'none';
    }
    // Try top position
    else if (rect.top - tooltipRect.height - padding > 0) {
        position = 'top';
        top = rect.top - tooltipRect.height - 8;

        // Center horizontally, but keep within viewport
        if (elementCenterX - tooltipHalfWidth < padding) {
            left = padding;
            arrowLeft = Math.max(10, elementCenterX - padding - 5);
        } else if (elementCenterX + tooltipHalfWidth > viewport.width - padding) {
            left = viewport.width - tooltipRect.width - padding;
            arrowLeft = Math.min(tooltipRect.width - 15, elementCenterX - left - 5);
        } else {
            left = elementCenterX - tooltipHalfWidth;
            arrowLeft = tooltipHalfWidth - 5;
        }

        arrowTop = tooltipRect.height - 5;
        arrow.style.borderTop = 'none';
        arrow.style.borderLeft = 'none';
    }
    // Try right position
    else if (rect.right + tooltipRect.width + padding < viewport.width) {
        position = 'right';
        left = rect.right + 8;
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;

        // Keep within vertical viewport
        if (top < padding) {
            top = padding;
            arrowTop = Math.max(10, rect.top + rect.height / 2 - padding - 5);
        } else if (top + tooltipRect.height > viewport.height - padding) {
            top = viewport.height - tooltipRect.height - padding;
            arrowTop = Math.min(tooltipRect.height - 15, rect.top + rect.height / 2 - top - 5);
        } else {
            arrowTop = tooltipRect.height / 2 - 5;
        }

        arrowLeft = -5;
        arrow.style.borderTop = 'none';
        arrow.style.borderRight = 'none';
    }
    // Fall back to left position
    else {
        position = 'left';
        left = rect.left - tooltipRect.width - 8;
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;

        // Keep within vertical viewport
        if (top < padding) {
            top = padding;
            arrowTop = Math.max(10, rect.top + rect.height / 2 - padding - 5);
        } else if (top + tooltipRect.height > viewport.height - padding) {
            top = viewport.height - tooltipRect.height - padding;
            arrowTop = Math.min(tooltipRect.height - 15, rect.top + rect.height / 2 - top - 5);
        } else {
            arrowTop = tooltipRect.height / 2 - 5;
        }

        arrowLeft = tooltipRect.width - 5;
        arrow.style.borderBottom = 'none';
        arrow.style.borderLeft = 'none';
    }

    // Apply final positions
    tooltip.style.left = Math.max(padding, left) + 'px';
    tooltip.style.top = Math.max(padding, top) + 'px';
    arrow.style.left = arrowLeft + 'px';
    arrow.style.top = arrowTop + 'px';

    // Store reference and position for cleanup
    element._adaptiveTooltip = tooltip;
    element._tooltipPosition = position;

    // Show with smooth animation
    requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'scale(1)';
    });
}

function hideAdaptiveTooltip(element) {
    if (element._adaptiveTooltip) {
        const tooltip = element._adaptiveTooltip;
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'scale(0.9)';

        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 200);

        delete element._adaptiveTooltip;
        delete element._tooltipPosition;
    }
}

// Update tooltips when theme changes
document.addEventListener('themechange', () => {
    // Re-initialize tooltips with new theme
    const tooltips = document.querySelectorAll('.adaptive-tooltip');
    tooltips.forEach(tooltip => {
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            tooltip.style.background = '#f8fafc';
            tooltip.style.color = '#1a202c';
            tooltip.style.borderColor = '#e2e8f0';
        } else {
            tooltip.style.background = 'var(--bg-primary)';
            tooltip.style.color = 'var(--text-primary)';
            tooltip.style.borderColor = 'var(--border-color)';
        }
    });
});

// Re-initialize tooltips when DOM changes
const tooltipObserver = new MutationObserver(() => {
    const newElements = document.querySelectorAll('[title]:not([data-tooltip])');
    if (newElements.length > 0) {
        initializeAdaptiveTooltips();
    }
});

tooltipObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// ===== PWA SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// ===== WEBSITE TOUR SYSTEM =====
class WebsiteTour {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.tourCompleted = localStorage.getItem('digitalLogicTourCompleted') === 'true';
        this.overlay = null;
        this.highlightBox = null;
        this.tourBox = null;

        this.steps = [
            {
                element: '.sidebar-header',
                title: '🎉 Welcome to Digital Logic Simulator!',
                content: 'This is your advanced digital circuit design tool. Let me show you around!',
                position: 'right'
            },
            {
                element: '.gates-grid',
                title: '🔧 Logic Gates Library',
                content: 'Drag and drop logic gates (AND, OR, NOT, etc.) from here to the canvas. Each gate has specific behavior explained in tooltips.',
                position: 'right'
            },
            {
                element: '.io-grid',
                title: '📡 Input/Output Components',
                content: 'Add INPUT sources to provide signals and OUTPUT displays to see results. These are essential for any circuit.',
                position: 'right'
            },
            {
                element: '.controls',
                title: '🎮 Control Panel',
                content: 'Use these buttons to simulate your circuit, auto-arrange components, clear the canvas, and generate Verilog code.',
                position: 'right'
            },
            {
                element: '.canvas-container',
                title: '🎨 Design Canvas',
                content: 'This is where you build your circuits! Drop gates here, connect them by clicking pins, and watch your logic come to life.',
                position: 'left'
            },
            {
                element: '.mode-toggle',
                title: '⚡ Design Modes',
                content: 'Switch between Visual mode (drag & drop) and Code mode (Verilog editor) for different design approaches.',
                position: 'bottom'
            },
            {
                element: '#theme-btn',
                title: '🌙 Theme Toggle',
                content: 'Switch between light and dark themes for comfortable viewing in any environment.',
                position: 'left'
            }
        ];
    }

    start() {
        if (this.tourCompleted || this.isActive) return;

        this.isActive = true;
        this.currentStep = 0;
        this.createTourElements();
        this.showStep(0);
    }

    createTourElements() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.4);
            z-index: 9998;
            backdrop-filter: blur(2px);
            transition: all 0.3s ease;
        `;

        // Create highlight box
        this.highlightBox = document.createElement('div');
        this.highlightBox.className = 'tour-highlight';
        this.highlightBox.style.cssText = `
            position: fixed;
            background: transparent;
            border: 3px solid var(--primary-color);
            border-radius: 8px;
            z-index: 9999;
            pointer-events: none;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        // Create tour box
        this.tourBox = document.createElement('div');
        this.tourBox.className = 'tour-box';
        this.tourBox.style.cssText = `
            position: fixed;
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
            max-width: 320px;
            min-width: 280px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-family: Inter, sans-serif;
        `;

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlightBox);
        document.body.appendChild(this.tourBox);
    }

    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        const step = this.steps[stepIndex];
        const element = document.querySelector(step.element);

        if (!element) {
            console.warn(`Tour element not found: ${step.element}`);
            this.showStep(stepIndex + 1);
            return;
        }

        // Highlight the element
        const rect = element.getBoundingClientRect();
        this.highlightBox.style.left = (rect.left - 8) + 'px';
        this.highlightBox.style.top = (rect.top - 8) + 'px';
        this.highlightBox.style.width = (rect.width + 16) + 'px';
        this.highlightBox.style.height = (rect.height + 16) + 'px';

        // Position tour box
        this.positionTourBox(rect, step.position);

        // Update tour box content
        this.tourBox.innerHTML = `
            <div class="tour-header">
                <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 600;">${step.title}</h3>
                <div style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 12px;">
                    Step ${stepIndex + 1} of ${this.steps.length}
                </div>
            </div>
            <div class="tour-content" style="margin-bottom: 20px; line-height: 1.5;">
                ${step.content}
            </div>
            <div class="tour-progress" style="margin-bottom: 16px;">
                <div style="background: var(--bg-muted); height: 4px; border-radius: 2px; overflow: hidden;">
                    <div style="background: var(--primary-color); height: 100%; width: ${((stepIndex + 1) / this.steps.length) * 100}%; transition: width 0.3s ease;"></div>
                </div>
            </div>
            <div class="tour-actions" style="display: flex; justify-content: space-between; align-items: center;">
                <button class="tour-btn tour-skip" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                    Skip Tour
                </button>
                <div style="display: flex; gap: 8px;">
                    ${stepIndex > 0 ? `
                        <button class="tour-btn tour-prev" style="background: var(--bg-muted); border: none; color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                            Previous
                        </button>
                    ` : ''}
                    <button class="tour-btn tour-next" style="background: var(--primary-color); border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                        ${stepIndex === this.steps.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        this.tourBox.querySelector('.tour-skip').addEventListener('click', () => this.complete());
        this.tourBox.querySelector('.tour-next').addEventListener('click', () => this.showStep(stepIndex + 1));

        const prevBtn = this.tourBox.querySelector('.tour-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.showStep(stepIndex - 1));
        }

        this.currentStep = stepIndex;
    }

    positionTourBox(elementRect, position) {
        const tourRect = this.tourBox.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        let left, top;
        const padding = 20;

        switch (position) {
            case 'right':
                left = elementRect.right + padding;
                top = elementRect.top + (elementRect.height - tourRect.height) / 2;
                break;
            case 'left':
                left = elementRect.left - tourRect.width - padding;
                top = elementRect.top + (elementRect.height - tourRect.height) / 2;
                break;
            case 'bottom':
                left = elementRect.left + (elementRect.width - tourRect.width) / 2;
                top = elementRect.bottom + padding;
                break;
            case 'top':
            default:
                left = elementRect.left + (elementRect.width - tourRect.width) / 2;
                top = elementRect.top - tourRect.height - padding;
                break;
        }

        // Keep within viewport
        left = Math.max(padding, Math.min(left, viewport.width - tourRect.width - padding));
        top = Math.max(padding, Math.min(top, viewport.height - tourRect.height - padding));

        this.tourBox.style.left = left + 'px';
        this.tourBox.style.top = top + 'px';
    }

    complete() {
        this.isActive = false;
        localStorage.setItem('digitalLogicTourCompleted', 'true');
        this.tourCompleted = true;

        // Fade out animation
        if (this.overlay) this.overlay.style.opacity = '0';
        if (this.highlightBox) this.highlightBox.style.opacity = '0';
        if (this.tourBox) this.tourBox.style.opacity = '0';

        setTimeout(() => {
            this.cleanup();
            // Show completion message
            setTimeout(() => {
                if (window.simulator) {
                    window.simulator.showMessage('🎉 Tour completed! You\'re ready to design amazing circuits!', 'success');
                }
            }, 500);
        }, 300);
    }

    cleanup() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.highlightBox) {
            this.highlightBox.remove();
            this.highlightBox = null;
        }
        if (this.tourBox) {
            this.tourBox.remove();
            this.tourBox = null;
        }
    }

    reset() {
        localStorage.removeItem('digitalLogicTourCompleted');
        this.tourCompleted = false;
        this.cleanup();
    }
}

// Initialize tour system
const websiteTour = new WebsiteTour();
window.websiteTour = websiteTour;

// Auto-start tour for new users (with delay to ensure DOM is ready)
setTimeout(() => {
    if (!websiteTour.tourCompleted) {
        websiteTour.start();
    }
}, 2000);

// Add tour reset function to global scope for testing
window.resetTour = () => {
    websiteTour.reset();
    setTimeout(() => websiteTour.start(), 500);
};

// ===== PWA SHORTCUTS HANDLING =====
// Handle PWA shortcuts when the app is opened with action parameters
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action) {
        // Wait for simulator to be initialized
        setTimeout(() => {
            switch (action) {
                case 'clear':
                    if (window.simulator) {
                        window.simulator.clearCanvas();
                        window.simulator.showMessage('Canvas cleared via PWA shortcut!', 'success');
                    }
                    break;
                case 'tour':
                    if (window.websiteTour) {
                        window.websiteTour.reset();
                        setTimeout(() => window.websiteTour.start(), 500);
                    }
                    break;
            }

            // Clean up URL without page refresh
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }, 1000);
    }
});

// ===== COPYRIGHT YEAR AUTO-UPDATE =====
function updateCopyrightYear() {
    const currentYearElement = document.getElementById('current-year');
    if (currentYearElement) {
        const currentYear = new Date().getFullYear();
        currentYearElement.textContent = currentYear;
    }
}
