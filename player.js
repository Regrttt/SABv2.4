// player.js

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        
        // --- VARIÁVEIS DE FÍSICA E MOVIMENTO ---
        this.velocityX = 0;
        this.velocityY = 0;
        this.acceleration = 2500;   
        this.friction = 0.85;       
        this.airFriction = 0.95;    
        this.skidMultiplier = 2.5;  
        this.maxFallSpeed = 900;    
        
        this.isJumping = false;
        this.onPassableSurface = false;
        
        // VARIÁVEIS DE ANCORAGEM
        this.standingOnPlatform = null; 
        this.anchorOffset = 0;

        // TRAVA DE SEGURANÇA (Debounce) PARA EFEITOS DE POUSO
        this.landingCooldown = 0;

        this.jumpsLeft = PLAYER_MAX_JUMPS;
        this.lastX = x;
        this.lastY = y;
        this.direction = 1;

        this.health = PLAYER_INITIAL_HEALTH;
        this.maxHealth = PLAYER_INITIAL_HEALTH;
        this.isInvincible = false;
        this.invincibilityTimer = 0;

        this.captureState = 'none'; 
        this.captureAnimProgress = 0;
        this.captureStartPos = null;
        this.captureEndPos = null;
        this.capturedByPlatform = null; 

        this.rewardCooldown = 0;
        this.rewardPlatform = null;
        this.rewardSource = null; 
        this.canInteractWithChest = null;
        
        this.heldDebris = null;
        this.canPickUpDebris = null;

        this.lastCenterX = this.x + this.width / 2;
        this.lastCenterY = this.y + this.height / 2;
        
        this.trailTimer = 0;
        this.TRAIL_INTERVAL = 0.03; 
        
        this.cloudStandTimer = 0;

        this.isSomersaulting = false;
        this.rotation = 0;
        this.coyoteTimeCounter = 0;
    }

    canJump() {
        return this.jumpsLeft > 0 || this.coyoteTimeCounter > 0;
    }

    jump() {
        if (!this.canJump()) return;

        this.standingOnPlatform = null;

        if (this.coyoteTimeCounter > 0) {
            this.isJumping = false;
            this.jumpsLeft = PLAYER_MAX_JUMPS;
        }
        
        if (this.jumpsLeft === PLAYER_MAX_JUMPS) {
            this.isSomersaulting = false;
            this.rotation = 0;
        } else {
            this.isSomersaulting = true;
            this.rotation = 0; 
        }
        
        this.velocityY = -JUMP_FORCE;
        this.isJumping = true;
        this.jumpsLeft--;
        this.coyoteTimeCounter = 0;
        
        this.cloudStandTimer = 0;
        
        playSound(sounds.jump);
    }

    draw(ctx, scrollOffset, verticalScrollOffset = 0, isVertical = false) {
        if (this.isInvincible && Math.floor(this.invincibilityTimer * 10) % 2 === 0) return;
        
        if (this.captureState === 'pulling' && this.captureAnimProgress >= 1) return;

        const playerX = this.x - (isVertical ? 0 : scrollOffset);
        const playerY = this.y - (isVertical ? verticalScrollOffset : 0);

        let drawWidth = this.width;
        let drawHeight = this.height;

        if (this.captureState === 'pulling') {
            drawWidth = this.width * (1 - this.captureAnimProgress * 0.9);
            drawHeight = this.height * (1 - this.captureAnimProgress * 0.9);
        }

        const scaleFactorX = drawWidth / this.width;
        const scaleFactorY = drawHeight / this.height;

        ctx.save();
        
        const centerX = playerX + drawWidth / 2;
        const centerY = playerY + drawHeight / 2;

        ctx.translate(centerX, centerY);
        if (this.isSomersaulting) {
            ctx.rotate(this.rotation * this.direction); 
        }
        ctx.translate(-centerX, -centerY);

        // --- CORPO DO JOGADOR ---
        const bodyGrad = ctx.createLinearGradient(playerX, playerY, playerX, playerY + drawHeight);
        bodyGrad.addColorStop(0, '#ff8b8b');
        bodyGrad.addColorStop(1, '#d13423');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(playerX, playerY, drawWidth, drawHeight);

        // --- CHAPÉU ---
        const hatX = playerX - (5 * scaleFactorX);
        const hatY = playerY - (10 * scaleFactorY);
        const hatWidth = drawWidth + (10 * scaleFactorX);
        const hatHeight = 15 * scaleFactorY;
        
        const hatGrad = ctx.createLinearGradient(hatX, hatY, hatX, hatY + hatHeight);
        hatGrad.addColorStop(0, '#ff4757');
        hatGrad.addColorStop(1, '#a4281b');
        
        ctx.fillStyle = hatGrad;
        ctx.fillRect(hatX, hatY, hatWidth, hatHeight);
        
        ctx.strokeStyle = '#a4281b';
        ctx.lineWidth = 2;
        ctx.strokeRect(hatX, hatY, hatWidth, hatHeight);

        ctx.restore();
        
        if (this.heldDebris) {
            this.heldDebris.draw(ctx, verticalScrollOffset);
        }
        
        if (debugMode) {
            ctx.strokeStyle = 'pink';
            ctx.lineWidth = 2;
            ctx.strokeRect(playerX, playerY, this.width, this.height);
        }
    }
    
    getCaptured(platform, windowPos) {
        if (platform.windowState !== 'active' || this.captureState !== 'none' || this.isInvincible) {
            return;
        }

        platform.windowState = 'in_progress';

        if (platform.windowType === 'reward') {
            this.rewardPlatform = platform;
            this.rewardSource = 'window';
            const spawnPos = { x: this.x + this.width / 2, y: this.y };
            triggerCoinReward(this, spawnPos, WINDOW_REWARD_COIN_COUNT);
        } else { 
            this.standingOnPlatform = null;
            this.captureState = 'reaching';
            this.capturedByPlatform = platform; 
            this.captureAnimProgress = 0;
            this.captureStartPos = { x: this.x, y: this.y };
            this.captureEndPos = windowPos;
            this.velocityX = 0;
            this.velocityY = 0;
        }
    }
    
    getCapturedByChest(chestPlatform) {
        this.takeDamage(true);
        chestPlatform.chestState = 'open';
    }

    update(deltaTime, keys, platforms, scrollOffset, infiniteInvincibilityCheat, enemies, sceneryManager, verticalScrollOffset, bossDebris, reduceParticles) {
        const particlesToCreate = [];
        const isVertical = isVerticalPhase();
        const wasJumping = this.isJumping;

        // Atualiza a trava de segurança (Cooldown) das partículas
        if (this.landingCooldown > 0) {
            this.landingCooldown -= deltaTime;
        }

        if (this.rewardPlatform && !coinRewardState.active && coinAnimations.length === 0) {
            this.rewardPlatform.windowState = 'closed';
            this.rewardPlatform = null;
        }
        
        if (this.rewardCooldown > 0) {
            this.rewardCooldown -= deltaTime;
            return { particles: particlesToCreate, closestDebris: null };
        }

        if (this.captureState !== 'none') {
            if(this.captureState === 'reaching') {
                this.captureAnimProgress += deltaTime / CAPTURE_REACH_DURATION;
                if(this.captureAnimProgress >= 1) { this.captureAnimProgress = 0; this.captureState = 'pulling'; }
            } else if (this.captureState === 'pulling') {
                this.captureAnimProgress += deltaTime / CAPTURE_PULL_DURATION;
                this.x = this.captureStartPos.x + (this.captureEndPos.x - this.captureStartPos.x) * this.captureAnimProgress;
                this.y = this.captureStartPos.y + (this.captureEndPos.y - this.captureStartPos.y) * this.captureAnimProgress;
                if(this.captureAnimProgress >= 1) this.captureAnimProgress = 1; 
            }
            return { particles: particlesToCreate, closestDebris: null };
        }

        if (infiniteInvincibilityCheat) {
            this.isInvincible = true;
        }

        if (this.isInvincible) {
            this.invincibilityTimer -= deltaTime;
            if (this.invincibilityTimer <= 0 && !infiniteInvincibilityCheat) {
                this.isInvincible = false;
            }
        }

        // --- SISTEMA DE ANCORAGEM REVISADO E BLINDADO ---
        if (this.standingOnPlatform && !this.isJumping) {
            const p = this.standingOnPlatform;
            const isInsideX = (this.x + this.width > p.x) && (this.x < p.x + p.width);
            
            let isPressingDown = false;
            if (keys && keys.down) {
                isPressingDown = true;
            }
            
            if (!isInsideX || p.type !== 'falling' || isPressingDown) {
                this.standingOnPlatform = null; 
            } else {
                this.y = p.y - this.anchorOffset;
                this.velocityY = 0;
            }
        } else {
            this.standingOnPlatform = null;
        }

        this.lastX = this.x;
        this.lastY = this.y;
        
        // --- MOVIMENTAÇÃO LATERAL ---
        let currentFriction = this.isJumping ? this.airFriction : this.friction;

        // ATUALIZAÇÃO: Verifica prioridade caso as duas teclas estejam pressionadas
        let moveRight = keys.right;
        let moveLeft = keys.left;

        if (keys.right && keys.left) {
            if (keys.lastHorizontal === 'right') moveLeft = false;
            else if (keys.lastHorizontal === 'left') moveRight = false;
        }

        if (moveRight) {
            this.direction = 1;
            if (this.velocityX < 0) this.velocityX += this.acceleration * this.skidMultiplier * deltaTime;
            else this.velocityX += this.acceleration * deltaTime;
        } else if (moveLeft) {
            this.direction = -1;
            if (this.velocityX > 0) this.velocityX -= this.acceleration * this.skidMultiplier * deltaTime;
            else this.velocityX -= this.acceleration * deltaTime;
        } else {
            this.velocityX *= currentFriction;
        }

        if (this.velocityX > PLAYER_SPEED) this.velocityX = PLAYER_SPEED;
        if (this.velocityX < -PLAYER_SPEED) this.velocityX = -PLAYER_SPEED;
        if (Math.abs(this.velocityX) < 5) this.velocityX = 0;

        if (this.onPassableSurface && !this.isJumping && Math.abs(this.velocityX) > 100 && ((keys.left && this.velocityX > 0) || (keys.right && this.velocityX < 0))) {
            particlesToCreate.push({
                x: this.x + this.width / 2, y: this.y + this.height, size: Math.random() * 3 + 2, color: 'rgba(200, 200, 200, 0.8)',
                lifespan: 0.3, initialLifespan: 0.3, vx: (this.direction * -1) * 100, vy: -50, isScreenSpace: false
            });
        }

        this.x += this.velocityX * deltaTime;
        
        // --- GRAVIDADE ---
        let proposedVelocityY = this.velocityY;

        if (!this.standingOnPlatform) {
            let currentGravity = GRAVITY * 0.8; 
            if (this.velocityY < 0 && !keys.space) currentGravity *= 2.5; 
            else if (this.velocityY > 0) currentGravity *= 1.2; 
            else if (Math.abs(this.velocityY) < 120 && keys.space) currentGravity *= 0.5; 

            if (keys.down && this.onPassableSurface) {
                this.y += 5;
                proposedVelocityY = 180;
                this.onPassableSurface = false; 
            } else {
                proposedVelocityY += currentGravity * deltaTime;
                if (proposedVelocityY > this.maxFallSpeed) proposedVelocityY = this.maxFallSpeed;
            }
        }
        
        const proposedY = this.y + proposedVelocityY * deltaTime;
        const falling = proposedVelocityY > 0; 
        
        let landedThisFrame = false;
        let hitObstacleSurface = false;
        let isOnCloud = false;
        let suppressLandingParticles = false;
        this.onPassableSurface = false;
        this.canInteractWithChest = null;
        let landedPlatformType = null;
        
        let landedOnPlatformSurface = false;
        let landedOnWallSurface = false;

        // --- SISTEMA DE COLISÃO DO CENÁRIO ---
        platforms.forEach(platform => {
            
            if (platform.hasChest && platform.chestState === 'closed') {
                const chestX = platform.x + (platform.width / 2) - 25; const chestY = platform.y - 40;
                const dx = (this.x + this.width / 2) - (chestX + 25); const dy = (this.y + this.height / 2) - (chestY + 20);
                if (Math.sqrt(dx * dx + dy * dy) < CHEST_PROMPT_DISTANCE) this.canInteractWithChest = platform;
            }
            if (platform.hasWindowTrap) {
                const windowHitbox = { x: platform.x + platform.width/2 - 30, y: platform.y - 90, width: 60, height: 90 };
                const pRect = { x: this.x, y: this.y, width: this.width, height: this.height };
                if (isColliding(pRect, windowHitbox) && keys.up) { this.getCaptured(platform, { x: platform.x + platform.width/2, y: platform.y - 45 }); }
            }

            platform.obstacles.forEach(obs => {
                if (obs.type === 'bush') return;

                let justTookDamage = false;

                const handleSpikeDamage = () => {
                    if (!this.isInvincible) {
                        this.takeDamage(true);
                        justTookDamage = true;
                    }
                };

                const pRect1 = { x: this.x, y: this.y, width: this.width, height: this.height };

                // 1. ESPINHO DE TETO (spike-down)
                if (obs.type === 'spike-down') {
                    const spikeHitbox = { x: platform.x + obs.x, y: platform.y + platform.height, width: obs.width, height: obs.height };
                    if (isColliding(pRect1, spikeHitbox)) {
                        handleSpikeDamage();
                        
                        if (justTookDamage && this.velocityY < 0) this.velocityY = JUMP_FORCE * 0.3; 
                        
                        if (this.lastY >= spikeHitbox.y + spikeHitbox.height - 20) {
                            this.y = spikeHitbox.y + spikeHitbox.height;
                            if (!justTookDamage) { proposedVelocityY = 0; this.velocityY = 0; }
                        } else {
                            const pCenter = this.x + this.width / 2;
                            const wCenter = spikeHitbox.x + spikeHitbox.width / 2;
                            if (pCenter < wCenter) this.x = spikeHitbox.x - this.width;
                            else this.x = spikeHitbox.x + spikeHitbox.width;
                            if (!justTookDamage) this.velocityX = 0;
                        }
                    }
                    return; 
                }

                // 2. OBSTÁCULOS TERRESTRES
                let obsMainRect = { x: platform.x + obs.x, y: platform.y - obs.height, width: obs.width, height: obs.height };
                let obsSpikePartRect = null;
                let lateralSpikeHitbox = null;

                if (obs.type === 'wall') {
                    if (obs.lateralSpikes) lateralSpikeHitbox = { x: platform.x + obs.x - obs.lateralSpikes.protrusion, y: platform.y - obs.height + obs.lateralSpikes.yOffset, width: obs.lateralSpikes.protrusion, height: obs.lateralSpikes.height };
                } else if (obs.type === 'wallWithTopSpikes') {
                    obsMainRect.height = obs.wallHeight;
                    obsMainRect.y = platform.y - obs.wallHeight;
                    obsSpikePartRect = { x: platform.x + obs.x, y: platform.y - obs.wallHeight - obs.spikeHeight, width: obs.width, height: obs.spikeHeight };
                } 

                const playerBottom = proposedY + this.height; 
                const lastPlayerBottom = this.lastY + this.height;
                const primarySurface = obsSpikePartRect || obsMainRect;
                
                if (primarySurface && !this.standingOnPlatform) {
                    const surfaceY = primarySurface.y;
                    const isHorizontallyAligned = this.x + this.width > primarySurface.x && this.x < primarySurface.x + primarySurface.width;
                    
                    if (falling && lastPlayerBottom <= surfaceY + 10 && playerBottom >= surfaceY && isHorizontallyAligned) {
                        hitObstacleSurface = true;
                        landedOnWallSurface = true; 
                        
                        if (obs.type === 'spike' || obs.type === 'wallWithTopSpikes') {
                            handleSpikeDamage();
                        }
                        
                        if (!justTookDamage) { 
                            this.y = surfaceY - this.height; 
                            proposedVelocityY = 0; 
                            this.velocityY = 0;
                            landedThisFrame = true;
                            landedPlatformType = 'stone';
                        }
                    }
                }
                
                const pRect2 = { x: this.x, y: this.y, width: this.width, height: this.height };
                if (lateralSpikeHitbox && isColliding(pRect2, lateralSpikeHitbox)) {
                    handleSpikeDamage();
                    const pCenter = this.x + this.width / 2;
                    const wCenter = lateralSpikeHitbox.x + lateralSpikeHitbox.width / 2;
                    if (pCenter < wCenter) this.x = lateralSpikeHitbox.x - this.width;
                    else this.x = lateralSpikeHitbox.x + lateralSpikeHitbox.width;
                    if (!justTookDamage) this.velocityX = 0;
                }

                const pRect3 = { x: this.x, y: this.y, width: this.width, height: this.height };
                if (obsSpikePartRect && isColliding(pRect3, obsSpikePartRect)) {
                    handleSpikeDamage();
                    const pCenter = this.x + this.width / 2;
                    const wCenter = obsSpikePartRect.x + obsSpikePartRect.width / 2;
                    if (pCenter < wCenter) this.x = obsSpikePartRect.x - this.width;
                    else this.x = obsSpikePartRect.x + obsSpikePartRect.width;
                    if (!justTookDamage) this.velocityX = 0;
                }

                const pRect4 = { x: this.x, y: this.y, width: this.width, height: this.height };
                if (isColliding(pRect4, obsMainRect)) {
                    if (obs.type === 'spike') {
                        handleSpikeDamage();
                    } 
                    
                    if (this.velocityY < 0 && this.lastY >= obsMainRect.y + obsMainRect.height - 15) { 
                        this.y = obsMainRect.y + obsMainRect.height; 
                        if (!justTookDamage) { proposedVelocityY = 0; this.velocityY = 0; }
                    } else if (this.velocityX !== 0) {
                        const pCenter = this.x + this.width / 2;
                        const wCenter = obsMainRect.x + obsMainRect.width / 2;
                        if (pCenter < wCenter) this.x = obsMainRect.x - this.width;
                        else this.x = obsMainRect.x + obsMainRect.width;
                        if (!justTookDamage) this.velocityX = 0;
                    }
                }
            });

            if (!hitObstacleSurface && !this.standingOnPlatform) {
                const isInsideX = (this.x + this.width > platform.x) && (this.x < platform.x + platform.width);
                const isCrossingY = (proposedY + this.height >= platform.y) && (this.lastY + this.height <= platform.y + 5);

                if (falling && isInsideX && isCrossingY) {
                    
                    let isPressingDown = false;
                    if (keys && keys.down) isPressingDown = true;
                    
                    const isPassablePlatformType = (platform.type === 'stable' || platform.type === 'falling');

                    if (isPassablePlatformType && isPressingDown) {
                        if (platform.type === 'falling' && !platform.isFalling) {
                            this.y = platform.y - this.height;
                            proposedVelocityY = 0;
                            this.velocityY = 0;
                            landedThisFrame = true;
                            landedPlatformType = platform.visualType;
                            landedOnPlatformSurface = true;
            
                            this.standingOnPlatform = platform;
                            this.anchorOffset = platform.y - this.y;
                            platform.isFalling = true; 
                            this.onPassableSurface = true; 
                        }
                    } 
                    else if (platform.type === 'pass-through-slow') {
                        isOnCloud = true;
                        landedPlatformType = 'cloud';
                    } 
                    else {
                        this.y = platform.y - this.height;
                        proposedVelocityY = 0;
                        this.velocityY = 0;
                        landedThisFrame = true;
                        landedPlatformType = platform.visualType;
                        landedOnPlatformSurface = true;

                        if (platform.type === 'stable') {
                            this.onPassableSurface = true; 
                        } else if (platform.type === 'falling') {
                            this.standingOnPlatform = platform;
                            this.anchorOffset = platform.y - this.y;
                            if (platform.fallSpeed > 0) suppressLandingParticles = true;
                            platform.isFalling = true;
                            this.onPassableSurface = true; 
                        }
                    }
                }
            }
        });

        // --- APLICAÇÃO DE ESTADOS FINAIS E ANIMAÇÃO ---
        if (!this.standingOnPlatform) {
            if (isOnCloud && !landedThisFrame) {
                this.isJumping = false;
                if (wasJumping) { 
                    this.jumpsLeft = PLAYER_MAX_JUMPS; 
                    this.cloudStandTimer = 0; 
                }
                
                this.cloudStandTimer += deltaTime; 
                
                const constantSinkSpeed = 45; 
                
                this.velocityY = constantSinkSpeed; 
                proposedVelocityY = constantSinkSpeed; 
                this.y += constantSinkSpeed * deltaTime; 
                
                const spawnChance = reduceParticles ? 0.3 : 1.0;
                if (Math.random() < spawnChance) {
                    particlesToCreate.push({ 
                        x: this.x + this.width / 2 + (Math.random() - 0.5) * 50, y: this.y + this.height,
                        size: Math.random() * 4 + 4, color: 'rgba(255, 255, 255, 0.65)', 
                        lifespan: 0.6, initialLifespan: 0.6, vx: (Math.random() - 0.5) * 60, vy: -(Math.random() * 20 + 10), 
                        isScreenSpace: false, priority: 'low', layer: 'front'
                    });
                }
            } else if (!landedThisFrame) {
                this.y += proposedVelocityY * deltaTime;
                this.velocityY = proposedVelocityY;
                this.isJumping = true;
                this.cloudStandTimer = 0;
            } else {
                this.isJumping = false;
                this.jumpsLeft = PLAYER_MAX_JUMPS;
                this.cloudStandTimer = 0;
            }
        } else {
            this.isJumping = false;
            this.jumpsLeft = PLAYER_MAX_JUMPS;
            this.cloudStandTimer = 0;
        }
        
        if (this.isSomersaulting) {
            const baseSpeed = 12;
            const dynamicSpeed = Math.abs(this.velocityY) / 60; 
            this.rotation += (baseSpeed + dynamicSpeed) * deltaTime;
            if (this.rotation >= Math.PI * 2) { this.rotation = 0; this.isSomersaulting = false; }
        }

        if (isVertical) {
            if (this.x < 0) { this.x = 0; this.velocityX = 0; }
            if (this.x + this.width > canvas.width) { this.x = canvas.width - this.width; this.velocityX = 0; }
        } else {
            if (this.x < scrollOffset + 10) { this.x = scrollOffset + 10; this.velocityX = 0; }
        }
        
        if (this.heldDebris) {
            this.heldDebris.x = this.x + (this.width / 2) - (this.heldDebris.width / 2);
            this.heldDebris.y = this.y - this.heldDebris.height - 10;
        }
        
        // --- SISTEMA DE COLISÃO COM INIMIGOS E EXPLOSÕES ---
        const playerWorldRect = { x: this.x, y: this.y, width: this.width, height: this.height };
        const playerScreenRect = { x: this.x - (isVertical ? 0 : scrollOffset), y: this.y - (isVertical ? verticalScrollOffset : 0), width: this.width, height: this.height };
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            let hasCollided = false;

            if (enemy.type === 'falling_rock') {
                const rockRect = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
                if(isColliding(playerWorldRect, rockRect)) hasCollided = true; 
            } else {
                let effectivePlayerRect, enemyRect;
                if (enemy.isScreenSpaceEntity) { effectivePlayerRect = playerScreenRect; enemyRect = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height }; } 
                else { effectivePlayerRect = { x: this.x, y: this.y, width: this.width, height: this.height }; enemyRect = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height }; }
                
                if (enemy.type === 'patrol') { if (isColliding(effectivePlayerRect, enemyRect)) hasCollided = true; } 
                else { const enemyCircle = { x: enemyRect.x + enemyRect.width / 2, y: enemyRect.y + enemyRect.height / 2, radius: enemyRect.width / 2 }; if (isCollidingCircleRect(enemyCircle, effectivePlayerRect)) hasCollided = true; }
            }

            if (hasCollided) {
                if (enemy.type === 'rebound') {
                    enemy.rebound(scrollOffset);
                    
                    if (!boss) {
                        enemy.velocityX = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 400 + 400);
                        enemy.velocityY = -(Math.random() * 400 + 400);
                        
                        if (!reduceParticles) {
                            for (let k = 0; k < 12; k++) {
                                particlesToCreate.push({
                                    x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                                    size: Math.random() * 4 + 2, color: '#5DADE2',
                                    lifespan: 0.4 + Math.random() * 0.3, initialLifespan: 0.7,
                                    vx: (Math.random() - 0.5) * 350, vy: (Math.random() - 0.5) * 350,
                                    isScreenSpace: enemy.isScreenSpaceEntity, priority: 'high', layer: 'front'
                                });
                            }
                        }
                    }
                } else { 
                    if (!this.isInvincible) { 
                        this.takeDamage(true); 
                    }
                    
                    if (!reduceParticles) {
                        let pColor = '#ffffff';
                        if (enemy.type === 'straight') pColor = '#5f27cd'; 
                        else if (enemy.type === 'homing') pColor = '#E6A11F';
                        else if (enemy.type === 'charger') pColor = '#2E8B57';
                        else if (enemy.type === 'patrol') pColor = '#e6bf9e';
                        else if (enemy.type === 'falling_rock') pColor = '#7f8c8d';
                        else if (enemy.type === 'rebound') pColor = '#5DADE2';

                        for (let k = 0; k < 12; k++) {
                            particlesToCreate.push({
                                x: enemy.x + enemy.width / 2,
                                y: enemy.y + enemy.height / 2,
                                size: Math.random() * 4 + 2,
                                color: pColor,
                                lifespan: 0.4 + Math.random() * 0.3,
                                initialLifespan: 0.7,
                                vx: (Math.random() - 0.5) * 350,
                                vy: (Math.random() - 0.5) * 350,
                                isScreenSpace: enemy.isScreenSpaceEntity,
                                priority: 'high',
                                layer: 'front'
                            });
                        }
                    }
                    
                    enemies.splice(i, 1); 
                }
            }
        }
        
        if (wasJumping && !this.isJumping) {
            if (!suppressLandingParticles && !isOnCloud) {
                if (this.landingCooldown <= 0) {
                    playSound(sounds.land);
                    this.landingCooldown = 0.15; 
                    
                    this.isSomersaulting = false; this.rotation = 0;
                    let landingParticleColor = '#4CAF50'; 
                    if (landedOnWallSurface) landingParticleColor = '#A9A9A9'; 
                    else if (landedPlatformType === 'stone') landingParticleColor = '#7f8c8d'; 
                    else if (landedPlatformType === 'cloud') landingParticleColor = 'rgba(255, 255, 255, 0.8)'; 

                    if (landedOnPlatformSurface || landedOnWallSurface) { 
                        const numLanding = reduceParticles ? 8 : 20;
                        for (let i = 0; i < numLanding; i++) { 
                            particlesToCreate.push({ x: this.x + this.width / 2, y: this.y + this.height, size: Math.random() * 4 + 3, color: landingParticleColor, lifespan: 0.6 + Math.random() * 0.4, initialLifespan: 1.0, vx: (Math.random() - 0.5) * 350, vy: (Math.random() * -200) - 80, isScreenSpace: false }); 
                        }
                    }
                }
            }
        }
        
        if (!this.isJumping) {
            this.coyoteTimeCounter = COYOTE_TIME_DURATION;
        } else {
            this.coyoteTimeCounter -= deltaTime;
        }

        if (reduceParticles) {
            this.trailTimer -= deltaTime;
            if (this.trailTimer <= 0) {
                if (Math.abs(this.velocityX) > 10 || (Math.abs(this.velocityY) > 10 && this.isJumping)) {
                    this.trailTimer = this.TRAIL_INTERVAL; 
                    const life = Math.random() * 0.4 + 0.2; 
                    particlesToCreate.push({
                        x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
                        y: this.y + this.height / 2 + (Math.random() - 0.5) * 20,
                        size: Math.random() * 3 + 2, color: Math.random() < 0.5 ? '#e67e22' : '#c0392b',
                        lifespan: life, initialLifespan: life,
                        vx: -(this.velocityX * 0.2), vy: -(this.velocityY * 0.2),
                        isScreenSpace: false, priority: 'high', layer: 'front', ignoreFreeze: false 
                    });
                }
            }
        } else {
            if ((Math.abs(this.velocityX) > 10) || (Math.abs(this.velocityY) > 10 && this.isJumping)) {
                for (let i = 0; i < 2; i++) {
                    const life = Math.random() * 0.4 + 0.2; 
                    particlesToCreate.push({
                        x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
                        y: this.y + this.height / 2 + (Math.random() - 0.5) * 20,
                        size: Math.random() * 3 + 2, color: Math.random() < 0.5 ? '#e67e22' : '#c0392b',
                        lifespan: life, initialLifespan: life,
                        vx: -(this.velocityX * 0.2), vy: -(this.velocityY * 0.2),
                        isScreenSpace: false
                    });
                }
            }
        }

        let closestDebris = null;
        if (bossDebris && !this.heldDebris) { 
            let minDistance = DEBRIS_PICKUP_DISTANCE;
            bossDebris.forEach(debris => {
                if (debris.state === 'landed') {
                    const dx = (this.x + this.width / 2) - (debris.x + debris.width / 2);
                    const dy = (this.y + this.height / 2) - (debris.y + debris.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < minDistance) { minDistance = distance; closestDebris = debris; }
                }
            });
        }
        this.canPickUpDebris = closestDebris;

        return { particles: particlesToCreate, closestDebris: this.canPickUpDebris };
    }

    triggerFallRespawn(platforms, verticalScrollOffset) {
        this.standingOnPlatform = null;

        // Se o player ESTÁ invencível ou com God Mode, ele NÃO PERDE VIDA ao cair!
        if (!this.isInvincible && !infiniteInvincibilityCheat) {
            this.health--;
            if (this.health > 0) {
                playSound(sounds.damage);
                this.isInvincible = true;
                this.invincibilityTimer = INVINCIBILITY_DURATION;
            }
        }

        if (this.health > 0 || infiniteInvincibilityCheat) {
            const visiblePlatforms = platforms.filter(p => p.y > verticalScrollOffset && p.y < verticalScrollOffset + canvas.height);
            const safePlatforms = visiblePlatforms.filter(p => p.visualType !== 'cloud' && !p.obstacles.some(obs => obs.type === 'spike-down'));

            let targetPool = safePlatforms.filter(p => !p.isFalling);
            if (targetPool.length === 0) targetPool = safePlatforms; 

            let respawnPlatform = null;
            if (targetPool.length > 0) {
                respawnPlatform = targetPool.reduce((lowest, current) => (current.y > lowest.y) ? lowest : current);
            }

            if (respawnPlatform) {
                this.x = respawnPlatform.x + (respawnPlatform.width / 2) - (this.width / 2);
                this.y = respawnPlatform.y - this.height - 50; // Nasce logo acima
            } else {
                this.x = canvas.width / 2 - this.width / 2;
                this.y = verticalScrollOffset + 50; // Se não tiver nada, cai do teto
            }

            this.velocityY = 0;
            this.velocityX = 0;
            this.jumpsLeft = PLAYER_MAX_JUMPS;
        }
    }

    takeDamage(applyKnockback = false) {
        if (!this.isInvincible && this.captureState === 'none') {
            this.health--;
            this.jumpComboCount = 0; 
            this.isSomersaulting = false;
            playSound(sounds.damage);
            this.isInvincible = true;
            this.invincibilityTimer = INVINCIBILITY_DURATION;
            
            if(applyKnockback) {
                this.standingOnPlatform = null; 
                this.velocityY = -JUMP_FORCE / 2;
                this.velocityX = (this.direction * -1) * 300; 
            }
        }
    }

    respawnInTower(platforms) {
        const platformCapturedOn = this.capturedByPlatform;
        if(!platformCapturedOn) return;
        
        if (platformCapturedOn.hasWindowTrap) {
            platformCapturedOn.windowState = 'closed';
        }

        this.standingOnPlatform = null;
        this.x = platformCapturedOn.x + (platformCapturedOn.width / 2) - (this.width / 2);
        this.y = platformCapturedOn.y - this.height - 5;
        
        this.velocityY = 0;
        this.velocityX = 0;
        this.jumpsLeft = PLAYER_MAX_JUMPS;
        this.captureState = 'none';
        this.capturedByPlatform = null;
        this.captureAnimProgress = 0;
    }

    respawn(platforms, scrollOffset) {
        this.standingOnPlatform = null;

        // Se o player ESTÁ invencível ou com God Mode, ele NÃO PERDE VIDA ao cair!
        if (!this.isInvincible && !infiniteInvincibilityCheat) {
            this.health--;
            if (this.health > 0) {
                playSound(sounds.damage);
                this.isInvincible = true;
                this.invincibilityTimer = INVINCIBILITY_DURATION;
            }
        }

        if (this.health > 0 || infiniteInvincibilityCheat) {
            const visiblePlatforms = platforms.filter(p => p.x + p.width > scrollOffset && p.x < scrollOffset + canvas.width);
            const safePlatforms = visiblePlatforms.filter(p => !p.obstacles.some(obs => obs.type === 'wall' || obs.type === 'spike' || obs.lateralSpikes || obs.type === 'wallWithTopSpikes'));
            
            let targetPool = safePlatforms.filter(p => !p.isFalling);
            if (targetPool.length === 0) targetPool = safePlatforms; 

            let closestPlatform = null;
            let minDistance = Infinity;
            if (targetPool.length > 0) {
                targetPool.forEach(p => { 
                    const distance = Math.abs((p.x + p.width / 2) - (this.x)); 
                    if (distance < minDistance) { 
                        minDistance = distance; 
                        closestPlatform = p; 
                    } 
                });
            }

            if (closestPlatform) { 
                this.x = closestPlatform.x + (closestPlatform.width / 2) - (this.width / 2); 
                this.y = closestPlatform.y - this.height - 50; // Nasce logo acima (Fase 1)
            } else { 
                this.x = scrollOffset + 100; 
                this.y = 100; // Se não tiver nada, cai do teto
            }
            
            this.velocityY = 0;
            this.velocityX = 0;
            this.jumpsLeft = PLAYER_MAX_JUMPS;
        }
    }
}