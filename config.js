// config.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mainWrapper = document.getElementById('main-wrapper');

// --- CONSTANTES DE FÍSICA E PLAYER ---
const GRAVITY = 2500; 
const JUMP_FORCE = 1000;
const PLAYER_SPEED = 430;
const COYOTE_TIME_DURATION = 0.1; 
const PLAYER_SLOW_FALL_SPEED = 15;
const PLAYER_INITIAL_HEALTH = 3, PLAYER_MAX_JUMPS = 2;
const INVINCIBILITY_DURATION = 1.8;
const CAPTURE_REACH_DURATION = 0.25; 
const CAPTURE_PULL_DURATION = 0.4;

// --- VARIÁVEIS DINÂMICAS DE DIFICULDADE (Atualizadas pelo applyDifficulty) ---
let OBSTACLE_CHANCE = 0.65;
let ENEMY_SPAWN_CHANCE = 0.01; 
let HOMING_ENEMY_CHANCE = 0.40; 
let CHARGER_ENEMY_CHANCE = 0.25; 
let FALLING_PLATFORM_CHANCE = 0.30; 
let WALL_SPIKE_CHANCE = 0.4;
let WALL_WITH_TOP_SPIKES_CHANCE = 0.3;
let SPIKE_MIN_BLOCKS = 1;
let SPIKE_MAX_BLOCKS = 5;

let CHEST_LUCK_CHANCE = 0.6;   
let WINDOW_REWARD_CHANCE = 0.6; 
let BASE_HEALTH_PACK_CHANCE = 0.07; // Padrão: 7%

let SCORE_OBSTACLE_HARD = 501;
let SCORE_ENEMY_STRAIGHT = 1001;
let SCORE_ENEMY_HOMING = 1501;
let SCORE_ENEMY_CHARGER = 2001;

let BOSS_TRIGGER_SCORE = 3000;
let BOSS_ATTACK_COOLDOWN = 2.5; 
let BOSS_PHASE2_THRESHOLD = 0.5; // 50% HP (Boss 1)
let BOSS_PITY_TIMER = 6; // Tiros máximos antes do Rebound

// Variáveis da Fase 2 (Torre)
let CLOUD_PLATFORM_CHANCE = 0.15;
let PATROL_ENEMY_SPAWN_CHANCE = 0.3; 
let FALLING_ROCK_SPAWN_INTERVAL = 2.5; 

let SCORE_PATROL_ENEMY = 501;
let SCORE_WINDOW_TRAP = 1501;
let SCORE_FALLING_ROCK = 2501;

// Variáveis Dinâmicas do Boss Final (Fase 2)
let FINAL_BOSS_TRIGGER_SCORE = 4000;
let FINAL_BOSS_SHAKE_CYCLE = 5; // Ataques antes de chacoalhar a torre
let FINAL_BOSS_DEBRIS_MIN = 4;
let FINAL_BOSS_DEBRIS_MAX = 6;
let FINAL_BOSS_PHASE2_THRESHOLD = 0.5; // 50% HP (Boss 2)
let FINAL_BOSS_RAGE_SPEED = 1.0; // Multiplicador de velocidade no Modo Fúria
let FINAL_BOSS_SLASH_COOLDOWN = 1.5; // Tempo de respiro entre golpes

// --- GERAÇÃO DE CENÁRIO E OBSTÁCULOS FIXOS ---
const PLATFORM_MAX_JUMP_HEIGHT = 120, PLATFORM_MAX_DROP_HEIGHT = 200;
const PLATFORM_MIN_GAP = 80, PLATFORM_MAX_GAP = 250;
const PLATFORM_MIN_WIDTH = 100, PLATFORM_MAX_WIDTH = 200; 
const LONG_PLATFORM_CHANCE = 0.4, LONG_PLATFORM_MIN_WIDTH = 300, LONG_PLATFORM_MAX_WIDTH = 450;
const CLOUD_REPLACES_STONE_CHANCE = 0.5;

const WALL_CHANCE = 0.5, BUSH_SPAWN_CHANCE = 0.4; 
const TALL_WALL_CHANCE = 0.3, TALL_WALL_HEIGHT = 180, NORMAL_WALL_HEIGHT = 60;
const BOTTOM_SPIKE_CHANCE = 0.15; 
const BOTTOM_SPIKE_HEIGHT = 15;
const FALLING_PLATFORM_ACCELERATION = 500; 

// --- ITENS, ECONOMIA E RNG FIXOS ---
const COIN_SPAWN_CHANCE = 0.5, COIN_VALUE = 10;
const COIN_ANIM_SPAWN_INTERVAL = 0.06; 
const COIN_ANIM_LIFESPAN = 0.7; 
const COIN_ANIM_START_VELOCITY_Y = -600; 
const COIN_ANIM_GRAVITY = 1800; 

const HEALTH_PACK_CHANCE_MULTIPLIER = 1.5; 
const HEALTH_PACK_SPAWN_CHANCE_BOSS = 0.03; // CORREÇÃO: Restaurada a constante do Chefe!

const CHEST_SPAWN_CHANCE = 0.15;
const CHEST_REWARD_COIN_COUNT = 15;
const CHEST_PROMPT_DISTANCE = 100;
const CHEST_PROMPT_Y_OFFSET = 40;

const WINDOW_TRAP_CHANCE = 0.1; 
const WINDOW_REWARD_COIN_COUNT = 10;
const MIN_WINDOW_SPACING = 300; 
const WINDOW_PROMPT_DISTANCE = 150; 
const WINDOW_PROMPT_Y_OFFSET = 40; 

// --- SISTEMA DE INIMIGOS FIXOS ---
const ENEMY_SPAWN_COOLDOWN = 2.0; 

const ENEMY_STRAIGHT_SPEED = 280; 
const ENEMY_HOMING_SPEED = 280;   
const ENEMY_CHARGER_DASH_SPEED = 580; 
const ENEMY_SPEED_BASE = 100; // Velocidade do Patrol
const HOMING_ENEMY_ATTRACTION = 60; 

const FALLING_ROCK_GRAVITY = 900;
const FALLING_ROCK_BOUNCE_VELOCITY_Y = -300;
const FALLING_ROCK_BOUNCE_VELOCITY_X = 200;

// --- BATALHAS DE CHEFE FIXAS ---
const BOSS_MINION_STRAIGHT_SPEED = 580; 
const BOSS_MINION_HOMING_SPEED = 300;
const BOSS_MINION_REBOUND_SPEED = 420;
const BOSS_DAMAGE_FROM_REBOUND = 10;
const BOSS_DASH_SPEED = 1200;
const BOSS_DASH_COOLDOWN = 3; 

const FINAL_BOSS_HEALTH = 10; 
const FINAL_BOSS_RISE_SPEED = 20;
const FINAL_BOSS_VERTICAL_OFFSET = 50; 
const FINAL_BOSS_SHAKE_ATTACK_COOLDOWN = 5.0;
const FINAL_BOSS_SHAKE_DURATION = 1.0; 
const FINAL_BOSS_SLASH_TELEGRAPH_TIME = 0.5;
const FINAL_BOSS_SLASH_EXTEND_TIME = 0.2;
const FINAL_BOSS_SLASH_RETRACT_TIME = 0.8;
const FINAL_BOSS_COMBO_COOLDOWN = 0.15;
const FINAL_BOSS_POST_COMBO_COOLDOWN = 2.0;
const FINAL_BOSS_LASER_CHARGE_TIME = 1.0;
const FINAL_BOSS_LASER_ACTIVE_TIME = 1.0; 
const FINAL_BOSS_LASER_ROTATION_SPEED = 1.5;
const FINAL_BOSS_LASER_WIDTH_TELEGRAPH = 4;
const FINAL_BOSS_LASER_WIDTH_ACTIVE = 18;

const BOSS_DEBRIS_GRAVITY = 1200;
const DEBRIS_PICKUP_DISTANCE = 60;
const DEBRIS_PICKUP_PROMPT_Y_OFFSET = 30;
const DEBRIS_PHASE_CHANCE = 0.3; 

// --- UTILIDADES E EFEITOS VISUAIS ---
const REBOUND_PROJECTILE_AIMED_SPEED = 850;
const PROJECTILE_INDICATOR_DURATION = 0.7; 
const TRIPLE_JUMP_FORCE = 1300; 
const JUMP_COMBO_WINDOW = 0.15;
const SCREEN_SHAKE_MAGNITUDE = 10;
const MUSIC_VOLUME_TRANSITION_SPEED = 1.5; 
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 30; 

const DAY_TO_AFTERNOON_TRIGGER_SCORE = 1000;
const AFTERNOON_TO_NIGHT_TRIGGER_SCORE = 2000;
const TRANSITION_DURATION_SCROLL = 5000;

const PAUSE_BTN_SIZE = 44; 
const PAUSE_BTN_MARGIN = 20;
const PAUSE_BTN_X = canvas.width - PAUSE_BTN_SIZE - PAUSE_BTN_MARGIN;
const PAUSE_BTN_Y = PAUSE_BTN_MARGIN;
const PAUSE_BTN_ANIM_SPEED = 15; 
const BUTTON_HOVER_SCALE = 1.15; 

const MAX_PARTICLES = 800; 

const PLAYER_TRAIL_COLOR = '#a4281b', 
      ENEMY_STRAIGHT_TRAIL_COLOR = '#5f27cd', 
      ENEMY_HOMING_TRAIL_COLOR = '#b8930b', 
      ENEMY_CHARGER_TRAIL_COLOR = '#2E8B57',
      REBOUND_PROJECTILE_COLOR = '#5DADE2';

const SKY_PALETTES = {
    day:       ['#80d0ff', '#4da6ff', '#1a5fab'],
    afternoon: ['#ffaf40', '#ff7e5f', '#c74b50'],
    night:     ['#0c0a1a', '#2a0f4a', '#4a1c6b']
};

const CRACK_CHANCE = 0.03; 
const MOSS_CHANCE = 0.02;
const HILL_DETAIL_CHANCE = 0.9;
const TREE_HAS_BRANCHES_CHANCE = 0.35;
const BRANCH_PROBABILITIES = [0.60, 0.40, 0.20];
const MAX_BRANCHES_PER_SIDE = 3;
const MIN_BRANCH_SPACING = 40;

// --- SISTEMA DE ÁUDIO ---
const sounds = { 
    music: { audio: new Audio('music.mp3'), loop: true, baseVolume: 0.4 }, 
    jump: { audio: new Audio('jump.mp3'), baseVolume: 0.05 }, 
    coin: { audio: new Audio('coin.mp3'), baseVolume: 0.15 }, 
    land: { audio: new Audio('falling.mp3'), baseVolume: 0.15 }, 
    damage: { audio: new Audio('damage.mp3'), baseVolume: 0.5 }, 
    gameOver: { audio: new Audio('gameOver.mp3'), baseVolume: 0.5 }, 
    victory: { audio: new Audio('victory.mp3'), baseVolume: 0.5 } 
};
const sfxSoundKeys = ['jump', 'coin', 'land', 'damage', 'gameOver', 'victory'];

const savedMusicVol = localStorage.getItem('musicVolume');
const savedSfxVol = localStorage.getItem('sfxVolume');

let musicVolume = (savedMusicVol !== null) ? parseFloat(savedMusicVol) : 0.4;
let sfxVolume = (savedSfxVol !== null) ? parseFloat(savedSfxVol) : 0.5;

let currentMusicVolumeFactor = 1.0; 
let targetMusicVolumeFactor = 1.0; 

function applyVolumes() { 
    sfxSoundKeys.forEach(key => { 
        if(sounds[key].audio) sounds[key].audio.volume = sounds[key].baseVolume * sfxVolume; 
    }); 
    if(sounds.music.audio) {
        sounds.music.audio.volume = sounds.music.baseVolume * musicVolume * currentMusicVolumeFactor;
    }
}

function playSound(soundObj) { 
    if (soundObj && soundObj.audio && soundObj.audio.src) { 
        if (soundObj.audio.loop || soundObj === sounds.gameOver || soundObj === sounds.victory) { 
            soundObj.audio.currentTime = 0; 
            soundObj.audio.play().catch(e => {}); 
        } else { 
            const tempAudio = soundObj.audio.cloneNode(); 
            tempAudio.volume = soundObj.audio.volume; 
            tempAudio.play().catch(e => {}); 
        } 
    } 
}

function setTargetMusicVolumeFactor(gameState) { 
    if (musicStarted && gameState !== 'start') { 
        sounds.music.audio.loop = true; 
        sounds.music.audio.play().catch(e => {}); 
    }
    
    if (gameState === 'playing' || gameState === 'bossBattle' || gameState === 'phaseTwo' || gameState === 'finalBoss' || gameState === 'start') {
        targetMusicVolumeFactor = 1.0;
    } else if (gameState === 'options') {
        if (optionsState === 'audio') {
            targetMusicVolumeFactor = 1.0;
        } else {
            targetMusicVolumeFactor = (musicVolume <= 0.2) ? 1.0 : 0.2;
        }
    } else {
        if (musicVolume <= 0.2) {
            targetMusicVolumeFactor = 1.0;
        } else {
            targetMusicVolumeFactor = 0.2;
        }
    }
}

function applyAndSaveVolumes(){ 
    applyVolumes(); 
    localStorage.setItem('musicVolume', musicVolume); 
    localStorage.setItem('sfxVolume', sfxVolume); 
}

// --- CANVAS OFFSREEN ---
let offscreenCanvas;
let offscreenCtx;

// --- VARIÁVEIS GLOBAIS ---
let player, platforms, keys, scrollOffset, gameOver, gameWon, enemies, coins, particles, musicStarted, lastWindowY; 
let verticalScrollOffset = 0;
let sceneryManager;
let boss, finalBoss, healthPacks;
let projectileIndicators;
let bossDebris;
let screenShakeTimer = 0;
let gameState;
let phaseOneComplete = false;
let selectedPauseOption = 0;

// --- VARIÁVEIS DE OPÇÕES & CONTROLES ---
let optionsState = 'main'; 
let selectedOptionMain = 0;
let selectedAudioSetting = 0;
let reduceParticles = false;

// --- VARIÁVEIS DO SISTEMA DE DIFICULDADE ---
let currentDifficulty = localStorage.getItem('cfg_difficulty') !== null ? parseInt(localStorage.getItem('cfg_difficulty')) : 1; 
const difficultyNames = ['Fácil', 'Normal', 'Difícil'];

const DIFFICULTY_CONFIG = [
    { // 0: FÁCIL
        obstacleChance: 0.50,
        enemySpawnChance: 0.006,
        homingChance: 0.40,
        chargerChance: 0.25,
        fallingPlatformChance: 0.15,
        wallSpikeChance: 0.20,
        wallTopSpikeChance: 0.10,
        spikeMin: 1,
        spikeMax: 3,
        luckChance: 0.6, 
        healthPackChance: 0.12, 
        scoreObstacleHard: 501, 
        scoreEnemyStraight: 1001, 
        scoreEnemyHoming: 1501,   
        scoreEnemyCharger: 2001,  
        bossTrigger: 2500,        
        bossAttackCooldown: 3.5,
        bossPhase2Threshold: 0.3,
        bossPityTimer: 3,         
        // Fase 2 Fácil
        cloudChance: 0.15,        
        patrolChance: 0.15,
        rockInterval: 3.5,
        scorePatrol: 501,         
        scoreWindow: 1501,        
        scoreRock: 2501,          
        // Final Boss (Fácil)
        fbTrigger: 3500,          
        fbShakeCycle: 4, 
        fbDebrisMin: 4,           
        fbDebrisMax: 6,           
        fbPhase2Threshold: 0.3,
        fbRageSpeed: 1.0,         
        fbSlashCooldown: 2.0
    },
    { // 1: NORMAL
        obstacleChance: 0.65,
        enemySpawnChance: 0.01,
        homingChance: 0.40,
        chargerChance: 0.25,
        fallingPlatformChance: 0.30,
        wallSpikeChance: 0.40,
        wallTopSpikeChance: 0.30,
        spikeMin: 1,
        spikeMax: 5,
        luckChance: 0.6, 
        healthPackChance: 0.07, 
        scoreObstacleHard: 501,
        scoreEnemyStraight: 1001,
        scoreEnemyHoming: 1501,
        scoreEnemyCharger: 2001,
        bossTrigger: 3000,
        bossAttackCooldown: 2.5,
        bossPhase2Threshold: 0.5,
        bossPityTimer: 6, 
        // Fase 2 Normal
        cloudChance: 0.15,
        patrolChance: 0.3,
        rockInterval: 2.5,
        scorePatrol: 501,
        scoreWindow: 1501,
        scoreRock: 2501,
        // Final Boss (Normal)
        fbTrigger: 4000,
        fbShakeCycle: 5, 
        fbDebrisMin: 4,
        fbDebrisMax: 6,
        fbPhase2Threshold: 0.5,
        fbRageSpeed: 1.0,
        fbSlashCooldown: 1.5
    },
    { // 2: DIFÍCIL
        obstacleChance: 0.85,
        enemySpawnChance: 0.016,
        homingChance: 0.45,
        chargerChance: 0.40,
        fallingPlatformChance: 0.50,
        wallSpikeChance: 0.65,
        wallTopSpikeChance: 0.55,
        spikeMin: 3,
        spikeMax: 6,
        luckChance: 0.4, 
        healthPackChance: 0.07, 
        scoreObstacleHard: 0,
        scoreEnemyStraight: 500,
        scoreEnemyHoming: 1000,
        scoreEnemyCharger: 1500,
        bossTrigger: 3500,  
        bossAttackCooldown: 1.8,
        bossPhase2Threshold: 0.7,
        bossPityTimer: 6, 
        // Fase 2 Difícil
        cloudChance: 0.08, 
        patrolChance: 0.45, 
        rockInterval: 1.5, 
        scorePatrol: 0,
        scoreWindow: 500,
        scoreRock: 1500,
        // Final Boss (Difícil)
        fbTrigger: 4500, 
        fbShakeCycle: 6, 
        fbDebrisMin: 2,  
        fbDebrisMax: 4,
        fbPhase2Threshold: 0.7,
        fbRageSpeed: 1.3,
        fbSlashCooldown: 1.0 
    }
];

function applyDifficulty() {
    const cfg = DIFFICULTY_CONFIG[currentDifficulty];
    // Fase 1
    OBSTACLE_CHANCE = cfg.obstacleChance;
    ENEMY_SPAWN_CHANCE = cfg.enemySpawnChance;
    HOMING_ENEMY_CHANCE = cfg.homingChance;
    CHARGER_ENEMY_CHANCE = cfg.chargerChance;
    FALLING_PLATFORM_CHANCE = cfg.fallingPlatformChance;
    WALL_SPIKE_CHANCE = cfg.wallSpikeChance;
    WALL_WITH_TOP_SPIKES_CHANCE = cfg.wallTopSpikeChance;
    SPIKE_MIN_BLOCKS = cfg.spikeMin;
    SPIKE_MAX_BLOCKS = cfg.spikeMax;
    CHEST_LUCK_CHANCE = cfg.luckChance;
    WINDOW_REWARD_CHANCE = cfg.luckChance;
    BASE_HEALTH_PACK_CHANCE = cfg.healthPackChance;
    SCORE_OBSTACLE_HARD = cfg.scoreObstacleHard;
    SCORE_ENEMY_STRAIGHT = cfg.scoreEnemyStraight;
    SCORE_ENEMY_HOMING = cfg.scoreEnemyHoming;
    SCORE_ENEMY_CHARGER = cfg.scoreEnemyCharger;
    // Boss 1
    BOSS_TRIGGER_SCORE = cfg.bossTrigger;
    BOSS_ATTACK_COOLDOWN = cfg.bossAttackCooldown;
    BOSS_PHASE2_THRESHOLD = cfg.bossPhase2Threshold;
    BOSS_PITY_TIMER = cfg.bossPityTimer;
    // Fase 2
    CLOUD_PLATFORM_CHANCE = cfg.cloudChance;
    PATROL_ENEMY_SPAWN_CHANCE = cfg.patrolChance;
    FALLING_ROCK_SPAWN_INTERVAL = cfg.rockInterval;
    SCORE_PATROL_ENEMY = cfg.scorePatrol;
    SCORE_WINDOW_TRAP = cfg.scoreWindow;
    SCORE_FALLING_ROCK = cfg.scoreRock;
    // Final Boss
    FINAL_BOSS_TRIGGER_SCORE = cfg.fbTrigger;
    FINAL_BOSS_SHAKE_CYCLE = cfg.fbShakeCycle;
    FINAL_BOSS_DEBRIS_MIN = cfg.fbDebrisMin;
    FINAL_BOSS_DEBRIS_MAX = cfg.fbDebrisMax;
    FINAL_BOSS_PHASE2_THRESHOLD = cfg.fbPhase2Threshold;
    FINAL_BOSS_RAGE_SPEED = cfg.fbRageSpeed;
    FINAL_BOSS_SLASH_COOLDOWN = cfg.fbSlashCooldown;
}

// Aplica imediatamente ao carregar
applyDifficulty();

let menuAnimStates = {
    main: [1, 1, 1, 1],       
    audio: [1, 1, 1],         
    controls: [1, 1, 1, 1, 1, 1, 1, 1],
    pause: [1, 1]             
};

const defaultKeyMap = {
    left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', 
    interact: 'Space', pause: 'KeyP', restart: 'KeyR'
};

let keyMap = JSON.parse(localStorage.getItem('superAIKeyMap')) || { ...defaultKeyMap };
let bindingAction = null; 

let lastTime = 0;
let screenMessage = null;
let draggingSlider = null;
let currentTransitionState;
let dayTransitionStartOffset;
let nightTransitionStartOffset;
let phaseTwoStartScrollY = 0;
let phaseTwoHealthPacks;
let fallingRockSpawnTimer;

let pixelsSinceLastHP = 0;
let platformsSinceLastPatrolF2 = 0;
let platformsSinceLastHPF2 = 0;

let coinAnimations = []; 
let coinRewardState = { active: false, toSpawn: 0, spawnTimer: 0, spawnPosition: null };
let interactionPrompts = [];
let hasBeatenGame = false;
let chestToOpen = null;
let enemySpawnCooldown = 0;
let score = 0;

let isHoveringPause = false; 
let previousStateForPause = 'playing';
let currentPauseButtonScale = 1.0;

let lastScoreTier = 0;
let scoreBlinkTimer = 0;

// --- VARIÁVEIS DE CHEAT/DEBUG ---
let cheatsEnabled = false;
const cheatCode = 'gubed'; 
let cheatCodeProgress = 0;
let debugMode = false;
let infiniteInvincibilityCheat = false;
let scoreLockCheat = false;

let debugPanelOpen = false;
let activeDebugTab = 'tab-general';
let selectedSpawnType = null; 

let isDraggingDebug = false;
let dragStartX = 0;
let dragStartLeft = 0;

let promptAnimFrame = 0;
let isRightCtrlPressed = false;
let isLeftCtrlPressed = false;
let debugListenersAdded = false;

// Variáveis para cálculo de FPS e Debug Info
let fpsTimer = 0;
let frameCount = 0;
let currentFps = 60;