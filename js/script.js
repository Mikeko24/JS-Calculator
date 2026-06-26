 let isScientificMode = false;
let currentExpression = '';

const display = document.getElementById('display');
const modeToggle = document.getElementById('modeToggle');
const scientificButtons = document.getElementById('scientificButtons');
const buttons = document.querySelectorAll('.btn, .sci-btn');

display.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        calculate();
    }
});

display.addEventListener('input', (event) => {
    const selection = window.getSelection();
    let isInFraction = false;
    
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        while (node && node !== display) {
            if (node.classList && node.classList.contains('fraction')) {
                isInFraction = true;
                break;
            }
            if (node.classList && (node.classList.contains('numerator') || node.classList.contains('denominator'))) {
                isInFraction = true;
                break;
            }
            node = node.parentNode;
        }
    }
    
    if (isInFraction) {
        syncExpressionFromDisplay();
    } else {
        const text = display.textContent || display.innerText;
        const fractionMatch = text.match(/(\d+)\/(\d+)/);
        
        if (fractionMatch && !display.querySelector('.fraction')) {
            currentExpression = text;
            updateDisplay();
        } else {
            syncExpressionFromDisplay();
        }
    }
});

let fractionEditTimeout;
display.addEventListener('input', (event) => {
    clearTimeout(fractionEditTimeout);
    const fractions = display.querySelectorAll('.fraction');
    if (fractions.length > 0) {
        fractionEditTimeout = setTimeout(() => {
            syncExpressionFromDisplay();
        }, 100);
    }
});

modeToggle.addEventListener('click', () => {
    isScientificMode = !isScientificMode;
    
    if (isScientificMode) {
        scientificButtons.classList.add('active');
        modeToggle.textContent = 'Normal';
        modeToggle.classList.add('active');
    } else {
        scientificButtons.classList.remove('active');
        modeToggle.textContent = 'Scientific';
        modeToggle.classList.remove('active');
    }
});

buttons.forEach(button => {
    button.addEventListener('click', () => {
        const value = button.getAttribute('data-value');
        
        if (value === 'C') {
            clearDisplay();
        } else if (value === 'backspace') {
            backspace();
        } else if (value === '=') {
            calculate();
        } else {
            appendToDisplay(value);
        }
    });
});

function isInsideFraction() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        while (node && node !== display) {
            if (node.classList && (node.classList.contains('numerator') || node.classList.contains('denominator'))) {
                return node.closest('.fraction');
            }
            node = node.parentNode;
        }
    }
    return null;
}

function handleFractionKeyInput(key) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        while (node && node !== display) {
            if (node.classList && (node.classList.contains('numerator') || node.classList.contains('denominator'))) {
                const partSpan = node;
                let currentText = partSpan.textContent;
                
                if (currentText === '□') {
                    partSpan.textContent = key;
                } else {
                    const cursorPos = range.startOffset;
                    partSpan.textContent = currentText.slice(0, cursorPos) + key + currentText.slice(cursorPos);
                }
                
                syncExpressionFromDisplay();
                display.classList.remove('result');
                
                // Restore cursor position after the inserted character
                try {
                    const newRange = document.createRange();
                    const textNode = partSpan.firstChild || partSpan;
                    const newPos = Math.min(partSpan.textContent === '□' ? 1 : (range.startOffset + 1), partSpan.textContent.length);
                    newRange.setStart(textNode, newPos);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } catch (e) {
                    // Cursor restore is non-critical
                }
                
                return true;
            }
            node = node.parentNode;
        }
    }
    return false;
}

function isInsideFractionPart() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        while (node && node !== display) {
            if (node.classList && (node.classList.contains('numerator') || node.classList.contains('denominator'))) {
                return node;
            }
            node = node.parentNode;
        }
    }
    return null;
}

function appendToDisplay(value) {
    const partSpan = isInsideFractionPart();
    
    if (partSpan && /^\d$/.test(value)) {
        // Insert digit directly into the numerator/denominator span
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        let currentText = partSpan.textContent;
        
        if (currentText === '□') {
            partSpan.textContent = value;
        } else {
            const cursorPos = range.startOffset;
            partSpan.textContent = currentText.slice(0, cursorPos) + value + currentText.slice(cursorPos);
        }
        
        syncExpressionFromDisplay();
        display.classList.remove('result');
        
        // Restore cursor position
        try {
            const newRange = document.createRange();
            const textNode = partSpan.firstChild || partSpan;
            const newPos = Math.min(range.startOffset + 1, partSpan.textContent.length);
            newRange.setStart(textNode, newPos);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } catch (e) {}
    } else {
        syncExpressionFromDisplay();
        currentExpression += value;
        updateDisplay();
    }
    
    display.classList.remove('typing');
    void display.offsetWidth;
    display.classList.add('typing');
}

function clearDisplay() {
    currentExpression = '';
    display.innerHTML = '';
    display.classList.remove('result');
}

function updateDisplay() {
    let displayText = currentExpression;
    
    displayText = displayText.replace(/(\d+)\/(\d+)/g, '<span class="fraction"><span class="numerator">$1</span><span class="denominator">$2</span></span>');
    displayText = displayText.replace(/\(([^)]+)\)\/\(([^)]+)\)/g, '<span class="fraction"><span class="numerator">($1)</span><span class="denominator">($2)</span></span>');
    
    display.innerHTML = displayText;
}

function syncExpressionFromDisplay() {
    const fractions = display.querySelectorAll('.fraction');
    
    if (fractions.length > 0) {
        let expr = '';
        const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                expr += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'SPAN' && node.classList.contains('fraction')) {
                    const numerator = node.querySelector('.numerator');
                    const denominator = node.querySelector('.denominator');
                    const numText = numerator ? numerator.textContent : '';
                    const denText = denominator ? denominator.textContent : '';
                    
                    if (numText && denText && numText !== '□' && denText !== '□') {
                        expr += `${numText}/${denText}`;
                    } else if (numText && numText !== '□') {
                        expr += numText;
                    }
                } else {
                    node.childNodes.forEach(walk);
                }
            }
        };
        
        display.childNodes.forEach(walk);
        currentExpression = expr;
    } else {
        let expr = display.textContent || display.innerText;
        expr = expr.replace(/□/g, '');
        expr = expr.replace(/\s+/g, '');
        currentExpression = expr;
    }
}

function updateExpressionFromDisplay() {
    const fractions = display.querySelectorAll('.fraction');
    
    if (fractions.length > 0) {
        let expr = '';
        const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                expr += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'SPAN' && node.classList.contains('fraction')) {
                    const numerator = node.querySelector('.numerator');
                    const denominator = node.querySelector('.denominator');
                    const numText = numerator ? numerator.textContent : '';
                    const denText = denominator ? denominator.textContent : '';
                    
                    if (numText && denText && numText !== '□' && denText !== '□') {
                        expr += `(${numText}/${denText})`;
                    } else if (numText && numText !== '□') {
                        expr += numText;
                    }
                } else {
                    node.childNodes.forEach(walk);
                }
            }
        };
        
        display.childNodes.forEach(walk);
        currentExpression = expr;
    } else {
        currentExpression = display.textContent || display.innerText;
    }
}

function backspace() {
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        while (node && node !== display) {
            if (node.classList && (node.classList.contains('numerator') || node.classList.contains('denominator'))) {
                const partSpan = node;
                const currentText = partSpan.textContent;
                
                if (currentText.length > 0 && currentText !== '□') {
                    const cursorPos = range.startOffset;
                    if (cursorPos > 0) {
                        partSpan.textContent = currentText.slice(0, cursorPos - 1) + currentText.slice(cursorPos);
                    } else {
                        partSpan.textContent = currentText.slice(0, -1);
                    }
                    
                    if (partSpan.textContent === '') {
                        partSpan.textContent = '□';
                    }
                    
                    syncExpressionFromDisplay();
                    display.classList.remove('result');
                    return;
                } else if (currentText === '□') {
                    const fractionSpan = partSpan.parentNode;
                    if (fractionSpan && fractionSpan.parentNode) {
                        fractionSpan.parentNode.removeChild(fractionSpan);
                        syncExpressionFromDisplay();
                        display.classList.remove('result');
                        return;
                    }
                }
                break;
            }
            node = node.parentNode;
        }
    }
    
    if (currentExpression.length > 0) {
        currentExpression = currentExpression.slice(0, -1);
        updateDisplay();
        display.classList.remove('result');
    }
}

function calculate() {
    try {
        updateExpressionFromDisplay();
        
        let expression = currentExpression
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/\^/g, '**')
            .replace(/π/g, Math.PI)
            .replace(/e/g, Math.E)
            .replace(/sin\(/g, 'Math.sin(')
            .replace(/cos\(/g, 'Math.cos(')
            .replace(/tan\(/g, 'Math.tan(')
            .replace(/log\(/g, 'Math.log10(')
            .replace(/ln\(/g, 'Math.log(')
            .replace(/sqrt\(/g, 'Math.sqrt(');
        
        expression = expression.replace(/(\d)\(/g, '$1*(');
        expression = expression.replace(/\)(\d)/g, ')*$1');
        expression = expression.replace(/\)\(/g, ')*(');
        
        expression = expression.replace(/(\d+\.?\d*)\/(\d+\.?\d*)/g, '($1/$2)');
        expression = expression.replace(/(\))\/(\d+\.?\d*)/g, '($1/$2)');
        expression = expression.replace(/(\))\/(\()/g, '($1/$2)');
        expression = expression.replace(/(\d+\.?\d*)\/(\()/g, '($1/$2)');
        expression = expression.replace(/\)\/(\()/g, '($1/$2)');
        
        const result = eval(expression);
        
        if (result === Infinity || result === -Infinity) {
            display.innerHTML = 'Error';
            currentExpression = '';
            display.classList.remove('result');
        } else if (isNaN(result)) {
            display.innerHTML = 'Error';
            currentExpression = '';
            display.classList.remove('result');
        } else {
            const roundedResult = Math.round(result * 1000000000) / 1000000000;
            currentExpression = roundedResult.toString();
            display.innerHTML = currentExpression;
            
            display.classList.remove('result');
            void display.offsetWidth;
            display.classList.add('result');
        }
    } catch (error) {
        display.innerHTML = 'Error';
        currentExpression = '';
        display.classList.remove('result');
    }
}

document.addEventListener('keydown', (event) => {
    const key = event.key;
    const fractionEl = isInsideFraction();
    
    if (/[0-9]/.test(key)) {
        event.preventDefault();
        if (fractionEl) {
            handleFractionKeyInput(key);
        } else {
            appendToDisplay(key);
        }
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        event.preventDefault();
        // Prevent duplicate / from keyboard input by using appendToDisplay which handles sync
        syncExpressionFromDisplay();
        if (key === '/' && currentExpression.endsWith('/')) {
            return; // Already has trailing slash
        }
        appendToDisplay(key);
    } else if (key === '.') {
        event.preventDefault();
        appendToDisplay('.');
    } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculate();
    } else if (key === 'Escape' || key === 'Delete') {
        event.preventDefault();
        clearDisplay();
    } else if (key === 'Backspace') {
        event.preventDefault();
        backspace();
    } else if (key === '(' || key === ')') {
        event.preventDefault();
        appendToDisplay(key);
    }
});