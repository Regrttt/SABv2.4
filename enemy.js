// enemy.js

class Enemy {
    constructor(x, y, type, speed, isScreenSpaceEntity = false, platform = null) { 
        this.type = type; 
        this.isScreenSpaceEntity = isScreenSpaceEntity;

        if (this.type === 'charger') {
            this.isScreenSpaceEntity = true;
        }

        this.x = x; 
        this.y = y;
        this.originalSpeed = speed;
        this.speed = Math.abs(speed);
        this.isRebounded = false;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // --- DIREÇÃO MATEMÁTICA DE MOVIMENTO ---
        this.moveDirX = -1; 
        if (this.isScreenSpaceEntity && this.x < 400) {
            this.moveDirX = 1;
        }
        
        this.pulseTimer = 0;

        if (this.type === 'patrol') {
            this.width = 35;
            this.height = 35;
            this.platform = platform;
            this.direction = Math.random() < 0.5 ? 1 : -1;
            this.animationTimer = Math.random() * Math.PI * 2;
            this.animationSpeed = 8;
        } else if (this.type === 'falling_rock') {
            const size = 40;
            this.width = size;
            this.height = size;
            this.radius = size / 2;
            this.details = [];
            const numDetails = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numDetails; i++) {
                this.details.push({
                    angle: Math.random() * Math.PI * 2,
                    radius: this.radius * (0.4 + Math.random() * 0.5),
                    arcLength: Math.PI * (0.2 + Math.random() * 0.3)
                });
            }
        } else {
            this.width = 35;
            this.height = 35;
        }
        
        this.lastCenterX = this.x + this.width / 2;
        this.lastCenterY = this.y + this.height / 2;

        if (this.type === 'charger') {
            this.chargeTimer = 2.0; 
            this.hasCharged = false;
        }
    }

    rebound(scrollOffset) {
        if (this.type !== 'rebound' || this.isRebounded) return;
        
        if (!this.isScreenSpaceEntity) { 
            if (isNaN(scrollOffset)) { return; }
            this.x = (this.x - scrollOffset); 
        }
        
        this.isRebounded = true;
        this.isScreenSpaceEntity = true; 
        this.speed = 0; 
        this.originalSpeed = 0;
        playSound(sounds.coin);
        this.lastCenterX = this.x + this.width / 2;
        this.lastCenterY = this.y + this.height / 2;
    }

    update(deltaTime, player, scrollOffset, boss) {
        const particlesToCreate = []; 
        this.pulseTimer += deltaTime; 
        
        if (this.type === 'charger') {
            if (!this.hasCharged) {
                this.chargeTimer -= deltaTime;
                
                if (this.chargeTimer <= 0) {
                    this.hasCharged = true;
                    // Vetor de ataque com mira perfeita na tela
                    const playerScreenX = player.x - scrollOffset + player.width / 2;
                    const playerScreenY = player.y + player.height / 2;
                    const dx = playerScreenX - (this.x + this.width / 2); 
                    const dy = playerScreenY - (this.y + this.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0 && !isNaN(distance)) {
                        // Utiliza a constante global do Charger Dash
                        this.velocityX = (dx / distance) * ENEMY_CHARGER_DASH_SPEED;
                        this.velocityY = (dy / distance) * ENEMY_CHARGER_DASH_SPEED;
                    } else { 
                        this.velocityX = 0; 
                        this.velocityY = 0;
                    }
                }
            } else { 
                if (!isNaN(this.velocityX)) this.x += this.velocityX * deltaTime;
                if (!isNaN(this.velocityY)) this.y += this.velocityY * deltaTime;
            }
        } else if (this.type === 'patrol') {
            this.animationTimer += this.animationSpeed * deltaTime;

            if (this.platform) {
                this.x += this.speed * this.direction * deltaTime;
                
                if (this.x <= this.platform.x) {
                    this.x = this.platform.x;
                    this.direction = 1;
                } else if (this.x + this.width >= this.platform.x + this.platform.width) {
                    this.x = this.platform.x + this.platform.width - this.width;
                    this.direction = -1;
                }
            }
        } else if (this.type === 'falling_rock') {
            this.velocityY += FALLING_ROCK_GRAVITY * deltaTime;
            this.y += this.velocityY * deltaTime;
            this.x += this.velocityX * deltaTime;
        } else if (this.isRebounded) { 
            if (boss && boss.health > 0) {
                const bossCenterX = boss.x + boss.width / 2;
                const bossCenterY = boss.y + boss.height / 2;
                const dx = bossCenterX - (this.x + this.width / 2);
                const dy = bossCenterY - (this.y + this.height / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0 && !isNaN(distance)) {
                    this.velocityX = (dx / distance) * 850; 
                    this.velocityY = (dy / distance) * 850;
                } else { 
                    this.velocityX = 0; 
                    this.velocityY = 0; 
                }
            }
            
            // Aplica velocidade livremente (rebate pro nada se não houver boss)
            if (!isNaN(this.velocityX)) this.x += this.velocityX * deltaTime;
            if (!isNaN(this.velocityY)) this.y += this.velocityY * deltaTime;

        } else {
            // MOVIMENTO NORMAL FRONT/BACK
            if (!isNaN(this.speed)) {
                this.x += this.speed * this.moveDirX * deltaTime;
            }
        }

        // --- NOVA FÍSICA DO HOMING (EFEITO "MOLA" SUAVE) ---
        if (this.type === 'homing' && !this.isRebounded) {
            const playerTargetY = player.y + player.height / 2;
            const enemyCenterY = this.y + this.height / 2;
            
            if (!isNaN(playerTargetY) && !isNaN(enemyCenterY)) {
                // Diferença de altura
                const dy = playerTargetY - enemyCenterY;
                
                // Força de atração elástica (mola).
                const springStrength = 4.0; 
                this.velocityY += (dy * springStrength) * deltaTime;

                // Amortecimento (Fricção)
                const damping = 0.95; 
                this.velocityY *= damping;

                // Limite de velocidade vertical
                const maxVerticalSpeed = 300; 
                if (this.velocityY > maxVerticalSpeed) this.velocityY = maxVerticalSpeed;
                if (this.velocityY < -maxVerticalSpeed) this.velocityY = -maxVerticalSpeed;

                this.y += this.velocityY * deltaTime;
            }
        }

        // --- SISTEMA DE TRILHAS VISUAIS ---
        let trailColor;
        if (this.type === 'homing') { trailColor = '#E6A11F'; } // Amarelo Homing
        else if (this.type === 'rebound') { trailColor = '#5DADE2'; } // Azul Rebound
        else if (this.type === 'charger') { trailColor = '#2E8B57'; } // Verde Charger
        else if (this.type !== 'patrol' && this.type !== 'falling_rock') {
            // CORREÇÃO: Restaurada a cor Roxo Forte para o Straight
            trailColor = '#5f27cd'; 
        }

        if (trailColor) {
            const currentCenterX = this.x + this.width / 2; 
            const currentCenterY = this.y + this.height / 2;
            let effectiveSpeedForTrailCheck = this.speed;
            
            if (this.isRebounded || (this.type === 'charger' && this.hasCharged)) {
                effectiveSpeedForTrailCheck = Math.sqrt(this.velocityX**2 + this.velocityY**2);
            } else if (this.isScreenSpaceEntity) {
                effectiveSpeedForTrailCheck = Math.abs(this.speed);
            }
            
            const needsDenseTrail = effectiveSpeedForTrailCheck > 360; 
            const numTrailParticles = needsDenseTrail ? 3 : 1;
            const trailLifespan = needsDenseTrail ? 0.3 : 0.5;
            
            if (!isNaN(currentCenterX) && !isNaN(currentCenterY) && !isNaN(this.lastCenterX) && !isNaN(this.lastCenterY)) {
                const dxTrail = currentCenterX - this.lastCenterX;
                const dyTrail = currentCenterY - this.lastCenterY;
                for (let i = 1; i <= numTrailParticles; i++) {
                    const fraction = i / numTrailParticles;
                    particlesToCreate.push({
                        x: this.lastCenterX + dxTrail * fraction, 
                        y: this.lastCenterY + dyTrail * fraction, 
                        size: 5, 
                        color: trailColor, 
                        lifespan: trailLifespan, 
                        initialLifespan: trailLifespan, 
                        vx: 0, 
                        vy: 0, 
                        isScreenSpace: this.isScreenSpaceEntity,
                        priority: 'low',
                        layer: 'front'
                    });
                }
            }
            this.lastCenterX = currentCenterX; 
            this.lastCenterY = currentCenterY;
        }
        
        return particlesToCreate;
    }

    draw(ctx, scrollOffset, verticalScrollOffset = 0, isVertical = false) {
        // Respeita rigorosamente a Screen Space no Eixo Y na Fase 2!
        const enemyXOnScreen = this.isScreenSpaceEntity ? this.x : this.x - (isVertical ? 0 : scrollOffset);
        const enemyYOnScreen = this.isScreenSpaceEntity ? this.y : this.y - (isVertical ? verticalScrollOffset : 0);
        
        if (isNaN(enemyXOnScreen) || isNaN(enemyYOnScreen)) {
            return; 
        }

        const INDICATOR_DURATION = 0.7; 
        
        if (this.type === 'charger' && !this.hasCharged && this.chargeTimer <= INDICATOR_DURATION) {
            const centerX = enemyXOnScreen + this.width / 2;
            const centerY = enemyYOnScreen + this.height / 2;
            
            const progress = 1 - (this.chargeTimer / INDICATOR_DURATION);
            const radius = 25 * progress;
            const alpha = Math.max(0, 1 - progress);
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2); 
            ctx.fillStyle = 'rgba(46, 139, 87, 0.7)'; 
            ctx.fill();
            ctx.restore();
        }

        if (this.type === 'rebound') {
            const centerX = enemyXOnScreen + this.width / 2;
            const centerY = enemyYOnScreen + this.height / 2;
            const pulseProgress = (this.pulseTimer % 1.0); 
            const maxRadius = this.width * 1.2;
            
            ctx.save();
            ctx.globalAlpha = 1.0 - pulseProgress; 
            ctx.beginPath();
            ctx.arc(centerX, centerY, (this.width / 2) + (pulseProgress * (maxRadius - this.width/2)), 0, Math.PI * 2);
            ctx.strokeStyle = '#5DADE2';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        let color1, color2, strokeColor;
        if (this.type === 'homing') { 
            color1 = '#FFF352'; color2 = '#E6A11F'; strokeColor = color2;
        } else if (this.type === 'rebound') { 
            color1 = '#54a0ff'; color2 = '#2e86de'; strokeColor = color2;
        } else if (this.type === 'charger') { 
            color1 = '#50C878'; color2 = '#2E8B57'; strokeColor = color2;
        } else if (this.type === 'patrol') {
            color1 = '#ffdab9'; color2 = '#e6bf9e'; strokeColor = '#c2a185';
        } else if (this.type === 'falling_rock') {
            // Tratado abaixo
        } else { 
            color1 = '#706fd3'; color2 = '#5f27cd'; strokeColor = color2;
        }
        
        if (this.type !== 'falling_rock') {
            const grad = ctx.createLinearGradient(enemyXOnScreen, enemyYOnScreen, enemyXOnScreen + this.width, enemyYOnScreen + this.height);
            grad.addColorStop(0, color1);
            grad.addColorStop(1, color2);
            ctx.fillStyle = grad;
        }

        if (this.type === 'patrol') {
            const animValue = Math.sin(this.animationTimer);
            const verticalOffset = (1 - Math.abs(animValue)) * 3;
            const legOffset = animValue * 5;
            const armOffset = animValue * 3;

            ctx.fillRect(enemyXOnScreen, enemyYOnScreen + verticalOffset, this.width, this.height);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(enemyXOnScreen, enemyYOnScreen + verticalOffset, this.width, this.height);

            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(enemyXOnScreen + 10, enemyYOnScreen + this.height + verticalOffset);
            ctx.lineTo(enemyXOnScreen + 5 - legOffset, enemyYOnScreen + this.height + 10);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(enemyXOnScreen + this.width - 10, enemyYOnScreen + this.height + verticalOffset);
            ctx.lineTo(enemyXOnScreen + this.width - 5 + legOffset, enemyYOnScreen + this.height + 10);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(enemyXOnScreen, enemyYOnScreen + 10 + verticalOffset);
            ctx.lineTo(enemyXOnScreen - 10 + armOffset, enemyYOnScreen + 20);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(enemyXOnScreen + this.width, enemyYOnScreen + 10 + verticalOffset);
            ctx.lineTo(enemyXOnScreen + this.width + 10 - armOffset, enemyYOnScreen + 20);
            ctx.stroke();

        } else if (this.type === 'falling_rock') {
            const centerX = enemyXOnScreen + this.radius;
            const centerY = enemyYOnScreen + this.radius;
            
            const rockGrad = ctx.createRadialGradient(centerX - this.radius * 0.4, centerY - this.radius * 0.4, this.radius * 0.1, centerX, centerY, this.radius);
            rockGrad.addColorStop(0, '#95a5a6'); 
            rockGrad.addColorStop(1, '#7f8c8d');
            ctx.fillStyle = rockGrad;

            ctx.beginPath();
            ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(92, 102, 103, 0.7)';
            ctx.lineWidth = 1.5;
            this.details.forEach(detail => {
                ctx.beginPath();
                ctx.arc(centerX, centerY, detail.radius, detail.angle, detail.angle + detail.arcLength);
                ctx.stroke();
            });

            ctx.strokeStyle = '#6c7a7b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        
        } else {
            ctx.beginPath();
            ctx.moveTo(enemyXOnScreen + this.width / 2, enemyYOnScreen);
            ctx.lineTo(enemyXOnScreen + this.width, enemyYOnScreen + this.height / 2);
            ctx.lineTo(enemyXOnScreen + this.width / 2, enemyYOnScreen + this.height);
            ctx.lineTo(enemyXOnScreen, enemyYOnScreen + this.height / 2);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        if (debugMode) {
            ctx.strokeStyle = 'pink';
            ctx.lineWidth = 2;

            if (this.type === 'patrol' || this.type === 'falling_rock') {
                ctx.strokeRect(enemyXOnScreen, enemyYOnScreen, this.width, this.height);
            } else {
                ctx.beginPath();
                ctx.moveTo(enemyXOnScreen + this.width / 2, enemyYOnScreen);
                ctx.lineTo(enemyXOnScreen + this.width, enemyYOnScreen + this.height / 2);
                ctx.lineTo(enemyXOnScreen + this.width / 2, enemyYOnScreen + this.height);
                ctx.lineTo(enemyXOnScreen, enemyYOnScreen + this.height / 2);
                ctx.closePath();
                ctx.stroke();
            }
        }
    }
}