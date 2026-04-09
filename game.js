// game.js

// --- FUNÇÕES DE INICIALIZAÇÃO ---
function init(keepCheckpoint = false, startDirectly = false) { 
    offscreenCanvas = document.createElement('canvas'); 
    offscreenCanvas.width = canvas.width; 
    offscreenCanvas.height = canvas.height; 
    offscreenCtx = offscreenCanvas.getContext('2d'); 
    platforms = [new Platform(0, 550, 600, 'stable', 'grass')]; 
    player = new Player(100, platforms[0].y - 40); 
    enemies = []; coins = []; particles = []; healthPacks = []; 
    projectileIndicators = [];
    coinAnimations = [];
    interactionPrompts = [];
    bossDebris = []; 
    coinRewardState = { active: false, toSpawn: 0, spawnTimer: 0, spawnPosition: null };
    
    // ATUALIZAÇÃO: Adicionada a memória 'lastHorizontal' para corrigir a movimentação
    keys = { right: false, left: false, down: false, up: false, space: false, lastHorizontal: null };
    
    scrollOffset = 0; 
    verticalScrollOffset = 0;
    gameOver = false; gameWon = false; enemySpawnCooldown = 0; score = 0;
    boss = null;
    finalBoss = null;
    if (!keepCheckpoint) {
        phaseOneComplete = false;
    }
    phaseTwoHealthPacks = {};
    musicStarted = false; 
    sceneryManager = new SceneryManager(canvas.width, canvas.height); 
    
    if (startDirectly) {
        gameState = 'playing';
        musicStarted = true; 
    } else {
        gameState = 'start';
        if (sounds.music.audio) {
            sounds.music.audio.pause();
            sounds.music.audio.currentTime = 0;
        }
    }
    
    currentTransitionState = 'day';
    dayTransitionStartOffset = null;
    nightTransitionStartOffset = null;
    selectedPauseOption = 0;
    
    optionsState = 'main';
    selectedOptionMain = 0;
    selectedAudioSetting = 0;

    currentMusicVolumeFactor = 1.0;
    targetMusicVolumeFactor = 1.0; 
    
    debugPanelOpen = false;
    selectedSpawnType = null;
    
    lastWindowY = Infinity; 
    phaseTwoStartScrollY = 0;
    fallingRockSpawnTimer = 2.0;
    lastScoreTier = 0;
    scoreBlinkTimer = 0;
    
    menuAnimStates = {
        main: [1, 1, 1, 1],
        audio: [1, 1, 1],
        controls: [1, 1, 1, 1, 1, 1, 1, 1],
        pause: [1, 1]
    };

    if(sounds.music.audio) sounds.music.audio.volume = sounds.music.baseVolume * musicVolume * currentMusicVolumeFactor;
    if(sounds.gameOver.audio && sounds.gameOver.audio.src) { sounds.gameOver.audio.currentTime = 0; sounds.gameOver.audio.pause(); }
    if(sounds.victory.audio && sounds.victory.audio.src) { sounds.victory.audio.currentTime = 0; sounds.victory.audio.pause(); }
    applyVolumes(); 
    setTargetMusicVolumeFactor(gameState); 
    
    if (typeof gerenciarPlataformas === "function") gerenciarPlataformas(); 
    if (typeof showPointingArrow === "function") showPointingArrow();
    hasBeatenGame = localStorage.getItem('gameBeaten') === 'true';
    
    if(typeof updateDebugPanelUI === 'function') updateDebugPanelUI();
    
    if (infiniteInvincibilityCheat && player) {
        player.isInvincible = true;
    }
}

function initBossBattle() { 
    platforms.forEach(platform => { 
        if (platform.x > scrollOffset - platform.width) { 
            platform.obstacles = []; 
            platform.hasChest = false; 
        } 
    }); 
    enemies = []; 
    coins = []; 
    
    // CORREÇÃO (Passo 3): Limpa os projetéis e as partículas remanescentes para o combate focar 100% no Boss.
    projectileIndicators = []; 
    particles = [];
    
    boss = new Boss(); 
    if (boss) boss.lastScrollOffsetForDash = scrollOffset; 
    setTargetMusicVolumeFactor('bossBattle'); 
}

function initPhaseTwo() {
    init(true, true); 
    
    coins = [];
    enemies = [];
    healthPacks = [];
    
    phaseOneComplete = true;
    gameState = 'phaseTwo';
    boss = null;
    finalBoss = null; 
    
    player = new Player(canvas.width / 2, canvas.height - 100);
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 100;
    player.velocityX = 0;
    player.velocityY = 0;
    
    if (infiniteInvincibilityCheat) player.isInvincible = true;
    
    verticalScrollOffset = player.y - canvas.height * 0.7; 
    phaseTwoStartScrollY = verticalScrollOffset;
    
    const towerWidth = canvas.width * 0.6;
    const towerX = (canvas.width - towerWidth) / 2;
    
    const baseWidth = (towerWidth * 0.5) + (Math.random() * towerWidth * 0.3);
    const baseX = towerX + (towerWidth - baseWidth) / 2;
    platforms = [new Platform(baseX, canvas.height - 40, baseWidth, 'stable', 'stone')];
    
    lastWindowY = canvas.height;
    fallingRockSpawnTimer = 2.0;
    if (typeof gerenciarPlataformasFase2 === "function") gerenciarPlataformasFase2();

    currentTransitionState = 'night';
    setTargetMusicVolumeFactor(gameState);
}

function initFinalBoss() {
    gameState = 'finalBoss';

    enemies = []; 
    coins = [];
    bossDebris = []; 
    projectileIndicators = []; 
    
    platforms.forEach(p => {
        p.obstacles = [];
        p.terrestrialSpawnPoint = null;
        p.hasWindowTrap = false;
    });
    
    const startY = verticalScrollOffset + canvas.height + 150;
    
    finalBoss = new FinalBoss(startY);
    setTargetMusicVolumeFactor(gameState); 
    screenMessage = { text: "A BATALHA FINAL!", lifespan: 4 };
}

function triggerCoinReward(player, spawnPosition, coinCount) {
    if (coinRewardState.active) return;

    coinRewardState.active = true;
    coinRewardState.toSpawn = coinCount;
    coinRewardState.spawnTimer = 0;
    coinRewardState.spawnPosition = spawnPosition;

    player.rewardCooldown = COIN_ANIM_SPAWN_INTERVAL * coinRewardState.toSpawn + 0.2;
    player.velocityX = 0;
    player.velocityY = 0;
}

// --- LÓGICA DE ENTIDADES E COLISÕES ---
function updateCoinAnimations(deltaTime) {
    if (coinRewardState.active && coinRewardState.toSpawn > 0) {
        coinRewardState.spawnTimer -= deltaTime;
        if (coinRewardState.spawnTimer <= 0) {
            coinRewardState.spawnTimer = COIN_ANIM_SPAWN_INTERVAL;
            coinRewardState.toSpawn--;

            coinAnimations.push({
                x: coinRewardState.spawnPosition.x,
                y: coinRewardState.spawnPosition.y,
                vx: (Math.random() - 0.5) * 80,
                vy: COIN_ANIM_START_VELOCITY_Y,
                lifespan: COIN_ANIM_LIFESPAN
            });
        }
    }
    if (coinRewardState.toSpawn === 0 && coinAnimations.length === 0) {
        coinRewardState.active = false;
    }

    for (let i = coinAnimations.length - 1; i >= 0; i--) {
        const coin = coinAnimations[i];
        coin.x += coin.vx * deltaTime;
        coin.y += coin.vy * deltaTime;
        coin.vy += COIN_ANIM_GRAVITY * deltaTime;
        coin.lifespan -= deltaTime;

        if (coin.lifespan <= 0) {
            if (!scoreLockCheat) {
                score += COIN_VALUE;
            }
            playSound(sounds.coin);
            
            if (!reduceParticles) {
                for (let k = 0; k < 8; k++) {
                    particles.push({
                        x: coin.x, y: coin.y, 
                        size: Math.random() * 4 + 2, 
                        color: '#feca57', 
                        lifespan: 0.5, initialLifespan: 0.5,
                        vx: (Math.random() - 0.5) * 200, 
                        vy: (Math.random() - 0.5) * 200, 
                        isScreenSpace: isVerticalPhase() ? false : true,
                        priority: 'high', 
                        layer: 'front',
                        ignoreFreeze: true
                    });
                }
            }
            coinAnimations.splice(i, 1);
        }
    }
}

function updateEnemies(deltaTime) { 
    enemies.forEach(enemy => { if (enemy instanceof Enemy) { const particleDataArray = enemy.update(deltaTime, player, scrollOffset, boss, platforms); if (Array.isArray(particleDataArray) && particleDataArray.length > 0) { particles.push(...particleDataArray); } } }); 
    enemies = enemies.filter(enemy => { if (!(enemy instanceof Enemy)) return false; 
        if(enemy.type === 'falling_rock') { return enemy.y < verticalScrollOffset + canvas.height + 100; }
        if (enemy.isScreenSpaceEntity) { return enemy.x + enemy.width > -50 && enemy.x < canvas.width + 50 && enemy.y > -enemy.height && enemy.y < canvas.height + enemy.height; } return enemy.x + enemy.width > scrollOffset && enemy.x < scrollOffset + canvas.width + enemy.width + 50; }); 
    
    // CORREÇÃO (Passo 3): Inimigos Independentes! No Normal/Difícil, eles spawnnam mesmo que você fique acampado/parado.
    if (gameState === 'playing' && (keys.left || keys.right || currentDifficulty > 0) && enemySpawnCooldown <= 0 && Math.random() < ENEMY_SPAWN_CHANCE) { 
        let type = null; 
        const enemySpawnRoll = Math.random(); 
        let enemyXPos; 
        let enemySpeedToSet; 
        
        let isScreenEntityForThisSpawn = true; 
        
        if (score >= SCORE_ENEMY_CHARGER && score < BOSS_TRIGGER_SCORE) {
            if (enemySpawnRoll < CHARGER_ENEMY_CHANCE) { type = 'charger'; } 
            else if (enemySpawnRoll < CHARGER_ENEMY_CHANCE + HOMING_ENEMY_CHANCE) { type = 'homing'; } 
            else { type = 'straight'; }
        } else if (score >= SCORE_ENEMY_HOMING && score < SCORE_ENEMY_CHARGER) {
            type = Math.random() < HOMING_ENEMY_CHANCE ? 'homing' : 'straight';
        } else if (score >= SCORE_ENEMY_STRAIGHT && score < SCORE_ENEMY_HOMING) {
            type = 'straight';
        }

        if (type) { 
            let speed = ENEMY_STRAIGHT_SPEED; 
            if (type === 'homing') speed = ENEMY_HOMING_SPEED;

            if (type !== 'charger') {
                const spawnX = canvas.width - 50; 
                const spawnY = Math.random() * (canvas.height - 200) + 50;
                
                projectileIndicators.push({
                    x: spawnX,
                    y: spawnY,
                    lifespan: PROJECTILE_INDICATOR_DURATION,
                    initialLifespan: PROJECTILE_INDICATOR_DURATION,
                    projectileType: type,
                    projectileSpeed: speed
                });
            } else {
                enemyXPos = canvas.width - 50; 
                enemySpeedToSet = speed; 
                
                enemies.push(new Enemy( enemyXPos, Math.random() * (canvas.height - 200) + 50, type, enemySpeedToSet, isScreenEntityForThisSpawn )); 
            }
            enemySpawnCooldown = ENEMY_SPAWN_COOLDOWN; 
        } 
    } 
}

function handleCollisions() { 
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    for (let i = coins.length - 1; i >= 0; i--) { 
        const coin = coins[i]; 
        if (!(coin instanceof Coin)) { coins.splice(i,1); continue; } 
        const dx = playerCenterX - coin.x; 
        const dy = playerCenterY - coin.y; 
        if (Math.sqrt(dx * dx + dy * dy) < player.width / 2 + coin.radius) { 
            if (!scoreLockCheat) { 
                score += COIN_VALUE; 
            } 
            playSound(sounds.coin); 
            if (!reduceParticles) {
                for (let k = 0; k < 6; k++) {
                    particles.push({
                        x: coin.x, y: coin.y, 
                        size: Math.random() * 4 + 2, color: '#feca57', 
                        lifespan: 0.5, initialLifespan: 0.5,
                        vx: (Math.random() - 0.5) * 250, vy: (Math.random() - 0.5) * 250,
                        isScreenSpace: false, priority: 'low', layer: 'front'
                    });
                }
            }
            coins.splice(i, 1); 
        } 
    } 
    for (let i = healthPacks.length - 1; i >= 0; i--) { 
        const pack = healthPacks[i]; 
        if (!(pack instanceof HealthPack)) { healthPacks.splice(i,1); continue; } 
        const dx = playerCenterX - pack.x; 
        const dy = playerCenterY - pack.y; 
        if (Math.sqrt(dx * dx + dy * dy) < player.width / 2 + pack.radius) { 
            player.health = Math.min(player.maxHealth, player.health + 1); 
            playSound(sounds.coin); 
            if (!reduceParticles) {
                for (let k = 0; k < 10; k++) { 
                    particles.push({
                        x: pack.x, y: pack.y, 
                        size: Math.random() * 5 + 3, color: '#e74c3c', 
                        lifespan: 0.6, initialLifespan: 0.6,
                        vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300,
                        isScreenSpace: false, priority: 'low', layer: 'front'
                    });
                }
            }
            healthPacks.splice(i, 1); 
        } 
    } 
}

function updateGameLogic(deltaTime) { 
    // CORREÇÃO (Passo 3): Os "Tiers" que piscam no placar agora acompanham dinamicamente a dificuldade.
    let milestones = [];
    if (gameState === 'playing' || gameState === 'bossBattle') {
        milestones = [SCORE_ENEMY_STRAIGHT, SCORE_ENEMY_HOMING, SCORE_ENEMY_CHARGER, BOSS_TRIGGER_SCORE];
    } else if (gameState === 'phaseTwo' || gameState === 'finalBoss') {
        milestones = [SCORE_PATROL_ENEMY, SCORE_WINDOW_TRAP, SCORE_FALLING_ROCK, FINAL_BOSS_TRIGGER_SCORE];
    }
    // Remove qualquer 0 da lista (Ex: No difícil, obstáculo/patrol é 0, então não precisa piscar na tela de início)
    milestones = milestones.filter(m => m > 0);

    for (const m of milestones) {
        if (score >= m && lastScoreTier < m) {
            scoreBlinkTimer = 3.0; 
            lastScoreTier = m;    
        }
    }
    
    if (scoreBlinkTimer > 0) {
        scoreBlinkTimer -= deltaTime;
    }

    if (boss && boss.health <= 0 && gameState !== 'gameWon') { 
        phaseOneComplete = true;
        gameWon = true; 
        gameState = 'gameWon'; 
        playSound(sounds.victory); 
        setTargetMusicVolumeFactor(gameState); 
    } 
    if ((finalBoss && finalBoss.health <= 0) && gameState !== 'gameWon') {
        gameWon = true; 
        localStorage.setItem('gameBeaten', 'true');
        gameState = 'gameWon';
        playSound(sounds.victory);
        setTargetMusicVolumeFactor(gameState);
    }
    if (player.health <= 0 && gameState !== 'gameOver' && player.captureState === 'none') { 
        gameWon = false; 
        gameState = 'gameOver'; 
        playSound(sounds.gameOver); 
        setTargetMusicVolumeFactor(gameState); 
    } 
}

// --- GERAÇÃO PROCEDURAL (LEVEL DESIGN) ---
function gerenciarPlataformas() {
    platforms = platforms.filter(p => p.y < canvas.height + 200 && (p.x + p.width - scrollOffset) > 0);
    if (platforms.length === 0) {
        platforms.push(new Platform(scrollOffset, 550, 600, 'stable', 'grass'));
    }
    let last = platforms[platforms.length - 1];
    
    if (last.isDebug) {
        for(let i = platforms.length - 1; i >= 0; i--) {
            if (!platforms[i].isDebug) {
                last = platforms[i];
                break;
            }
        }
    }
    
    if (last.width) {
        pixelsSinceLastHP += last.width;
    }

    while (last.x < scrollOffset + canvas.width + 200) {
        const gap = Math.random() * (PLATFORM_MAX_GAP - PLATFORM_MIN_GAP) + PLATFORM_MIN_GAP;
        const newX = last.x + last.width + gap;
        const isLongPlatform = Math.random() < LONG_PLATFORM_CHANCE;
        const newWidth = isLongPlatform ? Math.random() * (LONG_PLATFORM_MAX_WIDTH - LONG_PLATFORM_MIN_WIDTH) + LONG_PLATFORM_MIN_WIDTH : Math.random() * (PLATFORM_MAX_WIDTH - PLATFORM_MIN_WIDTH) + PLATFORM_MIN_WIDTH;
        const deltaY = (Math.random() - 0.5) * (PLATFORM_MAX_JUMP_HEIGHT + PLATFORM_MAX_DROP_HEIGHT);
        const newY = Math.max(250, Math.min(last.y + deltaY, 550));
        const newPlatform = new Platform(newX, newY, newWidth, 'stable', 'grass');
        
        pixelsSinceLastHP += gap;

        if (gameState === 'playing') {
            let canHaveItems = true;
            let hasCoinsOnPlatform = false;
            let hasBushOnPlatform = false;
            let itemPlacedOnPlatform = false;

            if (isLongPlatform && Math.random() < OBSTACLE_CHANCE) {
                canHaveItems = false;
                let generatedWallData = null;
                let generatedWallWithTopSpikesThisTime = false;
                if (score >= SCORE_OBSTACLE_HARD) {
                    if (Math.random() < WALL_CHANCE) {
                        const isTallWall = Math.random() < TALL_WALL_CHANCE;
                        const wallHeight = isTallWall ? TALL_WALL_HEIGHT : NORMAL_WALL_HEIGHT;
                        const wallX = Math.random() * (newWidth - 30 - 20) + 10;
                        
                        if (wallHeight === NORMAL_WALL_HEIGHT && Math.random() < WALL_WITH_TOP_SPIKES_CHANCE) {
                            newPlatform.addObstacle({ type: 'wallWithTopSpikes', x: wallX, width: 30, wallHeight: NORMAL_WALL_HEIGHT, spikeHeight: 20 });
                            generatedWallWithTopSpikesThisTime = true;
                        } else {
                            generatedWallData = { type: 'wall', x: wallX, width: 30, height: wallHeight };
                            newPlatform.addObstacle(generatedWallData);
                        }
                        if (!generatedWallWithTopSpikesThisTime && generatedWallData && Math.random() < WALL_SPIKE_CHANCE) {
                            const numLateralSpikes = Math.random() < 0.6 ? 1 : 2;
                            const singleSpikeVisualHeight = 20;
                            const totalLateralSpikeHeight = numLateralSpikes * singleSpikeVisualHeight;
                            let yOffsetForLateralSpike = 5 + Math.random() * ((generatedWallData.height * 0.15) - 5);
                            yOffsetForLateralSpike = Math.max(5, yOffsetForLateralSpike);
                            if (yOffsetForLateralSpike + totalLateralSpikeHeight > generatedWallData.height - 5) { yOffsetForLateralSpike = Math.max(5, generatedWallData.height - totalLateralSpikeHeight - 5); }
                            generatedWallData.lateralSpikes = { yOffset: yOffsetForLateralSpike, height: totalLateralSpikeHeight, protrusion: 15, numSpikes: numLateralSpikes };
                        }
                    } else {
                        const numSpikes = Math.floor(Math.random() * (SPIKE_MAX_BLOCKS - SPIKE_MIN_BLOCKS + 1)) + SPIKE_MIN_BLOCKS;
                        const spikeWidth = numSpikes * 20;
                        newPlatform.addObstacle({ type: 'spike', x: Math.random() * (newWidth - spikeWidth), width: spikeWidth, height: 20 });
                    }
                } else { 
                    if (Math.random() < 0.5) {
                        const wallX = Math.random() * (newWidth - 30 - 20) + 10;
                        const wallHeight = NORMAL_WALL_HEIGHT;
                        generatedWallData = { type: 'wall', x: wallX, width: 30, height: wallHeight };
                        newPlatform.addObstacle(generatedWallData);
                        if (Math.random() < WALL_SPIKE_CHANCE * 0.7) {
                            const numLateralSpikes = 1;
                            const singleSpikeVisualHeight = 20;
                            const totalSpikeSetHeight = numLateralSpikes * singleSpikeVisualHeight;
                            let yOffsetForLateralSpike = 5 + Math.random() * ((wallHeight * 0.15) - 5);
                            yOffsetForLateralSpike = Math.max(5, yOffsetForLateralSpike);
                            if (yOffsetForLateralSpike + totalSpikeSetHeight > wallHeight - 5) { yOffsetForLateralSpike = Math.max(5, wallHeight - totalSpikeSetHeight - 5); }
                            generatedWallData.lateralSpikes = { yOffset: yOffsetForLateralSpike, height: totalSpikeSetHeight, protrusion: 15, numSpikes: numLateralSpikes };
                        }
                    } else {
                        const maxEarly = Math.max(SPIKE_MIN_BLOCKS, 3);
                        const numSpikes = Math.floor(Math.random() * (maxEarly - SPIKE_MIN_BLOCKS + 1)) + SPIKE_MIN_BLOCKS;
                        const spikeWidth = numSpikes * 20;
                        newPlatform.addObstacle({ type: 'spike', x: Math.random() * (newWidth - spikeWidth), width: spikeWidth, height: 20 });
                    }
                }
            }
            const hasDangerousObstacles = newPlatform.obstacles.some(obs => obs.type !== 'bush');
            
            if (!isLongPlatform && !hasDangerousObstacles) {
                if (score >= SCORE_ENEMY_STRAIGHT && score <= SCORE_ENEMY_HOMING) { if (Math.random() < FALLING_PLATFORM_CHANCE * 0.5) newPlatform.type = 'falling'; }
                else if (score > SCORE_ENEMY_HOMING) { if (Math.random() < FALLING_PLATFORM_CHANCE) newPlatform.type = 'falling'; }
            }

            if (canHaveItems) {
                if (isLongPlatform && !hasDangerousObstacles && Math.random() < CHEST_SPAWN_CHANCE) {
                    newPlatform.hasChest = true;
                    newPlatform.chestType = (Math.random() < CHEST_LUCK_CHANCE) ? 'reward' : 'trap';
                    itemPlacedOnPlatform = true;
                }
                
                if (!itemPlacedOnPlatform && Math.random() < COIN_SPAWN_CHANCE) {
                    hasCoinsOnPlatform = true;
                    itemPlacedOnPlatform = true;
                    const numCoins = 3 + Math.floor(Math.random() * 3);
                    const coinSpacing = 30;
                    const totalCoinWidth = (numCoins - 1) * coinSpacing;
                    const startX = newPlatform.x + (newPlatform.width / 2) - (totalCoinWidth / 2);
                    for (let i = 0; i < numCoins; i++) {
                        coins.push(new Coin(startX + (i * coinSpacing), newPlatform.y - 25));
                    }
                }
                
                if (!itemPlacedOnPlatform && newPlatform.width > 150 && Math.random() < BUSH_SPAWN_CHANCE && !hasDangerousObstacles) {
                    hasBushOnPlatform = true;
                    const numBushes = 1 + Math.floor(Math.random() * 2);
                    for(let i = 0; i < numBushes; i++) {
                        const bushWidth = Math.random() * 20 + 25;
                        const bushHeight = bushWidth * (0.6 + Math.random() * 0.2);
                        const bushX = Math.random() * (newPlatform.width - bushWidth);
                        newPlatform.addObstacle({ type: 'bush', x: bushX, width: bushWidth, height: bushHeight });
                    }
                }
            }
            
            const canSpawnHealth = canHaveItems && !itemPlacedOnPlatform && !hasCoinsOnPlatform && !hasBushOnPlatform && !hasDangerousObstacles;
            
            if (player.health < player.maxHealth && canSpawnHealth) {
                if (pixelsSinceLastHP > 1500) {
                    let dynamicChance = BASE_HEALTH_PACK_CHANCE;
                    if (currentDifficulty < 2) {
                        const missingHealth = player.maxHealth - player.health;
                        dynamicChance *= (1 + missingHealth * HEALTH_PACK_CHANCE_MULTIPLIER);
                    }
                    
                    if (Math.random() < dynamicChance) {
                        healthPacks.push(new HealthPack(newPlatform.x + newPlatform.width / 2, newPlatform.y - 30));
                        pixelsSinceLastHP = 0; 
                    }
                }
            }
        } else if (gameState === 'bossBattle') {
            if (boss && boss.health <= boss.maxHealth * BOSS_PHASE2_THRESHOLD) { newPlatform.type = 'falling'; }
            if (newPlatform.width > 150 && Math.random() < BUSH_SPAWN_CHANCE) {
                const bushWidth = Math.random() * 20 + 25;
                const bushHeight = bushWidth * (0.6 + Math.random() * 0.2);
                const bushX = Math.random() * (newWidth - bushWidth);
                newPlatform.addObstacle({ type: 'bush', x: bushX, width: bushWidth, height: bushHeight });
            }
            
            let bossHpChance = HEALTH_PACK_SPAWN_CHANCE_BOSS;
            if (currentDifficulty === 0) bossHpChance *= 2; // Fácil tem o dobro de chance no Boss 1
            if (boss && player.health < player.maxHealth && Math.random() < bossHpChance) {
                healthPacks.push(new HealthPack(newPlatform.x + newPlatform.width / 2, newPlatform.y - 30));
            }
        }
        platforms.push(newPlatform);
        last = newPlatform;
    }
}

function gerenciarPlataformasFase2() {
    platforms = platforms.filter(p => p.y < verticalScrollOffset + canvas.height + 200);

    const requiredTopY = verticalScrollOffset - 200; 
    const towerWidth = canvas.width * 0.6;
    const towerX = (canvas.width - towerWidth) / 2;

    let lastStonePlatform = platforms.filter(p => (p.visualType === 'stone' || p.visualType === 'grass') && !p.isDebug).sort((a,b) => a.y - b.y)[0];
    if (!lastStonePlatform) {
        lastStonePlatform = new Platform(0, canvas.height, 0);
    }
    
    let currentStoneY = lastStonePlatform.y;
    while (currentStoneY > requiredTopY) {
        const gapY = Math.random() * 130 + 120;
        currentStoneY -= gapY;

        const platformWidth = (Math.floor(Math.random() * 2) + 2) * BRICK_WIDTH;
        const platformX = towerX + Math.random() * (towerWidth - platformWidth);
        const newPlatform = new Platform(platformX, currentStoneY, platformWidth, 'stable', 'stone');

        platformsSinceLastPatrolF2++;
        platformsSinceLastHPF2++;

        let hasSpecialFeature = false;
        
        if (gameState !== 'finalBoss') {
            if (score >= SCORE_WINDOW_TRAP && newPlatform.width >= BRICK_WIDTH * 3 && Math.random() < WINDOW_TRAP_CHANCE && Math.abs(newPlatform.y - lastWindowY) > MIN_WINDOW_SPACING) {
                newPlatform.hasWindowTrap = true;
                newPlatform.windowType = (Math.random() < WINDOW_REWARD_CHANCE) ? 'reward' : 'trap';
                lastWindowY = newPlatform.y;
                hasSpecialFeature = true;
            }

            if (!hasSpecialFeature && score >= SCORE_PATROL_ENEMY && newPlatform.width >= BRICK_WIDTH * 2 && platformsSinceLastPatrolF2 >= 2) {
                if (Math.random() < PATROL_ENEMY_SPAWN_CHANCE) {
                    const enemyY = newPlatform.y - 35;
                    const enemyX = newPlatform.x + (newPlatform.width / 2) - (35 / 2); 
                    enemies.push(new Enemy(enemyX, enemyY, 'patrol', ENEMY_SPEED_BASE, false, newPlatform));
                    newPlatform.hasPatrolEnemy = true;
                    hasSpecialFeature = true;
                    platformsSinceLastPatrolF2 = 0; 
                }
            }
            
            if (!hasSpecialFeature && Math.random() < BOTTOM_SPIKE_CHANCE) {
                const numSpikesInSet = (newPlatform.width / BRICK_WIDTH > 2) ? (Math.random() < 0.5 ? 2 : 1) : 1;
                const spikeSetWidth = numSpikesInSet * 20; 
                const startX = Math.random() * (newPlatform.width - spikeSetWidth);
                newPlatform.addObstacle({ type: 'spike-down', x: startX, width: spikeSetWidth, height: BOTTOM_SPIKE_HEIGHT });
                hasSpecialFeature = true;
            }
        }
        
        const isSafeForItems = !newPlatform.hasPatrolEnemy && !newPlatform.hasWindowTrap && !newPlatform.obstacles.some(obs => obs.type === 'spike-down');
        let hasCoinsOnPlatform = false;

        if (gameState !== 'finalBoss' && isSafeForItems) {
            if (Math.random() < COIN_SPAWN_CHANCE) {
                hasCoinsOnPlatform = true;
                
                const coinSpacing = 30;
                const maxCoinsPossible = Math.max(1, Math.floor((newPlatform.width - 20) / coinSpacing));
                let numCoins = 3 + Math.floor(Math.random() * 3); 
                numCoins = Math.min(numCoins, maxCoinsPossible);
                
                const totalCoinWidth = (numCoins - 1) * coinSpacing;
                const startX = newPlatform.x + (newPlatform.width / 2) - (totalCoinWidth / 2);
                for (let i = 0; i < numCoins; i++) {
                    coins.push(new Coin(startX + (i * coinSpacing), newPlatform.y - 25));
                }
            }
            
            if (player.health < player.maxHealth && !hasCoinsOnPlatform && platformsSinceLastHPF2 >= 3) {
                let dynamicChance = BASE_HEALTH_PACK_CHANCE;
                if (currentDifficulty < 2) {
                    const missingHealth = player.maxHealth - player.health;
                    dynamicChance *= (1 + missingHealth * HEALTH_PACK_CHANCE_MULTIPLIER);
                }
                
                if (Math.random() < dynamicChance) {
                    healthPacks.push(new HealthPack(newPlatform.x + newPlatform.width / 2, newPlatform.y - 30));
                    platformsSinceLastHPF2 = 0; 
                }
            }
        } else if (gameState === 'finalBoss' && isSafeForItems) {
            let bossHpChance = HEALTH_PACK_SPAWN_CHANCE_BOSS;
            if (currentDifficulty === 0) bossHpChance *= 2; // Fácil tem o dobro de chance no Boss 2
            if (finalBoss && player.health < player.maxHealth && Math.random() < bossHpChance) {
                healthPacks.push(new HealthPack(newPlatform.x + newPlatform.width / 2, newPlatform.y - 30));
            }
        }
        
        platforms.push(newPlatform);
    }
    
    let lastCloudPlatform = platforms.filter(p => p.visualType === 'cloud' && !p.isDebug).sort((a,b) => a.y - b.y)[0];
    if (!lastCloudPlatform) {
         lastCloudPlatform = new Platform(0, canvas.height - 150, 0);
    }
    
    let currentCloudY = lastCloudPlatform.y;
    while (currentCloudY > requiredTopY) {
        const gapY = Math.random() * 220 + 180;
        currentCloudY -= gapY;

        if (Math.random() > CLOUD_PLATFORM_CHANCE) continue;
        
        const cloudWidth = 100 + Math.random() * 50;
        const spawnSide = Math.random() < 0.5 ? 'left' : 'right';
        let cloudX;
        
        if (spawnSide === 'left') {
            cloudX = Math.random() * (towerX - cloudWidth - 20);
        } else {
            cloudX = towerX + towerWidth + 20 + (Math.random() * (canvas.width - (towerX + towerWidth) - cloudWidth - 20));
        }
        
        const newCloud = new Platform(cloudX, currentCloudY, cloudWidth, 'pass-through-slow', 'cloud');
        platforms.push(newCloud);
    }
}

// --- FUNÇÃO DE UPDATE PRINCIPAL (FÍSICA GERAL) ---
function update(deltaTime) { 
    let timeScale = 1.0;
    const isChestOpening = platforms.some(p => p.chestState === 'opening');
    if (isChestOpening || coinRewardState.active || player.rewardCooldown > 0 || player.captureState !== 'none') {
        timeScale = 0.0;
    }
    const physicsDelta = deltaTime * timeScale;
    
    if (player.rewardCooldown > 0) player.rewardCooldown -= deltaTime;

    const activeMaxParticles = reduceParticles ? MAX_PARTICLES / 2 : MAX_PARTICLES;
    if (particles.length > activeMaxParticles) {
        let toRemove = particles.length - activeMaxParticles;
        for (let i = 0; i < particles.length && toRemove > 0; i++) {
            if (particles[i].priority === 'low' || !particles[i].priority) {
                particles.splice(i, 1); i--; toRemove--;
            }
        }
        if (toRemove > 0) particles.splice(0, toRemove);
    }

    if (enemySpawnCooldown > 0) enemySpawnCooldown -= physicsDelta; 
    
    for (let i = particles.length - 1; i >= 0; i--) { 
        const p = particles[i]; 
        if (!p || isNaN(p.x) || isNaN(p.y)) { particles.splice(i,1); continue; }
        const delta = p.ignoreFreeze ? deltaTime : physicsDelta; 
        p.x += p.vx * delta; p.y += p.vy * delta; p.lifespan -= delta; 
        if (p.lifespan <= 0) particles.splice(i, 1); 
    } 
    
    platforms.forEach(p => {
        if (p.chestState === 'opening') {
            p.chestAnimTimer -= deltaTime; 
            if (p.chestAnimTimer <= 0) p.chestState = 'open';
        }
        p.update(physicsDelta);
    }); 
    
    for (let i = projectileIndicators.length - 1; i >= 0; i--) { 
        const p = projectileIndicators[i]; 
        if(!p || isNaN(p.lifespan)) { projectileIndicators.splice(i,1); continue; } 
        p.lifespan -= physicsDelta; 
        if(p.lifespan <= 0) { 
            let spawnX = p.x;
            let spawnY = p.y;
            let isScreenSpace = p.isScreenSpace !== undefined ? p.isScreenSpace : true;
            
            if (p.projectileType === 'falling_rock') { 
                spawnY = -70; 
                isScreenSpace = false; 
            } 
            
            const newMinion = new Enemy(spawnX, spawnY, p.projectileType, p.projectileSpeed, isScreenSpace); 
            enemies.push(newMinion); 
            projectileIndicators.splice(i, 1); 
        } 
    } 
    
    if (bossDebris && bossDebris.length > 0) {
        for(let i = bossDebris.length - 1; i >= 0; i--) {
            const d = bossDebris[i];
            d.update(physicsDelta, platforms);
            if (d.state === 'thrown' && (!finalBoss || finalBoss.health <= 0)) {
                d.isPhasing = true; 
            }
            if (d.y > canvas.height + 150 || d.x < -100 || d.x > canvas.width + 100) { 
                bossDebris.splice(i, 1); 
            }
        }
    }

    if (player.captureState === 'none') {
        const playerDelta = physicsDelta;
        const playerResult = player.update(playerDelta, keys, platforms, scrollOffset, infiniteInvincibilityCheat, enemies, sceneryManager, verticalScrollOffset, bossDebris, reduceParticles); 
        
        if (playerResult.particles.length > 0) { 
            playerResult.particles.forEach(p => {
                if (p.color === '#a4281b' || p.color === '#e67e22' || p.color === '#c0392b') p.priority = 'high'; else p.priority = 'low'; 
                p.layer = 'front'; p.ignoreFreeze = false; 
                if (!reduceParticles || p.priority === 'high') particles.push(p);
            });
        } 
        
        if (player.x - scrollOffset > canvas.width / 2) { scrollOffset = player.x - canvas.width / 2; }
        
        if (player.y > canvas.height + 100 && (player.health > 0 || infiniteInvincibilityCheat)) { 
            player.respawn(platforms, scrollOffset); 
        }
    } else {
        const playerDelta = deltaTime;
        player.update(playerDelta, keys, platforms, scrollOffset, infiniteInvincibilityCheat, enemies, sceneryManager, verticalScrollOffset, bossDebris, reduceParticles); 
        if (player.captureState === 'pulling' && player.captureAnimProgress >= 1) { 
            player.respawnInTower(platforms); 
            player.takeDamage(false); 
        }
    }

    interactionPrompts = [];
    
    platforms.forEach(p => {
        if (p.hasWindowTrap && p.windowState === 'active') {
            const windowWidth = 60; const windowHeight = 90;
            const windowX = p.x + (p.width / 2) - (windowWidth / 2);
            const windowY = p.y - windowHeight;
            const dx = (player.x + player.width / 2) - (windowX + windowWidth / 2);
            const dy = (player.y + player.height / 2) - (windowY + windowHeight / 2);
            if (Math.sqrt(dx * dx + dy * dy) < WINDOW_PROMPT_DISTANCE && !player.isJumping) {
                interactionPrompts.push({ x: windowX + windowWidth / 2, y: windowY - WINDOW_PROMPT_Y_OFFSET });
            }
        }
    });

    if (player.canInteractWithChest && !player.isJumping) {
        const platformWithChest = player.canInteractWithChest;
        const chestCenterX = platformWithChest.x + platformWithChest.width / 2;
        const chestTopY = platformWithChest.y - 40;
        interactionPrompts.push({ x: chestCenterX, y: chestTopY - CHEST_PROMPT_Y_OFFSET });
    }

    if (chestToOpen) {
        if (chestToOpen.chestState === 'closed') {
            chestToOpen.chestState = 'opening';
            chestToOpen.chestAnimTimer = 0.5;
            playSound(sounds.jump); 
            if (chestToOpen.chestType === 'reward') {
                player.rewardSource = 'chest';
                const chestX = chestToOpen.x + (chestToOpen.width / 2) - 25;
                triggerCoinReward(player, { x: chestX + 25, y: chestToOpen.y - 40 }, CHEST_REWARD_COIN_COUNT);
            } else { 
                playSound(sounds.land);
                player.rewardCooldown = 1.0; 
                const chestCenterX = chestToOpen.x + (chestToOpen.width / 2);
                for (let k = 0; k < 15; k++) {
                    particles.push({
                        x: chestCenterX + (Math.random() - 0.5) * 20, y: chestToOpen.y - 50, size: Math.random() * 4 + 2, color: '#d3d3d3',
                        lifespan: 0.5 + Math.random() * 0.3, initialLifespan: 0.8, vx: (Math.random() - 0.5) * 80, vy: (Math.random() * -120) - 20, 
                        isScreenSpace: false, priority: 'low', layer: 'back', ignoreFreeze: true
                    });
                }
            }
        }
        chestToOpen = null;
    }
    
    updateCoinAnimations(deltaTime);
    handleCollisions(); 
    sceneryManager.update(scrollOffset, canvas.width, gameState, verticalScrollOffset, platforms); 
    gerenciarPlataformas(); 
    updateEnemies(physicsDelta); 
    if(gameState === 'bossBattle' && boss) { boss.update(physicsDelta, scrollOffset, player); const playerScreenRect = {x: player.x - scrollOffset, y: player.y, width: player.width, height: player.height}; if (isCollidingWithDiamond(playerScreenRect, boss)) { player.takeDamage(); } for (let i = enemies.length - 1; i >= 0; i--) { const enemy = enemies[i]; if (!(enemy instanceof Enemy)) continue; if (enemy.isRebounded) { const enemyScreenRect = {x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height}; if (isCollidingWithDiamond(enemyScreenRect, boss)) { boss.health -= BOSS_DAMAGE_FROM_REBOUND; playSound(sounds.damage); for (let j = 0; j < 20; j++) { particles.push({ x: boss.x + (boss.width / 2), y: boss.y + boss.height / 2, size: Math.random() * 4 + 2, color: '#f1c40f', lifespan: 1, initialLifespan: 1, vx: (Math.random() - 0.5) * 500, vy: (Math.random() - 0.5) * 500, isScreenSpace: true, priority: 'low' }); } enemies.splice(i, 1); } } } } 
    updateGameLogic(deltaTime); 
    
    if (gameState === 'playing' && score >= BOSS_TRIGGER_SCORE && !boss) { gameState = 'bossBattle'; initBossBattle(); }
    
    if (currentTransitionState === 'day' && score >= DAY_TO_AFTERNOON_TRIGGER_SCORE) { 
        currentTransitionState = 'dayToAfternoon'; 
        dayTransitionStartOffset = scrollOffset; 
    } 
    else if (currentTransitionState === 'afternoon' && score >= AFTERNOON_TO_NIGHT_TRIGGER_SCORE) { 
        currentTransitionState = 'afternoonToNight'; 
        nightTransitionStartOffset = scrollOffset; 
    }
}

// --- FUNÇÃO DE UPDATE DA FASE VERTICAL ---
function updateVerticalPhase(deltaTime) {
    if (screenShakeTimer > 0) screenShakeTimer -= deltaTime;
    let timeScale = 1.0;
    const isChestOpening = platforms.some(p => p.chestState === 'opening');
    if (isChestOpening || coinRewardState.active || player.rewardCooldown > 0 || player.captureState !== 'none') { timeScale = 0.0; }
    const physicsDelta = deltaTime * timeScale;
    
    if (player.rewardCooldown > 0) player.rewardCooldown -= deltaTime;

    const activeMaxParticles = reduceParticles ? MAX_PARTICLES / 2 : MAX_PARTICLES;
    if (particles.length > activeMaxParticles) {
        let toRemove = particles.length - activeMaxParticles;
        for (let i = 0; i < particles.length && toRemove > 0; i++) { if (particles[i].priority === 'low' || !particles[i].priority) { particles.splice(i, 1); i--; toRemove--; } }
        if (toRemove > 0) particles.splice(0, toRemove);
    }
    
    interactionPrompts = []; 
    platforms.forEach(p => {
        if (p.hasWindowTrap && p.windowState === 'active') {
            const windowWidth = 60; const windowHeight = 90;
            const windowX = p.x + (p.width / 2) - (windowWidth / 2);
            const windowY = p.y - windowHeight;
            const dx = (player.x + player.width / 2) - (windowX + windowWidth / 2);
            const dy = (player.y + player.height / 2) - (windowY + windowHeight / 2);
            if (Math.sqrt(dx * dx + dy * dy) < WINDOW_PROMPT_DISTANCE && !player.isJumping) { interactionPrompts.push({ x: windowX + windowWidth / 2, y: windowY - WINDOW_PROMPT_Y_OFFSET }); }
        }
    });

    if (player.canInteractWithChest && !player.isJumping) {
        const platformWithChest = player.canInteractWithChest;
        const chestCenterX = platformWithChest.x + platformWithChest.width / 2;
        const chestTopY = platformWithChest.y - 40;
        interactionPrompts.push({ x: chestCenterX, y: chestTopY - CHEST_PROMPT_Y_OFFSET });
    }
    
    if (player.y >= verticalScrollOffset + canvas.height && (player.health > 0 || infiniteInvincibilityCheat)) { 
        player.triggerFallRespawn(platforms, verticalScrollOffset); 
        return; 
    }

    if (player.captureState === 'none') {
        const playerDelta = physicsDelta;
        const playerResult = player.update(playerDelta, keys, platforms, 0, infiniteInvincibilityCheat, enemies, sceneryManager, verticalScrollOffset, bossDebris, reduceParticles);
        if (playerResult.particles.length > 0) { 
            playerResult.particles.forEach(p => { 
                if (p.color === '#a4281b' || p.color === '#e67e22' || p.color === '#c0392b') { p.priority = 'high'; } else { p.priority = 'low'; } 
                p.layer = 'front'; p.ignoreFreeze = false; 
                if (!reduceParticles || p.priority === 'high') particles.push(p); 
            });
        }
        if (player.canPickUpDebris && !player.isJumping) { const debris = player.canPickUpDebris; interactionPrompts.push({ x: debris.x + debris.width / 2, y: debris.y - DEBRIS_PICKUP_PROMPT_Y_OFFSET }); }
        let cameraFocusPointY = canvas.height * (gameState === 'finalBoss' ? 0.3 : 0.5);
        const targetScrollY = player.y - cameraFocusPointY;
        if (targetScrollY < verticalScrollOffset) { verticalScrollOffset = targetScrollY; }
    } else {
        const playerDelta = deltaTime;
        player.update(playerDelta, keys, platforms, 0, infiniteInvincibilityCheat, enemies, sceneryManager, verticalScrollOffset, bossDebris, reduceParticles);
        if (player.captureState === 'pulling' && player.captureAnimProgress >= 1) { player.respawnInTower(platforms); player.takeDamage(false); }
    }
    
    if (chestToOpen) {
        if (chestToOpen.chestState === 'closed') {
            chestToOpen.chestState = 'opening';
            chestToOpen.chestAnimTimer = 0.5;
            playSound(sounds.jump); 
            if (chestToOpen.chestType === 'reward') {
                player.rewardSource = 'chest';
                const chestX = chestToOpen.x + (chestToOpen.width / 2) - 25;
                triggerCoinReward(player, { x: chestX + 25, y: chestToOpen.y - 40 }, CHEST_REWARD_COIN_COUNT);
            } else { 
                playSound(sounds.land);
                player.rewardCooldown = 1.0; 
                const chestCenterX = chestToOpen.x + (chestToOpen.width / 2);
                for (let k = 0; k < 15; k++) {
                    particles.push({
                        x: chestCenterX + (Math.random() - 0.5) * 20, y: chestToOpen.y - 50, size: Math.random() * 4 + 2, color: '#d3d3d3',
                        lifespan: 0.5 + Math.random() * 0.3, initialLifespan: 0.8, vx: (Math.random() - 0.5) * 80, vy: (Math.random() * -120) - 20, 
                        isScreenSpace: false, priority: 'low', layer: 'back', ignoreFreeze: true
                    });
                }
            }
        }
        chestToOpen = null;
    }

    if (gameState === 'phaseTwo' && score >= SCORE_FALLING_ROCK && score < FINAL_BOSS_TRIGGER_SCORE) {
        if (fallingRockSpawnTimer > 0) fallingRockSpawnTimer -= physicsDelta;
        if (fallingRockSpawnTimer <= 0) {
            const spawnX = Math.random() * canvas.width;
            
            projectileIndicators.push({ x: spawnX, y: 30, lifespan: PROJECTILE_INDICATOR_DURATION, initialLifespan: PROJECTILE_INDICATOR_DURATION, projectileType: 'falling_rock', projectileSpeed: 0, isScreenSpace: true });
            fallingRockSpawnTimer = FALLING_ROCK_SPAWN_INTERVAL + (Math.random() - 0.5); 
        }
    }
    
    for (let i = projectileIndicators.length - 1; i >= 0; i--) { 
        const p = projectileIndicators[i]; 
        if(!p || isNaN(p.lifespan)) { projectileIndicators.splice(i,1); continue; } 
        p.lifespan -= physicsDelta; 
        if(p.lifespan <= 0) { 
            let spawnX = p.x;
            let spawnY = p.y;
            let isScreenSpace = p.isScreenSpace !== undefined ? p.isScreenSpace : false; 
            
            if (p.projectileType === 'falling_rock') { 
                spawnY = verticalScrollOffset - 70; 
                isScreenSpace = false; 
            } 
            
            const newMinion = new Enemy(spawnX, spawnY, p.projectileType, p.projectileSpeed, isScreenSpace); 
            enemies.push(newMinion); 
            const particleDataArray = newMinion.update(0, player, scrollOffset, boss); 
            if (Array.isArray(particleDataArray) && particleDataArray.length > 0) { particles.push(...particleDataArray); } 
            projectileIndicators.splice(i, 1); 
        } 
    } 

    if (bossDebris && bossDebris.length > 0) {
        for(let i = bossDebris.length - 1; i >= 0; i--) {
            const d = bossDebris[i];
            d.update(physicsDelta, platforms);
            if (d.state === 'thrown' && (!finalBoss || finalBoss.health <= 0)) {
                d.isPhasing = true; 
            } else if (d.state === 'thrown' && finalBoss && finalBoss.health > 0) {
                const weakPoints = finalBoss.getBodyHitboxes(verticalScrollOffset).filter(h => h.type === 'circle');
                for (const point of weakPoints) {
                    const weakPointWorldRect = { x: point.x - point.radius, y: point.y - point.radius + verticalScrollOffset, width: point.radius * 2, height: point.radius * 2 };
                    const debrisWorldRect = { x: d.x, y: d.y, width: d.width, height: d.height };
                    if (isColliding(debrisWorldRect, weakPointWorldRect)) {
                        finalBoss.takeDamage(1); bossDebris.splice(i, 1);
                        for (let k = 0; k < 30; k++) { particles.push({ x: point.x, y: point.y, size: Math.random() * 5 + 2, color: '#f1c40f', lifespan: 0.8 + Math.random() * 0.5, initialLifespan: 1.3, vx: (Math.random() - 0.5) * 600, vy: (Math.random() - 0.5) * 600, isScreenSpace: true }); }
                        break;
                    }
                }
            }
            if (d.y > verticalScrollOffset + canvas.height + 150 || d.x < -100 || d.x > canvas.width + 100) { 
                bossDebris.splice(i, 1); 
            }
        }
    }
    
    updateCoinAnimations(deltaTime);
    platforms.forEach(p => { if (p.chestState === 'opening') { p.chestAnimTimer -= deltaTime; if (p.chestAnimTimer <= 0) p.chestState = 'open'; } p.update(physicsDelta); });
    gerenciarPlataformasFase2();
    updateEnemies(physicsDelta);
    handleCollisions();
    
    if (finalBoss) {
        const bossEvents = finalBoss.update(physicsDelta, player, verticalScrollOffset);
        if (bossEvents.particles && bossEvents.particles.length > 0) { particles.push(...bossEvents.particles); }
        
        if (bossEvents.shake) {
            screenShakeTimer = FINAL_BOSS_SHAKE_DURATION; 
            if (!bossDebris) bossDebris = []; 
            
            let validPlatforms = platforms.filter(p => {
                return p.y > verticalScrollOffset && 
                       p.y < verticalScrollOffset + canvas.height && 
                       p.visualType !== 'cloud' && 
                       !p.obstacles.some(obs => obs.type === 'spike-down');
            });

            let availableSlots = [];
            const slotWidth = 45; 
            
            validPlatforms.forEach(p => {
                const numSlots = Math.max(1, Math.floor(p.width / slotWidth));
                const actualSlotWidth = p.width / numSlots;
                for (let i = 0; i < numSlots; i++) {
                    const centerX = p.x + (actualSlotWidth * i) + (actualSlotWidth / 2) - 15;
                    availableSlots.push(centerX);
                }
            });

            availableSlots.sort(() => Math.random() - 0.5);

            const desiredUsableDebris = FINAL_BOSS_DEBRIS_MIN + Math.floor(Math.random() * (FINAL_BOSS_DEBRIS_MAX - FINAL_BOSS_DEBRIS_MIN + 1));
            const actualUsableDebris = Math.min(desiredUsableDebris, availableSlots.length);

            for (let i = 0; i < actualUsableDebris; i++) {
                const spawnX = availableSlots[i];
                const spawnY = verticalScrollOffset - (150 + Math.random() * 100);
                const spawnDelay = Math.random() * 0.5; 
                bossDebris.push(new BossDebris(spawnX, spawnY, spawnDelay, false)); 
            }

            const numPhasingDebris = 4 + Math.floor(Math.random() * 4);
            const towerWidth = canvas.width * 0.6; 
            const towerX = (canvas.width - towerWidth) / 2; 

            for (let i = 0; i < numPhasingDebris; i++) {
                const spawnX = towerX + Math.random() * (towerWidth - 30); 
                const spawnY = verticalScrollOffset - (150 + Math.random() * 100);
                const spawnDelay = Math.random() * 0.5; 
                bossDebris.push(new BossDebris(spawnX, spawnY, spawnDelay, true)); 
            }
        }
        
        const playerScreenRect = { x: player.x, y: player.y - verticalScrollOffset, width: player.width, height: player.height };
        let tookContactDamage = false;
        if (!player.isInvincible) {
            const bodyHitboxes = finalBoss.getBodyHitboxes(verticalScrollOffset);
            for (const hitbox of bodyHitboxes) {
                let collision = false;
                if (hitbox.type === 'rect') { collision = isColliding(playerScreenRect, hitbox); } else if (hitbox.type === 'circle') { collision = isCollidingCircleRect(hitbox, playerScreenRect); }
                if (collision) { player.takeDamage(true); tookContactDamage = true; break; }
            }
            if (!tookContactDamage) {
                const armHitboxes = finalBoss.getArmHitboxes(verticalScrollOffset);
                for (const arm of armHitboxes) { if (isCollidingRectPolygon(playerScreenRect, arm.upperArm) || isCollidingRectPolygon(playerScreenRect, arm.forearm)) { player.takeDamage(true); tookContactDamage = true; break; } }
            }
            if (finalBoss.attackState === 'laser_active') { const laserHitbox = finalBoss.getLaserHitbox(verticalScrollOffset); if (laserHitbox && isCollidingLineRect(laserHitbox, playerScreenRect)) { player.takeDamage(true); } }
        }
    }

    sceneryManager.update(0, canvas.width, gameState, verticalScrollOffset, platforms);
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; if (!p || isNaN(p.x) || isNaN(p.y) || isNaN(p.vx) || isNaN(p.vy) || isNaN(p.lifespan)) { particles.splice(i,1); continue; } p.x += p.vx * deltaTime; p.y += p.vy * deltaTime; p.lifespan -= deltaTime; if (p.lifespan <= 0) particles.splice(i, 1); }
    updateGameLogic(deltaTime);

    if (gameState === 'phaseTwo' && score >= FINAL_BOSS_TRIGGER_SCORE && !finalBoss) { initFinalBoss(); }
}

// --- RENDERIZAÇÃO PRINCIPAL E LOOP ---
function draw(deltaTime) {
    const isGameActive = gameState === 'playing' || gameState === 'bossBattle' || gameState === 'phaseTwo' || gameState === 'finalBoss';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'start') {
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, SKY_PALETTES.day[0]); bgGradient.addColorStop(0.6, SKY_PALETTES.day[1]); bgGradient.addColorStop(1, SKY_PALETTES.day[2]);
        ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, canvas.width, canvas.height); 
        drawStartScreen();
    } else {
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.save();
        if (screenShakeTimer > 0 && isGameActive) { const shakeX = (Math.random() - 0.5) * SCREEN_SHAKE_MAGNITUDE; const shakeY = 0; offscreenCtx.translate(shakeX, shakeY); }

        const activeState = (gameState === 'paused' || gameState === 'options') ? previousStateForPause || 'playing' : gameState;
        
        let isCurrentlyVertical = false;
        if (activeState === 'phaseTwo' || activeState === 'finalBoss') {
            isCurrentlyVertical = true;
        } else if (activeState === 'gameOver') {
            isCurrentlyVertical = phaseOneComplete;
        } else if (activeState === 'gameWon') {
            isCurrentlyVertical = (finalBoss !== null);
        }
        
        let visualState = activeState;
        if (activeState === 'gameOver') {
            if (phaseOneComplete) visualState = (finalBoss !== null) ? 'finalBoss' : 'phaseTwo';
            else visualState = (boss !== null) ? 'bossBattle' : 'playing';
        } else if (activeState === 'gameWon') {
            visualState = (finalBoss !== null) ? 'finalBoss' : 'bossBattle';
        }

        if (isCurrentlyVertical) {
            const bgGradient = offscreenCtx.createLinearGradient(0, 0, 0, canvas.height);
            bgGradient.addColorStop(0, SKY_PALETTES.night[0]); bgGradient.addColorStop(0.6, SKY_PALETTES.night[1]); bgGradient.addColorStop(1, SKY_PALETTES.night[2]);
            offscreenCtx.fillStyle = bgGradient; offscreenCtx.fillRect(0,0, canvas.width, canvas.height);
            
            sceneryManager.draw(offscreenCtx, 0, visualState, verticalScrollOffset, deltaTime, platforms, player);
            drawParticles(offscreenCtx, true, 'back');
            platforms.forEach(p => p.drawBase(offscreenCtx, 0, verticalScrollOffset, true, player));
            drawParticles(offscreenCtx, true, 'front');
            
            if (bossDebris && bossDebris.length > 0) {
                bossDebris.forEach(d => d.draw(offscreenCtx, verticalScrollOffset));
            }
            
            if (finalBoss) { finalBoss.draw(offscreenCtx, verticalScrollOffset); }
            
            enemies.forEach(e => { if (e instanceof Enemy) { e.draw(offscreenCtx, 0, verticalScrollOffset, true); } });
            player.draw(offscreenCtx, 0, verticalScrollOffset, true);
            coins.forEach(c => c.draw(offscreenCtx, 0, verticalScrollOffset, true));
            healthPacks.forEach(hp => hp.draw(offscreenCtx, 0, verticalScrollOffset, true));
            drawCoinAnimations(true); drawFogOverlay(true);
            
            if (visualState === 'finalBoss') { drawTowerLightingOverlay(offscreenCtx); }
            
            drawInteractionPrompts(offscreenCtx, true); drawProjectileIndicators();
        } else {
            let fromPalette, toPalette, progress = 0;
            switch (currentTransitionState) {
                case 'day': fromPalette = SKY_PALETTES.day; toPalette = SKY_PALETTES.day; break;
                case 'dayToAfternoon': 
                    fromPalette = SKY_PALETTES.day; 
                    toPalette = SKY_PALETTES.afternoon; 
                    progress = (scrollOffset - dayTransitionStartOffset) / TRANSITION_DURATION_SCROLL; 
                    if (progress >= 1) { currentTransitionState = 'afternoon'; } 
                    break;
                case 'afternoon': fromPalette = SKY_PALETTES.afternoon; toPalette = SKY_PALETTES.afternoon; break;
                case 'afternoonToNight': 
                    fromPalette = SKY_PALETTES.afternoon; 
                    toPalette = SKY_PALETTES.night; 
                    progress = (scrollOffset - nightTransitionStartOffset) / TRANSITION_DURATION_SCROLL; 
                    if (progress >= 1) { currentTransitionState = 'night'; } 
                    break;
                case 'night': fromPalette = SKY_PALETTES.night; toPalette = SKY_PALETTES.night; break;
            }
            progress = Math.max(0, Math.min(1, progress));
            const currentColors = fromPalette.map((from, i) => rgbToString(lerpColor(from, toPalette[i], progress)));
            const bgGradient = offscreenCtx.createLinearGradient(0, 0, 0, canvas.height);
            bgGradient.addColorStop(0, currentColors[0]); bgGradient.addColorStop(0.6, currentColors[1]); bgGradient.addColorStop(1, currentColors[2]);
            offscreenCtx.fillStyle = bgGradient; offscreenCtx.fillRect(0,0, canvas.width, canvas.height);
    
            sceneryManager.draw(offscreenCtx, scrollOffset, visualState);
            drawParticles(offscreenCtx, false, 'back');
            platforms.forEach(p => p.draw(offscreenCtx, scrollOffset, 0, false, player));
            coins.forEach(c => c.draw(offscreenCtx, scrollOffset, 0, false));
            healthPacks.forEach(hp => hp.draw(offscreenCtx, scrollOffset, 0, false));
            drawParticles(offscreenCtx, false, 'front');
            if (boss) { boss.draw(offscreenCtx); }

            if (bossDebris && bossDebris.length > 0) {
                offscreenCtx.save();
                offscreenCtx.translate(-scrollOffset, 0);
                bossDebris.forEach(d => d.draw(offscreenCtx, 0));
                offscreenCtx.restore();
            }
            
            enemies.forEach(e => { if (e instanceof Enemy) { e.draw(offscreenCtx, scrollOffset); } });
            player.draw(offscreenCtx, scrollOffset, 0, false);
            drawProjectileIndicators(); drawCoinAnimations(false); 
            
            if (visualState === 'bossBattle') {
                drawPhaseOneDarkness(offscreenCtx);
            }
            
            drawInteractionPrompts(offscreenCtx, false);
        }
        offscreenCtx.restore();
    
        const isOverlayState = gameState === 'paused' || gameState === 'options' || gameState === 'gameOver' || gameState === 'gameWon' || document.getElementById('patchNotesContainer').classList.contains('visible');
        ctx.filter = isOverlayState ? 'blur(4px)' : 'none';
        ctx.drawImage(offscreenCanvas, 0, 0);
        ctx.filter = 'none';
    
        if (isGameActive) {
            drawGameStats(); 
            if (gameState === 'bossBattle') drawBossUI();
            if (gameState === 'finalBoss') drawFinalBossUI();
            if (!isOverlayState) { drawCanvasPauseButton(ctx); }
            
            drawDebugInfo(ctx);
        }

        switch (gameState) {
            case 'paused': drawPauseMenu(deltaTime); break; 
            case 'options': drawOptionsMenu(deltaTime); break; 
            case 'gameOver': drawEndScreen(false); break;
            case 'gameWon': drawEndScreen(true); break;
        }
    }
}

function animate(timestamp) {
    requestAnimationFrame(animate);
    const deltaTime = Math.min((timestamp - lastTime) / 1000 || 0, 0.1);
    
    if (timestamp > fpsTimer + 1000) {
        currentFps = frameCount;
        frameCount = 0;
        fpsTimer = timestamp;
    }
    frameCount++;
    lastTime = timestamp;

    const isGameActive = gameState === 'playing' || gameState === 'bossBattle' || gameState === 'phaseTwo' || gameState === 'finalBoss';
    
    if (sounds.music.audio && sounds.music.audio.src) {
        const baseMusicVol = sounds.music.baseVolume * musicVolume;
        if (currentMusicVolumeFactor !== targetMusicVolumeFactor) {
            const transitionSpeed = MUSIC_VOLUME_TRANSITION_SPEED * deltaTime;
            if (currentMusicVolumeFactor < targetMusicVolumeFactor) { currentMusicVolumeFactor = Math.min(targetMusicVolumeFactor, currentMusicVolumeFactor + transitionSpeed); } 
            else if (currentMusicVolumeFactor > targetMusicVolumeFactor) { currentMusicVolumeFactor = Math.max(targetMusicVolumeFactor, currentMusicVolumeFactor - transitionSpeed); }
            sounds.music.audio.volume = baseMusicVol * currentMusicVolumeFactor;
        } else { sounds.music.audio.volume = baseMusicVol * targetMusicVolumeFactor; }
        sounds.music.audio.volume = Math.max(0, Math.min(1, sounds.music.audio.volume));
    }

    if (isGameActive) {
        if (screenMessage && screenMessage.lifespan > 0) { screenMessage.lifespan -= deltaTime; if (screenMessage.lifespan <= 0) screenMessage = null; }
        const targetScale = isHoveringPause ? 1.1 : 1.0; currentPauseButtonScale += (targetScale - currentPauseButtonScale) * PAUSE_BTN_ANIM_SPEED * deltaTime;
        if (isVerticalPhase()) { updateVerticalPhase(deltaTime); } else { update(deltaTime); }
    }
    
    draw(deltaTime);
}

const versionLabel = document.getElementById('versionLabel'); 
const patchNotesContainer = document.getElementById('patchNotesContainer'); 
const modalOverlay = document.getElementById('modalOverlay'); 
const closePatchNotesBtn = document.getElementById('closePatchNotes'); 
const pointingArrow = document.getElementById('pointingArrow'); 

function openPatchNotes() { modalOverlay.classList.add('visible'); patchNotesContainer.classList.add('visible'); pointingArrow.classList.remove('visible'); localStorage.setItem('lastSeenGameVersion', versionLabel.textContent); }
function closePatchNotes() { modalOverlay.classList.remove('visible'); patchNotesContainer.classList.remove('visible'); }
function showPointingArrow() { const lastSeenVersion = localStorage.getItem('lastSeenGameVersion'); const currentGameVersion = versionLabel.textContent; if (lastSeenVersion === currentGameVersion) { pointingArrow.style.display = 'none'; return; } pointingArrow.classList.add('visible'); }

versionLabel.addEventListener('click', openPatchNotes); 
closePatchNotesBtn.addEventListener('click', closePatchNotes); 
modalOverlay.addEventListener('click', closePatchNotes); 

init(); 
animate(0);