// boss.js

class Boss {
    constructor() {
        this.initialX = 50;
        this.initialY = 150;
        this.x = this.initialX;
        this.y = this.initialY;
        this.width = 200;
        this.height = 200;
        this.health = 100;
        this.maxHealth = 100;
        
        // Controle de Dano Visual
        this.lastHealth = 100;
        this.damageFlashTimer = 0;

        // Controle de Ambiente (Tensão Fase 2)
        this.darknessAlpha = 0; 
        this.rageTransition = 0;

        // Transição de Fase
        this.isEnraging = false;
        this.enrageTimer = 0;

        // Animação e Postura (Física Zero-G / Spring)
        this.bobAngle = 0;
        this.rotation = 0; 
        this.rotVelocity = 0; 

        this.isVulnerable = false;
        this.phaseTwoTriggered = false;
        this.attackCooldown = 2;
        // Utiliza a variável dinâmica baseada na Dificuldade atual
        this.attackCooldownMax = BOSS_ATTACK_COOLDOWN;
        this.healthPacksSpawnedInBattle = 0;
        this.dashTimer = BOSS_DASH_COOLDOWN;
        this.lastScrollOffsetForDash = 0;
        this.isDashing = false;
        this.dashPhase = 'none';
        this.windUpTimer = 0;
        
        // Físicas reais para o Boss
        this.velocityX = 0;
        this.velocityY = 0;

        // --- SISTEMA DE RNG JUSTO PARA PROJÉTEIS AZUIS ---
        this.shotsSinceLastRebound = 0;
    }

    update(deltaTime, scrollOffset, player) {
        if (this.health < this.lastHealth) {
            this.damageFlashTimer = 0.4; 
            this.lastHealth = this.health;
        }
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
        }

        // --- GATILHO DA TRANSIÇÃO DE FASE ---
        if (this.health <= this.maxHealth * BOSS_PHASE2_THRESHOLD && !this.phaseTwoTriggered && !this.isEnraging) {
            this.isEnraging = true;
            this.enrageTimer = 1.0;
            
            // Interrompe bruscamente qualquer ataque atual
            this.isDashing = false;
            this.dashPhase = 'none';
            this.dashTimer = BOSS_DASH_COOLDOWN;
            this.velocityX = 0;
            this.velocityY = 0;
        }

        if (this.phaseTwoTriggered) {
            this.darknessAlpha = Math.min(1, this.darknessAlpha + deltaTime * 0.7);
            this.rageTransition = Math.min(1, this.rageTransition + deltaTime * 0.5);
        }

        // --- CONTROLE DE VELOCIDADE DA ANIMAÇÃO "PARADA" ---
        let currentBobSpeed = 1.2;
        let bobAmplitude = 20;

        if (this.isEnraging) {
            currentBobSpeed = 80; // Vibração vertical frenética
            bobAmplitude = 12;    // Amplitude curta e violenta
        } else if (this.phaseTwoTriggered) {
            currentBobSpeed = 4.0; // Apreensivo/Acelerado (Fase 2)
            bobAmplitude = 15;     // Reduz levemente a amplitude para parecer um tremor de ansiedade
        }

        this.bobAngle += currentBobSpeed * deltaTime;
        const idleTargetY = this.initialY + Math.sin(this.bobAngle) * bobAmplitude;

        let applyIdlePhysics = false;

        if (this.isEnraging) {
            this.enrageTimer -= deltaTime;
            
            this.attackCooldown = this.attackCooldownMax; // Impede atirar
            
            // Zera as rotações e inércias
            this.rotation = 0;
            this.rotVelocity = 0;
            this.velocityX = 0;
            this.velocityY = 0;
            
            // Centraliza em X suavemente, mas aplica o tremor estritamente no Y
            this.x += (this.initialX - this.x) * 20 * deltaTime; 
            this.y = idleTargetY; // Ignora a mola e segue a matemática exata (Tremor duro)
            
            if (this.enrageTimer <= 0) {
                this.isEnraging = false;
                this.phaseTwoTriggered = true;
                platforms.forEach(p => { p.type = 'falling'; });
            }
        } else if (!this.isDashing) {
            applyIdlePhysics = true;

            // --- SISTEMA ANTI-CHEESE (Só ativa em Normal e Difícil) ---
            if (currentDifficulty > 0) {
                if (scrollOffset - this.lastScrollOffsetForDash >= 200) {
                    this.dashTimer = BOSS_DASH_COOLDOWN;
                    this.lastScrollOffsetForDash = scrollOffset;
                } else {
                    this.dashTimer -= deltaTime;
                }

                if (this.dashTimer <= 0) {
                    this.isDashing = true;
                    this.dashPhase = 'winding_up';
                    this.windUpTimer = 0.7; 
                }
            } else {
                this.dashTimer = BOSS_DASH_COOLDOWN;
                this.lastScrollOffsetForDash = scrollOffset;
            }

            if (this.attackCooldown > 0) {
                this.attackCooldown -= deltaTime;
            } else {
                this.shotsSinceLastRebound++;
                let isRebound = false;
                
                // Utiliza a variável dinâmica do Pity Timer
                if (this.shotsSinceLastRebound >= BOSS_PITY_TIMER) {
                    isRebound = true;
                } else if (currentDifficulty < 2) {
                    const dynamicChance = (this.shotsSinceLastRebound / BOSS_PITY_TIMER) * 0.5;
                    if (Math.random() < dynamicChance) {
                        isRebound = true;
                    }
                } 

                let type, minionSpeed;
                if (isRebound) {
                    type = 'rebound'; 
                    minionSpeed = BOSS_MINION_REBOUND_SPEED;
                    this.shotsSinceLastRebound = 0; 
                } else {
                    if (Math.random() < 0.53) {
                        type = 'homing'; 
                        minionSpeed = BOSS_MINION_HOMING_SPEED;
                    } else {
                        type = 'straight'; 
                        minionSpeed = BOSS_MINION_STRAIGHT_SPEED;
                    }
                }

                projectileIndicators.push({ 
                    x: this.x, y: Math.random() * (canvas.height - 150) + 50, 
                    lifespan: PROJECTILE_INDICATOR_DURATION, initialLifespan: PROJECTILE_INDICATOR_DURATION, 
                    projectileType: type, projectileSpeed: minionSpeed 
                });
                this.attackCooldown = this.attackCooldownMax;
            }
        } else {
            switch(this.dashPhase) {
                case 'winding_up':
                    this.rotVelocity += (-0.3 - this.rotation) * 25 * deltaTime;
                    this.rotation += this.rotVelocity * deltaTime;
                    this.rotVelocity *= 0.85;

                    this.velocityX -= 400 * deltaTime;
                    this.velocityY -= 120 * deltaTime; 
                    
                    this.velocityX *= 0.9;
                    this.velocityY *= 0.9;

                    this.x += this.velocityX * deltaTime;
                    this.y += this.velocityY * deltaTime;
                    
                    this.windUpTimer -= deltaTime;
                    if (this.windUpTimer <= 0) {
                        this.dashPhase = 'dashing';
                        const targetX = player.x - scrollOffset + (player.width / 2);
                        const targetY = player.y + (player.height / 2);
                        const currentBossX = this.x + (this.width / 2);
                        const currentBossY = this.y + (this.height / 2);
                        const dx = targetX - currentBossX;
                        const dy = targetY - currentBossY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        this.velocityX = (dx / distance) * BOSS_DASH_SPEED;
                        this.velocityY = (dy / distance) * BOSS_DASH_SPEED;
                    }
                    break;

                case 'dashing':
                    this.rotVelocity += (0.4 - this.rotation) * 40 * deltaTime;
                    this.rotation += this.rotVelocity * deltaTime;
                    this.rotVelocity *= 0.85;

                    this.x += this.velocityX * deltaTime;
                    this.y += this.velocityY * deltaTime;

                    const bRect = { 
                        x: this.x + 40, y: this.y + 40, 
                        width: this.width - 80, height: this.height - 80 
                    };
                    const pRect = { 
                        x: player.x - scrollOffset, y: player.y, 
                        width: player.width, height: player.height 
                    };

                    let hitWall = false;
                    const overX = 50; 
                    if (this.x > canvas.width - this.width + overX) { this.x = canvas.width - this.width + overX; hitWall = true; }
                    if (this.x < -overX) { this.x = -overX; hitWall = true; }
                    if (this.y > canvas.height - this.height + overX) { this.y = canvas.height - this.height + overX; hitWall = true; }
                    if (this.y < -overX) { this.y = -overX; hitWall = true; }

                    if ((isColliding(pRect, bRect) && !player.isInvincible) || hitWall) {
                        this.dashPhase = 'returning';
                        this.velocityX = 0; 
                        this.velocityY = 0;
                    }
                    break;

                case 'returning':
                    applyIdlePhysics = true;
                    const dxReturn = this.initialX - this.x;
                    const dyReturn = idleTargetY - this.y;
                    if (Math.abs(dxReturn) < 5 && Math.abs(dyReturn) < 5 && Math.abs(this.velocityX) < 20 && Math.abs(this.velocityY) < 20) {
                        this.isDashing = false;
                        this.dashPhase = 'none';
                        this.dashTimer = BOSS_DASH_COOLDOWN;
                    }
                    break;
            }
        }

        if (applyIdlePhysics) {
            const dx = this.initialX - this.x;
            const dy = idleTargetY - this.y;
            
            this.velocityX += dx * 25 * deltaTime;
            this.velocityY += dy * 25 * deltaTime;
            
            this.velocityX *= 0.85;
            this.velocityY *= 0.85;

            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;

            if (!this.isEnraging) {
                this.rotVelocity += (0 - this.rotation) * 20 * deltaTime;
                this.rotation += this.rotVelocity * deltaTime;
                this.rotVelocity *= 0.85;
            }
        }
    }

    draw(ctx) {
        let bossX = this.x;
        let bossY = this.y;
        
        if (this.isEnraging) {
            bossX += (Math.random() - 0.5) * 15;
            bossY += (Math.random() - 0.5) * 15;
        }

        const centerX = bossX + this.width / 2; 
        const centerY = bossY + this.height / 2; 

        let isFlashing = false;
        if (this.damageFlashTimer > 0) {
            if (Math.floor(this.damageFlashTimer * 20) % 2 === 0) {
                isFlashing = true;
            }
        }

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        ctx.translate(-centerX, -centerY);

        const bossGrad = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, this.width);
        bossGrad.addColorStop(0, '#5f27cd'); 
        bossGrad.addColorStop(1, '#3d1a4d');
        
        ctx.fillStyle = bossGrad; 
        ctx.strokeStyle = '#3d1a4d';
        ctx.lineWidth = 3;

        ctx.beginPath(); 
        ctx.moveTo(bossX + this.width / 2, bossY); 
        ctx.lineTo(bossX + this.width, bossY + this.height / 2); 
        ctx.lineTo(bossX + this.width / 2, bossY + this.height); 
        ctx.lineTo(bossX, bossY + this.height / 2); 
        ctx.closePath(); 
        ctx.fill(); 
        ctx.stroke();
        
        const eyeSize = 40; 
        
        let baseC1 = {r: 255, g: 107, b: 107}; // Rosa/Vermelho Claro
        let baseC2 = {r: 231, g: 76, b: 60};  // Vermelho
        let baseSc = {r: 231, g: 76, b: 60};  // Borda

        if (this.isVulnerable) {
            baseC1 = {r: 254, g: 202, b: 87}; // Amarelo
            baseC2 = {r: 241, g: 196, b: 15}; // Dourado
            baseSc = {r: 241, g: 196, b: 15}; 
        } else if (this.rageTransition > 0) {
            baseC1 = lerpColor('#ff6b6b', '#e67e22', this.rageTransition);
            baseC2 = lerpColor('#e74c3c', '#c0392b', this.rageTransition);
            baseSc = lerpColor('#e74c3c', '#7b241c', this.rageTransition);
        }
        
        const c1Str = rgbToString(baseC1);
        const c2Str = rgbToString(baseC2);
        const scStr = rgbToString(baseSc);

        // Máscara do Olho (Diamond)
        ctx.save();
        ctx.beginPath(); 
        ctx.moveTo(centerX, centerY - eyeSize); 
        ctx.lineTo(centerX + eyeSize, centerY); 
        ctx.lineTo(centerX, centerY + eyeSize); 
        ctx.lineTo(centerX - eyeSize, centerY); 
        ctx.closePath(); 
        ctx.clip(); 

        // Fundo do olho (Gradiente Base)
        const eyeBgGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, eyeSize);
        eyeBgGrad.addColorStop(0, c1Str);
        eyeBgGrad.addColorStop(1, c2Str);
        ctx.fillStyle = eyeBgGrad;
        ctx.fill();

        // --- OTIMIZAÇÃO: Mistura Líquida apenas se EFEITOS = ON ---
        if (vfxEnabled && this.rageTransition > 0) {
            const t = this.bobAngle * 2;
            
            const b1x = centerX + Math.cos(t) * (eyeSize * 0.3);
            const b1y = centerY + Math.sin(t * 0.8) * (eyeSize * 0.3);
            const g1 = ctx.createRadialGradient(b1x, b1y, 0, b1x, b1y, eyeSize);
            g1.addColorStop(0, `rgba(${baseC1.r}, ${baseC1.g}, ${baseC1.b}, ${this.rageTransition})`);
            g1.addColorStop(1, `rgba(${baseC2.r},${baseC2.g},${baseC2.b},0)`);
            ctx.fillStyle = g1;
            ctx.fillRect(centerX - eyeSize, centerY - eyeSize, eyeSize*2, eyeSize*2);

            const b2x = centerX + Math.cos(t * 1.3 + Math.PI) * (eyeSize * 0.4);
            const b2y = centerY + Math.sin(t * 1.1 + Math.PI) * (eyeSize * 0.4);
            const g2 = ctx.createRadialGradient(b2x, b2y, 0, b2x, b2y, eyeSize * 0.8);
            const hlColor = `rgba(${Math.min(255, baseC1.r+60)},${Math.min(255, baseC1.g+60)},${Math.min(255, baseC1.b+60)}, ${this.rageTransition * 0.9})`;
            g2.addColorStop(0, hlColor);
            g2.addColorStop(1, `rgba(${baseC1.r},${baseC1.g},${baseC1.b},0)`);
            ctx.fillStyle = g2;
            ctx.fillRect(centerX - eyeSize, centerY - eyeSize, eyeSize*2, eyeSize*2);
        }

        ctx.restore(); // Remove a máscara

        // Borda do Olho
        ctx.strokeStyle = scStr;
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(centerX, centerY - eyeSize); 
        ctx.lineTo(centerX + eyeSize, centerY); 
        ctx.lineTo(centerX, centerY + eyeSize); 
        ctx.lineTo(centerX - eyeSize, centerY); 
        ctx.closePath(); 
        ctx.stroke();

        // --- SISTEMA DE DANO (PELÍCULA VERMELHA TRANSPARENTE) ---
        if (isFlashing) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
            
            // Cobre o corpo e também o olho simultaneamente
            ctx.beginPath(); 
            ctx.moveTo(bossX + this.width / 2, bossY); 
            ctx.lineTo(bossX + this.width, bossY + this.height / 2); 
            ctx.lineTo(bossX + this.width / 2, bossY + this.height); 
            ctx.lineTo(bossX, bossY + this.height / 2); 
            ctx.closePath(); 
            ctx.fill(); 
            ctx.stroke();
        }

        if (debugMode) {
            ctx.strokeStyle = 'pink';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(bossX + this.width / 2, bossY);
            ctx.lineTo(bossX + this.width, bossY + this.height / 2);
            ctx.lineTo(bossX + this.width / 2, bossY + this.height);
            ctx.lineTo(bossX, bossY + this.height / 2);
            ctx.closePath();
            ctx.stroke();

            ctx.strokeStyle = 'red';
            ctx.strokeRect(bossX + 40, bossY + 40, this.width - 80, this.height - 80);
        }

        ctx.restore(); 
    }
}


class FinalBoss {
    constructor(startY) {
        this.y = startY;
        this.bobAngle = 0;
        this.flameAngle = 0; 
        
        this.health = FINAL_BOSS_HEALTH;
        this.maxHealth = FINAL_BOSS_HEALTH;
        this.isInvincible = false;
        this.invincibilityTimer = 0;
        
        this.attackState = 'idle'; 
        this.attackTimer = 2.0;
        this.attackSubTimer = 0;
        
        this.slashCount = 0;
        this.lastSlashSide = 'right';
        this.activeArm = null;

        this.isInRageMode = false;
        this.rageBobSpeedMultiplier = 1.0;
        this.rageFlameSpeedMultiplier = 1.0;
        this.targetArmSpeedMultiplier = 1.0; 
        this.currentArmSpeedMultiplier = 1.0; 
        this.comboHitCount = 0;
        this.healthPacksSpawnedInBattle = 0;
        
        this.rageLightingAlpha = 0;
        this.rageLightingFadeInDuration = 1.5;
        
        this.attackPool = ['slash_simple', 'slash_simple', 'slash_double'];
        
        if (currentDifficulty === 2) {
            this.rageAttackPool = ['slash_simple', 'slash_double', 'slash_double', 'combo_slash', 'combo_slash', 'laser_beam', 'laser_beam'];
        } else {
            this.rageAttackPool = ['slash_simple', 'slash_double', 'combo_slash', 'combo_slash', 'laser_beam'];
        }

        // --- NOVO: Memória de Ataque Anti-Repetição ---
        this.lastAttack = null;
        this.consecutiveSameAttack = 0;

        this.glowState = 'idle';
        this.glowTimer = 2.0 + Math.random() * 2;
        this.glowProgress = 0;
        this.glowChargeDuration = 0.4;
        this.glowFadeDuration = 0.8;
        
        this.laserAngle = 0;
        this.headTilt = 0;
        
        this.pupilFocus = 0; 

        this.arms = [
            { 
                side: 'left', 
                animationAngle: Math.random() * Math.PI * 2,
                animationSpeed: 1.8 + Math.random() * 0.5,
                targetShoulderAngle: -Math.PI * 0.6,
                currentShoulderAngle: -Math.PI * 0.6,
                targetElbowAngle: Math.PI * 0.4,
                currentElbowAngle: Math.PI * 0.4,
                breathingAmplitude: 1.0 
            },
            { 
                side: 'right', 
                animationAngle: Math.random() * Math.PI * 2,
                animationSpeed: 1.8 + Math.random() * 0.5,
                targetShoulderAngle: -Math.PI * 0.4,
                currentShoulderAngle: -Math.PI * 0.4,
                targetElbowAngle: -Math.PI * 0.4,
                currentElbowAngle: -Math.PI * 0.4,
                breathingAmplitude: 1.0 
            }
        ];
    }

    update(deltaTime, player, verticalScrollOffset) {
        const particlesToCreate = []; 
        let events = { shake: false }; 

        if (this.isInvincible) {
            this.invincibilityTimer -= deltaTime;
            if (this.invincibilityTimer <= 0) {
                this.isInvincible = false;
            }
        }
        
        this.bobAngle += 1.5 * deltaTime * this.rageBobSpeedMultiplier;
        this.flameAngle += 6 * deltaTime * this.rageFlameSpeedMultiplier; 
        
        this.currentArmSpeedMultiplier += (this.targetArmSpeedMultiplier - this.currentArmSpeedMultiplier) * 1.5 * deltaTime;
        
        let targetTilt = 0; 
        if (this.attackState === 'laser_charge' || this.attackState === 'laser_active') {
            targetTilt = Math.cos(this.laserAngle) * 0.5; 
        }
        this.headTilt += (targetTilt - this.headTilt) * 3.0 * deltaTime;

        const isLaser = (this.attackState === 'laser_charge' || this.attackState === 'laser_active');
        this.pupilFocus += ((isLaser ? 1 : 0) - this.pupilFocus) * 10 * deltaTime;

        if (this.attackState === 'rage_transition') {
            this.rageLightingAlpha += deltaTime / this.rageLightingFadeInDuration;
            if (this.rageLightingAlpha >= 1) this.rageLightingAlpha = 1;
            
            screenShakeTimer = 0.2; 
            
            this.arms[0].targetShoulderAngle = -Math.PI * 0.65;
            this.arms[0].targetElbowAngle = Math.PI * 0.1;
            this.arms[1].targetShoulderAngle = -Math.PI * 0.35;
            this.arms[1].targetElbowAngle = -Math.PI * 0.1;

            this.attackSubTimer -= deltaTime;
            if (this.attackSubTimer <= 0) {
                this.attackState = 'idle';
                this.attackTimer = 1.0; 
                this.arms.forEach(arm => {
                    arm.targetShoulderAngle = (arm.side === 'left') ? -Math.PI * 0.6 : -Math.PI * 0.4;
                    arm.targetElbowAngle = (arm.side === 'left') ? Math.PI * 0.4 : -Math.PI * 0.4;
                });
            }
        } 
        else {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0 && this.attackState === 'idle') {
                
                if (this.slashCount >= FINAL_BOSS_SHAKE_CYCLE) {
                    this.attackState = 'grabbing';
                    this.attackSubTimer = 0.5;
                    this.arms[0].targetShoulderAngle = -Math.PI * 0.8;
                    this.arms[0].targetElbowAngle = Math.PI * 0.7;
                    this.arms[1].targetShoulderAngle = -Math.PI * 0.2;
                    this.arms[1].targetElbowAngle = -Math.PI * 0.7;
                } else {
                    const currentPool = this.isInRageMode ? this.rageAttackPool : this.attackPool;
                    let nextAttack = currentPool[Math.floor(Math.random() * currentPool.length)];

                    // SHUFFLE BAG: Verifica se tentou repetir o mesmo ataque 3x seguidas.
                    if (nextAttack === this.lastAttack) {
                        this.consecutiveSameAttack++;
                        if (this.consecutiveSameAttack >= 2) { 
                            // Força a escolher outro que seja diferente
                            let fallbackPool = currentPool.filter(atk => atk !== this.lastAttack);
                            if (fallbackPool.length === 0) fallbackPool = currentPool; 
                            nextAttack = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
                            this.consecutiveSameAttack = 0;
                        }
                    } else {
                        this.consecutiveSameAttack = 0;
                    }
                    this.lastAttack = nextAttack;

                    switch(nextAttack) {
                        case 'slash_simple':
                            this.attackState = 'slash_telegraph';
                            this.attackSubTimer = FINAL_BOSS_SLASH_TELEGRAPH_TIME;
                            const sideToAttack = this.lastSlashSide === 'left' ? 'right' : 'left';
                            this.activeArm = this.arms.find(arm => arm.side === sideToAttack);
                            this.lastSlashSide = sideToAttack;
                            if (sideToAttack === 'left') {
                                this.activeArm.targetShoulderAngle = -Math.PI * 0.9;
                                this.activeArm.targetElbowAngle = Math.PI * 0.1;
                            } else {
                                this.activeArm.targetShoulderAngle = -Math.PI * 0.1;
                                this.activeArm.targetElbowAngle = -Math.PI * 0.1;
                            }
                            break;
                        case 'slash_double':
                            this.attackState = 'double_slash_telegraph';
                            this.attackSubTimer = FINAL_BOSS_SLASH_TELEGRAPH_TIME;
                            this.arms[0].targetShoulderAngle = -Math.PI * 0.9;
                            this.arms[0].targetElbowAngle = Math.PI * 0.1;
                            this.arms[1].targetShoulderAngle = -Math.PI * 0.1;
                            this.arms[1].targetElbowAngle = -Math.PI * 0.1;
                            break;
                        case 'combo_slash':
                            this.attackState = 'combo_slash_telegraph';
                            this.comboHitCount = 0; 
                            this.attackSubTimer = FINAL_BOSS_SLASH_TELEGRAPH_TIME * 0.4;
                            this.activeArm = this.arms.find(arm => arm.side === 'left');
                            this.activeArm.targetShoulderAngle = -Math.PI * 0.9;
                            this.activeArm.targetElbowAngle = Math.PI * 0.1;
                            break;
                        case 'laser_beam':
                            this.attackState = 'laser_charge';
                            this.attackSubTimer = FINAL_BOSS_LASER_CHARGE_TIME;
                            const playerCenter = {
                                x: player.x + player.width / 2,
                                y: (player.y - verticalScrollOffset) + player.height / 2
                            };
                            const eyePos = this.getBodyHitboxes(verticalScrollOffset)[0]; 
                            this.laserAngle = Math.atan2(playerCenter.y - eyePos.y, playerCenter.x - eyePos.x);
                            break;
                    }
                }
            }
            
            if (this.attackState === 'grabbing') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'shaking';
                    this.attackSubTimer = FINAL_BOSS_SHAKE_DURATION;
                    events.shake = true; 
                }
            } else if (this.attackState === 'shaking') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'releasing';
                    this.attackSubTimer = 0.5; 
                    this.arms.forEach(arm => {
                        arm.targetShoulderAngle = (arm.side === 'left') ? -Math.PI * 0.6 : -Math.PI * 0.4;
                        arm.targetElbowAngle = (arm.side === 'left') ? Math.PI * 0.4 : -Math.PI * 0.4;
                    });
                }
            } else if (this.attackState === 'releasing') {
                 this.attackSubTimer -= deltaTime;
                 if (this.attackSubTimer <= 0) {
                    this.attackState = 'idle';
                    this.attackTimer = FINAL_BOSS_SHAKE_ATTACK_COOLDOWN; 
                    this.slashCount = 0;
                 }
            }
            else if (this.attackState === 'slash_telegraph') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'slashing';
                    this.attackSubTimer = FINAL_BOSS_SLASH_EXTEND_TIME;
                    if (this.activeArm.side === 'left') {
                        this.activeArm.targetShoulderAngle = -Math.PI * 0.1;
                    } else {
                        this.activeArm.targetShoulderAngle = -Math.PI * 0.9;
                    }
                }
            } else if (this.attackState === 'slashing') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'slash_retract';
                    this.attackSubTimer = FINAL_BOSS_SLASH_RETRACT_TIME;
                    this.activeArm = null; 
                    this.arms.forEach(arm => {
                        arm.targetShoulderAngle = (arm.side === 'left') ? -Math.PI * 0.6 : -Math.PI * 0.4;
                        arm.targetElbowAngle = (arm.side === 'left') ? Math.PI * 0.4 : -Math.PI * 0.4;
                    });
                }
            } else if (this.attackState === 'slash_retract') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'idle';
                    this.slashCount++;
                    this.attackTimer = FINAL_BOSS_SLASH_COOLDOWN / (this.isInRageMode ? FINAL_BOSS_RAGE_SPEED : 1);
                }
            }
            else if (this.attackState === 'double_slash_telegraph') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'double_slashing';
                    this.attackSubTimer = FINAL_BOSS_SLASH_EXTEND_TIME;
                    this.arms[0].targetShoulderAngle = -Math.PI * 0.1;
                    this.arms[1].targetShoulderAngle = -Math.PI * 0.9;
                }
            } else if (this.attackState === 'double_slashing') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'double_slash_retract';
                    this.attackSubTimer = FINAL_BOSS_SLASH_RETRACT_TIME;
                    this.arms.forEach(arm => {
                        arm.targetShoulderAngle = (arm.side === 'left') ? -Math.PI * 0.6 : -Math.PI * 0.4;
                        arm.targetElbowAngle = (arm.side === 'left') ? Math.PI * 0.4 : -Math.PI * 0.4;
                    });
                }
            } else if (this.attackState === 'double_slash_retract') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'idle';
                    this.slashCount++; 
                    this.attackTimer = FINAL_BOSS_SLASH_COOLDOWN / (this.isInRageMode ? FINAL_BOSS_RAGE_SPEED : 1);
                }
            }
            else if (this.attackState === 'combo_slash_telegraph') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'combo_slashing';
                    this.attackSubTimer = FINAL_BOSS_SLASH_EXTEND_TIME * 0.4;
                    if (this.comboHitCount === 2) { 
                        this.arms[0].targetShoulderAngle = Math.PI * 0.2;
                        this.arms[0].targetElbowAngle = Math.PI * 0.1;
                        this.arms[1].targetShoulderAngle = -Math.PI * 1.2;
                        this.arms[1].targetElbowAngle = -Math.PI * 0.1;
                    } else {
                        if (this.activeArm.side === 'left') {
                            this.activeArm.targetShoulderAngle = Math.PI * 0.2;
                            this.activeArm.targetElbowAngle = Math.PI * 0.1;
                        } else {
                            this.activeArm.targetShoulderAngle = -Math.PI * 1.2;
                            this.activeArm.targetElbowAngle = -Math.PI * 0.1;
                        }
                    }
                }
            } else if (this.attackState === 'combo_slashing') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'combo_slash_retract';
                    this.attackSubTimer = FINAL_BOSS_SLASH_RETRACT_TIME * 0.5;
                    this.activeArm = null; 
                    this.arms.forEach(arm => {
                        arm.targetShoulderAngle = (arm.side === 'left') ? -Math.PI * 0.6 : -Math.PI * 0.4;
                        arm.targetElbowAngle = (arm.side === 'left') ? Math.PI * 0.4 : -Math.PI * 0.4;
                    });
                }
            } else if (this.attackState === 'combo_slash_retract') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.comboHitCount++;
                    if (this.comboHitCount >= 3) {
                        this.attackState = 'idle';
                        this.slashCount++; 
                        this.attackTimer = FINAL_BOSS_POST_COMBO_COOLDOWN / (this.isInRageMode ? FINAL_BOSS_RAGE_SPEED : 1);
                    } else {
                        this.attackState = 'combo_slash_telegraph';
                        this.attackSubTimer = FINAL_BOSS_COMBO_COOLDOWN; 
                        if (this.comboHitCount === 1) { 
                            this.activeArm = this.arms.find(arm => arm.side === 'right');
                            this.activeArm.targetShoulderAngle = -Math.PI * 0.1;
                            this.activeArm.targetElbowAngle = -Math.PI * 0.1;
                        } else { 
                            this.activeArm = null;
                            this.arms[0].targetShoulderAngle = -Math.PI * 0.9;
                            this.arms[0].targetElbowAngle = Math.PI * 0.1;
                            this.arms[1].targetShoulderAngle = -Math.PI * 0.1;
                            this.arms[1].targetElbowAngle = -Math.PI * 0.1;
                        }
                    }
                }
            }
            else if (this.attackState === 'laser_charge') {
                this.attackSubTimer -= deltaTime;
                if (this.attackSubTimer <= 0) {
                    this.attackState = 'laser_active';
                    this.attackSubTimer = FINAL_BOSS_LASER_ACTIVE_TIME;
                }
            } else if (this.attackState === 'laser_active') {
                this.attackSubTimer -= deltaTime;
                const playerCenter = { x: player.x + player.width / 2, y: (player.y - verticalScrollOffset) + player.height / 2 };
                const eyePos = this.getBodyHitboxes(verticalScrollOffset)[0];
                const targetAngle = Math.atan2(playerCenter.y - eyePos.y, playerCenter.x - eyePos.x);

                let angleDiff = targetAngle - this.laserAngle;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                
                const currentLaserSpeed = FINAL_BOSS_LASER_ROTATION_SPEED * (this.isInRageMode ? FINAL_BOSS_RAGE_SPEED : 1.0);
                this.laserAngle += angleDiff * currentLaserSpeed * deltaTime;
                
                for(let i = 0; i < 2; i++) {
                    const angle = this.laserAngle + (Math.random() - 0.5) * 0.5;
                    const pColor = this.isInRageMode ? (Math.random() < 0.5 ? '#d35400' : '#e74c3c') : (Math.random() < 0.5 ? '#f1c40f' : 'rgba(255, 255, 255, 0.7)');
                    
                    particlesToCreate.push({
                        x: eyePos.x, y: eyePos.y,
                        size: Math.random() * 2 + 1,
                        color: pColor,
                        lifespan: 0.2 + Math.random() * 0.2,
                        initialLifespan: 0.4,
                        vx: -Math.cos(angle) * (Math.random() * 100 + 50),
                        vy: -Math.sin(angle) * (Math.random() * 100 + 50),
                        isScreenSpace: true
                    });
                }

                if (this.attackSubTimer <= 0) {
                    this.attackState = 'idle';
                    this.slashCount++;
                    this.attackTimer = FINAL_BOSS_SLASH_COOLDOWN / (this.isInRageMode ? FINAL_BOSS_RAGE_SPEED : 1);
                }
            }
        }

        this.arms.forEach(arm => {
            arm.animationAngle += arm.animationSpeed * this.currentArmSpeedMultiplier * deltaTime;
            const lerpFactor = 5 * deltaTime;
            arm.currentShoulderAngle += (arm.targetShoulderAngle - arm.currentShoulderAngle) * lerpFactor;
            arm.currentElbowAngle += (arm.targetElbowAngle - arm.currentElbowAngle) * lerpFactor;
            
            const isAttacking = this.attackState.includes('grabbing') || 
                                this.attackState.includes('shaking') || 
                                this.attackState.includes('slash') ||
                                this.attackState.includes('laser');

            if (isAttacking) {
                arm.breathingAmplitude = Math.max(0, arm.breathingAmplitude - deltaTime * 4);
            } else {
                arm.breathingAmplitude = Math.min(1, arm.breathingAmplitude + deltaTime * 4);
            }
        });

        if (this.glowState === 'idle') {
            this.glowTimer -= deltaTime;
            if (this.glowTimer <= 0) {
                this.glowState = 'charging';
                this.glowProgress = 0;
                this.glowTimer = 3.0 + Math.random() * 4.0; 
            }
        } else if (this.glowState === 'charging') {
            this.glowProgress += deltaTime / this.glowChargeDuration;
            if (this.glowProgress >= 1) {
                this.glowProgress = 1;
                this.glowState = 'fading';
            }
        } else if (this.glowState === 'fading') {
            this.glowProgress -= deltaTime / this.glowFadeDuration;
            if (this.glowProgress <= 0) {
                this.glowProgress = 0;
                this.glowState = 'idle';
            }
        }

        const anchorPos = verticalScrollOffset + canvas.height - FINAL_BOSS_VERTICAL_OFFSET;
        const naturalRisePos = this.y - FINAL_BOSS_RISE_SPEED * deltaTime;
        this.y = Math.min(naturalRisePos, anchorPos);
        
        events.particles = particlesToCreate;
        return events;
    }

    takeDamage(amount) {
        if (this.isInvincible) return;

        this.health -= amount;
        this.isInvincible = true;
        this.invincibilityTimer = 0.5; 
        playSound(sounds.damage);

        if (this.health <= this.maxHealth * FINAL_BOSS_PHASE2_THRESHOLD && !this.isInRageMode) {
            this.enterRageMode();
        }
    }

    enterRageMode() {
        this.isInRageMode = true;
        this.rageBobSpeedMultiplier = 1.5;
        this.rageFlameSpeedMultiplier = 1.6;
        this.targetArmSpeedMultiplier = 1.6 * FINAL_BOSS_RAGE_SPEED; 
        
        this.slashCount = 0;

        bossDebris = []; 
        if (player) {
            player.heldDebris = null;
        }

        this.activeArm = null; 
        this.attackState = 'rage_transition';
        this.attackSubTimer = 1.5; 
    }
    
    getArmHitboxes(verticalScrollOffset) {
        const screenY = this.y - verticalScrollOffset;
        const bobOffset = Math.sin(this.bobAngle) * 10;
        const bossY = screenY + bobOffset;
        const shoulderY = bossY;
        const towerWidth = canvas.width * 0.6;
        const towerX = (canvas.width - towerWidth) / 2;
        
        const leftShoulderX = towerX;
        const rightShoulderX = towerX + towerWidth;

        const hitboxes = [];

        this.arms.forEach(arm => {
            const shoulderPos = { x: (arm.side === 'left') ? leftShoulderX : rightShoulderX, y: shoulderY };
            const upperArmLength = 180;
            const forearmLength = 150;
            const armWidth = 40;
            
            const shoulderAngle = arm.currentShoulderAngle + Math.sin(arm.animationAngle) * (((arm.side === 'left') ? 0.2 : -0.2) * arm.breathingAmplitude);
            const elbowAngle = arm.currentElbowAngle + Math.cos(arm.animationAngle) * (0.2 * arm.breathingAmplitude);

            const elbowPos = {
                x: shoulderPos.x + Math.cos(shoulderAngle) * upperArmLength,
                y: shoulderPos.y + Math.sin(shoulderAngle) * upperArmLength
            };

            const hookPos = {
                x: elbowPos.x + Math.cos(shoulderAngle + elbowAngle) * forearmLength,
                y: elbowPos.y + Math.sin(shoulderAngle + elbowAngle) * forearmLength
            };

            const createRotatedRect = (start, end, width) => {
                const angle = Math.atan2(end.y - start.y, end.x - start.x);
                const perpAngle = angle + Math.PI / 2;
                const halfWidth = width / 2;
                const perpX = Math.cos(perpAngle) * halfWidth;
                const perpY = Math.sin(perpAngle) * halfWidth;

                return [
                    { x: start.x + perpX, y: start.y + perpY },
                    { x: end.x + perpX, y: end.y + perpY },
                    { x: end.x - perpX, y: end.y - perpY },
                    { x: start.x - perpX, y: start.y - perpY }
                ];
            };
            
            const upperArmPolygon = createRotatedRect(shoulderPos, elbowPos, armWidth);
            const forearmPolygon = createRotatedRect(elbowPos, hookPos, armWidth);

            const hookLines = [];
            const hookAngle = shoulderAngle + elbowAngle + Math.PI / 2;
            const cosHook = Math.cos(hookAngle);
            const sinHook = Math.sin(hookAngle);
            
            const p1x = hookPos.x + (20 * cosHook - 40 * sinHook);
            const p1y = hookPos.y + (20 * sinHook + 40 * cosHook);
            hookLines.push({ x1: hookPos.x, y1: hookPos.y, x2: p1x, y2: p1y });
            
            const p2x = hookPos.x + (-20 * cosHook - 40 * sinHook);
            const p2y = hookPos.y + (-20 * sinHook + 40 * cosHook);
            hookLines.push({ x1: hookPos.x, y1: hookPos.y, x2: p2x, y2: p2y });

            hitboxes.push({
                side: arm.side,
                hook: { lines: hookLines },
                upperArm: upperArmPolygon,
                forearm: forearmPolygon
            });
        });

        return hitboxes;
    }

    getLaserHitbox(verticalScrollOffset) {
        if (this.attackState !== 'laser_active') return null;

        const eyePos = this.getBodyHitboxes(verticalScrollOffset)[0];
        return {
            type: 'line',
            x1: eyePos.x,
            y1: eyePos.y,
            x2: eyePos.x + Math.cos(this.laserAngle) * (canvas.width * 1.5),
            y2: eyePos.y + Math.sin(this.laserAngle) * (canvas.width * 1.5)
        };
    }
    
    getBodyHitboxes(verticalScrollOffset) {
        const screenY = this.y - verticalScrollOffset;
        const bobOffset = Math.sin(this.bobAngle) * 10;
        const bossY = screenY + bobOffset;

        const headWidth = 180;
        const headHeight = 140;
        const headX = canvas.width / 2 - headWidth / 2;
        const headY = bossY - headHeight + 30;
        
        const torsoHeight = 140;
        const shoulderY = bossY;
        
        const towerWidth = canvas.width * 0.6;
        const towerX = (canvas.width - towerWidth) / 2;
        const leftShoulderX = towerX;
        const rightShoulderX = towerX + towerWidth;
        const waistY = shoulderY + torsoHeight;

        const eyeHitbox = { type: 'circle', x: headX + headWidth/2, y: headY + 60, radius: 35 };
        const torsoHitbox = { type: 'rect', x: leftShoulderX + 20, y: shoulderY, width: towerWidth - 40, height: torsoHeight - 10 };
        const leftShoulderHitbox = { type: 'circle', x: leftShoulderX, y: shoulderY, radius: 40 };
        const rightShoulderHitbox = { type: 'circle', x: rightShoulderX, y: shoulderY, radius: 40 };
        const waistHitbox = { type: 'circle', x: canvas.width / 2, y: waistY - 20, radius: 45 };

        const pivotX = headX + headWidth/2;
        const pivotY = headY + 60;
        
        const rotatePoint = (px, py) => {
            const dx = px - pivotX;
            const dy = py - pivotY;
            const cos = Math.cos(this.headTilt);
            const sin = Math.sin(this.headTilt);
            return {
                x: pivotX + (dx * cos - dy * sin),
                y: pivotY + (dx * sin + dy * cos)
            };
        };

        const cTop = rotatePoint(pivotX, headY + 30); 
        const cLeft = rotatePoint(headX + 45, headY + 90); 
        const cRight = rotatePoint(headX + headWidth - 45, headY + 90); 

        const headTopHitbox = { type: 'circle', x: cTop.x, y: cTop.y, radius: 35 };
        const headLeftHitbox = { type: 'circle', x: cLeft.x, y: cLeft.y, radius: 45 };
        const headRightHitbox = { type: 'circle', x: cRight.x, y: cRight.y, radius: 45 };

        return [
            eyeHitbox, 
            torsoHitbox, leftShoulderHitbox, rightShoulderHitbox, waistHitbox, 
            headTopHitbox, headLeftHitbox, headRightHitbox
        ];
    }
    
    draw(ctx, verticalScrollOffset) {
        let isFlashing = false;
        if (this.isInvincible && Math.floor(this.invincibilityTimer * 15) % 2 === 0) {
            isFlashing = true;
        }

        let bodyShakeX = 0;
        if (this.attackState === 'shaking' || this.attackState === 'rage_transition') {
            bodyShakeX = (Math.random() - 0.5) * (SCREEN_SHAKE_MAGNITUDE * 0.7);
        }

        const towerWidth = canvas.width * 0.6;
        const towerX = (canvas.width - towerWidth) / 2;

        const screenY = this.y - verticalScrollOffset;
        const bobOffset = Math.sin(this.bobAngle) * 10;
        const bossY = screenY + bobOffset;

        const headWidth = 180;
        const headHeight = 140;
        const headX = canvas.width / 2 - headWidth / 2 + bodyShakeX;
        const headY = bossY - headHeight + 30; 
        
        const leftShoulderX = towerX + bodyShakeX;
        const rightShoulderX = towerX + towerWidth + bodyShakeX;
        const shoulderY = bossY;
        
        const torsoHeight = 140;
        const torsoWaistWidth = 80;
        const waistLX = canvas.width / 2 - torsoWaistWidth / 2 + bodyShakeX;
        const waistRX = canvas.width / 2 + torsoWaistWidth / 2 + bodyShakeX;
        const waistY = shoulderY + torsoHeight;

        const lightGrayColor = '#d3d3d3'; 
        const strokeC = '#2c3e50';
        const jointC = '#34495e';

        const eyeRadius = 35; 
        const orbX = canvas.width / 2 + bodyShakeX;
        const orbY = shoulderY + 65;

        // Fogo da cintura
        const flameHeight = 40 + Math.sin(this.flameAngle) * 10;
        const flameSway = Math.cos(this.flameAngle * 0.5) * 15;
        const flameGrad = ctx.createLinearGradient(0, waistY, 0, waistY + flameHeight);
        flameGrad.addColorStop(0, 'rgba(243, 156, 18, 0.9)'); 
        flameGrad.addColorStop(0.5, 'rgba(230, 126, 34, 0.6)'); 
        flameGrad.addColorStop(1, 'rgba(230, 126, 34, 0)');
        ctx.fillStyle = flameGrad;

        ctx.beginPath();
        ctx.moveTo(waistLX, waistY - 20);
        ctx.quadraticCurveTo(canvas.width / 2 + flameSway + bodyShakeX, waistY + flameHeight, waistRX, waistY - 20);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = lightGrayColor; 
        ctx.strokeStyle = strokeC; 
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.moveTo(leftShoulderX, shoulderY); 
        ctx.quadraticCurveTo(canvas.width / 2 - 150 + bodyShakeX, shoulderY + 70, waistLX, waistY - 20);
        ctx.quadraticCurveTo(canvas.width / 2 + bodyShakeX, waistY + 20, waistRX, waistY - 20);
        ctx.quadraticCurveTo(canvas.width / 2 + 150 + bodyShakeX, shoulderY + 70, rightShoulderX, shoulderY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke(); 

        const c1Rgb = lerpColor('#f1c40f', '#f39c12', this.rageLightingAlpha);
        const c2Rgb = lerpColor('#e67e22', '#d35400', this.rageLightingAlpha);
        const outlineRgb = lerpColor('#c0392b', '#a93226', this.rageLightingAlpha);

        // --- ORB DO PEITO ---
        ctx.save();
        ctx.beginPath();
        ctx.arc(orbX, orbY, eyeRadius, 0, Math.PI * 2);
        ctx.clip();

        const orbBgGrad = ctx.createRadialGradient(orbX, orbY, 5, orbX, orbY, eyeRadius);
        orbBgGrad.addColorStop(0, rgbToString(c1Rgb));
        orbBgGrad.addColorStop(1, rgbToString(c2Rgb));
        ctx.fillStyle = orbBgGrad;
        ctx.fill();

        // --- OTIMIZAÇÃO: Mistura Líquida apenas se EFEITOS = ON ---
        if (vfxEnabled && this.rageLightingAlpha > 0) {
            const tOrb = this.flameAngle * 1.5;
            const ob1x = orbX + Math.cos(tOrb) * (eyeRadius * 0.3);
            const ob1y = orbY + Math.sin(tOrb * 0.8) * (eyeRadius * 0.3);
            const og1 = ctx.createRadialGradient(ob1x, ob1y, 0, ob1x, ob1y, eyeRadius);
            og1.addColorStop(0, `rgba(${c1Rgb.r}, ${c1Rgb.g}, ${c1Rgb.b}, ${this.rageLightingAlpha})`);
            og1.addColorStop(1, `rgba(${c2Rgb.r},${c2Rgb.g},${c2Rgb.b},0)`);
            ctx.fillStyle = og1;
            ctx.fillRect(orbX - eyeRadius, orbY - eyeRadius, eyeRadius*2, eyeRadius*2);

            const ob2x = orbX + Math.cos(tOrb * 1.3 + Math.PI) * (eyeRadius * 0.4);
            const ob2y = orbY + Math.sin(tOrb * 1.1 + Math.PI) * (eyeRadius * 0.4);
            const og2 = ctx.createRadialGradient(ob2x, ob2y, 0, ob2x, ob2y, eyeRadius * 0.8);
            const oHl = `rgba(${Math.min(255, c1Rgb.r+50)},${Math.min(255, c1Rgb.g+50)},${Math.min(255, c1Rgb.b+50)}, ${this.rageLightingAlpha * 0.8})`;
            og2.addColorStop(0, oHl);
            og2.addColorStop(1, `rgba(${c1Rgb.r},${c1Rgb.g},${c1Rgb.b},0)`);
            ctx.fillStyle = og2;
            ctx.fillRect(orbX - eyeRadius, orbY - eyeRadius, eyeRadius*2, eyeRadius*2);
        }

        ctx.restore(); 

        ctx.strokeStyle = rgbToString(outlineRgb); 
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(orbX, orbY, eyeRadius, 0, Math.PI * 2);
        ctx.stroke(); 
        
        // --- SISTEMA DE DANO (TORSO E ORBE DO PEITO) ---
        if (isFlashing) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
            
            // Cobre o Torso
            ctx.beginPath();
            ctx.moveTo(leftShoulderX, shoulderY); 
            ctx.quadraticCurveTo(canvas.width / 2 - 150 + bodyShakeX, shoulderY + 70, waistLX, waistY - 20);
            ctx.quadraticCurveTo(canvas.width / 2 + bodyShakeX, waistY + 20, waistRX, waistY - 20);
            ctx.quadraticCurveTo(canvas.width / 2 + 150 + bodyShakeX, shoulderY + 70, rightShoulderX, shoulderY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cobre o Orbe do Peito especificamente
            ctx.beginPath();
            ctx.arc(orbX, orbY, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        if (this.attackState === 'laser_charge' || this.attackState === 'laser_active') {
            const eyePos = this.getBodyHitboxes(verticalScrollOffset)[0];
            const laserEndX = eyePos.x + Math.cos(this.laserAngle) * (canvas.width * 1.5);
            const laserEndY = eyePos.y + Math.sin(this.laserAngle) * (canvas.width * 1.5);
            
            if (this.attackState === 'laser_charge') {
                ctx.strokeStyle = this.isInRageMode ? 'rgba(211, 84, 0, 0.7)' : 'rgba(255, 100, 100, 0.5)';
                ctx.lineWidth = FINAL_BOSS_LASER_WIDTH_TELEGRAPH;
                ctx.beginPath();
                ctx.moveTo(eyePos.x, eyePos.y);
                ctx.lineTo(laserEndX, laserEndY);
                ctx.stroke();
            } else { 
                ctx.strokeStyle = this.isInRageMode ? 'rgba(211, 84, 0, 0.7)' : 'rgba(230, 126, 34, 0.5)';
                ctx.lineWidth = FINAL_BOSS_LASER_WIDTH_ACTIVE;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(eyePos.x, eyePos.y);
                ctx.lineTo(laserEndX, laserEndY);
                ctx.stroke();
                
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.lineWidth = FINAL_BOSS_LASER_WIDTH_ACTIVE * 0.5;
                ctx.beginPath();
                ctx.moveTo(eyePos.x, eyePos.y);
                ctx.lineTo(laserEndX, laserEndY);
                ctx.stroke();
                
                ctx.lineCap = 'butt';
            }
        }
        
        this.arms.forEach(arm => {
            const armShoulderX = (arm.side === 'left') ? leftShoulderX : rightShoulderX;
            
            const upperArmLength = 180;
            const armWidth = 40;
            const forearmLength = 150;
            
            const shoulderAngle = arm.currentShoulderAngle + Math.sin(arm.animationAngle) * (((arm.side === 'left') ? 0.2 : -0.2) * arm.breathingAmplitude);
            const elbowAngle = arm.currentElbowAngle + Math.cos(arm.animationAngle) * (0.2 * arm.breathingAmplitude);
            
            const elbowPos = {
                x: armShoulderX + Math.cos(shoulderAngle) * upperArmLength,
                y: shoulderY + Math.sin(shoulderAngle) * upperArmLength
            };

            const hookPos = {
                x: elbowPos.x + Math.cos(shoulderAngle + elbowAngle) * forearmLength,
                y: elbowPos.y + Math.sin(shoulderAngle + elbowAngle) * forearmLength
            };

            ctx.fillStyle = lightGrayColor;
            ctx.strokeStyle = strokeC; 
            ctx.lineWidth = 4;

            ctx.save();
            ctx.translate(armShoulderX, shoulderY);
            ctx.rotate(shoulderAngle);
            ctx.beginPath();
            ctx.roundRect(0, -armWidth / 2, upperArmLength, armWidth, [armWidth/2]);
            ctx.fill();
            ctx.stroke();
            if (isFlashing) { ctx.fillStyle = 'rgba(255,0,0,0.4)'; ctx.strokeStyle = 'rgba(255,0,0,0.4)'; ctx.fill(); ctx.stroke(); }
            ctx.restore();

            ctx.save();
            ctx.translate(elbowPos.x, elbowPos.y);
            ctx.rotate(shoulderAngle + elbowAngle);
            ctx.beginPath();
            ctx.roundRect(0, -armWidth / 2, forearmLength, armWidth, [armWidth/2]);
            ctx.fill();
            ctx.stroke();
            if (isFlashing) { ctx.fillStyle = 'rgba(255,0,0,0.4)'; ctx.strokeStyle = 'rgba(255,0,0,0.4)'; ctx.fill(); ctx.stroke(); }
            ctx.restore();
            
            ctx.fillStyle = jointC; 
            ctx.strokeStyle = strokeC; // RESET STROKE
            ctx.beginPath();
            ctx.arc(armShoulderX, shoulderY, armWidth, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            if (isFlashing) { ctx.fillStyle = 'rgba(255,0,0,0.4)'; ctx.strokeStyle = 'rgba(255,0,0,0.4)'; ctx.fill(); ctx.stroke(); }

            ctx.fillStyle = jointC; // RESET FILL
            ctx.strokeStyle = strokeC; // RESET STROKE
            ctx.beginPath();
            ctx.arc(elbowPos.x, elbowPos.y, armWidth * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            if (isFlashing) { ctx.fillStyle = 'rgba(255,0,0,0.4)'; ctx.strokeStyle = 'rgba(255,0,0,0.4)'; ctx.fill(); ctx.stroke(); }
            
            ctx.save();
            ctx.translate(hookPos.x, hookPos.y);
            ctx.rotate(shoulderAngle + elbowAngle + Math.PI / 2); 
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#c0392b'; 
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(30, 20, 20, 40);
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-30, 20, -20, 40);
            ctx.stroke();
            if (isFlashing) { ctx.strokeStyle = 'rgba(255,0,0,0.4)'; ctx.stroke(); }
            ctx.restore();
        });

        // --- RENDERIZAÇÃO DA CABEÇA ---
        ctx.save();
        const pivotX = headX + headWidth/2;
        const pivotY = headY + 60; 
        
        ctx.translate(pivotX, pivotY);
        ctx.rotate(this.headTilt);
        ctx.translate(-pivotX, -pivotY);

        ctx.fillStyle = lightGrayColor;
        ctx.strokeStyle = strokeC; 
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(headX, headY + headHeight);
        ctx.quadraticCurveTo(headX, headY, headX + headWidth / 2, headY);
        ctx.quadraticCurveTo(headX + headWidth, headY, headX + headWidth, headY + headHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const headEyeX = headX + headWidth/2;
        const headEyeY = headY + 60;

        ctx.save();
        ctx.beginPath();
        ctx.arc(headEyeX, headEyeY, eyeRadius, 0, Math.PI * 2);
        ctx.clip();

        const headBgGrad = ctx.createRadialGradient(headEyeX, headEyeY, 5, headEyeX, headEyeY, eyeRadius);
        headBgGrad.addColorStop(0, rgbToString(c1Rgb));
        headBgGrad.addColorStop(1, rgbToString(c2Rgb));
        
        ctx.fillStyle = headBgGrad;
        ctx.fill();

        // --- OTIMIZAÇÃO: Mistura Líquida com Interpolação de Foco apenas se EFEITOS = ON ---
        if (vfxEnabled && this.rageLightingAlpha > 0) {
            const tEye = this.bobAngle * 2;
            
            const idleB1X = Math.cos(tEye) * (eyeRadius * 0.3);
            const idleB1Y = Math.sin(tEye * 0.8) * (eyeRadius * 0.3);
            const idleB2X = Math.cos(tEye * 1.3 + Math.PI) * (eyeRadius * 0.4);
            const idleB2Y = Math.sin(tEye * 1.1 + Math.PI) * (eyeRadius * 0.4);

            const aimAngle = this.laserAngle - this.headTilt;
            const aimB1X = Math.cos(aimAngle) * (eyeRadius * 0.4);
            const aimB1Y = Math.sin(aimAngle) * (eyeRadius * 0.4);
            const aimB2X = Math.cos(aimAngle) * (eyeRadius * 0.6);
            const aimB2Y = Math.sin(aimAngle) * (eyeRadius * 0.6);

            const finalB1X = idleB1X + (aimB1X - idleB1X) * this.pupilFocus;
            const finalB1Y = idleB1Y + (aimB1Y - idleB1Y) * this.pupilFocus;
            const finalB2X = idleB2X + (aimB2X - idleB2X) * this.pupilFocus;
            const finalB2Y = idleB2Y + (aimB2Y - idleB2Y) * this.pupilFocus;

            const he1x = headEyeX + finalB1X;
            const he1y = headEyeY + finalB1Y;
            const hg1 = ctx.createRadialGradient(he1x, he1y, 0, he1x, he1y, eyeRadius);
            hg1.addColorStop(0, `rgba(${c1Rgb.r}, ${c1Rgb.g}, ${c1Rgb.b}, ${this.rageLightingAlpha})`);
            hg1.addColorStop(1, `rgba(${c2Rgb.r},${c2Rgb.g},${c2Rgb.b},0)`);
            ctx.fillStyle = hg1;
            ctx.fillRect(headEyeX - eyeRadius, headEyeY - eyeRadius, eyeRadius*2, eyeRadius*2);

            const he2x = headEyeX + finalB2X;
            const he2y = headEyeY + finalB2Y;
            const hg2 = ctx.createRadialGradient(he2x, he2y, 0, he2x, he2y, eyeRadius * 0.8);
            const hHl = `rgba(${Math.min(255, c1Rgb.r+50)},${Math.min(255, c1Rgb.g+50)},${Math.min(255, c1Rgb.b+50)}, ${this.rageLightingAlpha * 0.8})`;
            hg2.addColorStop(0, hHl);
            hg2.addColorStop(1, `rgba(${c1Rgb.r},${c1Rgb.g},${c1Rgb.b},0)`);
            ctx.fillStyle = hg2;
            ctx.fillRect(headEyeX - eyeRadius, headEyeY - eyeRadius, eyeRadius*2, eyeRadius*2);
        }

        ctx.restore(); 

        ctx.strokeStyle = rgbToString(outlineRgb);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(headEyeX, headEyeY, eyeRadius, 0, Math.PI * 2);
        ctx.stroke();

        // --- SISTEMA DE DANO (CABEÇA E OLHO) ---
        if (isFlashing) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
            
            // Cobre a base da cabeça
            ctx.beginPath();
            ctx.moveTo(headX, headY + headHeight);
            ctx.quadraticCurveTo(headX, headY, headX + headWidth / 2, headY);
            ctx.quadraticCurveTo(headX + headWidth, headY, headX + headWidth, headY + headHeight);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cobre o olho especificamente
            ctx.beginPath();
            ctx.arc(headEyeX, headEyeY, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // --- OTIMIZAÇÃO: Glows apenas se EFEITOS = ON ---
        if (vfxEnabled && this.glowState !== 'idle') {
            const glowAlpha = (this.glowState === 'charging') ? this.glowProgress * 0.7 : this.glowProgress * 0.7;
            const radiusMultiplier = 1 + (this.glowState === 'charging' ? this.glowProgress * 0.5 : (1-this.glowProgress) * 0.5);

            const glowColor = `rgba(${c1Rgb.r}, ${c1Rgb.g}, ${c1Rgb.b}, ${glowAlpha})`;

            const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeRadius * radiusMultiplier);
            glowGrad.addColorStop(0, glowColor); 
            glowGrad.addColorStop(1, `rgba(241, 196, 15, 0)`);
            
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(headEyeX, headEyeY, eyeRadius * radiusMultiplier, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore(); 

        if (vfxEnabled && this.glowState !== 'idle') {
            const glowAlpha = (this.glowState === 'charging') ? this.glowProgress * 0.7 : this.glowProgress * 0.7;
            const radiusMultiplier = 1 + (this.glowState === 'charging' ? this.glowProgress * 0.5 : (1-this.glowProgress) * 0.5);
            
            const glowColor = `rgba(${c1Rgb.r}, ${c1Rgb.g}, ${c1Rgb.b}, ${glowAlpha})`;

            const chestGlowGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, eyeRadius * radiusMultiplier);
            chestGlowGrad.addColorStop(0, glowColor); 
            chestGlowGrad.addColorStop(1, `rgba(241, 196, 15, 0)`);
            
            ctx.fillStyle = chestGlowGrad;
            ctx.beginPath();
            ctx.arc(orbX, orbY, eyeRadius * radiusMultiplier, 0, Math.PI * 2);
            ctx.fill();
        }

        if (debugMode) {
            ctx.strokeStyle = 'pink';
            ctx.lineWidth = 2;
            
            this.getBodyHitboxes(verticalScrollOffset).forEach(hitbox => {
                if (hitbox.type === 'rect') {
                    ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
                } else if (hitbox.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(hitbox.x, hitbox.y, hitbox.radius, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (hitbox.type === 'line') {
                    ctx.beginPath();
                    ctx.moveTo(hitbox.x1, hitbox.y1);
                    ctx.lineTo(hitbox.x2, hitbox.y2);
                    ctx.stroke();
                } 
            });

            this.getArmHitboxes(verticalScrollOffset).forEach(arm => {
                const drawPolygon = (polygon) => {
                    ctx.beginPath();
                    ctx.moveTo(polygon[0].x, polygon[0].y);
                    for (let i = 1; i < polygon.length; i++) {
                        ctx.lineTo(polygon[i].x, polygon[i].y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                };
                drawPolygon(arm.upperArm);
                drawPolygon(arm.forearm);
                
                arm.hook.lines.forEach(line => {
                    ctx.beginPath();
                    ctx.moveTo(line.x1, line.y1);
                    ctx.lineTo(line.x2, line.y2);
                    ctx.stroke();
                });
            });

            const laserHitbox = this.getLaserHitbox(verticalScrollOffset);
            if (laserHitbox) {
                ctx.beginPath();
                ctx.moveTo(laserHitbox.x1, laserHitbox.y1);
                ctx.lineTo(laserHitbox.x2, laserHitbox.y2);
                ctx.stroke();
            }
        }
    }
}

class BossDebris {
    constructor(x, y, delay = 0, isPhasing = false) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.width = this.radius * 2;
        this.height = this.radius * 2;
        this.velocityY = 0;
        this.velocityX = 0; 
        this.state = 'falling';
        this.spawnDelay = delay;
        this.isPhasing = isPhasing; 

        this.throw_startX = 0;
        this.throw_startY = 0;
        this.throw_targetX = 0;
        this.throw_targetY = 0;
        this.throw_progress = 0;
        this.throw_duration = 0.4;

        this.details = [];
        const numDetails = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numDetails; i++) {
            this.details.push({
                angle: Math.random() * Math.PI * 2,
                radius: this.radius * (0.4 + Math.random() * 0.5),
                arcLength: Math.PI * (0.2 + Math.random() * 0.3)
            });
        }
    }

    throwAt(targetX, targetY) {
        this.state = 'thrown';
        this.throw_startX = this.x;
        this.throw_startY = this.y;
        this.throw_targetX = targetX;
        this.throw_targetY = targetY;
        this.throw_progress = 0;
    }

    update(deltaTime, platforms) {
        if (this.spawnDelay > 0) {
            this.spawnDelay -= deltaTime;
            return;
        }

        if (this.state === 'falling') {
            this.velocityY += BOSS_DEBRIS_GRAVITY * deltaTime;
            this.y += this.velocityY * deltaTime;

            if (!this.isPhasing) {
                for (const p of platforms) {
                    if (p.visualType === 'cloud') continue;
                    
                    const pRect = { x: p.x, y: p.y, width: p.width, height: 1 };
                    const dRect = { x: this.x, y: this.y, width: this.width, height: this.height };

                    if (isColliding(dRect, pRect) && (this.y + this.height) < (p.y + 20)) {
                        this.y = p.y - this.height;
                        this.velocityY = 0;
                        this.state = 'landed';
                        playSound(sounds.land);
                        break;
                    }
                }
            }

        } else if (this.state === 'thrown') {
            this.throw_progress += deltaTime / this.throw_duration;
            const t = Math.min(1, this.throw_progress);
            this.x = this.throw_startX + (this.throw_targetX - this.throw_startX) * t;
            this.y = this.throw_startY + (this.throw_targetY - this.throw_startY) * t;
        }
    }

    draw(ctx, vOffset) {
        if (this.spawnDelay > 0) {
            return;
        }

        const screenX = this.x;
        const screenY = this.y - vOffset;

        const centerX = screenX + this.radius;
        const centerY = screenY + this.radius;
        
        let color1, color2, strokeColor, detailStrokeColor;

        if (this.isPhasing) {
            ctx.globalAlpha = 0.6;
            color1 = '#727879'; 
            color2 = '#5d6465'; 
            strokeColor = '#4e5455';
            detailStrokeColor = 'rgba(78, 84, 85, 0.7)';
        } else {
            color1 = '#95a5a6';
            color2 = '#7f8c8d';
            strokeColor = '#6c7a7b';
            detailStrokeColor = 'rgba(92, 102, 103, 0.7)';
        }

        const rockGrad = ctx.createRadialGradient(
            centerX - this.radius * 0.4, 
            centerY - this.radius * 0.4, 
            this.radius * 0.1, 
            centerX, 
            centerY, 
            this.radius
        );
        rockGrad.addColorStop(0, color1); 
        rockGrad.addColorStop(1, color2);
        ctx.fillStyle = rockGrad;

        ctx.beginPath();
        ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = detailStrokeColor;
        ctx.lineWidth = 1.5;
        this.details.forEach(detail => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, detail.radius, detail.angle, detail.angle + detail.arcLength);
            ctx.stroke();
        });

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1.0;

        if (debugMode) {
            ctx.strokeStyle = 'pink';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}