// item.js

// Classe para as Moedas
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.value = COIN_VALUE;
    }

    draw(ctx, scrollOffset, verticalScrollOffset = 0, isVertical = false) {
        const coinX = this.x - (isVertical ? 0 : scrollOffset);
        const coinY = this.y - (isVertical ? verticalScrollOffset : 0);

        const grad = ctx.createRadialGradient(coinX, coinY, this.radius * 0.2, coinX, coinY, this.radius);
        grad.addColorStop(0, '#feca57');
        grad.addColorStop(1, '#f39c12');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(coinX, coinY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#b8930b';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (debugMode) {
            ctx.strokeStyle = 'pink';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(coinX, coinY, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// Classe para os Kits Médicos (Agora com Visual de Coração)
class HealthPack {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
    }

    draw(ctx, scrollOffset, verticalScrollOffset = 0, isVertical = false) {
        const packX = this.x - (isVertical ? 0 : scrollOffset);
        const packY = this.y - (isVertical ? verticalScrollOffset : 0);
        
        // Configuração de tamanho para o coração
        const heartSize = this.radius * 2.5; 
        
        ctx.save();
        ctx.translate(packX - heartSize/2, packY - heartSize/2);

        // Gradiente idêntico ao da UI de Vida
        const heartGrad = ctx.createLinearGradient(0, 0, 0, heartSize);
        heartGrad.addColorStop(0, '#ff8b8b');
        heartGrad.addColorStop(1, '#d13423');
        ctx.fillStyle = heartGrad;
        
        // Desenho do Coração (Curvas de Bézier idênticas à UI)
        ctx.beginPath();
        ctx.moveTo(heartSize / 2, heartSize * 0.4);
        ctx.bezierCurveTo(0, 0, 0, heartSize * 0.7, heartSize / 2, heartSize);
        ctx.bezierCurveTo(heartSize, heartSize * 0.7, heartSize, 0, heartSize / 2, heartSize * 0.4);
        ctx.closePath();
        ctx.fill();

        // Borda dourada/marrom para destacar como item coletável
        ctx.strokeStyle = '#a4281b'; 
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();

        if (debugMode) {
            ctx.strokeStyle = 'pink';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(packX, packY, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}