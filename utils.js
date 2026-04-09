// utils.js - Funções Auxiliares (Matemática, Colisões, Cores e UI)

// --- FUNÇÕES DE DESENHO (HELPERS) ---
function drawGradientText(text, x, y, size, align = 'center', shadow = true, targetCtx = ctx) { 
    targetCtx.font = `${size}px "Press Start 2P", cursive`; 
    targetCtx.textAlign = align; 
    const shadowOffset = Math.ceil(size / 16); 
    if (shadow) { 
        targetCtx.fillStyle = 'rgba(0, 0, 0, 0.25)'; 
        targetCtx.fillText(text, x + shadowOffset, y + shadowOffset); 
    } 
    const gradient = targetCtx.createLinearGradient(0, y - size, 0, y); 
    gradient.addColorStop(0, '#ffffff'); 
    gradient.addColorStop(1, '#d0d0d0'); 
    targetCtx.fillStyle = gradient; 
    targetCtx.fillText(text, x, y); 
}

// --- MOUSE E UI HELPERS ---
function getMousePos(canvas, event) { 
    const rect = canvas.getBoundingClientRect(); 
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }; 
}

function isMouseOverRect(mousePos, x, y, width, height) { 
    return mousePos.x >= x && mousePos.x <= x + width && mousePos.y >= y && mousePos.y <= y + height; 
}

function getControlsLayout(cx, cy) {
    const s = 50; const g = 10; const mx = cx - 180; const my = cy + 20; const ax = cx + 120; const ay = cy - 40; const ayGap = 70; 
    return [ 
        { action: 'up', x: mx, y: my - s - g, w: s, h: s, label: 'PULAR' }, 
        { action: 'left', x: mx - s - g, y: my, w: s, h: s, label: 'ESQUERDA' }, 
        { action: 'down', x: mx, y: my, w: s, h: s, label: 'DESCER' }, 
        { action: 'right', x: mx + s + g, y: my, w: s, h: s, label: 'DIREITA' }, 
        { action: 'interact', x: ax, y: ay, w: s, h: s, label: 'INTERAGIR' }, 
        { action: 'pause', x: ax, y: ay + ayGap, w: s, h: s, label: 'PAUSAR' }, 
        { action: 'restart', x: ax, y: ay + ayGap*2, w: s, h: s, label: 'REINICIAR' } 
    ];
}

function getBackButtonRect(canvasWidth, canvasHeight) { 
    return { x: canvasWidth / 2 - 60, y: canvasHeight - 60, w: 120, h: 30 }; 
}

function formatKeyName(code) {
    if (!code) return '...';
    if (code.startsWith('Arrow')) return ''; 
    if (code.startsWith('Numpad')) {
        const suffix = code.replace('Numpad', '');
        if (suffix === 'Enter') return 'ENT';
        if (suffix === 'Add') return '+';
        if (suffix === 'Subtract') return '-';
        if (suffix === 'Multiply') return '*';
        if (suffix === 'Divide') return '/';
        if (suffix === 'Decimal') return '.';
        return 'NP' + suffix; 
    }
    const specialKeys = { 'Backspace': 'BAC', 'Pause': 'PAU', 'Insert': 'INS', 'Home': 'HOM', 'PageUp': 'PUP', 'PageDown': 'PDW', 'Delete': 'DEL', 'End': 'END', 'Tab': 'TAB', 'CapsLock': 'CAP', 'Space': 'SPC', 'Enter': 'ENT', 'Escape': 'ESC', 'ControlLeft': 'CTRL', 'ControlRight': 'CTRL', 'ShiftLeft': 'SHFT', 'ShiftRight': 'SHFT', 'AltLeft': 'ALT', 'AltRight': 'ALT', 'Minus': '-', 'Equal': '=', 'BracketLeft': '[', 'BracketRight': ']', 'Semicolon': ';', 'Quote': "'", 'Backquote': '`', 'Backslash': '\\', 'Comma': ',', 'Period': '.', 'Slash': '/' };
    if (specialKeys[code]) return specialKeys[code];
    return code.replace('Key', '').replace('Digit', '').toUpperCase().substring(0, 4);
}

// --- COLISÕES E FÍSICA ---
function isCollidingWithDiamond(rect, diamond) { 
    if (!rect || !diamond || typeof rect.x === 'undefined' || typeof diamond.x === 'undefined' || isNaN(rect.x) || isNaN(rect.y) || isNaN(rect.width) || isNaN(rect.height) || isNaN(diamond.x) || isNaN(diamond.y) || isNaN(diamond.width) || isNaN(diamond.height) ) { return false; } 
    const diamondCenterX = diamond.x + diamond.width / 2; 
    const diamondCenterY = diamond.y + diamond.height / 2; 
    const diamondHalfWidth = diamond.width / 2; 
    const diamondHalfHeight = diamond.height / 2; 
    const rectCorners = [ { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }, { x: rect.x, y: rect.y + rect.height }, { x: rect.x + rect.width, y: rect.y + rect.height } ]; 
    for (const corner of rectCorners) { 
        const dx = Math.abs(corner.x - diamondCenterX); 
        const dy = Math.abs(corner.y - diamondCenterY); 
        if (dx / diamondHalfWidth + dy / diamondHalfHeight <= 1) { return true; } 
    } 
    return false; 
}

function isColliding(rect1, rect2) {
    if (!rect1 || !rect2) return false;
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function isCollidingCircleRect(circle, rect) {
    if (!circle || !rect) return false;
    const circleX = circle.x;
    const circleY = circle.y;
    
    const closestX = Math.max(rect.x, Math.min(circleX, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circleY, rect.y + rect.height));

    const distanceX = circleX - closestX;
    const distanceY = circleY - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

    return distanceSquared < (circle.radius * circle.radius);
}

function isCollidingLineRect(line, rect) {
    const left = isCollidingLineLine(line.x1, line.y1, line.x2, line.y2, rect.x, rect.y, rect.x, rect.y + rect.height);
    const right = isCollidingLineLine(line.x1, line.y1, line.x2, line.y2, rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height);
    const top = isCollidingLineLine(line.x1, line.y1, line.x2, line.y2, rect.x, rect.y, rect.x + rect.width, rect.y);
    const bottom = isCollidingLineLine(line.x1, line.y1, line.x2, line.y2, rect.x, rect.y + rect.height, rect.x + rect.width, rect.y + rect.height);
    if (left || right || top || bottom) return true;
    const cx = line.x1;
    const cy = line.y1;
    if (cx > rect.x && cx < rect.x + rect.width && cy > rect.y && cy < rect.y + rect.height) {
        return true;
    }
    return false;
}

function isCollidingLineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
}

function isCollidingRectPolygon(rect, polygon) {
    const rectPoly = [
        {x: rect.x, y: rect.y},
        {x: rect.x + rect.width, y: rect.y},
        {x: rect.x + rect.width, y: rect.y + rect.height},
        {x: rect.x, y: rect.y + rect.height}
    ];

    const polygons = [rectPoly, polygon];
    for (let i = 0; i < polygons.length; i++) {
        const poly = polygons[i];
        for (let j1 = 0; j1 < poly.length; j1++) {
            const j2 = (j1 + 1) % poly.length;
            const p1 = poly[j1];
            const p2 = poly[j2];

            const normal = { x: p2.y - p1.y, y: p1.x - p2.x };
            let minA = null, maxA = null;
            for (const p of rectPoly) {
                const projected = normal.x * p.x + normal.y * p.y;
                if (minA === null || projected < minA) minA = projected;
                if (maxA === null || projected > maxA) maxA = projected;
            }

            let minB = null, maxB = null;
            for (const p of polygon) {
                const projected = normal.x * p.x + normal.y * p.y;
                if (minB === null || projected < minB) minB = projected;
                if (maxB === null || projected > maxB) maxB = projected;
            }

            if (maxA < minB || maxB < minA) {
                return false; 
            }
        }
    }
    return true; 
}

// --- CORES E EFEITOS ---
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function rgbToString(rgb) { 
    return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`; 
}

function lerpColor(color1, color2, factor) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    if (!rgb1 || !rgb2) return 'rgb(0,0,0)';
    const result = { 
        r: rgb1.r + factor * (rgb2.r - rgb1.r), 
        g: rgb1.g + factor * (rgb2.g - rgb1.g), 
        b: rgb1.b + factor * (rgb2.b - rgb1.b) 
    };
    return result;
}

// --- STATE HELPERS ---
function isVerticalPhase() {
    return gameState === 'phaseTwo' || gameState === 'finalBoss';
}