// Verilog Editor Auto-complete and Validation System
class VerilogEditor {
    constructor() {
        this.editor = document.getElementById('verilog-input');
        this.autocompletePopup = document.getElementById('autocomplete-popup');
        this.errorDisplay = document.getElementById('error-display');
        this.terminalContent = document.getElementById('terminal-content');
        this.lineNumbers = document.getElementById('line-numbers');

        this.currentMode = 'visual';
        this.autocompleteItems = [];
        this.selectedIndex = 0;

        this.initializeVerilogKeywords();
        this.bindEvents();
        this.setupResizablePanels();
        this.updateLineNumbers();

        // Show terminal by default
        this.showTerminal();
    }

    initializeVerilogKeywords() {
        this.verilogKeywords = {
            // Basic keywords
            keywords: [
                'module', 'endmodule', 'input', 'output', 'wire', 'reg', 'assign',
                'always', 'begin', 'end', 'if', 'else', 'case', 'endcase',
                'for', 'while', 'repeat', 'initial', 'parameter', 'localparam'
            ],

            // Logic gates and operators
            gates: [
                'and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor',
                'buf', 'bufif0', 'bufif1', 'notif0', 'notif1'
            ],

            // Data types
            datatypes: [
                'integer', 'real', 'time', 'realtime', 'string'
            ],

            // System tasks
            systemTasks: [
                '$display', '$monitor', '$finish', '$stop', '$time',
                '$dumpfile', '$dumpvars', '$random'
            ],

            // Common component templates
            templates: [
                {
                    name: 'basic_module',
                    code: `module example_module(
    input wire clk,
    input wire reset,
    input wire [7:0] data_in,
    output reg [7:0] data_out
);

    always @(posedge clk or posedge reset) begin
        if (reset)
            data_out <= 8'b0;
        else
            data_out <= data_in;
    end

endmodule`
                },
                {
                    name: 'and_gate',
                    code: `module and_gate(
    input wire a,
    input wire b,
    output wire y
);
    assign y = a & b;
endmodule`
                },
                {
                    name: 'counter',
                    code: `module counter(
    input wire clk,
    input wire reset,
    output reg [3:0] count
);

    always @(posedge clk or posedge reset) begin
        if (reset)
            count <= 4'b0;
        else
            count <= count + 1;
    end

endmodule`
                }
            ]
        };
    }

    bindEvents() {
        if (!this.editor) return;

        // Auto-complete on typing
        this.editor.addEventListener('input', (e) => {
            this.handleInput(e);
            this.validateSyntax();
            this.updateLineNumbers();
        });

        // Handle special keys
        this.editor.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Line numbers scroll sync
        this.editor.addEventListener('scroll', () => {
            if (this.lineNumbers) {
                this.lineNumbers.scrollTop = this.editor.scrollTop;
            }
        });

        // Hide autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.autocompletePopup.contains(e.target) && e.target !== this.editor) {
                this.hideAutocomplete();
            }
        });

        // Mode toggle buttons
        const visualBtn = document.getElementById('visual-mode-btn');
        const codeBtn = document.getElementById('code-mode-btn');

        if (visualBtn) {
            visualBtn.addEventListener('click', () => this.switchMode('visual'));
        }
        if (codeBtn) {
            codeBtn.addEventListener('click', () => this.switchMode('code'));
        }

        // Generate visual button (NEW)
        const generateVisualBtn = document.getElementById('generate-visual-btn');
        if (generateVisualBtn) {
            generateVisualBtn.addEventListener('click', () => this.generateVisualFromCode());
        }

        // Validate button
        const validateBtn = document.getElementById('validate-code-btn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => this.validateSyntax(true));
        }

        // Format button
        const formatBtn = document.getElementById('format-code-btn');
        if (formatBtn) {
            formatBtn.addEventListener('click', () => this.formatCode());
        }

        // Terminal controls
        const closeTerminal = document.getElementById('close-terminal');
        const minimizeTerminal = document.getElementById('minimize-terminal');
        const maximizeTerminal = document.getElementById('maximize-terminal');

        if (closeTerminal) {
            closeTerminal.addEventListener('click', () => this.hideTerminal());
        }
        if (minimizeTerminal) {
            minimizeTerminal.addEventListener('click', () => this.minimizeTerminal());
        }
        if (maximizeTerminal) {
            maximizeTerminal.addEventListener('click', () => this.maximizeTerminal());
        }

        // Generate code button (from visual to code)
        const generateCodeBtn = document.getElementById('generate-verilog-btn');
        if (generateCodeBtn) {
            generateCodeBtn.addEventListener('click', () => this.generateCodeFromVisual());
        }
    }

    handleInput(e) {
        const cursorPos = this.editor.selectionStart;
        const text = this.editor.value;
        const textBeforeCursor = text.substring(0, cursorPos);

        // Find the current word being typed
        const words = textBeforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1];

        if (currentWord.length >= 2) {
            this.showAutocomplete(currentWord, cursorPos);
        } else {
            this.hideAutocomplete();
        }
    }

    showAutocomplete(word, cursorPos) {
        const suggestions = this.getSuggestions(word);

        if (suggestions.length === 0) {
            this.hideAutocomplete();
            return;
        }

        this.autocompleteItems = suggestions;
        this.selectedIndex = 0;

        // Clear and populate autocomplete popup
        this.autocompletePopup.innerHTML = '';

        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = `autocomplete-item ${index === 0 ? 'selected' : ''}`;

            if (suggestion.type === 'template') {
                item.innerHTML = `
                    <span class="suggestion-name">${suggestion.name}</span>
                    <span class="suggestion-type">template</span>
                `;
            } else {
                item.innerHTML = `
                    <span class="suggestion-name">${suggestion.name}</span>
                    <span class="suggestion-type">${suggestion.type}</span>
                `;
            }

            item.addEventListener('click', () => {
                this.insertSuggestion(suggestion, word);
            });

            this.autocompletePopup.appendChild(item);
        });

        // Position popup near cursor
        this.positionAutocomplete(cursorPos);
        this.autocompletePopup.style.display = 'block';
    }

    hideAutocomplete() {
        this.autocompletePopup.style.display = 'none';
    }

    getSuggestions(word) {
        const suggestions = [];
        const lowerWord = word.toLowerCase();

        // Add keyword suggestions
        this.verilogKeywords.keywords.forEach(keyword => {
            if (keyword.toLowerCase().startsWith(lowerWord)) {
                suggestions.push({ name: keyword, type: 'keyword' });
            }
        });

        // Add gate suggestions
        this.verilogKeywords.gates.forEach(gate => {
            if (gate.toLowerCase().startsWith(lowerWord)) {
                suggestions.push({ name: gate, type: 'gate' });
            }
        });

        // Add datatype suggestions
        this.verilogKeywords.datatypes.forEach(datatype => {
            if (datatype.toLowerCase().startsWith(lowerWord)) {
                suggestions.push({ name: datatype, type: 'datatype' });
            }
        });

        // Add system task suggestions
        this.verilogKeywords.systemTasks.forEach(task => {
            if (task.toLowerCase().startsWith(lowerWord)) {
                suggestions.push({ name: task, type: 'system' });
            }
        });

        // Add template suggestions
        this.verilogKeywords.templates.forEach(template => {
            if (template.name.toLowerCase().includes(lowerWord)) {
                suggestions.push({
                    name: template.name,
                    type: 'template',
                    code: template.code
                });
            }
        });

        return suggestions.slice(0, 10); // Limit to 10 suggestions
    }

    handleKeyDown(e) {
        if (this.autocompletePopup.style.display === 'none') return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevious();
                break;
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                this.insertSelectedSuggestion();
                break;
            case 'Escape':
                e.preventDefault();
                this.hideAutocomplete();
                break;
        }
    }

    selectNext() {
        this.selectedIndex = (this.selectedIndex + 1) % this.autocompleteItems.length;
        this.updateSelection();
    }

    selectPrevious() {
        this.selectedIndex = this.selectedIndex === 0
            ? this.autocompleteItems.length - 1
            : this.selectedIndex - 1;
        this.updateSelection();
    }

    updateSelection() {
        const items = this.autocompletePopup.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    insertSelectedSuggestion() {
        if (this.autocompleteItems.length > 0) {
            const suggestion = this.autocompleteItems[this.selectedIndex];
            const cursorPos = this.editor.selectionStart;
            const text = this.editor.value;
            const textBeforeCursor = text.substring(0, cursorPos);
            const words = textBeforeCursor.split(/\s+/);
            const currentWord = words[words.length - 1];

            this.insertSuggestion(suggestion, currentWord);
        }
    }

    insertSuggestion(suggestion, currentWord) {
        const cursorPos = this.editor.selectionStart;
        const text = this.editor.value;
        const textBeforeCursor = text.substring(0, cursorPos);
        const textAfterCursor = text.substring(cursorPos);

        // Find the start of current word
        const wordStart = textBeforeCursor.lastIndexOf(currentWord);
        const beforeWord = text.substring(0, wordStart);

        let insertText;
        if (suggestion.type === 'template') {
            insertText = suggestion.code;
        } else {
            insertText = suggestion.name;
        }

        const newText = beforeWord + insertText + textAfterCursor;
        const newCursorPos = wordStart + insertText.length;

        this.editor.value = newText;
        this.editor.setSelectionRange(newCursorPos, newCursorPos);

        this.hideAutocomplete();
        this.validateSyntax();
    }

    positionAutocomplete(cursorPos) {
        // Simple positioning - you might want to make this more sophisticated
        const rect = this.editor.getBoundingClientRect();
        this.autocompletePopup.style.left = `${rect.left}px`;
        this.autocompletePopup.style.top = `${rect.bottom + 5}px`;
    }

    validateSyntax(showFeedback = false) {
        const code = this.editor.value;
        const errors = this.findSyntaxErrors(code);

        this.clearTerminal();

        if (errors.length > 0) {
            this.showErrors(errors);
            this.showTerminal();
        } else {
            if (showFeedback || code.trim().length > 0) {
                this.showSuccess('✓ No syntax errors found. Code is valid!');
                this.showTerminal();
            }
        }
    }

    updateLineNumbers() {
        if (!this.lineNumbers || !this.editor) return;

        const lines = this.editor.value.split('\n');
        const lineCount = lines.length;

        let lineNumbersText = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbersText += i + '\n';
        }

        this.lineNumbers.textContent = lineNumbersText;
    }

    setupResizablePanels() {
        const panelDivider = document.getElementById('panel-divider');
        const editorPanel = document.querySelector('.editor-panel');
        const terminalPanel = document.querySelector('.terminal-panel');

        if (!panelDivider || !editorPanel || !terminalPanel) return;

        let isResizing = false;

        panelDivider.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
        });

        function handleResize(e) {
            if (!isResizing) return;

            const container = document.querySelector('.code-mode');
            const containerRect = container.getBoundingClientRect();
            const newEditorHeight = e.clientY - containerRect.top - 50; // 50px offset
            const newTerminalHeight = containerRect.height - newEditorHeight - 4; // 4px for divider

            if (newEditorHeight > 200 && newTerminalHeight > 100) {
                editorPanel.style.height = newEditorHeight + 'px';
                terminalPanel.style.height = newTerminalHeight + 'px';
                editorPanel.style.flex = 'none';
                terminalPanel.style.flex = 'none';
            }
        }

        function stopResize() {
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
        }
    }

    showTerminal() {
        const terminalPanel = document.querySelector('.terminal-panel');
        if (terminalPanel) {
            terminalPanel.style.display = 'block';
            this.errorDisplay.classList.add('show');
        }
    }

    hideTerminal() {
        const terminalPanel = document.querySelector('.terminal-panel');
        if (terminalPanel) {
            terminalPanel.style.display = 'none';
            this.errorDisplay.classList.remove('show');
        }
    }

    minimizeTerminal() {
        const terminalPanel = document.querySelector('.terminal-panel');
        if (terminalPanel) {
            terminalPanel.style.height = '40px';
            terminalPanel.style.flex = 'none';
        }
    }

    maximizeTerminal() {
        const terminalPanel = document.querySelector('.terminal-panel');
        const editorPanel = document.querySelector('.editor-panel');
        if (terminalPanel && editorPanel) {
            terminalPanel.style.height = '300px';
            editorPanel.style.height = '200px';
            terminalPanel.style.flex = 'none';
            editorPanel.style.flex = 'none';
        }
    }

    clearTerminal() {
        if (this.terminalContent) {
            this.terminalContent.innerHTML = '';
        }
    }

    addTerminalMessage(message, type = 'info', icon = 'fa-info-circle') {
        if (!this.terminalContent) return;

        const messageEl = document.createElement('div');
        messageEl.className = `error-item ${type}`;
        messageEl.innerHTML = `
            <i class="fas ${icon}"></i>
            <span class="error-message">${message}</span>
        `;

        // Add click handler for error navigation
        if (type === 'error' || type === 'warning') {
            messageEl.addEventListener('click', () => {
                const lineMatch = message.match(/Line (\d+):/);
                if (lineMatch) {
                    this.goToLine(parseInt(lineMatch[1]));
                }
            });
        }

        this.terminalContent.appendChild(messageEl);
        this.terminalContent.scrollTop = this.terminalContent.scrollHeight;
    }

    goToLine(lineNumber) {
        if (!this.editor) return;

        const lines = this.editor.value.split('\n');
        const targetLine = Math.max(1, Math.min(lineNumber, lines.length));

        let charPosition = 0;
        for (let i = 0; i < targetLine - 1; i++) {
            charPosition += lines[i].length + 1; // +1 for newline
        }

        this.editor.focus();
        this.editor.setSelectionRange(charPosition, charPosition + lines[targetLine - 1].length);
        this.editor.scrollTop = (targetLine - 1) * 21; // Approximate line height
    }

    formatCode() {
        const code = this.editor.value;
        let formatted = this.autoFormatVerilog(code);
        this.editor.value = formatted;
        this.updateLineNumbers();
        this.addTerminalMessage('✓ Code formatted successfully!', 'success', 'fa-check-circle');
        this.showTerminal();
    }

    autoFormatVerilog(code) {
        const lines = code.split('\n');
        let indentLevel = 0;
        const indentSize = 4;
        let formattedLines = [];

        for (let line of lines) {
            const trimmed = line.trim();

            if (trimmed === '') {
                formattedLines.push('');
                continue;
            }

            // Decrease indent for closing keywords
            if (trimmed.includes('end') || trimmed === 'endmodule' || trimmed === 'endcase') {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            // Add indentation
            const indent = ' '.repeat(indentLevel * indentSize);
            formattedLines.push(indent + trimmed);

            // Increase indent for opening keywords
            if (trimmed.includes('begin') || trimmed.includes('module') || trimmed.includes('case')) {
                indentLevel++;
            }
        }

        return formattedLines.join('\n');
    }

    findSyntaxErrors(code) {
        const errors = [];
        const lines = code.split('\n');

        // Basic syntax checking
        let moduleCount = 0;
        let endmoduleCount = 0;
        let beginCount = 0;
        let endCount = 0;

        lines.forEach((line, index) => {
            const lineNum = index + 1;
            const trimmedLine = line.trim();

            // Skip empty lines and comments
            if (trimmedLine === '' || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
                return;
            }

            // Check for module/endmodule balance
            if (trimmedLine.includes('module') && !trimmedLine.includes('endmodule')) {
                moduleCount++;
            }
            if (trimmedLine.includes('endmodule')) {
                endmoduleCount++;
            }

            // Check for begin/end balance
            if (trimmedLine.includes('begin')) {
                beginCount++;
            }
            if (trimmedLine.includes('end') && !trimmedLine.includes('endmodule') && !trimmedLine.includes('endcase')) {
                endCount++;
            }

            // Enhanced semicolon checking - only for statements that should have semicolons
            const needsSemicolon = (
                trimmedLine.includes('assign') ||
                trimmedLine.includes('<=') ||
                (trimmedLine.includes('=') && !trimmedLine.includes('==') && !trimmedLine.includes('<=') && !trimmedLine.includes('>=')) ||
                (trimmedLine.includes('wire') && !trimmedLine.includes('input') && !trimmedLine.includes('output')) ||
                (trimmedLine.includes('reg') && !trimmedLine.includes('input') && !trimmedLine.includes('output')) ||
                trimmedLine.includes('$display') ||
                trimmedLine.includes('$monitor')
            );

            const shouldNotHaveSemicolon = (
                trimmedLine.includes('module') ||
                trimmedLine.includes('endmodule') ||
                trimmedLine.includes('begin') ||
                trimmedLine.includes('end') && !trimmedLine.includes('<=') ||
                trimmedLine.includes('if') && trimmedLine.includes('(') ||
                trimmedLine.includes('else') ||
                trimmedLine.includes('case') ||
                trimmedLine.includes('endcase') ||
                trimmedLine.includes('always') ||
                trimmedLine.includes('initial') ||
                trimmedLine.startsWith('//') ||
                trimmedLine.startsWith('/*') ||
                trimmedLine.endsWith('*/') ||
                trimmedLine.endsWith('{') ||
                trimmedLine.endsWith('}') ||
                trimmedLine.endsWith(')') && !trimmedLine.includes('assign') ||
                // Port declarations in module header should not have semicolons
                (trimmedLine.includes('input') && trimmedLine.includes('wire')) ||
                (trimmedLine.includes('output') && trimmedLine.includes('wire')) ||
                trimmedLine.endsWith(',') // Lines ending with comma are part of port list
            );

            if (needsSemicolon && !shouldNotHaveSemicolon && !trimmedLine.endsWith(';')) {
                errors.push({
                    line: lineNum,
                    message: 'Missing semicolon at end of statement',
                    type: 'warning'
                });
            }
        });

        // Check balance
        if (moduleCount !== endmoduleCount) {
            errors.push({
                line: lines.length,
                message: `Unbalanced module/endmodule statements (${moduleCount} modules, ${endmoduleCount} endmodules)`,
                type: 'error'
            });
        }

        if (beginCount !== endCount) {
            errors.push({
                line: lines.length,
                message: `Unbalanced begin/end statements (${beginCount} begins, ${endCount} ends)`,
                type: 'error'
            });
        }

        return errors;
    }

    showErrors(errors) {
        this.clearTerminal();

        errors.forEach(error => {
            const iconClass = error.type === 'error' ? 'fa-times-circle' : 'fa-exclamation-triangle';
            this.addTerminalMessage(`Line ${error.line}: ${error.message}`, error.type, iconClass);
        });
    }

    showSuccess(message) {
        this.addTerminalMessage(message, 'success', 'fa-check-circle');
    }

    hideErrors() {
        // Keep terminal visible but show success message
        this.clearTerminal();
        this.addTerminalMessage('✓ No syntax errors detected', 'success', 'fa-check-circle');
    }

    generateVisualFromCode() {
        console.log('=== GENERATE VISUAL FROM CODE STARTED ===');
        const code = this.editor.value.trim();
        console.log('Code to process:', code);

        if (!code) {
            this.addTerminalMessage('⚠ No code to generate from', 'warning', 'fa-exclamation-triangle');
            this.showTerminal();
            return;
        }

        // First validate the code
        const errors = this.findSyntaxErrors(code);
        if (errors.length > 0) {
            console.log('Syntax errors found:', errors);
            this.addTerminalMessage('❌ Cannot generate visual circuit: Code has syntax errors', 'error', 'fa-times-circle');
            this.showErrors(errors);
            return;
        }

        this.addTerminalMessage('🔄 Generating visual circuit from Verilog code...', 'info', 'fa-spinner');
        this.showTerminal();

        // Parse immediately without delay for better debugging
        try {
            console.log('=== PARSING VERILOG CODE ===');
            const circuit = this.parseVerilogCode(code);
            console.log('Parsed circuit result:', circuit);

            if (circuit && circuit.inputs.length > 0 && circuit.outputs.length > 0) {
                this.addTerminalMessage('✅ Verilog code parsed successfully!', 'success', 'fa-check-circle');
                this.addTerminalMessage(`� Found: ${circuit.inputs.length} inputs, ${circuit.outputs.length} outputs, ${circuit.gates.length} gates`, 'info', 'fa-chart-bar');

                // Switch to visual mode immediately
                console.log('=== SWITCHING TO VISUAL MODE ===');
                this.switchMode('visual');

                // Create visual gates with shorter delay
                setTimeout(() => {
                    console.log('=== CHECKING SIMULATOR AVAILABILITY ===');
                    if (window.simulator) {
                        console.log('Simulator available, creating visual gates...');
                        this.addTerminalMessage('🔄 Creating visual components...', 'info', 'fa-cogs');
                        this.createVisualGates(circuit);
                    } else {
                        console.error('Simulator not available:', typeof window.simulator);
                        this.addTerminalMessage('❌ Simulator not available. Please refresh the page.', 'error', 'fa-times-circle');
                        // Try to re-initialize simulator
                        console.log('Attempting to re-initialize simulator...');
                        if (typeof DigitalLogicSimulator !== 'undefined') {
                            window.simulator = new DigitalLogicSimulator();
                            console.log('Simulator re-initialized');
                            this.createVisualGates(circuit);
                        } else {
                            this.addTerminalMessage('❌ DigitalLogicSimulator class not found', 'error', 'fa-times-circle');
                        }
                    }
                }, 100);
            } else {
                console.log('Parser result check failed:', circuit);
                this.addTerminalMessage('⚠ Could not parse Verilog code structure or no inputs/outputs found', 'warning', 'fa-exclamation-triangle');
                this.addTerminalMessage('💡 Make sure your module has input and output declarations', 'info', 'fa-lightbulb');

                if (circuit) {
                    this.addTerminalMessage(`🔍 Debug: Found ${circuit.inputs?.length || 0} inputs, ${circuit.outputs?.length || 0} outputs`, 'info', 'fa-bug');
                }
            }
        } catch (error) {
            console.error('Parse error:', error);
            this.addTerminalMessage(`❌ Generation failed: ${error.message}`, 'error', 'fa-times-circle');
            this.addTerminalMessage(`📋 Stack trace: ${error.stack}`, 'error', 'fa-list');
        }
    }

    parseVerilogCode(code) {
        console.log('Parsing Verilog code:', code);

        // Enhanced Verilog parser
        const moduleMatch = code.match(/module\s+(\w+)\s*\(([\s\S]*?)\);/);
        if (!moduleMatch) {
            throw new Error('No module declaration found');
        }

        const moduleName = moduleMatch[1];
        const portList = moduleMatch[2];
        console.log('Module name:', moduleName);
        console.log('Port list:', portList);

        // Parse inputs and outputs
        const inputs = [];
        const outputs = [];
        const gates = [];
        const wireMap = new Map(); // Track intermediate wires

        // Enhanced port parsing - handle both inline and separate declarations
        const portDeclarations = portList.split(',').map(p => p.trim());

        // Parse module ports
        portDeclarations.forEach(port => {
            const cleanPort = port.trim();
            if (cleanPort.includes('input')) {
                const inputMatch = cleanPort.match(/input\s+(?:wire\s+)?(\w+)/);
                if (inputMatch) {
                    inputs.push(inputMatch[1]);
                }
            } else if (cleanPort.includes('output')) {
                const outputMatch = cleanPort.match(/output\s+(?:wire\s+)?(\w+)/);
                if (outputMatch) {
                    outputs.push(outputMatch[1]);
                }
            }
        });

        // Also find separate input/output declarations in module body
        const inputMatches = code.match(/input\s+(?:wire\s+)?(\w+)/g);
        if (inputMatches) {
            inputMatches.forEach(match => {
                const name = match.replace(/input\s+(?:wire\s+)?/, '').trim();
                if (!inputs.includes(name)) {
                    inputs.push(name);
                }
            });
        }

        const outputMatches = code.match(/output\s+(?:wire\s+)?(\w+)/g);
        if (outputMatches) {
            outputMatches.forEach(match => {
                const name = match.replace(/output\s+(?:wire\s+)?/, '').trim();
                if (!outputs.includes(name)) {
                    outputs.push(name);
                }
            });
        }

        console.log('Inputs found:', inputs);
        console.log('Outputs found:', outputs);

        // Find wire declarations
        const wireMatches = code.match(/wire\s+(\w+);/g);
        if (wireMatches) {
            wireMatches.forEach(match => {
                const name = match.replace(/wire\s+/, '').replace(';', '').trim();
                wireMap.set(name, name);
            });
        }
        console.log('Wires found:', Array.from(wireMap.keys()));

        // Enhanced assign statement parsing
        const assignMatches = code.match(/assign\s+(\w+)\s*=\s*([^;]+);/g);
        console.log('Assign statements found:', assignMatches);

        if (assignMatches) {
            assignMatches.forEach((assign, index) => {
                console.log(`Processing assign ${index}:`, assign);
                const parts = assign.match(/assign\s+(\w+)\s*=\s*([^;]+);/);
                if (parts) {
                    const output = parts[1].trim();
                    const expression = parts[2].trim();
                    console.log(`Output: ${output}, Expression: ${expression}`);

                    // Parse different types of expressions
                    let gateType = 'AND'; // default
                    let inputSignals = [];

                    if (expression.includes('&') && !expression.includes('|') && !expression.includes('~')) {
                        // AND gate
                        gateType = 'AND';
                        inputSignals = expression.split('&').map(s => s.trim());
                    } else if (expression.includes('|') && !expression.includes('&') && !expression.includes('~')) {
                        // OR gate
                        gateType = 'OR';
                        inputSignals = expression.split('|').map(s => s.trim());
                    } else if (expression.includes('~') && !expression.includes('&') && !expression.includes('|')) {
                        // NOT gate
                        gateType = 'NOT';
                        inputSignals = [expression.replace('~', '').trim()];
                    } else if (expression.includes('^') && !expression.includes('&') && !expression.includes('|')) {
                        // XOR gate
                        gateType = 'XOR';
                        inputSignals = expression.split('^').map(s => s.trim());
                    } else if (expression.includes('~(') && expression.includes('&')) {
                        // NAND gate
                        gateType = 'NAND';
                        const innerExpr = expression.replace(/~\(([^)]+)\)/, '$1');
                        inputSignals = innerExpr.split('&').map(s => s.trim());
                    } else if (expression.includes('~(') && expression.includes('|')) {
                        // NOR gate
                        gateType = 'NOR';
                        const innerExpr = expression.replace(/~\(([^)]+)\)/, '$1');
                        inputSignals = innerExpr.split('|').map(s => s.trim());
                    } else if (expression.includes('~(') && expression.includes('^')) {
                        // XNOR gate
                        gateType = 'XNOR';
                        const innerExpr = expression.replace(/~\(([^)]+)\)/, '$1');
                        inputSignals = innerExpr.split('^').map(s => s.trim());
                    } else if (!expression.includes('&') && !expression.includes('|') && !expression.includes('~') && !expression.includes('^')) {
                        // Direct assignment (wire connection) - treat as buffer/wire
                        console.log(`Direct assignment: ${output} = ${expression}`);
                        gates.push({
                            type: 'WIRE',
                            output: output,
                            inputs: [expression.trim()]
                        });
                        return;
                    }

                    console.log(`Gate created - Type: ${gateType}, Output: ${output}, Inputs:`, inputSignals);
                    gates.push({
                        type: gateType,
                        output: output,
                        inputs: inputSignals
                    });
                }
            });
        }

        const result = {
            moduleName,
            inputs,
            outputs,
            gates
        };

        console.log('Final parsed circuit:', result);
        return result;
    }

    createVisualGates(circuit) {
        console.log('=== CREATE VISUAL GATES STARTED ===');
        console.log('createVisualGates called with circuit:', circuit);

        // This integrates with the main DigitalLogicSimulator
        if (!window.simulator) {
            console.error('Simulator not available');
            this.addTerminalMessage('❌ Simulator not available', 'error', 'fa-times-circle');
            return;
        }

        console.log('Simulator found:', window.simulator);
        console.log('Simulator methods:', Object.getOwnPropertyNames(window.simulator));

        // Create the circuit using the main simulator
        try {
            this.addTerminalMessage('🔧 Clearing existing circuit...', 'info', 'fa-trash');

            // Ensure we're in visual mode first
            if (this.currentMode !== 'visual') {
                console.log('Switching to visual mode before creating circuit');
                this.switchMode('visual');
            }

            // Direct call to create circuit
            console.log('=== CALLING createCircuitFromParsedData ===');
            window.simulator.createCircuitFromParsedData(circuit);

            this.addTerminalMessage(`📐 Circuit created: ${circuit.inputs.length} inputs, ${circuit.outputs.length} outputs, ${circuit.gates.length} gates`, 'success', 'fa-check-circle');
            this.addTerminalMessage('🎮 You can now interact with the visual circuit!', 'info', 'fa-gamepad');
            this.addTerminalMessage('💡 Try toggling the input values in the sidebar', 'info', 'fa-lightbulb');

            // Update the results panel with generated code
            const verilogOutput = document.getElementById('verilog-code');
            if (verilogOutput) {
                verilogOutput.value = this.editor.value;
            }

            // Force update counters and UI
            setTimeout(() => {
                console.log('Checking circuit creation result...');
                if (window.simulator.gates && window.simulator.gates.length > 0) {
                    this.addTerminalMessage(`✅ Success! Created ${window.simulator.gates.length} visual components`, 'success', 'fa-check-circle');
                    console.log('Created gates:', window.simulator.gates);
                } else {
                    this.addTerminalMessage('⚠ No visual components were created', 'warning', 'fa-exclamation-triangle');
                    console.log('No gates found in simulator after creation');
                }
            }, 500);

        } catch (error) {
            console.error('Error creating circuit:', error);
            this.addTerminalMessage(`❌ Error creating circuit: ${error.message}`, 'error', 'fa-times-circle');
            this.addTerminalMessage(`📋 Error details: ${error.stack}`, 'error', 'fa-list');
        }
    }

    switchMode(mode) {
        this.currentMode = mode;

        const visualMode = document.getElementById('visual-mode');
        const codeMode = document.getElementById('code-mode');
        const visualBtn = document.getElementById('visual-mode-btn');
        const codeBtn = document.getElementById('code-mode-btn');

        if (mode === 'visual') {
            visualMode.style.display = 'block';
            codeMode.style.display = 'none';
            visualBtn.classList.add('active');
            codeBtn.classList.remove('active');
        } else {
            visualMode.style.display = 'none';
            codeMode.style.display = 'block';
            visualBtn.classList.remove('active');
            codeBtn.classList.add('active');
        }
    }

    generateCircuitFromCode() {
        const code = this.editor.value;

        // Show generation status
        this.generationStatus.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>Generating circuit from Verilog code...</span>
        `;
        this.generationStatus.style.display = 'flex';

        // Simulate processing time
        setTimeout(() => {
            // This would be where you parse the Verilog code and generate visual components
            // For now, just show a success message
            this.generationStatus.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>Circuit generated successfully!</span>
            `;

            setTimeout(() => {
                this.generationStatus.style.display = 'none';
            }, 2000);
        }, 1500);
    }

    generateCodeFromVisual() {
        this.addTerminalMessage('🔄 Generating Verilog code from visual circuit...', 'info', 'fa-spinner');
        this.showTerminal();

        // Check if simulator and gates are available
        if (!window.simulator || !window.simulator.gates || window.simulator.gates.length === 0) {
            this.addTerminalMessage('⚠ No visual circuit found to generate code from', 'warning', 'fa-exclamation-triangle');
            this.addTerminalMessage('💡 Please create a visual circuit first by dragging gates to the canvas', 'info', 'fa-lightbulb');
            return;
        }

        setTimeout(() => {
            try {
                // Generate code based on actual visual circuit
                const generatedCode = this.createVerilogFromVisualCircuit();

                this.editor.value = generatedCode;
                this.updateLineNumbers();
                this.validateSyntax();

                this.addTerminalMessage('✅ Verilog code generated from visual circuit!', 'success', 'fa-check-circle');
                this.addTerminalMessage(`📊 Generated: ${window.simulator.gates.filter(g => g.type === 'INPUT').length} inputs, ${window.simulator.gates.filter(g => g.type === 'OUTPUT').length} outputs, ${window.simulator.gates.filter(g => !['INPUT', 'OUTPUT'].includes(g.type)).length} logic gates`, 'info', 'fa-chart-bar');
                this.addTerminalMessage('💡 You can now edit and modify the generated code', 'info', 'fa-lightbulb');

                // Update the results panel
                const verilogOutput = document.getElementById('verilog-code');
                if (verilogOutput) {
                    verilogOutput.value = generatedCode;
                }
            } catch (error) {
                console.error('Error generating code:', error);
                this.addTerminalMessage(`❌ Failed to generate code: ${error.message}`, 'error', 'fa-times-circle');
            }
        }, 1000);
    }

    createVerilogFromVisualCircuit() {
        console.log('=== CREATING VERILOG FROM VISUAL CIRCUIT ===');

        if (!window.simulator || !window.simulator.gates) {
            throw new Error('No visual circuit data available');
        }

        const gates = window.simulator.gates;
        const wires = window.simulator.wires || [];

        console.log('Visual gates:', gates);
        console.log('Visual wires:', wires);
        console.log('Wire count:', wires.length);

        // Debug wire structure
        if (wires.length > 0) {
            console.log('First wire structure:', wires[0]);
        }

        // Debug: Inspect wire structure in detail
        console.log('=== WIRE STRUCTURE ANALYSIS ===');
        if (wires.length === 0) {
            console.log('⚠️ NO WIRES FOUND!');
        } else {
            wires.forEach((wire, index) => {
                console.log(`Wire ${index}:`, {
                    sourceGate: wire.sourceGate,
                    sourcePinIndex: wire.sourcePinIndex,
                    targetGate: wire.targetGate,
                    targetPinIndex: wire.targetPinIndex
                });
            });
        }
        console.log('=== END WIRE ANALYSIS ===');

        // Analyze the visual circuit
        const inputs = gates.filter(g => g.type === 'INPUT');
        const outputs = gates.filter(g => g.type === 'OUTPUT');
        const logicGates = gates.filter(g => !['INPUT', 'OUTPUT'].includes(g.type));

        console.log('Analyzed circuit:', { inputs, outputs, logicGates });

        // Generate module header
        let verilogCode = `// Generated from visual circuit\n`;
        verilogCode += `// Module: visual_circuit\n`;
        verilogCode += `// Generated on: ${new Date().toLocaleString()}\n\n`;

        // Create input/output port declarations
        const inputNames = inputs.map((gate, index) => `input${index + 1}`);
        const outputNames = outputs.map((gate, index) => `output${index + 1}`);

        verilogCode += `module visual_circuit(\n`;

        // Add input declarations
        inputNames.forEach((name, index) => {
            verilogCode += `    input wire ${name}`;
            if (index < inputNames.length - 1 || outputNames.length > 0) verilogCode += ',';
            verilogCode += '\n';
        });

        // Add output declarations
        outputNames.forEach((name, index) => {
            verilogCode += `    output wire ${name}`;
            if (index < outputNames.length - 1) verilogCode += ',';
            verilogCode += '\n';
        });

        verilogCode += `);\n\n`;

        // Generate wire declarations for intermediate signals
        const wireDeclarations = new Set();
        logicGates.forEach((gate, index) => {
            const wireName = `${gate.type.toLowerCase()}_out${index + 1}`;
            wireDeclarations.add(wireName);
        });

        if (wireDeclarations.size > 0) {
            verilogCode += `    // Internal wires\n`;
            Array.from(wireDeclarations).forEach(wire => {
                verilogCode += `    wire ${wire};\n`;
            });
            verilogCode += '\n';
        }

        verilogCode += `    // Logic implementation\n`;

        // Generate assign statements based on connections
        const wireMapping = new Map();

        // Map input gates to their names
        inputs.forEach((gate, index) => {
            wireMapping.set(gate.id, inputNames[index]);
        });

        // Map logic gates to their wire names and generate assignments
        logicGates.forEach((gate, index) => {
            const outputWire = `${gate.type.toLowerCase()}_out${index + 1}`;
            wireMapping.set(gate.id, outputWire);

            // Find wires connected to this gate's inputs
            const inputWires = wires.filter(wire => wire.targetGate === gate.id);

            console.log(`Processing gate ${gate.type} (ID: ${gate.id}), input wires:`, inputWires);

            if (inputWires.length > 0) {
                // Generate the assign statement based on gate type
                let expression = '';
                const inputSignals = inputWires
                    .sort((a, b) => a.targetPinIndex - b.targetPinIndex)
                    .map(wire => {
                        const sourceWire = wireMapping.get(wire.sourceGate);
                        console.log(`  Wire from gate ${wire.sourceGate} -> ${sourceWire}`);
                        return sourceWire || `unknown_${wire.sourceGate}`;
                    });

                console.log(`  Input signals for ${gate.type}:`, inputSignals);

                switch (gate.type) {
                    case 'AND':
                        expression = inputSignals.join(' & ');
                        break;
                    case 'OR':
                        expression = inputSignals.join(' | ');
                        break;
                    case 'NOT':
                        expression = `~${inputSignals[0]}`;
                        break;
                    case 'NAND':
                        expression = `~(${inputSignals.join(' & ')})`;
                        break;
                    case 'NOR':
                        expression = `~(${inputSignals.join(' | ')})`;
                        break;
                    case 'XOR':
                        expression = inputSignals.join(' ^ ');
                        break;
                    case 'XNOR':
                        expression = `~(${inputSignals.join(' ^ ')})`;
                        break;
                    default:
                        expression = inputSignals.join(' & '); // Default to AND
                }

                verilogCode += `    assign ${outputWire} = ${expression};\n`;
                console.log(`  Generated: assign ${outputWire} = ${expression};`);
            } else {
                console.log(`  No input connections found for gate ${gate.type} (${gate.id})`);
                verilogCode += `    // assign ${outputWire} = 1'b0; // Unconnected gate\n`;
            }
        });

        // Generate output assignments
        outputs.forEach((gate, index) => {
            const outputName = outputNames[index];

            // Find what's connected to this output
            const inputWire = wires.find(wire => wire.targetGate === gate.id);

            console.log(`Processing output ${outputName} (${gate.id}), wire:`, inputWire);

            if (inputWire) {
                const sourceWire = wireMapping.get(inputWire.sourceGate);
                console.log(`  Source wire for ${outputName}: ${sourceWire}`);
                if (sourceWire) {
                    verilogCode += `    assign ${outputName} = ${sourceWire};\n`;
                    console.log(`  Generated output: assign ${outputName} = ${sourceWire};`);
                } else {
                    console.log(`  No source wire found for output ${outputName}`);
                    verilogCode += `    // assign ${outputName} = 1'b0; // No source wire\n`;
                }
            } else {
                console.log(`  No input connection found for output ${outputName}`);
                verilogCode += `    // assign ${outputName} = 1'b0; // Unconnected output\n`;
            }
        }); verilogCode += `\nendmodule\n\n// End of generated code`;

        console.log('Generated Verilog code:', verilogCode);
        return verilogCode;
    }
}

// Initialize the Verilog Editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.verilogEditor = new VerilogEditor();
});
