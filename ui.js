// ui.js - Funções de Interface, Menus e Efeitos Visuais

// --- EFEITOS VISUAIS E PARTÍCULAS ---
function drawParticles(ctx, isVertical = false, layer = 'front') { 
    ctx.save(); 
    for (let i = particles.length - 1; i >= 0; i--) { 
        const p = particles[i]; 
        if (p.layer !== layer && !(layer === 'front' && !p.layer)) continue;
        if (!p || isNaN(p.x)) continue; 
        let px = Math.floor(p.isScreenSpace ? p.x : p.x - (isVertical ? 0 : scrollOffset));
        let py = Math.floor(p.isScreenSpace ? p.y : p.y - (isVertical ? verticalScrollOffset : 0));
        ctx.globalAlpha = p.lifespan / p.initialLifespan; 
        ctx.fillStyle = p.color; 
        ctx.fillRect(px, py, p.size, p.size); 
    } 
    ctx.restore(); 
}

function drawPhaseOneDarkness(ctx) {
    if (!vfxEnabled) return; 
    if (!boss || boss.darknessAlpha <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = boss.darknessAlpha * 0.9; 

    const gradL = ctx.createLinearGradient(0, 0, 200, 0); 
    gradL.addColorStop(0, 'black');
    gradL.addColorStop(1, 'transparent');
    ctx.fillStyle = gradL;
    ctx.fillRect(0, 0, 200, ctx.canvas.height);

    const gradR = ctx.createLinearGradient(ctx.canvas.width - 200, 0, ctx.canvas.width, 0);
    gradR.addColorStop(0, 'transparent');
    gradR.addColorStop(1, 'black');
    ctx.fillStyle = gradR;
    ctx.fillRect(ctx.canvas.width - 200, 0, 200, ctx.canvas.height);

    ctx.restore();
}

function drawTowerLightingOverlay(targetCtx) {
    if (!vfxEnabled) return; 
    if (!finalBoss || !finalBoss.isInRageMode) return;
    
    targetCtx.globalAlpha = finalBoss.rageLightingAlpha;
    const lightingOverlay = targetCtx.createLinearGradient(0, 0, targetCtx.canvas.width, 0);
    lightingOverlay.addColorStop(0.2, 'rgba(0, 0, 0, 0.5)'); 
    lightingOverlay.addColorStop(0.5, 'rgba(0, 0, 0, 0)'); 
    lightingOverlay.addColorStop(0.8, 'rgba(0, 0, 0, 0.5)');
    targetCtx.fillStyle = lightingOverlay; 
    targetCtx.fillRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height); 
    targetCtx.globalAlpha = 1.0;
}

function drawFogOverlay(isVertical = false) {
    if (typeof sceneryQuality !== 'undefined' && sceneryQuality === 'low') return;

    platforms.forEach(p => {
        if (p.visualType === 'cloud') {
            const px = p.x - (isVertical ? 0 : scrollOffset); 
            const py = p.y - (isVertical ? verticalScrollOffset : 0);
            if (px + p.width > 0 && px < canvas.width && py + p.height > 0 && py < canvas.height) { 
                p.drawFog(offscreenCtx, px, py); 
            }
        }
    });
}

function drawProjectileIndicators() { 
    projectileIndicators.forEach(p => { 
        if (!p || isNaN(p.lifespan)) return; 
        let indicatorColor = 'rgba(106, 51, 129, 0.7)';
        if (p.projectileType === 'homing') indicatorColor = 'rgba(184, 147, 11, 0.7)'; 
        else if (p.projectileType === 'rebound') indicatorColor = 'rgba(93, 173, 226, 0.7)'; 
        else if (p.projectileType === 'charger') indicatorColor = 'rgba(46, 139, 87, 0.7)'; 
        else if (p.projectileType === 'falling_rock') indicatorColor = 'rgba(128, 128, 128, 0.7)'; 
        
        const progress = Math.max(0, 1 - (p.lifespan / p.initialLifespan)); 
        const radius = 25 * progress; 
        const alpha = Math.max(0, 1 - progress); 
        offscreenCtx.save(); 
        offscreenCtx.globalAlpha = alpha; 
        offscreenCtx.beginPath(); 
        offscreenCtx.arc(p.x + 17.5, p.y + 17.5, radius, 0, Math.PI * 2); 
        offscreenCtx.fillStyle = indicatorColor; 
        offscreenCtx.fill(); 
        offscreenCtx.restore(); 
    }); 
}

function drawCoinAnimations(isVertical = false) {
    for (const coin of coinAnimations) {
        const cx = coin.x - (isVertical ? 0 : scrollOffset); 
        const cy = coin.y - (isVertical ? verticalScrollOffset : 0); 
        const radius = 8;
        const grad = offscreenCtx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
        grad.addColorStop(0, '#feca57'); 
        grad.addColorStop(1, '#f39c12');
        offscreenCtx.fillStyle = grad; 
        offscreenCtx.beginPath(); 
        offscreenCtx.arc(cx, cy, radius, 0, Math.PI * 2); 
        offscreenCtx.fill();
        offscreenCtx.strokeStyle = '#b8930b'; 
        ctx.lineWidth = 2; 
        ctx.stroke();
    }
}

// --- UI IN-GAME (HUD, PROMPTS, BOTÕES) ---
function getHudScale() {
    if (hudState === 0) return 0.75; // PEQUENO
    if (hudState === 1) return 1.0;  // PADRÃO
    return 0; // OFF (hudState === 2)
}

function drawInteractionPrompts(ctx, isVertical = false) {
    if (hudState === 2) return; // HUD OFF

    ctx.save();
    
    const scale = getHudScale();
    
    if (gameState === 'playing' || gameState === 'bossBattle' || gameState === 'phaseTwo' || gameState === 'finalBoss') {
        promptAnimFrame += 0.15;
    }
    
    const pulse = Math.sin(promptAnimFrame); 
    const alpha = 0.7 + pulse * 0.3; 
    ctx.globalAlpha = alpha;
    
    interactionPrompts.forEach(prompt => {
        const px = prompt.x - (isVertical ? 0 : scrollOffset); 
        const py = prompt.y - (isVertical ? verticalScrollOffset : 0);
        
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(scale, scale);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; 
        ctx.strokeStyle = 'rgba(50, 50, 50, 0.9)'; 
        ctx.lineWidth = 2;
        
        ctx.beginPath(); 
        ctx.roundRect(-14, -14, 28, 28, [4]); 
        ctx.fill(); 
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; 
        ctx.beginPath(); 
        ctx.moveTo(-4, 14); 
        ctx.lineTo(4, 14); 
        ctx.lineTo(0, 20);     
        ctx.closePath(); 
        ctx.fill();
        ctx.stroke(); 
        
        ctx.fillStyle = '#2c3e50'; 
        
        const key = keyMap.interact;
        const isArrow = key.startsWith('Arrow');
        
        if (isArrow) {
            let rotation = 0;
            if (key === 'ArrowRight') rotation = Math.PI / 2;
            if (key === 'ArrowDown') rotation = Math.PI;
            if (key === 'ArrowLeft') rotation = -Math.PI / 2;
            ctx.rotate(rotation);
            
            ctx.beginPath();
            ctx.moveTo(0, -10); ctx.lineTo(8, 3); ctx.lineTo(3, 3); ctx.lineTo(3, 9);
            ctx.lineTo(-3, 9); ctx.lineTo(-3, 3); ctx.lineTo(-8, 3);
            ctx.closePath();
            ctx.fill();
        } else {
            const label = formatKeyName(key);
            ctx.font = label.length > 3 ? '8px "Press Start 2P"' : '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, 0, 1);
        }
        
        ctx.restore();
    });
    ctx.restore();
}

function drawCanvasPauseButton(targetCtx) {
    targetCtx.save();
    
    // Força o botão de pause a usar no mínimo a escala de "Pequeno" se o HUD estiver OFF
    const scale = (hudState === 0) ? 0.75 : 1.0;
    
    const cx = PAUSE_BTN_X + PAUSE_BTN_SIZE / 2; 
    const cy = PAUSE_BTN_Y + PAUSE_BTN_SIZE / 2;
    targetCtx.translate(cx, cy); 
    targetCtx.scale(currentPauseButtonScale * scale, currentPauseButtonScale * scale); 
    targetCtx.translate(-cx, -cy);
    
    const grad = targetCtx.createLinearGradient(cx, cy - 12.5, cx, cy + 12.5); 
    grad.addColorStop(0, '#ffffff'); 
    grad.addColorStop(1, '#dddddd'); 
    targetCtx.fillStyle = grad;
    
    targetCtx.beginPath(); 
    targetCtx.roundRect(cx - 5 - 8, cy - 12.5, 8, 25, 2); 
    targetCtx.fill();
    
    targetCtx.beginPath(); 
    targetCtx.roundRect(cx + 5, cy - 12.5, 8, 25, 2); 
    targetCtx.fill();
    targetCtx.restore();
}

function drawFpsDisplay(ctx) {
    if (typeof showFps === 'undefined' || !showFps || cheatsEnabled) return;
    
    ctx.save();
    ctx.font = '14px "Press Start 2P"';
    ctx.textAlign = 'right';
    const x = canvas.width - 15;
    const y = canvas.height - 15; 
    const text = `FPS: ${currentFps}`;
    
    // Sombra para contraste
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(text, x + 2, y + 2);
    
    // Gradiente verde arcade
    const grad = ctx.createLinearGradient(0, y - 14, 0, y);
    grad.addColorStop(0, '#55ff55');
    grad.addColorStop(1, '#00aa00');
    ctx.fillStyle = grad;
    
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawGameStats() { 
    if (hudState === 2) return; // HUD OFF

    const scale = getHudScale();

    let isGold = false;
    if (scoreBlinkTimer > 0) {
         if (Math.floor(scoreBlinkTimer * 6) % 2 === 0) isGold = true;
    }

    ctx.save();
    ctx.scale(scale, scale);
    
    ctx.font = '24px "Press Start 2P", cursive';
    ctx.textAlign = 'left';
    
    let targetScoreText = "";
    if (gameState === 'playing') {
        targetScoreText = `/${BOSS_TRIGGER_SCORE}`;
    } else if (gameState === 'phaseTwo') {
        targetScoreText = `/${FINAL_BOSS_TRIGGER_SCORE}`;
    } 
    
    const displayText = `Pontos: ${score}${targetScoreText}`;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillText(displayText, 22, 42);

    let grad;
    if (isGold) {
        grad = ctx.createLinearGradient(0, 40 - 24, 0, 40);
        grad.addColorStop(0, '#feca57'); 
        grad.addColorStop(1, '#f39c12'); 
    } else {
        grad = ctx.createLinearGradient(0, 40 - 24, 0, 40);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#d0d0d0');
    }

    ctx.fillStyle = grad;
    ctx.fillText(displayText, 20, 40);

    let distanceText = isVerticalPhase() ? `Altura: ${Math.max(0, Math.floor((phaseTwoStartScrollY - verticalScrollOffset) / 10))}m` : `Distancia: ${Math.floor(scrollOffset / 50)}m`;
    drawGradientText(distanceText, 20, 65, 18, 'left', true, ctx);
    
    const startX = 20; const startY = 85; 
    for (let i = 0; i < player.maxHealth; i++) { 
        const x = startX + i * 38; 
        ctx.fillStyle = '#555'; 
        ctx.beginPath(); 
        ctx.moveTo(x + 14, startY + 11.2); 
        ctx.bezierCurveTo(x, startY, x, startY + 19.6, x + 14, startY + 28); 
        ctx.bezierCurveTo(x + 28, startY + 19.6, x + 28, startY, x + 14, startY + 11.2); 
        ctx.closePath(); 
        ctx.fill(); 
    } 
    for (let i = 0; i < player.health; i++) { 
        const x = startX + i * 38; 
        const hpGrad = ctx.createLinearGradient(x, startY, x, startY + 28); 
        hpGrad.addColorStop(0, '#ff8b8b'); 
        hpGrad.addColorStop(1, '#d13423'); 
        ctx.fillStyle = hpGrad; 
        ctx.beginPath(); 
        ctx.moveTo(x + 14, startY + 11.2); 
        ctx.bezierCurveTo(x, startY, x, startY + 19.6, x + 14, startY + 28); 
        ctx.bezierCurveTo(x + 28, startY + 19.6, x + 28, startY, x + 14, startY + 11.2); 
        ctx.closePath(); 
        ctx.fill(); 
        ctx.strokeStyle = '#a4281b'; 
        ctx.lineWidth = 2; 
        ctx.stroke(); 
    } 
    
    ctx.restore();
    
    drawFpsDisplay(ctx);
}

function drawFinalBossUI() {
    if (hudState === 2 || !finalBoss) return; // HUD OFF

    ctx.save();
    const hpPct = finalBoss.health / finalBoss.maxHealth;
    let bw, bx, by, titleSize;
    let bgAlpha = 0.7; // OPACIDADE UNIVERSAL

    if (bossHpPos === 2) {
        // ATRELADA (Barra gruda na cabeça física da máquina, com offset de 90px)
        bw = 120;
        const headHitbox = finalBoss.getBodyHitboxes(verticalScrollOffset).find(h => h.radius === 35); 
        bx = headHitbox ? headHitbox.x - bw/2 : (canvas.width / 2) - bw/2;
        by = headHitbox ? headHitbox.y - 90 : finalBoss.y - verticalScrollOffset - 30; // Mais longe do modelo
        titleSize = 0; 
    } else {
        const scale = getHudScale();
        bw = canvas.width / 2; 
        bx = canvas.width / 2 - (bw * scale) / 2; 
        
        if (bossHpPos === 1) {
            by = 90; // CIMA
        } else {
            by = canvas.height - 50 - (25 * (scale - 1)); // BAIXO
        }
        titleSize = 18;
        
        ctx.translate(bx, by);
        ctx.scale(scale, scale);
        ctx.translate(-bx, -by);
    }

    ctx.fillStyle = `rgba(44, 62, 80, ${bgAlpha})`; 
    ctx.fillRect(bx, by, bw, 25);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0); 
    grad.addColorStop(0, `rgba(230, 126, 34, ${bgAlpha})`); 
    grad.addColorStop(1, `rgba(241, 196, 15, ${bgAlpha})`); 
    ctx.fillStyle = grad; ctx.fillRect(bx, by, bw * hpPct, 25);
    ctx.strokeStyle = `rgba(236, 240, 241, ${bgAlpha})`; 
    ctx.lineWidth = 3; 
    ctx.strokeRect(bx, by, bw, 25);
    
    if (titleSize > 0) {
        // A legenda mantém a opacidade em 1.0 (true no parametro shadow do helper) para garantir a leitura perfeita
        drawGradientText('A AUTÔMATA ASCENDENTE', bx + bw/2, by - 15, titleSize, 'center', true, ctx);
    }
    
    ctx.restore();
}

function drawBossUI() { 
    if (hudState === 2 || !boss) return; // HUD OFF

    ctx.save();
    const hpPct = boss.health / boss.maxHealth;
    let bw, bx, by, titleSize;
    let bgAlpha = 0.7; // OPACIDADE UNIVERSAL

    if (bossHpPos === 2) {
        // ATRELADA
        bw = 120;
        bx = boss.x + boss.width/2 - bw/2;
        by = boss.y + boss.height + 20;
        titleSize = 0; 
    } else {
        const scale = getHudScale();
        bw = canvas.width / 2; 
        bx = canvas.width / 2 - (bw * scale) / 2; 
        
        if (bossHpPos === 1) {
            by = 90; // CIMA
        } else {
            by = canvas.height - 50 - (25 * (scale - 1)); // BAIXO
        }
        titleSize = 18;
        
        ctx.translate(bx, by);
        ctx.scale(scale, scale);
        ctx.translate(-bx, -by);
    }

    ctx.fillStyle = `rgba(85, 85, 85, ${bgAlpha})`; 
    ctx.fillRect(bx, by, bw, 25);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0); 
    grad.addColorStop(0, `rgba(255, 107, 107, ${bgAlpha})`); 
    grad.addColorStop(1, `rgba(231, 76, 60, ${bgAlpha})`); 
    ctx.fillStyle = grad; ctx.fillRect(bx, by, bw * hpPct, 25);
    ctx.strokeStyle = `rgba(255, 255, 255, ${bgAlpha})`; 
    ctx.lineWidth = 3; 
    ctx.strokeRect(bx, by, bw, 25); 
    
    if (titleSize > 0) {
        // A legenda mantém a opacidade em 1.0
        drawGradientText('O OLHO ONISCIENTE', bx + bw/2, by - 15, titleSize, 'center', true, ctx);
    }
    
    ctx.restore();
}

// --- MENUS ---
function drawPauseMenu(deltaTime) { 
    const targetScales = [ 
        (selectedPauseOption === 0) ? BUTTON_HOVER_SCALE : 1.0, 
        (selectedPauseOption === 1) ? BUTTON_HOVER_SCALE : 1.0,
        (selectedPauseOption === 2) ? BUTTON_HOVER_SCALE : 1.0 
    ];
    
    while(menuAnimStates.pause.length < 3) menuAnimStates.pause.push(1.0);

    for (let i = 0; i < 3; i++) { 
        menuAnimStates.pause[i] += (targetScales[i] - menuAnimStates.pause[i]) * 15 * deltaTime; 
    }
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height); 
    drawGradientText('PAUSADO', canvas.width / 2, canvas.height / 2 - 80, 40, 'center', true, ctx); 
    
    const opts = ['Continuar', 'Opções', 'Voltar Para o Menu']; 
    
    for (let i = 0; i < opts.length; i++) { 
        const isSel = (selectedPauseOption === i); 
        const scale = menuAnimStates.pause[i];
        const size = 24 * scale; 
        const grad = ctx.createLinearGradient(0, (canvas.height/2 + i*50) - size, 0, canvas.height/2 + i*50); 
        grad.addColorStop(0, isSel ? '#ffffff' : '#e0e0e0'); grad.addColorStop(1, isSel ? '#dddddd' : '#b0b0b0'); 
        ctx.fillStyle = grad; ctx.font = `${size}px "Press Start 2P"`; ctx.textAlign = 'center'; ctx.fillText(opts[i], canvas.width / 2, canvas.height/2 + i*50); 
    } 
}

function drawOptionsMenu(deltaTime) { 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height); 
    
    let titleText = 'OPÇÕES';
    if (optionsState === 'audio') titleText = 'ÁUDIO'; 
    if (optionsState === 'controls') titleText = 'CONTROLE';
    if (optionsState === 'graphics') titleText = 'GRÁFICOS';
    
    const titleSize = optionsState === 'main' ? 40 : 32;
    drawGradientText(titleText, canvas.width / 2, canvas.height / 2 - 130, titleSize, 'center', true, ctx); 

    if (!menuAnimStates.graphics) menuAnimStates.graphics = [1, 1, 1, 1, 1, 1, 1];

    if (optionsState === 'main') {
        const options = ['Opções Gráficas', 'Opções de Áudio', 'Opções de Controle', 'Voltar'];
        const startY = canvas.height / 2 - 30;
        for (let i = 0; i < options.length; i++) {
            const isSelected = (selectedOptionMain === i);
            const target = isSelected ? BUTTON_HOVER_SCALE : 1.0;
            menuAnimStates.main[i] += (target - menuAnimStates.main[i]) * 15 * deltaTime;
            const scale = menuAnimStates.main[i]; const size = 24 * scale; const yPos = startY + i * 50;
            const grad = ctx.createLinearGradient(0, yPos - size, 0, yPos);
            grad.addColorStop(0, isSelected ? '#ffffff' : '#e0e0e0'); grad.addColorStop(1, isSelected ? '#dddddd' : '#b0b0b0');
            ctx.fillStyle = grad; ctx.font = `${size}px "Press Start 2P"`; ctx.textAlign = 'center'; ctx.fillText(options[i], canvas.width / 2, yPos);
        }
    } else if (optionsState === 'graphics') {
        const hudText = hudState === 0 ? 'Pequeno' : hudState === 1 ? 'Padrão' : 'Off';
        const bossHpText = bossHpPos === 0 ? 'Padrão' : bossHpPos === 1 ? 'Cima' : 'Atrelada';
        const scenText = sceneryQuality === 'high' ? 'Padrão' : 'Reduzido';
        const effText = vfxEnabled ? 'Padrão' : 'Reduzido';
        const partText = particleQuality === 'high' ? 'Padrão' : 'Reduzido';
        const fpsText = (typeof showFps !== 'undefined' && showFps) ? 'On' : 'Off';
        
        const options = [
            `HUD: < ${hudText} >`,
            `HP Chefe: < ${bossHpText} >`,
            `Cenário: < ${scenText} >`,
            `Efeitos: < ${effText} >`,
            `Partículas: < ${partText} >`,
            `Mostrar FPS: < ${fpsText} >`
        ];
        
        const startY = canvas.height / 2 - 80;
        for (let i = 0; i < options.length; i++) {
            const isSelected = (selectedAudioSetting === i);
            const target = isSelected ? BUTTON_HOVER_SCALE : 1.0;
            menuAnimStates.graphics[i] += (target - menuAnimStates.graphics[i]) * 15 * deltaTime;
            const scale = menuAnimStates.graphics[i]; const size = 18 * scale; const yPos = startY + i * 35;
            const grad = ctx.createLinearGradient(0, yPos - size, 0, yPos);
            grad.addColorStop(0, isSelected ? '#ffffff' : '#e0e0e0'); 
            grad.addColorStop(1, isSelected ? '#dddddd' : '#b0b0b0');
            ctx.fillStyle = grad; ctx.font = `${size}px "Press Start 2P"`; ctx.textAlign = 'center'; ctx.fillText(options[i], canvas.width / 2, yPos);
        }
        
        const backTarget = (selectedAudioSetting === 6) ? BUTTON_HOVER_SCALE : 1.0;
        menuAnimStates.graphics[6] += (backTarget - menuAnimStates.graphics[6]) * 15 * deltaTime;
        const backBtn = getBackButtonRect(canvas.width, canvas.height); 
        const textY = backBtn.y + 25; 
        const scale = menuAnimStates.graphics[6]; const size = 24 * scale;
        const gradT = ctx.createLinearGradient(0, textY - size, 0, textY);
        gradT.addColorStop(0, (selectedAudioSetting === 6) ? '#ffffff' : '#e0e0e0'); 
        gradT.addColorStop(1, (selectedAudioSetting === 6) ? '#dddddd' : '#b0b0b0');
        ctx.fillStyle = gradT; ctx.font = `${size}px "Press Start 2P"`; ctx.textAlign = 'center'; ctx.fillText("Voltar", canvas.width / 2, textY);

    } else if (optionsState === 'audio') {
        const sliderWidth = 300; const sliderHeight = 20; const sliderStartX = (canvas.width / 2 - sliderWidth / 2) + 10; const labelXPosition = sliderStartX - 20; 
        const musicSliderY = canvas.height / 2 - 30; 
        
        while(menuAnimStates.audio.length < 3) menuAnimStates.audio.push(1.0);
        
        const targetScale0 = (selectedAudioSetting === 0) ? BUTTON_HOVER_SCALE : 1.0;
        const targetScale1 = (selectedAudioSetting === 1) ? BUTTON_HOVER_SCALE : 1.0;
        menuAnimStates.audio[0] += (targetScale0 - menuAnimStates.audio[0]) * 15 * deltaTime;
        menuAnimStates.audio[1] += (targetScale1 - menuAnimStates.audio[1]) * 15 * deltaTime;

        // Label Música
        ctx.font = '24px "Press Start 2P"'; ctx.textAlign = 'right'; 
        const musicLabelGrad = ctx.createLinearGradient(0, musicSliderY - 24, 0, musicSliderY); 
        musicLabelGrad.addColorStop(0, (selectedAudioSetting === 0) ? '#ffffff' : '#d0d0d0'); 
        musicLabelGrad.addColorStop(1, (selectedAudioSetting === 0) ? '#dddddd' : '#888');
        ctx.fillStyle = musicLabelGrad; 
        
        ctx.save();
        ctx.translate(labelXPosition, musicSliderY + sliderHeight / 2 + 5);
        ctx.scale(menuAnimStates.audio[0], menuAnimStates.audio[0]);
        ctx.fillText('Música', 0, 0);
        ctx.restore();

        // Slider Música
        ctx.fillStyle = '#555'; ctx.fillRect(sliderStartX, musicSliderY, sliderWidth, sliderHeight); 
        const musicGrad = ctx.createLinearGradient(sliderStartX, 0, sliderStartX + sliderWidth, 0); musicGrad.addColorStop(0, '#f1c40f'); musicGrad.addColorStop(1, '#f39c12'); 
        ctx.fillStyle = musicGrad; ctx.fillRect(sliderStartX, musicSliderY, sliderWidth * musicVolume, sliderHeight); 
        
        // Label Efeitos
        const sfxSliderY = canvas.height / 2 + 20; 
        const sfxLabelGrad = ctx.createLinearGradient(0, sfxSliderY - 24, 0, sfxSliderY); 
        sfxLabelGrad.addColorStop(0, (selectedAudioSetting === 1) ? '#ffffff' : '#d0d0d0'); 
        sfxLabelGrad.addColorStop(1, (selectedAudioSetting === 1) ? '#dddddd' : '#888');
        ctx.fillStyle = sfxLabelGrad; 
        
        ctx.save();
        ctx.translate(labelXPosition, sfxSliderY + sliderHeight / 2 + 5);
        ctx.scale(menuAnimStates.audio[1], menuAnimStates.audio[1]);
        ctx.fillText('Efeitos', 0, 0);
        ctx.restore();

        // Slider Efeitos
        ctx.fillStyle = '#555'; ctx.fillRect(sliderStartX, sfxSliderY, sliderWidth, sliderHeight); 
        const sfxGrad = ctx.createLinearGradient(sliderStartX, 0, sliderStartX + sliderWidth, 0); sfxGrad.addColorStop(0, '#f1c40f'); sfxGrad.addColorStop(1, '#f39c12'); 
        ctx.fillStyle = sfxGrad; ctx.fillRect(sliderStartX, sfxSliderY, sliderWidth * sfxVolume, sliderHeight); 
        
        const knobGrad = ctx.createLinearGradient(0, -14, 0, 14); knobGrad.addColorStop(0, '#fff'); knobGrad.addColorStop(1, '#ccc'); 
        ctx.fillStyle = knobGrad; ctx.strokeStyle = '#333'; ctx.lineWidth = 2; 
        ctx.save(); ctx.translate(sliderStartX + sliderWidth * musicVolume, musicSliderY + sliderHeight / 2); 
        ctx.beginPath(); ctx.roundRect(-6, -14, 12, 28, [3]); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(sliderStartX + sliderWidth * sfxVolume, sfxSliderY + sliderHeight / 2); 
        ctx.beginPath(); ctx.roundRect(-6, -14, 12, 28, [3]); ctx.fill(); ctx.stroke(); ctx.restore();
        
        // CORREÇÃO: Variável ajustada para desenhar o botão corretamente
        const isSelected = (selectedAudioSetting === 2); const backBtn = getBackButtonRect(canvas.width, canvas.height); const textY = backBtn.y + 25; 
        const target = isSelected ? BUTTON_HOVER_SCALE : 1.0; menuAnimStates.audio[2] += (target - menuAnimStates.audio[2]) * 15 * deltaTime;
        const scale = menuAnimStates.audio[2]; 
        const backSize = 24 * scale;
        const gradT = ctx.createLinearGradient(0, textY - backSize, 0, textY);
        gradT.addColorStop(0, isSelected ? '#ffffff' : '#e0e0e0'); gradT.addColorStop(1, isSelected ? '#dddddd' : '#b0b0b0');
        ctx.fillStyle = gradT; ctx.font = `${backSize}px "Press Start 2P"`; ctx.textAlign = 'center'; ctx.fillText("Voltar", canvas.width / 2, textY);
    } else if (optionsState === 'controls') {
        const layout = getControlsLayout(canvas.width / 2, canvas.height / 2 + 20); const backBtn = getBackButtonRect(canvas.width, canvas.height);
        
        const maxIndex = Object.keys(keyMap).length;
        if (typeof menuAnimStates.controls[maxIndex] === 'undefined') { menuAnimStates.controls[maxIndex] = 1.0; }
        const backTarget = (selectedAudioSetting === maxIndex) ? BUTTON_HOVER_SCALE : 1.0;
        menuAnimStates.controls[maxIndex] += (backTarget - menuAnimStates.controls[maxIndex]) * 15 * deltaTime;
        
        for (let i = 0; i < layout.length; i++) {
            const btn = layout[i]; const isSelected = (selectedAudioSetting === i); const isBinding = (bindingAction === btn.action);
            const target = (isSelected || isBinding) ? BUTTON_HOVER_SCALE : 1.0;
            menuAnimStates.controls[i] += (target - menuAnimStates.controls[i]) * 15 * deltaTime;
            const scale = menuAnimStates.controls[i];
            let drawW = btn.w * scale; let drawH = btn.h * scale; let drawX = btn.x - (drawW - btn.w) / 2; let drawY = btn.y - (drawH - btn.h) / 2;
            
            const btnGrad = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
            if (isBinding) { btnGrad.addColorStop(0, '#e74c3c'); btnGrad.addColorStop(1, '#c0392b'); } else { btnGrad.addColorStop(0, '#ecf0f1'); btnGrad.addColorStop(1, '#bdc3c7'); }
            ctx.fillStyle = btnGrad; ctx.strokeStyle = isSelected ? '#ffffff' : '#7f8c8d'; ctx.lineWidth = isSelected ? 3 : 2;
            ctx.beginPath(); ctx.roundRect(drawX, drawY, drawW, drawH, 6); ctx.fill(); ctx.stroke();
            
            const code = keyMap[btn.action] || ''; 
            const isArrow = code.startsWith('Arrow');
            
            if (isArrow) {
                ctx.save();
                ctx.translate(drawX + drawW/2, drawY + drawH/2);
                let rotation = 0;
                if (code === 'ArrowDown') rotation = Math.PI;
                else if (code === 'ArrowRight') rotation = Math.PI / 2;
                else if (code === 'ArrowLeft') rotation = -Math.PI / 2;
                ctx.rotate(rotation);
                ctx.scale(scale, scale);
                ctx.fillStyle = '#2c3e50';
                ctx.beginPath();
                ctx.moveTo(0, -10); ctx.lineTo(8, 3); ctx.lineTo(3, 3); ctx.lineTo(3, 9);
                ctx.lineTo(-3, 9); ctx.lineTo(-3, 3); ctx.lineTo(-8, 3);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                let keyName = isBinding ? '...' : formatKeyName(code);
                ctx.save(); ctx.translate(drawX + drawW/2, drawY + drawH/2); ctx.scale(scale, scale); ctx.fillStyle = '#2c3e50'; ctx.font = '12px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(keyName, 0, 2); ctx.restore();
            }
            if (['up', 'interact', 'pause', 'restart'].includes(btn.action)) {
                ctx.fillStyle = '#d0d0d0'; ctx.font = '10px "Press Start 2P"'; ctx.textBaseline = 'alphabetic';
                const displayLabel = btn.label.charAt(0).toUpperCase() + btn.label.slice(1).toLowerCase();
                if (btn.action === 'up') { ctx.textAlign = 'center'; ctx.fillText(displayLabel, btn.x + btn.w / 2, btn.y - 10); } else { ctx.textAlign = 'right'; ctx.fillText(displayLabel, btn.x - 15, btn.y + btn.h / 2 + 5); }
            }
        }
        
        const textY = backBtn.y + 25; const backScale = menuAnimStates.controls[maxIndex]; const backSize = 24 * backScale; const isSelected = (selectedAudioSetting === maxIndex);
        const grad = ctx.createLinearGradient(0, textY - backSize, 0, textY); grad.addColorStop(0, isSelected ? '#ffffff' : '#e0e0e0'); grad.addColorStop(1, isSelected ? '#dddddd' : '#b0b0b0');
        ctx.fillStyle = grad; ctx.font = `${backSize}px "Press Start 2P"`; ctx.textAlign = 'center'; ctx.fillText("Voltar", canvas.width / 2, textY);
    }
}

function drawStartScreen() { 
    drawGradientText('Super AI Bros.', canvas.width / 2, canvas.height / 2 - 40, 48, 'center', true, ctx);
    
    const interactCode = keyMap.interact || 'Space';
    let interactKeyFull = interactCode.replace('Key', '').replace('Digit', '').toUpperCase();
    if (interactCode === 'Space') interactKeyFull = 'BARRA DE ESPAÇO';
    if (interactCode === 'Enter') interactKeyFull = 'ENTER';
    if (interactCode.startsWith('Arrow')) interactKeyFull = interactCode.replace('Arrow', 'SETA ').toUpperCase();

    drawGradientText(`Pressione ${interactKeyFull} para iniciar!`, canvas.width / 2, canvas.height / 2 + 30, 20, 'center', true, ctx);

    let diffY = canvas.height / 2 + 80;

    if (hasBeatenGame) {
        drawGradientText('Código Secreto: gubed', canvas.width / 2, canvas.height / 2 + 75, 16, 'center', true, ctx);
        diffY = canvas.height / 2 + 120;
    }

    if (typeof menuAnimStates.startDiff === 'undefined') menuAnimStates.startDiff = 1.0;
    
    ctx.save();
    ctx.translate(canvas.width / 2, diffY);
    ctx.scale(menuAnimStates.startDiff, menuAnimStates.startDiff);
    drawGradientText(`Dificuldade: < ${difficultyNames[currentDifficulty]} >`, 0, 0, 18, 'center', true, ctx);
    ctx.restore();
}

function drawEndScreen(isVictory) {
    const overlayColor = isVictory ? 'rgba(12, 10, 26, 0.85)' : 'rgba(40, 10, 10, 0.85)';
    ctx.fillStyle = overlayColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (isVictory) { 
        drawGradientText('VOCÊ VENCEU!', canvas.width / 2, canvas.height / 2 - 50, 48, 'center', true, ctx); 
    } else { 
        drawGradientText('FIM DE JOGO', canvas.width / 2, canvas.height / 2 - 50, 48, 'center', true, ctx); 
    }

    let endMetricLabel = (finalBoss || (phaseOneComplete && !isVictory)) ? 'Altura Final' : 'Distância Final';
    let endMetricValue = (finalBoss || (phaseOneComplete && !isVictory)) ? Math.max(0, Math.floor((phaseTwoStartScrollY - verticalScrollOffset) / 10)) : Math.floor(scrollOffset / 50);
    
    if (!isVictory) {
        drawGradientText(`Pontuação Final: ${score}`, canvas.width / 2, canvas.height / 2 - 10, 20, 'center', true, ctx);
        drawGradientText(`${endMetricLabel}: ${endMetricValue}m`, canvas.width / 2, canvas.height / 2 + 20, 20, 'center', true, ctx);
    } else {
        drawGradientText(`${endMetricLabel}: ${endMetricValue}m`, canvas.width / 2, canvas.height / 2 + 20, 24, 'center', true, ctx);
    }

    const interactCode = keyMap.interact || 'Space';
    let interactKeyFull = interactCode.replace('Key', '').replace('Digit', '').toUpperCase();
    if (interactCode === 'Space') interactKeyFull = 'BARRA DE ESPAÇO';
    if (interactCode === 'Enter') interactKeyFull = 'ENTER';
    if (interactCode.startsWith('Arrow')) interactKeyFull = interactCode.replace('Arrow', 'SETA ').toUpperCase();

    const continueY = isVictory ? 130 : 100;
    
    if (isVictory && finalBoss) { 
         drawGradientText('DEBUG MODE DESBLOQUEADO!', canvas.width / 2, canvas.height / 2 + 60, 14, 'center', true, ctx);
         drawGradientText('Código: gubed', canvas.width / 2, canvas.height / 2 + 85, 14, 'center', true, ctx);
         drawGradientText(`Pressione ${interactKeyFull} para continuar`, canvas.width / 2, canvas.height / 2 + 130, 20, 'center', true, ctx);
    } else {
         drawGradientText(`Pressione ${interactKeyFull} para continuar`, canvas.width / 2, canvas.height / 2 + continueY, 20, 'center', true, ctx);
    }
}

function drawScreenMessages() {
    return;
}

function drawDebugInfo(ctx) {
    if (!cheatsEnabled) return; 

    ctx.save();
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00ff00';
    
    const boxWidth = 200;
    const boxHeight = 90;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvas.width - boxWidth - 10, canvas.height - boxHeight - 10, boxWidth, boxHeight);

    ctx.fillStyle = '#00ff00';
    let lineY = canvas.height - boxHeight + 5;
    const lineHeight = 12;
    const rightX = canvas.width - 15;

    ctx.fillText(`FPS: ${currentFps}`, rightX, lineY); lineY += lineHeight;
    ctx.fillText(`ENTITIES: E:${enemies.length} P:${particles.length}`, rightX, lineY); lineY += lineHeight;
    ctx.fillText(`PLAYER: X:${Math.floor(player.x)} Y:${Math.floor(player.y)}`, rightX, lineY); lineY += lineHeight;
    ctx.fillText(`VEL: VX:${Math.floor(player.velocityX)} VY:${Math.floor(player.velocityY)}`, rightX, lineY); lineY += lineHeight;
    
    let stateText = "AIR";
    if (player.onPassableSurface) stateText = "GROUND";
    if (player.isJumping) stateText = "JUMP";
    ctx.fillText(`STATE: ${stateText} | ${gameState}`, rightX, lineY); lineY += lineHeight;
    
    const camY = isVerticalPhase() ? verticalScrollOffset : 0;
    const camX = isVerticalPhase() ? 0 : scrollOffset;
    ctx.fillText(`CAM: X:${Math.floor(camX)} Y:${Math.floor(camY)}`, rightX, lineY);

    ctx.restore();
}