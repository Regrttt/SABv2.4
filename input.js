// input.js - Controle de Teclado, Mouse e Debug Menu

// --- LER CONFIGURAÇÕES SALVAS (Ou definir padrão) ---
let hudState = localStorage.getItem('cfg_hudState') !== null ? parseInt(localStorage.getItem('cfg_hudState')) : 1; 
let bossHpPos = localStorage.getItem('cfg_bossHpPos') !== null ? parseInt(localStorage.getItem('cfg_bossHpPos')) : 0; 
let sceneryQuality = localStorage.getItem('cfg_sceneryQuality') || 'high'; 
let vfxEnabled = localStorage.getItem('cfg_vfxEnabled') !== null ? localStorage.getItem('cfg_vfxEnabled') === 'true' : true; 
let particleQuality = localStorage.getItem('cfg_particleQuality') || 'high'; 
let showFps = localStorage.getItem('cfg_showFps') !== null ? localStorage.getItem('cfg_showFps') === 'true' : false; 

currentDifficulty = localStorage.getItem('cfg_difficulty') !== null ? parseInt(localStorage.getItem('cfg_difficulty')) : 1; 

function saveGraphicsConfig() {
    localStorage.setItem('cfg_hudState', hudState);
    localStorage.setItem('cfg_bossHpPos', bossHpPos);
    localStorage.setItem('cfg_sceneryQuality', sceneryQuality);
    localStorage.setItem('cfg_vfxEnabled', vfxEnabled);
    localStorage.setItem('cfg_particleQuality', particleQuality);
    localStorage.setItem('cfg_showFps', showFps);
}

function saveDifficultyConfig() {
    localStorage.setItem('cfg_difficulty', currentDifficulty);
}

// Sincroniza a variável reduceParticles do game.js na inicialização
window.addEventListener('load', () => {
    if (typeof reduceParticles !== 'undefined') {
        reduceParticles = (particleQuality !== 'high');
    }
});

// --- LÓGICA DO DEBUG PANEL E SPAWN ---
function toggleDebugPanel(forceState = null) {
    const panel = document.getElementById('debugPanel');
    const newState = (forceState !== null) ? forceState : !debugPanelOpen;
    debugPanelOpen = newState;
    
    if (debugPanelOpen) {
        panel.style.left = '0px'; 
        updateDebugPanelUI();
    } else {
        panel.style.left = '-300px'; 
        selectedSpawnType = null;
        canvas.style.cursor = 'default';
        updateDebugPanelUI();
    }
}

function updateDebugPanelUI() {
    const setToggle = (id, state) => {
        const btn = document.getElementById(id);
        if(!btn) return;
        if (state) {
            btn.classList.add('active-toggle');
            btn.innerText = 'ON';
        } else {
            btn.classList.remove('active-toggle');
            btn.innerText = 'OFF';
        }
    };

    setToggle('btn-godmode', infiniteInvincibilityCheat);
    setToggle('btn-lock-score', scoreLockCheat);
    setToggle('btn-hitbox', debugMode);

    document.querySelectorAll('.spawn-select').forEach(btn => {
        if (btn.dataset.type === selectedSpawnType) {
            btn.classList.add('active-toggle');
            btn.classList.add('spawn-selected');
            btn.innerText = 'ON';
        } else {
            btn.classList.remove('active-toggle');
            btn.classList.remove('spawn-selected');
            btn.innerText = 'OFF';
        }
    });
}

function handleDebugSpawn(mousePos) {
    if (!selectedSpawnType) return;

    const isVertical = isVerticalPhase();
    const worldY = mousePos.y + (isVertical ? verticalScrollOffset : 0);
    
    const isScreenEntity = ['enemy-straight', 'enemy-homing', 'enemy-charger', 'aux-rebound'].includes(selectedSpawnType);
    
    const spawnX = isScreenEntity ? mousePos.x : mousePos.x + (isVertical ? 0 : scrollOffset);
    const spawnY = isScreenEntity ? mousePos.y : worldY;

    for(let i=0; i<8; i++) {
        particles.push({
            x: spawnX, y: spawnY, size: Math.random()*3+2, color: '#fff',
            lifespan: 0.5, initialLifespan: 0.5,
            vx: (Math.random()-0.5)*200, vy: (Math.random()-0.5)*200,
            isScreenSpace: isScreenEntity
        });
    }

    const addIsolatedPlatform = (p) => {
        p.isDebug = true; 
        if (platforms.length > 0) { platforms.splice(platforms.length - 1, 0, p); } 
        else { platforms.push(p); }
    };

    if (selectedSpawnType.startsWith('enemy-')) {
        const type = selectedSpawnType.replace('enemy-', '');
        
        if (type === 'patrol') {
            const plat = new Platform(spawnX - 50, spawnY + 20, 100, 'stable', isVertical ? 'stone' : 'grass');
            plat.spawnReason = 'enemy'; 
            addIsolatedPlatform(plat);
            const enemy = new Enemy(spawnX - 17, spawnY - 15, 'patrol', ENEMY_SPEED_BASE, false, plat);
            enemy.platform = plat; 
            enemies.push(enemy);
        } else if (type === 'rock') {
            const rock = new Enemy(spawnX - 20, spawnY - 20, 'falling_rock', 0, false);
            enemies.push(rock);
        } else {
            let speed = ENEMY_STRAIGHT_SPEED;
            if (type === 'homing') speed = ENEMY_HOMING_SPEED;
            if (type === 'charger') speed = 0;

            projectileIndicators.push({
                x: spawnX - 17.5,
                y: spawnY - 17.5,
                lifespan: PROJECTILE_INDICATOR_DURATION,
                initialLifespan: PROJECTILE_INDICATOR_DURATION,
                projectileType: type,
                projectileSpeed: speed,
                isScreenSpace: isScreenEntity
            });
        }
        
    } else if (selectedSpawnType.startsWith('aux-')) {
        const type = selectedSpawnType.replace('aux-', '');
        
        if (type === 'rebound') {
            projectileIndicators.push({
                x: spawnX - 17.5, y: spawnY - 17.5,
                lifespan: PROJECTILE_INDICATOR_DURATION, initialLifespan: PROJECTILE_INDICATOR_DURATION,
                projectileType: 'rebound', projectileSpeed: BOSS_MINION_REBOUND_SPEED,
                isScreenSpace: isScreenEntity
            });
        } else if (type === 'debris') {
            bossDebris.push(new BossDebris(spawnX, spawnY, 0, false));
        }

    } else if (selectedSpawnType === 'item-coin') {
        coins.push(new Coin(spawnX, spawnY));
    } else if (selectedSpawnType === 'item-health') {
        healthPacks.push(new HealthPack(spawnX, spawnY));
    } else if (selectedSpawnType.startsWith('obj-')) {
        const objType = selectedSpawnType.replace('obj-', '');
        
        if (objType === 'chest') {
            const pWidth = 150;
            const p = new Platform(spawnX - pWidth/2, spawnY + 20, pWidth, 'stable', isVertical ? 'stone' : 'grass');
            p.hasChest = true; 
            p.chestType = Math.random() < CHEST_LUCK_CHANCE ? 'reward' : 'trap'; 
            p.spawnReason = 'item'; 
            addIsolatedPlatform(p);
        } else if (objType === 'window') {
            const pWidth = 150;
            const p = new Platform(spawnX - pWidth/2, spawnY + 20, pWidth, 'stable', isVertical ? 'stone' : 'grass');
            p.hasWindowTrap = true; 
            p.windowType = Math.random() < WINDOW_REWARD_CHANCE ? 'reward' : 'trap'; 
            p.spawnReason = 'item'; 
            addIsolatedPlatform(p);
        } else if (objType === 'falling') {
             const pWidth = 150;
             const p = new Platform(spawnX - pWidth/2, spawnY + 20, pWidth, 'falling', isVertical ? 'stone' : 'grass');
             p.spawnReason = 'item'; 
             addIsolatedPlatform(p);
        } else if (objType === 'cloud') {
             const pWidth = 100 + Math.random() * 50; 
             const p = new Platform(spawnX - pWidth/2, spawnY + 20, pWidth, 'pass-through-slow', 'cloud');
             p.spawnReason = 'item'; 
             addIsolatedPlatform(p);
        } else if (objType === 'spike') {
            const pWidth = 150;
            const p = new Platform(spawnX - pWidth/2, spawnY + 20, pWidth, 'stable', isVertical ? 'stone' : 'grass');
            p.spawnReason = 'enemy';
            
            const isBottom = isVertical ? (Math.random() < 0.5) : false; 
            const numSpikes = Math.floor(Math.random() * 5) + 1; 
            const spikeW = numSpikes * 20;
            const obsX = (pWidth - spikeW) / 2; 

            if (isBottom) { p.addObstacle({ type: 'spike-down', x: obsX, width: spikeW, height: BOTTOM_SPIKE_HEIGHT }); } 
            else { p.addObstacle({ type: 'spike', x: obsX, width: spikeW, height: 20 }); }
            
            addIsolatedPlatform(p);
        } else if (objType === 'wall') {
            const pWidth = 150;
            const p = new Platform(spawnX - pWidth/2, spawnY + 20, pWidth, 'stable', isVertical ? 'stone' : 'grass');
            p.spawnReason = 'enemy';
            
            const isTall = Math.random() < TALL_WALL_CHANCE;
            const wHeight = isTall ? TALL_WALL_HEIGHT : NORMAL_WALL_HEIGHT;
            
            const hasTopSpikes = (!isTall && Math.random() < WALL_WITH_TOP_SPIKES_CHANCE);
            const hasLatSpikes = Math.random() < WALL_SPIKE_CHANCE;
            
            let wallData;
            if (hasTopSpikes) { wallData = { type: 'wallWithTopSpikes', x: 60, width: 30, wallHeight: wHeight, spikeHeight: 20 }; } 
            else { wallData = { type: 'wall', x: 60, width: 30, height: wHeight }; }
            
            if (hasLatSpikes) {
                const numLat = Math.random() < 0.6 ? 1 : 2;
                const singleSpikeVisualHeight = 20;
                const totalLatHeight = numLat * singleSpikeVisualHeight;
                let yOff = 5 + Math.random() * ((wHeight * 0.15) - 5);
                yOff = Math.max(5, yOff);
                if (yOff + totalLatHeight > wHeight - 5) yOff = Math.max(5, wHeight - totalLatHeight - 5);
                wallData.lateralSpikes = { yOffset: yOff, height: totalLatHeight, protrusion: 15, numSpikes: numLat };
            }
            p.addObstacle(wallData);
            addIsolatedPlatform(p);
        }
    }
}

function startDebugDrag(e) {
    isDraggingDebug = true;
    dragStartX = e.clientX;
    const panel = document.getElementById('debugPanel');
    panel.style.transition = 'none';
    dragStartLeft = parseInt(window.getComputedStyle(panel).left, 10);
}

function handleDebugDrag(e) {
    if (!isDraggingDebug) return;
    const deltaX = e.clientX - dragStartX;
    let newLeft = dragStartLeft + deltaX;
    newLeft = Math.max(-300, Math.min(0, newLeft));
    const panel = document.getElementById('debugPanel');
    panel.style.left = newLeft + 'px';
}

function stopDebugDrag(e) {
    if (!isDraggingDebug) return;
    isDraggingDebug = false;
    const panel = document.getElementById('debugPanel');
    panel.style.transition = 'left 0.3s ease-out';
    const currentLeft = parseInt(panel.style.left, 10);
    const threshold = -150; 
    
    if (Math.abs(e.clientX - dragStartX) < 5) {
        toggleDebugPanel(); 
    } else {
        if (currentLeft > threshold) { toggleDebugPanel(true); } else { toggleDebugPanel(false); }
    }
}

function setupDebugListeners() {
    if (debugListenersAdded) return; 
    debugListenersAdded = true;

    const unwantedText = document.querySelector('.debug-info-text');
    if(unwantedText) unwantedText.style.display = 'none';

    document.getElementById('closeDebugPanel').addEventListener('click', function() {
        this.blur();
        toggleDebugPanel(false);
    });
    
    const handle = document.getElementById('debugDragHandle');
    handle.addEventListener('mousedown', startDebugDrag);
    window.addEventListener('mousemove', handleDebugDrag);
    window.addEventListener('mouseup', stopDebugDrag);

    const debugBody = document.querySelector('.debug-body');
    if (debugBody) {
        let isDown = false;
        let startY;
        let scrollTop;

        debugBody.addEventListener('mousedown', (e) => {
            isDown = true;
            startY = e.pageY - debugBody.offsetTop;
            scrollTop = debugBody.scrollTop;
        });
        debugBody.addEventListener('mouseleave', () => {
            isDown = false;
        });
        debugBody.addEventListener('mouseup', () => {
            isDown = false;
        });
        debugBody.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault(); 
            const y = e.pageY - debugBody.offsetTop;
            const walk = (y - startY) * 1.5; 
            debugBody.scrollTop = scrollTop - walk;
        });
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.blur();
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const contentId = btn.dataset.tab;
            document.getElementById(contentId).classList.add('active');
            activeDebugTab = contentId;
            
            if (debugBody) {
                debugBody.scrollTop = 0;
            }
        });
    });

    document.getElementById('btn-godmode').addEventListener('click', function() {
        this.blur();
        infiniteInvincibilityCheat = !infiniteInvincibilityCheat;
        if(!infiniteInvincibilityCheat && player) player.isInvincible = false;
        updateDebugPanelUI();
    });
    document.getElementById('btn-add-life').addEventListener('click', function() {
        this.blur();
        if(player && player.health < player.maxHealth) { player.health++; playSound(sounds.coin); }
    });
    document.getElementById('btn-sub-life').addEventListener('click', function() {
        this.blur();
        if(player && player.health > 1) { player.health--; } 
    });

    document.getElementById('btn-add-score').addEventListener('click', function() {
        this.blur();
        score += 100;
    });
    document.getElementById('btn-sub-score').addEventListener('click', function() {
        this.blur();
        score = Math.max(0, score - 100);
    });
    document.getElementById('btn-lock-score').addEventListener('click', function() {
        this.blur();
        scoreLockCheat = !scoreLockCheat;
        updateDebugPanelUI();
    });

    document.getElementById('btn-hitbox').addEventListener('click', function() {
        this.blur();
        debugMode = !debugMode;
        updateDebugPanelUI();
    });

    document.getElementById('btn-phase-1').addEventListener('click', function() {
        this.blur();
        init(false, true); 
    });
    document.getElementById('btn-phase-2').addEventListener('click', function() {
        this.blur();
        phaseOneComplete = true; initPhaseTwo(); 
    });
    
    document.getElementById('btn-dmg-boss').addEventListener('click', function() {
        this.blur();
        if(boss) { boss.health -= 10; playSound(sounds.damage); }
        if(finalBoss) { finalBoss.takeDamage(1); }
    });

    const summonBossBtn = document.getElementById('btn-summon-boss');
    if (summonBossBtn) summonBossBtn.addEventListener('click', function() {
        this.blur();
        if (gameState === 'playing' && !boss) {
            score = Math.max(score, BOSS_TRIGGER_SCORE);
            gameState = 'bossBattle';
            initBossBattle();
        } else if (gameState === 'phaseTwo' && !finalBoss) {
            score = Math.max(score, FINAL_BOSS_TRIGGER_SCORE);
            initFinalBoss();
        }
    });

    const clearEnemiesBtn = document.getElementById('btn-clear-enemies');
    if (clearEnemiesBtn) clearEnemiesBtn.addEventListener('click', function() {
        this.blur();
        enemies = [];
        projectileIndicators = [];
        bossDebris = [];
        
        platforms.forEach(p => {
            if(p.obstacles) p.obstacles = p.obstacles.filter(obs => obs.type === 'bush');
            p.hasPatrolEnemy = false; 
        });

        platforms = platforms.filter(p => !(p.isDebug && p.spawnReason === 'enemy'));
        playSound(sounds.damage);
    });

    const clearItemsBtn = document.getElementById('btn-clear-items');
    if (clearItemsBtn) clearItemsBtn.addEventListener('click', function() {
        this.blur();
        coins = [];
        healthPacks = [];
        coinAnimations = [];
        
        platforms.forEach(p => {
            p.hasChest = false;
            p.hasWindowTrap = false;
        });

        platforms = platforms.filter(p => {
            if (p.isDebug && p.spawnReason === 'item') return false;
            if (p.type === 'falling') return false;
            return true;
        });
        playSound(sounds.coin);
    });

    const clearAllBtn = document.getElementById('btn-clear-all');
    if (clearAllBtn) clearAllBtn.addEventListener('click', function() {
        this.blur();
        enemies = [];
        projectileIndicators = [];
        bossDebris = [];
        coins = [];
        healthPacks = [];
        coinAnimations = [];
        
        platforms.forEach(p => {
            if(p.obstacles) p.obstacles = p.obstacles.filter(obs => obs.type === 'bush');
            p.hasPatrolEnemy = false; 
            p.hasChest = false;
            p.hasWindowTrap = false;
        });

        platforms = platforms.filter(p => {
            if (p.isDebug) return false;
            if (p.type === 'falling') return false;
            return true;
        });
        playSound(sounds.damage);
    });

    const resetSaveBtn = document.getElementById('btn-reset-save');
    if (resetSaveBtn) resetSaveBtn.addEventListener('click', function() {
        this.blur();
        localStorage.removeItem('gameBeaten');
        alert('ARQUIVO DE SALVAMENTO DELETADO COM SUCESSO!');
        location.reload();
    });

    document.querySelectorAll('.spawn-select').forEach(btn => {
        btn.addEventListener('click', function() {
            this.blur();
            const type = btn.dataset.type;
            if (selectedSpawnType === type) {
                selectedSpawnType = null; 
                canvas.style.cursor = 'default';
            } else {
                selectedSpawnType = type;
                canvas.style.cursor = 'crosshair'; 
            }
            updateDebugPanelUI();
        });
    });
}

// --- FUNÇÕES DE INPUT (EVENT HANDLING) ---
function togglePauseGame() {
    if (gameState === 'playing' || gameState === 'bossBattle' || gameState === 'phaseTwo' || gameState === 'finalBoss') { 
        previousStateForPause = gameState; 
        gameState = 'paused'; 
        setTargetMusicVolumeFactor(gameState); 
        keys.left = false; 
        keys.right = false; 
        keys.down = false;
    } else if (gameState === 'paused') { 
        gameState = previousStateForPause || 'playing'; 
        setTargetMusicVolumeFactor(gameState); 
    }
}

function handleStartInput(event) { 
    if (event.code === keyMap.interact) {
        gameState = 'playing'; 
        musicStarted = true; 
        if (sounds.music.audio) {
            sounds.music.audio.currentTime = 0;
            sounds.music.audio.play().catch(e => {});
        }
        setTargetMusicVolumeFactor(gameState); 
    }
}

function handlePlayingInput(event) { 
    if (document.getElementById('patchNotesContainer').classList.contains('visible')) return; 
    
    if (event.code === keyMap.pause) { togglePauseGame(); return; } 
    
    // ATUALIZAÇÃO: Registra qual foi a última tecla de movimento apertada
    if (event.code === keyMap.left) { keys.left = true; keys.lastHorizontal = 'left'; } 
    if (event.code === keyMap.right) { keys.right = true; keys.lastHorizontal = 'right'; } 
    
    if (event.code === keyMap.down) keys.down = true; 
    
    if (event.code === keyMap.up) {
        if (event.repeat) return;
        keys.space = true; 
        if (player.canJump()) { player.jump(); }
    }

    if (event.code === keyMap.interact) {
        if (player.captureState === 'none') {
            if (player.heldDebris) {
                if (gameState === 'finalBoss' && finalBoss && finalBoss.health > 0) {
                    const weakPoints = finalBoss.getBodyHitboxes(verticalScrollOffset);
                    const head = weakPoints.find(h => h.type === 'circle');
                    if (head) { 
                        player.heldDebris.throwAt(head.x, head.y + verticalScrollOffset); 
                        bossDebris.push(player.heldDebris); 
                        player.heldDebris = null; 
                        playSound(sounds.jump); 
                    }
                } else {
                    const dirX = Math.random() > 0.5 ? 1 : -1; 
                    const forceX = Math.random() * 300 + 200;
                    const forceY = Math.random() * 300 + 150;
                    const throwTargetX = player.x + (dirX * forceX); 
                    const throwTargetY = player.y - forceY;          
                    player.heldDebris.throwAt(throwTargetX, throwTargetY);
                    bossDebris.push(player.heldDebris);
                    player.heldDebris = null;
                    playSound(sounds.jump);
                }
            } else if (player.canPickUpDebris && !player.isJumping) { 
                player.heldDebris = player.canPickUpDebris; 
                const idx = bossDebris.indexOf(player.canPickUpDebris); 
                if (idx > -1) bossDebris.splice(idx, 1); 
                player.canPickUpDebris = null; 
                playSound(sounds.coin);
            }
        }

        if (!player.isJumping) {
            if (player.canInteractWithChest) {
                chestToOpen = player.canInteractWithChest; 
                player.canInteractWithChest = null;
            }
            const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };
            for (const platform of platforms) {
                if (platform.hasWindowTrap) {
                    const wW = 60; const wH = 90;
                    const wX = platform.x + (platform.width/2) - (wW/2); const wY = platform.y - wH;
                    if (isColliding(playerRect, {x: wX, y: wY, width: wW, height: wH})) { 
                        player.getCaptured(platform, { x: wX + wW/2, y: wY + wH/2 }); break; 
                    }
                }
            }
        }
    }

    if (event.code === keyMap.restart) { init(false, true); return; } 
}

function handlePausedInput(event) { 
    if (event.code === keyMap.pause) { 
        gameState = previousStateForPause || 'playing'; 
        setTargetMusicVolumeFactor(gameState); 
    } 
}

function handleOptionsInput(event) {
    if (bindingAction) {
        event.preventDefault(); 
        if (event.code === 'Escape') { bindingAction = null; } 
        else {
            const isDuplicate = Object.values(keyMap).includes(event.code);
            if (isDuplicate && keyMap[bindingAction] !== event.code) {
                const existingAction = Object.keys(keyMap).find(key => keyMap[key] === event.code);
                keyMap[existingAction] = keyMap[bindingAction]; 
            }
            keyMap[bindingAction] = event.code; 
            localStorage.setItem('superAIKeyMap', JSON.stringify(keyMap)); 
            bindingAction = null; playSound(sounds.coin);
        }
        return;
    }
}

function handleEndScreenInput(event) {
    if (event.code === keyMap.interact) {
        sounds.music.audio.currentTime = 0;
        
        if (gameWon) {
            if (finalBoss) {
                init();
            } else {
                initPhaseTwo();
            }
        } else {
            if (phaseOneComplete) {
                initPhaseTwo();
            } else {
                init(false, true); 
            }
        }
    }
}

let cheatCodePlayer = 'gubed';
let cheatCodeDev = 'qa24';
let cheatProgressPlayer = 0;
let cheatProgressDev = 0;

function toggleCheatState() {
    cheatsEnabled = !cheatsEnabled;
    const panel = document.getElementById('debugPanel');
    if (cheatsEnabled) {
        screenMessage = { text: "DEBUG MODE ATIVADO!", lifespan: 2 };
        panel.classList.add('active'); 
        toggleDebugPanel(false); 
        setupDebugListeners(); 
    } else {
        screenMessage = { text: "DEBUG MODE DESATIVADO!", lifespan: 2 };
        panel.classList.remove('active'); 
        toggleDebugPanel(false); 
        debugMode = false;
        infiniteInvincibilityCheat = false;
        if (player) player.isInvincible = false;
        scoreLockCheat = false;
        updateDebugPanelUI();
    }
}

function handleKeyDown(event) { 
    // ATUALIZAÇÃO: Trava de segurança do Patch Notes
    if (document.getElementById('patchNotesContainer').classList.contains('visible')) return;

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
    }

    if (event.key.toLowerCase() === cheatCodeDev[cheatProgressDev]) {
        cheatProgressDev++;
        if (cheatProgressDev === cheatCodeDev.length) {
            toggleCheatState();
            cheatProgressDev = 0;
            cheatProgressPlayer = 0;
        }
    } else {
        cheatProgressDev = 0;
    }

    if (hasBeatenGame) {
        if (event.key.toLowerCase() === cheatCodePlayer[cheatProgressPlayer]) {
            cheatProgressPlayer++;
            if (cheatProgressPlayer === cheatCodePlayer.length) {
                toggleCheatState();
                cheatProgressPlayer = 0;
                cheatProgressDev = 0;
            }
        } else {
            cheatProgressPlayer = 0;
        }
    }

    switch (gameState) { 
        case 'start': handleStartInput(event); break; 
        case 'playing': case 'bossBattle': case 'phaseTwo': case 'finalBoss': handlePlayingInput(event); break; 
        case 'paused': handlePausedInput(event); break; 
        case 'options': handleOptionsInput(event); break; 
        case 'gameOver': case 'gameWon': handleEndScreenInput(event); break; 
    } 
}

function handleKeyUp(event) { 
    if (event.code === keyMap.up) keys.up = false;
    if (event.code === keyMap.up) keys.space = false;
    if (gameState === 'playing' || gameState === 'bossBattle' || gameState === 'phaseTwo' || gameState === 'finalBoss') { 
        if (event.code === keyMap.left) keys.left = false; 
        if (event.code === keyMap.right) keys.right = false; 
        if (event.code === keyMap.down) keys.down = false; 
    } 
}

function handleMouseDown(event) { 
    const mousePos = getMousePos(canvas, event); 
    if (gameState === 'options') { 
        if (optionsState === 'audio') {
            const sliderWidth = 300; const sliderHeight = 20; const sliderStartX = (canvas.width / 2 - sliderWidth / 2) + 10; const musicSliderY = canvas.height / 2 - 30; const sfxSliderY = canvas.height / 2 + 20; 
            if (isMouseOverRect(mousePos, sliderStartX, musicSliderY - 10, sliderWidth, sliderHeight + 20)) { draggingSlider = 'music'; handleMouseMove(event); } 
            else if (isMouseOverRect(mousePos, sliderStartX, sfxSliderY - 10, sliderWidth, sliderHeight + 20)) { draggingSlider = 'sfx'; handleMouseMove(event); } 
        }
    } 
}

function handleMouseUp(event) { 
    if (draggingSlider === 'sfx') playSound(sounds.coin); 
    draggingSlider = null; 
}

function handleMouseMove(event) { 
    if (event.target.closest('#debugPanel') || event.target.closest('#debugDragHandle')) {
        canvas.style.cursor = 'default';
        isHoveringPause = false;
        return;
    }
    
    // ATUALIZAÇÃO: Trava de segurança do Patch Notes
    if (document.getElementById('patchNotesContainer').classList.contains('visible')) {
        canvas.style.cursor = 'default';
        return;
    }

    const mousePos = getMousePos(canvas, event); 
    const isGameActive = gameState === 'playing' || gameState === 'bossBattle' || gameState === 'phaseTwo' || gameState === 'finalBoss';
    
    if (gameState === 'start') {
        let diffY = canvas.height / 2 + 80;
        if (hasBeatenGame) { diffY = canvas.height / 2 + 120; }
        
        if (isMouseOverRect(mousePos, canvas.width / 2 - 150, diffY - 20, 300, 30)) {
            menuAnimStates.startDiff += (BUTTON_HOVER_SCALE - menuAnimStates.startDiff) * 0.3;
            canvas.style.cursor = 'pointer';
        } else {
            menuAnimStates.startDiff += (1.0 - menuAnimStates.startDiff) * 0.3;
            canvas.style.cursor = 'default';
        }
        return;
    }

    if (isGameActive) {
        if (selectedSpawnType) {
            canvas.style.cursor = 'crosshair';
            isHoveringPause = false; 
        } else {
            if (isMouseOverRect(mousePos, PAUSE_BTN_X, PAUSE_BTN_Y, PAUSE_BTN_SIZE, PAUSE_BTN_SIZE)) {
                isHoveringPause = true; canvas.style.cursor = 'pointer';
            } else { 
                isHoveringPause = false; canvas.style.cursor = 'default'; 
            }
        }
    } else if (gameState !== 'options') { canvas.style.cursor = 'default'; isHoveringPause = false; }

    if (gameState === 'paused') { 
        const menuXCenter = canvas.width / 2; const optionYStart = canvas.height / 2; const lineHeight = 50; const hoverWidth = 250; const hoverHeight = 40; const textBaselineOffset = 25; 
        selectedPauseOption = -1;
        if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optionYStart - textBaselineOffset, hoverWidth, hoverHeight)) { selectedPauseOption = 0; } 
        if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optionYStart + lineHeight - textBaselineOffset, hoverWidth, hoverHeight)) { selectedPauseOption = 1; } 
        if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optionYStart + lineHeight * 2 - textBaselineOffset, hoverWidth, hoverHeight)) { selectedPauseOption = 2; } 
    } 
    else if (gameState === 'options') { 
        if (optionsState === 'main') {
            const menuXCenter = canvas.width / 2; const optionYStart = canvas.height / 2 - 30; const lineHeight = 50; const hoverWidth = 450; const hoverHeight = 40; const textBaselineOffset = 25; 
            selectedOptionMain = -1;
            for(let i=0; i<4; i++) { if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optionYStart + (i * lineHeight) - textBaselineOffset, hoverWidth, hoverHeight)) { selectedOptionMain = i; } }
        } else if (optionsState === 'graphics') {
            const menuXCenter = canvas.width / 2; 
            const optionYStart = canvas.height / 2 - 80; 
            const lineHeight = 35; 
            const hoverWidth = 480; 
            const hoverHeight = 35; 
            const textBaselineOffset = 20; 
            
            selectedAudioSetting = -1;
            for(let i=0; i<6; i++) { 
                if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optionYStart + (i * lineHeight) - textBaselineOffset, hoverWidth, hoverHeight)) { 
                    selectedAudioSetting = i; 
                } 
            }
            const backBtn = getBackButtonRect(canvas.width, canvas.height);
            if (isMouseOverRect(mousePos, backBtn.x, backBtn.y, backBtn.w, backBtn.h)) { selectedAudioSetting = 6; }
        } else if (optionsState === 'audio') {
            const sliderWidth = 300; const sliderHeight = 20; const sliderStartX = (canvas.width / 2 - sliderWidth / 2) + 10; const labelXPosition = sliderStartX - 20; 
            const musicSliderY = canvas.height / 2 - 30; 
            
            selectedAudioSetting = -1;
            
            const hoverWidth = 400; const hoverHeight = 40;
            if (isMouseOverRect(mousePos, labelXPosition - 100, musicSliderY - 10, hoverWidth, hoverHeight)) { selectedAudioSetting = 0; } 
            
            const sfxSliderY = canvas.height / 2 + 20; 
            if (isMouseOverRect(mousePos, labelXPosition - 100, sfxSliderY - 10, hoverWidth, hoverHeight)) { selectedAudioSetting = 1; } 
            
            const backBtn = getBackButtonRect(canvas.width, canvas.height);
            if (isMouseOverRect(mousePos, backBtn.x, backBtn.y, backBtn.w, backBtn.h)) { selectedAudioSetting = 2; }
            
            if (draggingSlider) {
                let newValue = (mousePos.x - sliderStartX) / sliderWidth; newValue = Math.max(0, Math.min(1, newValue));
                if (draggingSlider === 'music') { musicVolume = newValue; } else if (draggingSlider === 'sfx') { sfxVolume = newValue; }
                applyAndSaveVolumes();
            }
        } else if (optionsState === 'controls') {
            const layout = getControlsLayout(canvas.width / 2, canvas.height / 2 + 20); const backBtn = getBackButtonRect(canvas.width, canvas.height);
            selectedAudioSetting = -1;
            if (isMouseOverRect(mousePos, backBtn.x, backBtn.y, backBtn.w, backBtn.h)) { selectedAudioSetting = Object.keys(keyMap).length; } 
            else { for(let i=0; i<layout.length; i++) { const btn = layout[i]; if (isMouseOverRect(mousePos, btn.x, btn.y, btn.w, btn.h)) { selectedAudioSetting = i; } } }
        }
    } 
}

function handleClick(event) { 
    if (event.target.closest('#debugPanel') || event.target.closest('#debugDragHandle')) return;

    // ATUALIZAÇÃO: Trava de segurança do Patch Notes
    if (document.getElementById('patchNotesContainer').classList.contains('visible')) return;

    const mousePos = getMousePos(canvas, event);
    if (bindingAction) return; 

    const isGameActive = gameState === 'playing' || gameState === 'bossBattle' || gameState === 'phaseTwo' || gameState === 'finalBoss';
    
    if (isGameActive) {
        if (isMouseOverRect(mousePos, PAUSE_BTN_X, PAUSE_BTN_Y, PAUSE_BTN_SIZE, PAUSE_BTN_SIZE)) { togglePauseGame(); return; }

        if (selectedSpawnType) {
            handleDebugSpawn(mousePos);
            return; 
        }
    }

    if (gameState === 'start') { 
        let diffY = canvas.height / 2 + 80;
        if (hasBeatenGame) { diffY = canvas.height / 2 + 120; }
        
        if (isMouseOverRect(mousePos, canvas.width / 2 - 150, diffY - 20, 300, 30)) {
            currentDifficulty = (currentDifficulty + 1) % 3;
            playSound(sounds.coin);
            saveDifficultyConfig();
            applyDifficulty();
        }
        return; 
    } 
    
    if (gameState === 'options') {
        if (optionsState !== 'main') {
            const backBtn = getBackButtonRect(canvas.width, canvas.height);
            if (optionsState === 'audio' || optionsState === 'controls' || optionsState === 'graphics') {
                if (isMouseOverRect(mousePos, backBtn.x, backBtn.y, backBtn.w, backBtn.h)) { optionsState = 'main'; playSound(sounds.coin); setTargetMusicVolumeFactor(gameState); return; }
            }
        }
        if (optionsState === 'main') {
            const menuXCenter = canvas.width / 2; const optionYStart = canvas.height / 2 - 30; const lineHeight = 50; const hoverWidth = 450; const hoverHeight = 40; const textBaselineOffset = 25; let optY = optionYStart - textBaselineOffset;
            
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { optionsState = 'graphics'; selectedAudioSetting = 0; setTargetMusicVolumeFactor(gameState); return; } optY += lineHeight;
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { optionsState = 'audio'; selectedAudioSetting = 0; setTargetMusicVolumeFactor(gameState); return; } optY += lineHeight;
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { optionsState = 'controls'; selectedAudioSetting = -1; setTargetMusicVolumeFactor(gameState); return; } optY += lineHeight; 
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { gameState = 'paused'; setTargetMusicVolumeFactor(gameState); playSound(sounds.coin); return; }
        } else if (optionsState === 'graphics') {
            const menuXCenter = canvas.width / 2; 
            const optionYStart = canvas.height / 2 - 80; 
            const lineHeight = 35; 
            const hoverWidth = 480; 
            const hoverHeight = 35; 
            const textBaselineOffset = 20; 
            let optY = optionYStart - textBaselineOffset;
            
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { hudState = (hudState + 1) % 3; playSound(sounds.coin); saveGraphicsConfig(); return; } optY += lineHeight;
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { bossHpPos = (bossHpPos + 1) % 3; playSound(sounds.coin); saveGraphicsConfig(); return; } optY += lineHeight;
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { sceneryQuality = (sceneryQuality === 'high') ? 'low' : 'high'; playSound(sounds.coin); saveGraphicsConfig(); return; } optY += lineHeight;
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { vfxEnabled = !vfxEnabled; playSound(sounds.coin); saveGraphicsConfig(); return; } optY += lineHeight;
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { 
                particleQuality = (particleQuality === 'high') ? 'low' : 'high';
                reduceParticles = (particleQuality !== 'high');
                playSound(sounds.coin); saveGraphicsConfig(); 
                return; 
            } optY += lineHeight;
            if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optY, hoverWidth, hoverHeight)) { 
                showFps = !showFps;
                playSound(sounds.coin); saveGraphicsConfig(); 
                return; 
            }
            
        } else if (optionsState === 'audio' && !draggingSlider) {
            const sliderWidth = 300; const sliderStartX = (canvas.width / 2 - sliderWidth / 2) + 10; const musicSliderY = canvas.height / 2 - 30; const sfxSliderY = canvas.height / 2 + 20; 
            if (isMouseOverRect(mousePos, sliderStartX, musicSliderY - 10, sliderWidth, 40)) { musicVolume = (mousePos.x - sliderStartX) / sliderWidth; musicVolume = Math.max(0, Math.min(1, musicVolume)); applyAndSaveVolumes(); } 
            else if (isMouseOverRect(mousePos, sliderStartX, sfxSliderY - 10, sliderWidth, 40)) { let old = sfxVolume; sfxVolume = (mousePos.x - sliderStartX) / sliderWidth; sfxVolume = Math.max(0, Math.min(1, sfxVolume)); if (sfxVolume !== old) playSound(sounds.coin); applyAndSaveVolumes(); } 
        } else if (optionsState === 'controls') {
            const layout = getControlsLayout(canvas.width / 2, canvas.height / 2 + 20);
            for(let i=0; i<layout.length; i++) { const btn = layout[i]; if (isMouseOverRect(mousePos, btn.x, btn.y, btn.w, btn.h)) { bindingAction = btn.action; playSound(sounds.jump); return; } }
        }
    } else if (gameState === 'paused') { 
        const menuXCenter = canvas.width / 2; const optionYStart = canvas.height / 2; const lineHeight = 50; const hoverWidth = 250; const hoverHeight = 40; const textBaselineOffset = 25; 
        if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optionYStart - textBaselineOffset, hoverWidth, hoverHeight)) { gameState = previousStateForPause || 'playing'; setTargetMusicVolumeFactor(gameState); } 
        else if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optionYStart + lineHeight - textBaselineOffset, hoverWidth, hoverHeight)) { gameState = 'options'; optionsState = 'main'; selectedOptionMain = 0; setTargetMusicVolumeFactor(gameState); } 
        else if (isMouseOverRect(mousePos, menuXCenter - hoverWidth/2, optionYStart + lineHeight * 2 - textBaselineOffset, hoverWidth, hoverHeight)) { 
            init(); 
        } 
    } 
}

function handleBodyClick(event) { 
    if (event.target.closest('#debugPanel') || event.target.closest('#debugDragHandle')) return;
    if (event.target === document.body || event.target === mainWrapper) { if (gameState === 'playing' || gameState === 'bossBattle' || gameState === 'phaseTwo' || gameState === 'finalBoss') { togglePauseGame(); } } 
}

window.addEventListener('keydown', handleKeyDown); 
window.addEventListener('keyup', handleKeyUp); 
window.addEventListener('mousedown', handleMouseDown); 
window.addEventListener('mouseup', handleMouseUp); 
window.addEventListener('mousemove', handleMouseMove); 
window.addEventListener('click', handleClick);