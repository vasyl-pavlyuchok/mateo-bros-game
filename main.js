const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Cover art used on the start screen
const coverImage = new Image();
coverImage.src = "mateo & bros 2.png";
let coverImageLoaded = false;
coverImage.onload = () => {
  coverImageLoaded = true;
};

const finaleVideo = document.createElement("video");
finaleVideo.src = "video5.mp4";
finaleVideo.loop = true;
finaleVideo.muted = true;
finaleVideo.playsInline = true;
finaleVideo.preload = "auto";
let finaleVideoReady = false;
finaleVideo.oncanplay = () => {
  finaleVideoReady = true;
};
function ensureFinaleVideoPlays() {
  if (finaleVideoReady && finaleVideo.paused) {
    finaleVideo.play().catch(() => {});
  }
}

// Precomputed backdrop details so the menu art feels calm instead of random noise
const menuBackdrop = {
  buildings: [],
  waves: [],
  boats: [],
};
let menuWavePhase = 0;

function initMenuBackdrop() {
  const skylineColors = ["#f8d3a8", "#f3b993", "#e58a6c"];
  const buildingCount = 8;
  menuBackdrop.buildings = [];
  for (let i = 0; i < buildingCount; i++) {
    const width = 60 + Math.random() * 40;
    const height = 80 + Math.random() * 120;
    const x = (canvas.width / buildingCount) * i + Math.random() * 30;
    const color =
      skylineColors[Math.floor(Math.random() * skylineColors.length)];
    menuBackdrop.buildings.push({ x, width, height, color });
  }

  menuBackdrop.waves = [];
  for (let i = 0; i < 12; i++) {
    menuBackdrop.waves.push({
      x: Math.random() * canvas.width,
      width: 60 + Math.random() * 80,
      relY: Math.random(),
      phase: Math.random() * Math.PI * 2,
    });
  }

  const boatColors = ["#f9f4da", "#f4d35e", "#f19c79"];
  menuBackdrop.boats = [];
  const boatCount = 3;
  for (let i = 0; i < boatCount; i++) {
    menuBackdrop.boats.push({
      x: Math.random() * canvas.width,
      relY: 0.05 + Math.random() * 0.6,
      speed: 0.2 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      color: boatColors[i % boatColors.length],
    });
  }
}

initMenuBackdrop();

// ------ WORLD & CAMERA ------
let worldWidth = 2000; // updated from tilemap
let cameraX = 0;

// Flag animation
let flagOffset = 0; // 0 = top of pole
let flagAnimating = false;

// ------ INPUT ------
const keys = {
  left: false,
  right: false,
  up: false,
};

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyP" && (gameState === "playing" || isPaused)) {
    isPaused = !isPaused;
    if (isPaused) {
      stopBackgroundMusic();
    } else {
      ensureBackgroundMusic();
    }
    return;
  }
  const preventScrollKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
  ];
  if (preventScrollKeys.includes(e.code)) {
    e.preventDefault();
  }

  // Character selection: 1 = Mateo, 2 = Nick, 3 = Vas
  if (e.code === "Digit1") currentCharacter = "mateo";
  if (e.code === "Digit2") currentCharacter = "nick";
  if (e.code === "Digit3") currentCharacter = "vas";

  // Handle menu/game over/win screen
  if (gameState === "menu" || gameState === "gameOver" || gameState === "win") {
    const startKeys = [
      "Space",
      "Enter",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ];
    if (startKeys.includes(e.code)) {
      if (gameState === "menu") {
        currentLevel = 0;
      } else if (gameState === "win") {
        if (currentLevel < totalLevels - 1) {
          currentLevel++;
        } else {
          currentLevel = 0;
        }
      }
      startGame();
    }
    return;
  }

  // Gameplay controls
  if (e.code === "ArrowLeft") keys.left = true;
  if (e.code === "ArrowRight") keys.right = true;
  if (e.code === "Space" || e.code === "ArrowUp") keys.up = true;
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft") keys.left = false;
  if (e.code === "ArrowRight") keys.right = false;
  if (e.code === "Space" || e.code === "ArrowUp") keys.up = false;
});

const playerSmallHeight = 32;
const playerBigHeight = playerSmallHeight * 2;

// ------ PLAYER ------
const player = {
  x: 50,
  y: 300,
  width: 32,
  height: playerSmallHeight, // small size
  vx: 0,
  vy: 0,
  speed: 3,
  jumpStrength: 10,
  onGround: false,
  state: "small", // "small" or "big"
  facing: 1,
  walkCycle: 0,
  respawnAnimating: false,
  respawnFrame: 0,
  fallTriggersGameOver: false,
  idleTimer: 0,
  expressionTimer: 0,
  currentExpression: "",
  celebrationTimer: 0,
  helmetOn: false,
};

const basePlayerSpeed = player.speed;
const basePlayerJumpStrength = player.jumpStrength;

// ------ CHARACTERS (Mateo, Nick, Vas) ------
// Color palette and small details for each brother
const characters = {
  mateo: {
    name: "Mateo",
    hatColor: "#d63c32",
    hatBrimColor: "#a1241c",
    badgeLetter: "M",
    style: "plaid",
    shirtColor: "#c62828",
    plaidColors: {
      base: "#c62828",
      deep: "#8b1f1f",
      stripe: "#141414",
      highlight: "#ff5252",
    },
    buttonColor: "#f4d5a7",
    pantsColor: "#16161f",
    shoeColor: "#2e2a30",
    glovesColor: "#f5c49b",
    moustacheColor: "#23140e",
    beardColor: "#2e1e12",
    hasScarf: true,
    scarfColor: "#1a1f2f",
    accessory: "shark",
    accessoryHand: "both",
    hasGlasses: false,
    expressions: {
      hit: "NO COMPÀ",
    },
  },
  nick: {
    name: "Nick",
    hatColor: "#158c34",
    hatBrimColor: "#0b5c1f",
    badgeLetter: "N",
    style: "hawaiian",
    shirtColor: "#159941",
    patternColors: ["#ffe067", "#ff8f4a"],
    pantsColor: "#4f2f83",
    shoeColor: "#111111",
    glovesColor: "#f5c49b",
    moustacheColor: "#22150d",
    beardColor: null,
    scarfColor: "#2e7d32",
    hasScarf: false,
    accessory: "mushroom",
    accessoryHand: "right",
    hasGlasses: false,
    expressions: {
      hit: "MA DAI",
    },
  },
  vas: {
    name: "Vas",
    hatColor: "#c8ad7f",
    hatBrimColor: "#a47b4b",
    badgeLetter: "V",
    style: "overalls",
    overallColor: "#d1b280",
    undershirtColor: "#f7d7a0",
    strapColor: "#936c3a",
    pantsColor: "#1f355d",
    shoeColor: "#1a1006",
    glovesColor: "#ffffff",
    moustacheColor: "#201208",
    beardColor: null,
    scarfColor: "#d2b48c",
    hasScarf: false,
    accessory: "fireflower",
    accessoryHand: "left",
    hasGlasses: true,
    expressions: {
      hit: "MIERDA",
    },
  },
};

const POWER_UP_GROWTH = "growth";

// Current active character (Level 1 = Mateo)
let currentCharacter = "mateo";

// ------ LEVEL MANAGEMENT ------
const levelOrder = ["mateo", "nick", "vas", "mateo", "nick", "vas", "mateo", "nick", "vas", "mateo"];
const totalLevels = levelOrder.length;
let currentLevel = 0; // 0 = Mateo, 1 = Nick, 2 = Vas

const gravity = 0.5;
const groundY = 350;

// ------ TILEMAP SYSTEM ------
const tileSize = 40;

const levelConfigs = [
  {
    theme: {
      skyColor: "#87ceeb",
      groundColor: "#6b3a1e",
      groundDark: "#3f2916",
      groundHighlight: "#8b5a2b",
    },
    levelData: [
      "                                        ",
      "                                        ",
      "                              XXXX      ",
      "                                        ",
      "           XXXX              XXXX      ",
      "                                        ",
      "     XXXX          XXXX         XXXX   ",
      "              XXXX          XXXX        ",
      "  XX                    XX             ",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 500, y: 220, width: 40, height: 40, used: false, reward: "coin" },
      { x: 700, y: 220, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
    ],
    bricks: [
      { x: 540, y: 220, width: 40, height: 40, broken: false },
      { x: 580, y: 220, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 250, y: 220, width: 20, height: 20, collected: false },
      { x: 500, y: 220, width: 20, height: 20, collected: false },
      { x: 850, y: 220, width: 20, height: 20, collected: false },
      { x: 1250, y: 260, width: 20, height: 20, collected: false },
      { x: 300, y: 220, width: 20, height: 20, collected: false },
      { x: 600, y: 260, width: 20, height: 20, collected: false },
      { x: 150, y: 300, width: 20, height: 20, collected: false },
      { x: 750, y: 300, width: 20, height: 20, collected: false },
      { x: 1100, y: 300, width: 20, height: 20, collected: false },
      { x: 1400, y: 300, width: 20, height: 20, collected: false },
      { x: 400, y: 260, width: 20, height: 20, collected: false },
      { x: 950, y: 220, width: 20, height: 20, collected: false },
      { x: 200, y: 140, width: 20, height: 20, collected: false },
      { x: 1200, y: 60, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 180, y: 150, type: "helm", width: 24, height: 24, collected: false },
      { x: 620, y: 180, type: "anchor", width: 24, height: 24, collected: false },
      { x: 1180, y: 220, type: "compass", width: 26, height: 26, collected: false },
    ],
    enemies: [
      {
        type: "crab",
        x: 380,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: 1.3,
        speed: 1.3,
        leftBound: 280,
        rightBound: 620,
        platformY: groundY,
        phaseOffset: 0,
      },
      {
        type: "crab",
        x: 960,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: -1.4,
        speed: 1.4,
        leftBound: 880,
        rightBound: 1260,
        platformY: groundY,
        phaseOffset: Math.PI / 2,
      },
      {
        type: "armadillo",
        x: 600,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: 1.1,
        speed: 1.1,
        leftBound: 520,
        rightBound: 820,
        platformY: groundY,
        phaseOffset: Math.PI / 3,
        rollTimer: 0,
      },
      {
        type: "armadillo",
        x: 250,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: -1.0,
        speed: 1.0,
        leftBound: 200,
        rightBound: 420,
        platformY: groundY,
        phaseOffset: (Math.PI * 2) / 3,
        rollTimer: 0,
      },
      {
        type: "bat",
        x: 320,
        y: 210,
        width: 36,
        height: 18,
        vx: 1.2,
        speed: 1.2,
        leftBound: 260,
        rightBound: 520,
        baseY: 220,
        amplitude: 30,
        phaseOffset: 0,
        diveTimer: 0,
      },
      {
        type: "bat",
        x: 820,
        y: 190,
        width: 36,
        height: 18,
        vx: -1.3,
        speed: 1.3,
        leftBound: 760,
        rightBound: 1080,
        baseY: 195,
        amplitude: 26,
        phaseOffset: Math.PI,
        diveTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 250, width: 260, height: 120, baseColor: "#1f4d27", shadowColor: "#16371c" },
      { x: 900, width: 300, height: 140, baseColor: "#1f4d27", shadowColor: "#16371c" },
      { x: 1550, width: 260, height: 130, baseColor: "#1f4d27", shadowColor: "#16371c" },
    ],
    backgroundHillsNear: [
      { x: 200, width: 220, height: 110, baseColor: "#2f7d33", shadowColor: "#256429" },
      { x: 700, width: 260, height: 140, baseColor: "#2f7d33", shadowColor: "#256429" },
      { x: 1300, width: 240, height: 130, baseColor: "#2f7d33", shadowColor: "#256429" },
    ],
    backgroundClouds: [
      { x: 250, y: 80, scale: 1.0 },
      { x: 600, y: 60, scale: 1.3 },
      { x: 950, y: 90, scale: 0.9 },
      { x: 1400, y: 70, scale: 1.1 },
    ],
  },
  {
    theme: {
      skyColor: "#f4b183",
      groundColor: "#4b2d1c",
      groundDark: "#331f13",
      groundHighlight: "#a7653a",
    },
    levelData: [
      "                                        ",
      "                XX             XX      ",
      "     XX                     XXXX       ",
      "             XXXX                      ",
      "   XXXX               XX               ",
      "                       XXXX         XX ",
      "        XXXX    XX                    ",
      "   XX                 XXXX      XXX    ",
      " XXXX        XX                       X",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 350, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 900, y: 160, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
    ],
    bricks: [
      { x: 390, y: 200, width: 40, height: 40, broken: false },
      { x: 430, y: 200, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 180, y: 200, width: 20, height: 20, collected: false },
      { x: 420, y: 160, width: 20, height: 20, collected: false },
      { x: 650, y: 220, width: 20, height: 20, collected: false },
      { x: 980, y: 120, width: 20, height: 20, collected: false },
      { x: 1200, y: 200, width: 20, height: 20, collected: false },
      { x: 760, y: 260, width: 20, height: 20, collected: false },
      { x: 300, y: 260, width: 20, height: 20, collected: false },
      { x: 100, y: 300, width: 20, height: 20, collected: false },
      { x: 520, y: 120, width: 20, height: 20, collected: false },
      { x: 880, y: 260, width: 20, height: 20, collected: false },
      { x: 1340, y: 240, width: 20, height: 20, collected: false },
      { x: 1500, y: 280, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 300, y: 140, type: "anchor", width: 24, height: 24, collected: false },
      { x: 900, y: 90, type: "compass", width: 26, height: 26, collected: false },
      { x: 1380, y: 200, type: "helm", width: 24, height: 24, collected: false },
    ],
    enemies: [
      {
        type: "crab",
        x: 500,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: 1.2,
        speed: 1.2,
        leftBound: 450,
        rightBound: 780,
        platformY: groundY,
        phaseOffset: Math.PI / 4,
      },
      {
        type: "crab",
        x: 1100,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: -1.4,
        speed: 1.4,
        leftBound: 1000,
        rightBound: 1400,
        platformY: groundY,
        phaseOffset: Math.PI,
      },
      {
        type: "bat",
        x: 420,
        y: 160,
        width: 36,
        height: 18,
        vx: 1.0,
        speed: 1.0,
        leftBound: 350,
        rightBound: 650,
        baseY: 170,
        amplitude: 34,
        phaseOffset: 0,
        diveTimer: 0,
      },
      {
        type: "bat",
        x: 980,
        y: 140,
        width: 36,
        height: 18,
        vx: -1.1,
        speed: 1.1,
        leftBound: 920,
        rightBound: 1180,
        baseY: 150,
        amplitude: 30,
        phaseOffset: Math.PI / 2,
        diveTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 200, width: 260, height: 120, baseColor: "#7b4a2f", shadowColor: "#5c2f1b" },
      { x: 900, width: 300, height: 140, baseColor: "#7b4a2f", shadowColor: "#5c2f1b" },
      { x: 1500, width: 260, height: 130, baseColor: "#7b4a2f", shadowColor: "#5c2f1b" },
    ],
    backgroundHillsNear: [
      { x: 180, width: 220, height: 110, baseColor: "#c97b2a", shadowColor: "#a75f1f" },
      { x: 720, width: 260, height: 140, baseColor: "#c97b2a", shadowColor: "#a75f1f" },
      { x: 1320, width: 240, height: 130, baseColor: "#c97b2a", shadowColor: "#a75f1f" },
    ],
    backgroundClouds: [
      { x: 250, y: 90, scale: 1.0 },
      { x: 600, y: 70, scale: 1.2 },
      { x: 1050, y: 80, scale: 0.85 },
      { x: 1450, y: 90, scale: 1.1 },
    ],
  },
  {
    theme: {
      skyColor: "#9ed8ff",
      groundColor: "#f3cf96",
      groundDark: "#c89c55",
      groundHighlight: "#ffe7b4",
    },
    levelData: [
      "                                        ",
      "        XX             XX               ",
      "   XXX        XXXX            XX        ",
      "                 XXX    XX              ",
      "  XXXX    XX          XXXX        XX    ",
      "      XXXX       XX          XXXX       ",
      "   XX        XXX      XX                ",
      " XXXXX   XX         XXXX     XX         ",
      "XX   XXXXX     XX         XXXXX         ",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 420, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 860, y: 180, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 1200, y: 180, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1480, y: 140, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
    ],
    bricks: [
      { x: 460, y: 200, width: 40, height: 40, broken: false },
      { x: 900, y: 180, width: 40, height: 40, broken: false },
      { x: 1240, y: 180, width: 40, height: 40, broken: false },
      { x: 1520, y: 140, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 220, y: 220, width: 20, height: 20, collected: false },
      { x: 260, y: 180, width: 20, height: 20, collected: false },
      { x: 500, y: 180, width: 20, height: 20, collected: false },
      { x: 640, y: 220, width: 20, height: 20, collected: false },
      { x: 780, y: 160, width: 20, height: 20, collected: false },
      { x: 940, y: 140, width: 20, height: 20, collected: false },
      { x: 1010, y: 220, width: 20, height: 20, collected: false },
      { x: 1120, y: 160, width: 20, height: 20, collected: false },
      { x: 1320, y: 120, width: 20, height: 20, collected: false },
      { x: 1400, y: 200, width: 20, height: 20, collected: false },
      { x: 1550, y: 160, width: 20, height: 20, collected: false },
      { x: 1480, y: 220, width: 20, height: 20, collected: false },
      { x: 1580, y: 200, width: 20, height: 20, collected: false },
      { x: 1460, y: 80, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 260, y: 170, type: "anchor", width: 24, height: 24, collected: false },
      { x: 820, y: 130, type: "helm", width: 24, height: 24, collected: false },
      { x: 1420, y: 90, type: "compass", width: 26, height: 26, collected: false },
    ],
    enemies: [
      {
        type: "crab",
        x: 320,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: 1.4,
        speed: 1.4,
        leftBound: 220,
        rightBound: 520,
        platformY: groundY,
        phaseOffset: Math.PI / 5,
      },
      {
        type: "crab",
        x: 900,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: -1.3,
        speed: 1.3,
        leftBound: 780,
        rightBound: 1080,
        platformY: groundY,
        phaseOffset: Math.PI,
      },
      {
        type: "armadillo",
        x: 1260,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: 1.0,
        speed: 1.0,
        leftBound: 1120,
        rightBound: 1480,
        platformY: groundY,
        phaseOffset: Math.PI / 4,
        rollTimer: 0,
      },
      {
        type: "bat",
        x: 620,
        y: 170,
        width: 36,
        height: 18,
        vx: 1.1,
        speed: 1.1,
        leftBound: 520,
        rightBound: 920,
        baseY: 190,
        amplitude: 32,
        phaseOffset: Math.PI / 3,
        diveTimer: 0,
      },
      {
        type: "bat",
        x: 1380,
        y: 150,
        width: 36,
        height: 18,
        vx: -1.2,
        speed: 1.2,
        leftBound: 1280,
        rightBound: 1560,
        baseY: 160,
        amplitude: 28,
        phaseOffset: Math.PI * 1.5,
        diveTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 300, width: 280, height: 90, baseColor: "#f2dcb3", shadowColor: "#d4b986" },
      { x: 900, width: 260, height: 80, baseColor: "#f2dcb3", shadowColor: "#d4b986" },
      { x: 1500, width: 320, height: 95, baseColor: "#f2dcb3", shadowColor: "#d4b986" },
    ],
    backgroundHillsNear: [
      { x: 450, width: 220, height: 70, baseColor: "#f4c57a", shadowColor: "#d49a4a" },
      { x: 1100, width: 240, height: 80, baseColor: "#f4c57a", shadowColor: "#d49a4a" },
      { x: 1650, width: 210, height: 60, baseColor: "#f4c57a", shadowColor: "#d49a4a" },
    ],
    backgroundClouds: [
      { x: 220, y: 70, scale: 1.1 },
      { x: 680, y: 60, scale: 0.9 },
      { x: 1050, y: 80, scale: 1.3 },
      { x: 1420, y: 65, scale: 0.75 },
    ],
    backgroundSea: {
      horizonY: groundY - 130,
      height: 160,
      topColor: "#86d3ff",
      bottomColor: "#1f7fb8",
      waveColor: "rgba(255, 255, 255, 0.75)",
      parallax: 0.12,
      waves: [
        { x: 60, width: 180, relY: 0.1, amplitude: 18, speed: 0.02, thickness: 4, phase: 0 },
        { x: 320, width: 200, relY: 0.35, amplitude: 15, speed: 0.018, thickness: 3, phase: Math.PI / 3 },
        { x: 720, width: 220, relY: 0.55, amplitude: 12, speed: 0.016, thickness: 4, phase: Math.PI * 1.5 },
        { x: 1100, width: 190, relY: 0.25, amplitude: 14, speed: 0.019, thickness: 3, phase: Math.PI / 4 },
      ],
    },
    backgroundFish: [
      { x: 200, relY: 0.35, scale: 1.1, speed: 0.7, direction: 1, color: "#ffe066", accent: "#ffb347", wave: 6, bobSpeed: 0.03 },
      { x: 720, relY: 0.6, scale: 0.8, speed: 0.55, direction: -1, color: "#74d2ff", accent: "#ffffff", wave: 5, bobSpeed: 0.025 },
      { x: 1180, relY: 0.45, scale: 1.2, speed: 0.8, direction: 1, color: "#ff8fa3", accent: "#ffe6ef", wave: 7, bobSpeed: 0.028 },
    ],
  },
  {
    theme: {
      skyColor: "#6ec3a4",
      groundColor: "#3b4425",
      groundDark: "#252a14",
      groundHighlight: "#719745",
    },
    levelData: [
      "                                        ",
      "      XXX        XX         XX          ",
      "   XX      XXX         XXX              ",
      "         XXXX     XX         XX         ",
      "  XXX         XX     XXX        XX      ",
      "      XXXX         XX      XXXX         ",
      "   XX      XXX        XXX         XX    ",
      " XXXX   XX      XXX         XXX      XX ",
      "XX   XXXXX   XX      XX       XXXXX     ",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 360, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 760, y: 180, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 1120, y: 160, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1360, y: 160, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
    ],
    bricks: [
      { x: 400, y: 200, width: 40, height: 40, broken: false },
      { x: 800, y: 180, width: 40, height: 40, broken: false },
      { x: 1160, y: 160, width: 40, height: 40, broken: false },
      { x: 1480, y: 160, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 220, y: 220, width: 20, height: 20, collected: false },
      { x: 320, y: 180, width: 20, height: 20, collected: false },
      { x: 520, y: 180, width: 20, height: 20, collected: false },
      { x: 640, y: 150, width: 20, height: 20, collected: false },
      { x: 780, y: 160, width: 20, height: 20, collected: false },
      { x: 900, y: 200, width: 20, height: 20, collected: false },
      { x: 1020, y: 160, width: 20, height: 20, collected: false },
      { x: 1140, y: 120, width: 20, height: 20, collected: false },
      { x: 1240, y: 140, width: 20, height: 20, collected: false },
      { x: 1380, y: 140, width: 20, height: 20, collected: false },
      { x: 1500, y: 200, width: 20, height: 20, collected: false },
      { x: 1620, y: 200, width: 20, height: 20, collected: false },
      { x: 1720, y: 160, width: 20, height: 20, collected: false },
      { x: 1820, y: 120, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 320, y: 160, type: "anchor", width: 24, height: 24, collected: false },
      { x: 920, y: 120, type: "helm", width: 24, height: 24, collected: false },
      { x: 1460, y: 130, type: "compass", width: 26, height: 26, collected: false },
    ],
    enemies: [
      {
        type: "crab",
        x: 420,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: 1.2,
        speed: 1.2,
        leftBound: 340,
        rightBound: 640,
        platformY: groundY,
        phaseOffset: Math.PI / 6,
      },
      {
        type: "crab",
        x: 1080,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: -1.3,
        speed: 1.3,
        leftBound: 960,
        rightBound: 1320,
        platformY: groundY,
        phaseOffset: (Math.PI * 3) / 4,
      },
      {
        type: "bat",
        x: 600,
        y: 180,
        width: 36,
        height: 18,
        vx: 1.1,
        speed: 1.1,
        leftBound: 520,
        rightBound: 840,
        baseY: 190,
        amplitude: 24,
        phaseOffset: Math.PI / 2,
        diveTimer: 0,
      },
      {
        type: "bat",
        x: 1340,
        y: 150,
        width: 36,
        height: 18,
        vx: -1.0,
        speed: 1.0,
        leftBound: 1280,
        rightBound: 1580,
        baseY: 160,
        amplitude: 22,
        phaseOffset: Math.PI,
        diveTimer: 0,
      },
      {
        type: "armadillo",
        x: 880,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: 1.0,
        speed: 1.0,
        leftBound: 760,
        rightBound: 1040,
        platformY: groundY,
        phaseOffset: Math.PI / 2,
        rollTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 260, width: 260, height: 110, baseColor: "#2c5e33", shadowColor: "#1d3d20" },
      { x: 820, width: 300, height: 120, baseColor: "#2c5e33", shadowColor: "#1d3d20" },
      { x: 1460, width: 260, height: 110, baseColor: "#2c5e33", shadowColor: "#1d3d20" },
    ],
    backgroundHillsNear: [
      { x: 180, width: 200, height: 90, baseColor: "#4d8235", shadowColor: "#315821" },
      { x: 720, width: 240, height: 100, baseColor: "#4d8235", shadowColor: "#315821" },
      { x: 1320, width: 220, height: 90, baseColor: "#4d8235", shadowColor: "#315821" },
    ],
    backgroundClouds: [
      { x: 200, y: 80, scale: 0.9 },
      { x: 540, y: 70, scale: 1.1 },
      { x: 980, y: 60, scale: 0.85 },
      { x: 1380, y: 90, scale: 1.0 },
    ],
    ambientSprites: [
      { type: "firefly", x: 200, y: 170, amplitude: 22, vx: 0.25, parallax: 0.3, color: "#ffe066" },
      { type: "firefly", x: 560, y: 210, amplitude: 18, vx: 0.18, parallax: 0.25, color: "#fff2a8" },
      { type: "firefly", x: 960, y: 160, amplitude: 20, vx: 0.2, parallax: 0.28, color: "#ffe6a0" },
      { type: "firefly", x: 1420, y: 200, amplitude: 24, vx: 0.22, parallax: 0.27, color: "#ffd45c" },
    ],
  },
  {
    theme: {
      skyColor: "#3fb9d7",
      groundColor: "#1a3a46",
      groundDark: "#0e252e",
      groundHighlight: "#4ec9d5",
    },
    settings: {
      gravityScale: 0.9,
    },
    levelData: [
      "                                        ",
      "     XXX       XX       XXX             ",
      "  XX      XXX       XX       XX         ",
      "        XXXX    XXX    XXX              ",
      "   XXX       XX      XXX      XX        ",
      "      XXXX         XXXX         XXX     ",
      "  XX       XXXX          XXXX        XX ",
      " XXX   XX        XXX   XX        XXX    ",
      "XX  XXXXX   XX       XXX    XX    XXXX  ",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 380, y: 200, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 720, y: 180, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1020, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1340, y: 160, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
    ],
    bricks: [
      { x: 420, y: 200, width: 40, height: 40, broken: false },
      { x: 760, y: 180, width: 40, height: 40, broken: false },
      { x: 1060, y: 200, width: 40, height: 40, broken: false },
      { x: 1380, y: 160, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 260, y: 220, width: 20, height: 20, collected: false },
      { x: 320, y: 180, width: 20, height: 20, collected: false },
      { x: 460, y: 140, width: 20, height: 20, collected: false },
      { x: 600, y: 180, width: 20, height: 20, collected: false },
      { x: 780, y: 140, width: 20, height: 20, collected: false },
      { x: 880, y: 180, width: 20, height: 20, collected: false },
      { x: 1010, y: 120, width: 20, height: 20, collected: false },
      { x: 1160, y: 180, width: 20, height: 20, collected: false },
      { x: 1260, y: 140, width: 20, height: 20, collected: false },
      { x: 1400, y: 160, width: 20, height: 20, collected: false },
      { x: 1540, y: 200, width: 20, height: 20, collected: false },
      { x: 1660, y: 170, width: 20, height: 20, collected: false },
      { x: 1780, y: 150, width: 20, height: 20, collected: false },
      { x: 1880, y: 210, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 300, y: 160, type: "helm", width: 24, height: 24, collected: false },
      { x: 860, y: 140, type: "anchor", width: 24, height: 24, collected: false },
      { x: 1500, y: 140, type: "compass", width: 26, height: 26, collected: false },
    ],
    enemies: [
      {
        type: "crab",
        x: 540,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: 1.2,
        speed: 1.2,
        leftBound: 460,
        rightBound: 760,
        platformY: groundY,
        phaseOffset: 0,
      },
      {
        type: "jellyfish",
        x: 780,
        y: 230,
        width: 32,
        height: 34,
        vx: 0.6,
        speed: 0.6,
        leftBound: 720,
        rightBound: 900,
        baseY: 220,
        amplitude: 30,
        phaseOffset: Math.PI / 3,
      },
      {
        type: "jellyfish",
        x: 1180,
        y: 200,
        width: 32,
        height: 34,
        vx: -0.5,
        speed: 0.5,
        leftBound: 1080,
        rightBound: 1300,
        baseY: 210,
        amplitude: 28,
        phaseOffset: (Math.PI * 2) / 3,
      },
      {
        type: "bat",
        x: 1020,
        y: 150,
        width: 36,
        height: 18,
        vx: 1.0,
        speed: 1.0,
        leftBound: 960,
        rightBound: 1240,
        baseY: 160,
        amplitude: 22,
        phaseOffset: Math.PI / 4,
        diveTimer: 0,
      },
      {
        type: "armadillo",
        x: 1400,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: -1.1,
        speed: 1.1,
        leftBound: 1300,
        rightBound: 1560,
        platformY: groundY,
        phaseOffset: Math.PI / 5,
        rollTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 260, width: 280, height: 90, baseColor: "#1a4b57", shadowColor: "#0d2e34" },
      { x: 860, width: 300, height: 95, baseColor: "#1a4b57", shadowColor: "#0d2e34" },
      { x: 1500, width: 260, height: 90, baseColor: "#1a4b57", shadowColor: "#0d2e34" },
    ],
    backgroundHillsNear: [
      { x: 320, width: 220, height: 70, baseColor: "#337179", shadowColor: "#1d4e53" },
      { x: 1020, width: 200, height: 75, baseColor: "#337179", shadowColor: "#1d4e53" },
      { x: 1560, width: 240, height: 70, baseColor: "#337179", shadowColor: "#1d4e53" },
    ],
    backgroundClouds: [
      { x: 260, y: 70, scale: 0.8 },
      { x: 720, y: 90, scale: 0.95 },
      { x: 1160, y: 60, scale: 0.85 },
      { x: 1500, y: 80, scale: 0.9 },
    ],
    backgroundSea: {
      horizonY: groundY - 110,
      height: 190,
      topColor: "#2e82a1",
      bottomColor: "#0f2535",
      waveColor: "rgba(255, 255, 255, 0.55)",
      parallax: 0.08,
      waves: [
        { x: 80, width: 220, relY: 0.1, amplitude: 12, speed: 0.015, thickness: 4, phase: 0 },
        { x: 420, width: 200, relY: 0.4, amplitude: 18, speed: 0.018, thickness: 3, phase: Math.PI / 2 },
        { x: 820, width: 240, relY: 0.6, amplitude: 16, speed: 0.02, thickness: 4, phase: Math.PI },
        { x: 1260, width: 210, relY: 0.3, amplitude: 14, speed: 0.017, thickness: 3, phase: (Math.PI * 3) / 2 },
      ],
    },
    backgroundFish: [
      { x: 120, relY: 0.25, scale: 0.9, speed: 0.6, direction: 1, color: "#f4d35e", accent: "#fff3b0", wave: 8, bobSpeed: 0.028 },
      { x: 520, relY: 0.55, scale: 1.3, speed: 0.8, direction: -1, color: "#ff7b9c", accent: "#ffe1ec", wave: 10, bobSpeed: 0.03 },
      { x: 960, relY: 0.4, scale: 0.95, speed: 0.65, direction: 1, color: "#9bf6ff", accent: "#e0fbfc", wave: 7, bobSpeed: 0.02 },
      { x: 1460, relY: 0.65, scale: 1.2, speed: 0.7, direction: -1, color: "#7bdff2", accent: "#ffffff", wave: 9, bobSpeed: 0.026 },
    ],
    ambientSprites: [
      { type: "spark", x: 240, y: groundY - 150, amplitude: 30, vx: 0.15, parallax: 0.2, color: "#bff3ff" },
      { type: "spark", x: 640, y: groundY - 130, amplitude: 25, vx: 0.1, parallax: 0.22, color: "#8ef0ff" },
      { type: "spark", x: 1080, y: groundY - 160, amplitude: 34, vx: 0.12, parallax: 0.2, color: "#c9ffef" },
      { type: "spark", x: 1520, y: groundY - 140, amplitude: 28, vx: 0.14, parallax: 0.2, color: "#f9f871" },
    ],
  },
  {
    theme: {
      skyColor: "#d4c6b2",
      groundColor: "#5e4640",
      groundDark: "#402a26",
      groundHighlight: "#b9876b",
    },
    levelData: [
      "                                        ",
      "     XX        XXX          XX          ",
      "  XXX   XX           XX          XXX    ",
      "        XXXX    XX        XXX           ",
      "   XX        XXXX    XX         XX      ",
      "XXXX   XX          XXXXX    XX      XX  ",
      "     XXXXX   XX          XXXX      XXX  ",
      " XX      XXXXX     XX            XXXXX  ",
      "XX   XX      XXX      XX    XXX      XX ",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 320, y: 220, width: 40, height: 40, used: false, reward: "coin" },
      { x: 620, y: 200, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 980, y: 180, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1340, y: 160, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
    ],
    bricks: [
      { x: 360, y: 220, width: 40, height: 40, broken: false },
      { x: 660, y: 200, width: 40, height: 40, broken: false },
      { x: 1020, y: 180, width: 40, height: 40, broken: false },
      { x: 1380, y: 160, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 240, y: 240, width: 20, height: 20, collected: false },
      { x: 300, y: 200, width: 20, height: 20, collected: false },
      { x: 420, y: 160, width: 20, height: 20, collected: false },
      { x: 560, y: 200, width: 20, height: 20, collected: false },
      { x: 720, y: 160, width: 20, height: 20, collected: false },
      { x: 860, y: 200, width: 20, height: 20, collected: false },
      { x: 980, y: 160, width: 20, height: 20, collected: false },
      { x: 1120, y: 140, width: 20, height: 20, collected: false },
      { x: 1260, y: 150, width: 20, height: 20, collected: false },
      { x: 1400, y: 180, width: 20, height: 20, collected: false },
      { x: 1540, y: 140, width: 20, height: 20, collected: false },
      { x: 1640, y: 200, width: 20, height: 20, collected: false },
      { x: 1740, y: 180, width: 20, height: 20, collected: false },
      { x: 1850, y: 220, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 280, y: 180, type: "anchor", width: 24, height: 24, collected: false },
      { x: 880, y: 140, type: "compass", width: 26, height: 26, collected: false },
      { x: 1460, y: 140, type: "helm", width: 24, height: 24, collected: false },
    ],
    enemies: [
      {
        type: "armadillo",
        x: 520,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: 1.1,
        speed: 1.1,
        leftBound: 420,
        rightBound: 660,
        platformY: groundY,
        phaseOffset: Math.PI / 4,
        rollTimer: 0,
      },
      {
        type: "armadillo",
        x: 1180,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: -1.2,
        speed: 1.2,
        leftBound: 1040,
        rightBound: 1340,
        platformY: groundY,
        phaseOffset: Math.PI / 6,
        rollTimer: 0,
      },
      {
        type: "crab",
        x: 820,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: 1.0,
        speed: 1.0,
        leftBound: 760,
        rightBound: 980,
        platformY: groundY,
        phaseOffset: Math.PI / 5,
      },
      {
        type: "bat",
        x: 1420,
        y: 140,
        width: 36,
        height: 18,
        vx: -1.0,
        speed: 1.0,
        leftBound: 1340,
        rightBound: 1560,
        baseY: 150,
        amplitude: 24,
        phaseOffset: Math.PI,
        diveTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 260, width: 240, height: 100, baseColor: "#7b5a4f", shadowColor: "#51382f" },
      { x: 900, width: 280, height: 110, baseColor: "#7b5a4f", shadowColor: "#51382f" },
      { x: 1540, width: 260, height: 105, baseColor: "#7b5a4f", shadowColor: "#51382f" },
    ],
    backgroundHillsNear: [
      { x: 180, width: 200, height: 80, baseColor: "#926b5f", shadowColor: "#644439" },
      { x: 720, width: 240, height: 85, baseColor: "#926b5f", shadowColor: "#644439" },
      { x: 1320, width: 220, height: 90, baseColor: "#926b5f", shadowColor: "#644439" },
    ],
    backgroundClouds: [
      { x: 200, y: 70, scale: 0.8 },
      { x: 580, y: 60, scale: 0.9 },
      { x: 1020, y: 80, scale: 0.75 },
      { x: 1420, y: 70, scale: 0.85 },
    ],
    ambientSprites: [
      { type: "spark", x: 260, y: 200, amplitude: 18, vx: 0.1, parallax: 0.2, color: "rgba(255,230,200,0.8)" },
      { type: "spark", x: 720, y: 210, amplitude: 16, vx: 0.08, parallax: 0.25, color: "rgba(255,205,160,0.7)" },
      { type: "spark", x: 1180, y: 190, amplitude: 20, vx: 0.12, parallax: 0.22, color: "rgba(255,240,210,0.8)" },
      { type: "spark", x: 1620, y: 220, amplitude: 15, vx: 0.09, parallax: 0.18, color: "rgba(255,198,150,0.75)" },
    ],
  },
  {
    theme: {
      skyColor: "#3c0f14",
      groundColor: "#4c1f0f",
      groundDark: "#2b0f08",
      groundHighlight: "#b84d2b",
    },
    levelData: [
      "                                        ",
      "        XX        XXX        XX         ",
      "   XXX       XXX        XXX        XXX  ",
      "      XXXX        XX        XXXX        ",
      "  XX       XXXX        XXX        XX    ",
      "     XXXX       XXXX        XXX        X",
      "  XXX      XXXX      XXX        XXXXX   ",
      " XX   XXXX      XXX       XXXX      XX  ",
      "XX XXX    XX      XXXX      XX    XXXX  ",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 360, y: 220, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 700, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1060, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1380, y: 180, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 1600, y: 160, width: 40, height: 40, used: false, reward: "coin" },
    ],
    bricks: [
      { x: 400, y: 220, width: 40, height: 40, broken: false },
      { x: 740, y: 200, width: 40, height: 40, broken: false },
      { x: 1100, y: 200, width: 40, height: 40, broken: false },
      { x: 1420, y: 180, width: 40, height: 40, broken: false },
      { x: 1640, y: 160, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 220, y: 220, width: 20, height: 20, collected: false },
      { x: 320, y: 180, width: 20, height: 20, collected: false },
      { x: 520, y: 180, width: 20, height: 20, collected: false },
      { x: 660, y: 160, width: 20, height: 20, collected: false },
      { x: 820, y: 140, width: 20, height: 20, collected: false },
      { x: 940, y: 200, width: 20, height: 20, collected: false },
      { x: 1080, y: 160, width: 20, height: 20, collected: false },
      { x: 1200, y: 140, width: 20, height: 20, collected: false },
      { x: 1320, y: 200, width: 20, height: 20, collected: false },
      { x: 1440, y: 160, width: 20, height: 20, collected: false },
      { x: 1560, y: 140, width: 20, height: 20, collected: false },
      { x: 1680, y: 200, width: 20, height: 20, collected: false },
      { x: 1780, y: 180, width: 20, height: 20, collected: false },
      { x: 1880, y: 140, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 280, y: 180, type: "helm", width: 24, height: 24, collected: false },
      { x: 960, y: 140, type: "anchor", width: 24, height: 24, collected: false },
      { x: 1500, y: 140, type: "compass", width: 26, height: 26, collected: false },
    ],
    enemies: [
      {
        type: "armadillo",
        x: 520,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: 1.2,
        speed: 1.2,
        leftBound: 420,
        rightBound: 740,
        platformY: groundY,
        phaseOffset: Math.PI / 3,
        rollTimer: 0,
      },
      {
        type: "crab",
        x: 860,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: -1.2,
        speed: 1.2,
        leftBound: 760,
        rightBound: 980,
        platformY: groundY,
        phaseOffset: Math.PI / 4,
      },
      {
        type: "bat",
        x: 1180,
        y: 160,
        width: 36,
        height: 18,
        vx: 1.1,
        speed: 1.1,
        leftBound: 1100,
        rightBound: 1340,
        baseY: 170,
        amplitude: 30,
        phaseOffset: Math.PI / 2,
        diveTimer: 0,
      },
      {
        type: "bat",
        x: 1540,
        y: 130,
        width: 36,
        height: 18,
        vx: -1.0,
        speed: 1.0,
        leftBound: 1480,
        rightBound: 1700,
        baseY: 140,
        amplitude: 26,
        phaseOffset: Math.PI,
        diveTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 260, width: 260, height: 120, baseColor: "#76231c", shadowColor: "#4f140f" },
      { x: 900, width: 300, height: 125, baseColor: "#76231c", shadowColor: "#4f140f" },
      { x: 1500, width: 260, height: 120, baseColor: "#76231c", shadowColor: "#4f140f" },
    ],
    backgroundHillsNear: [
      { x: 200, width: 220, height: 90, baseColor: "#a03223", shadowColor: "#6b1d13" },
      { x: 780, width: 240, height: 100, baseColor: "#a03223", shadowColor: "#6b1d13" },
      { x: 1380, width: 220, height: 95, baseColor: "#a03223", shadowColor: "#6b1d13" },
    ],
    backgroundClouds: [
      { x: 250, y: 70, scale: 0.7 },
      { x: 620, y: 60, scale: 0.8 },
      { x: 1050, y: 75, scale: 0.65 },
      { x: 1460, y: 70, scale: 0.7 },
    ],
    ambientSprites: [
      { type: "ember", x: 220, y: 40, vy: 1.2, vx: -0.2, size: 5, parallax: 0.05, color: "#ffb347" },
      { type: "ember", x: 620, y: 60, vy: 1.4, vx: 0.1, size: 4, parallax: 0.05, color: "#ffd166" },
      { type: "ember", x: 1040, y: 50, vy: 1.6, vx: -0.15, size: 5, parallax: 0.05, color: "#ff6b6b" },
      { type: "ember", x: 1460, y: 70, vy: 1.5, vx: 0.08, size: 4, parallax: 0.05, color: "#ffa552" },
      { type: "ember", x: 1800, y: 30, vy: 1.8, vx: -0.1, size: 6, parallax: 0.05, color: "#ffd166" },
    ],
  },
  {
    theme: {
      skyColor: "#3c5a8f",
      groundColor: "#c8d9e8",
      groundDark: "#7f94b1",
      groundHighlight: "#f5fbff",
    },
    levelData: [
      "                                        ",
      "   XX       XXX        XX        XXX    ",
      "      XXX        XX        XXX         X",
      "  XXX     XX        XXX       XX        ",
      "     XX       XXXX       XX       XXX   ",
      "  XXX    XX       XXX       XX      XX  ",
      "     XXXX     XX      XXX      XXXX     ",
      " XX      XXXX     XX       XXXX      XX ",
      "XX   XX       XXXX     XX       XXXX   X",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 300, y: 220, width: 40, height: 40, used: false, reward: "coin" },
      { x: 640, y: 200, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 980, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1320, y: 180, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 1580, y: 160, width: 40, height: 40, used: false, reward: "coin" },
    ],
    bricks: [
      { x: 340, y: 220, width: 40, height: 40, broken: false },
      { x: 680, y: 200, width: 40, height: 40, broken: false },
      { x: 1020, y: 200, width: 40, height: 40, broken: false },
      { x: 1360, y: 180, width: 40, height: 40, broken: false },
      { x: 1620, y: 160, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 240, y: 220, width: 20, height: 20, collected: false },
      { x: 320, y: 180, width: 20, height: 20, collected: false },
      { x: 460, y: 160, width: 20, height: 20, collected: false },
      { x: 600, y: 200, width: 20, height: 20, collected: false },
      { x: 720, y: 160, width: 20, height: 20, collected: false },
      { x: 860, y: 200, width: 20, height: 20, collected: false },
      { x: 980, y: 160, width: 20, height: 20, collected: false },
      { x: 1120, y: 140, width: 20, height: 20, collected: false },
      { x: 1260, y: 180, width: 20, height: 20, collected: false },
      { x: 1400, y: 140, width: 20, height: 20, collected: false },
      { x: 1540, y: 160, width: 20, height: 20, collected: false },
      { x: 1680, y: 200, width: 20, height: 20, collected: false },
      { x: 1800, y: 180, width: 20, height: 20, collected: false },
      { x: 1900, y: 140, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 280, y: 180, type: "compass", width: 26, height: 26, collected: false },
      { x: 920, y: 160, type: "helm", width: 24, height: 24, collected: false },
      { x: 1500, y: 150, type: "anchor", width: 24, height: 24, collected: false },
    ],
    enemies: [
      {
        type: "crab",
        x: 460,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: 1.0,
        speed: 1.0,
        leftBound: 360,
        rightBound: 580,
        platformY: groundY,
        phaseOffset: Math.PI / 4,
      },
      {
        type: "bat",
        x: 780,
        y: 150,
        width: 36,
        height: 18,
        vx: 1.1,
        speed: 1.1,
        leftBound: 720,
        rightBound: 980,
        baseY: 160,
        amplitude: 28,
        phaseOffset: Math.PI / 3,
        diveTimer: 0,
      },
      {
        type: "bat",
        x: 1200,
        y: 140,
        width: 36,
        height: 18,
        vx: -1.0,
        speed: 1.0,
        leftBound: 1140,
        rightBound: 1340,
        baseY: 150,
        amplitude: 24,
        phaseOffset: Math.PI,
        diveTimer: 0,
      },
      {
        type: "armadillo",
        x: 1420,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: 1.1,
        speed: 1.1,
        leftBound: 1340,
        rightBound: 1560,
        platformY: groundY,
        phaseOffset: Math.PI / 5,
        rollTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 260, width: 260, height: 140, baseColor: "#5d7fb3", shadowColor: "#3c5787" },
      { x: 900, width: 300, height: 150, baseColor: "#5d7fb3", shadowColor: "#3c5787" },
      { x: 1500, width: 280, height: 145, baseColor: "#5d7fb3", shadowColor: "#3c5787" },
    ],
    backgroundHillsNear: [
      { x: 200, width: 220, height: 110, baseColor: "#8fb0d9", shadowColor: "#5a7ca9" },
      { x: 820, width: 240, height: 120, baseColor: "#8fb0d9", shadowColor: "#5a7ca9" },
      { x: 1420, width: 220, height: 110, baseColor: "#8fb0d9", shadowColor: "#5a7ca9" },
    ],
    backgroundClouds: [
      { x: 200, y: 60, scale: 1.1 },
      { x: 520, y: 50, scale: 1.3 },
      { x: 980, y: 60, scale: 1.0 },
      { x: 1400, y: 55, scale: 1.2 },
    ],
    ambientSprites: [
      { type: "spark", x: 240, y: 140, amplitude: 30, vx: 0.1, parallax: 0.18, color: "#d5f1ff" },
      { type: "spark", x: 640, y: 160, amplitude: 28, vx: 0.12, parallax: 0.2, color: "#f5f3ff" },
      { type: "spark", x: 1080, y: 150, amplitude: 26, vx: 0.09, parallax: 0.19, color: "#d7f5ff" },
      { type: "spark", x: 1520, y: 140, amplitude: 30, vx: 0.11, parallax: 0.18, color: "#f0e8ff" },
    ],
  },
  {
    theme: {
      skyColor: "#050713",
      groundColor: "#1a1f2a",
      groundDark: "#090b12",
      groundHighlight: "#4d5e7d",
    },
    settings: {
      gravityScale: 0.65,
      helmet: true,
      playerSpeed: 3.2,
      jumpStrength: 11,
    },
    levelData: [
      "                                        ",
      "     XX     XXX       XX      XXX       ",
      "  XXX   XX      XXX        XX       XXX ",
      "     XXX     XX      XXX       XX       ",
      "  XX     XXXX    XX       XXX      XX   ",
      "     XX      XXX     XXXX      XXX      ",
      "  XXX    XX      XXX     XX      XXX    ",
      " XX   XXX    XX      XXX     XX     XXX ",
      "XX XXX   XX    XXX      XX    XXX   XX X",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 260, y: 200, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 640, y: 180, width: 40, height: 40, used: false, reward: "coin" },
      { x: 980, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1320, y: 180, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 1680, y: 160, width: 40, height: 40, used: false, reward: "coin" },
    ],
    bricks: [
      { x: 300, y: 200, width: 40, height: 40, broken: false },
      { x: 680, y: 180, width: 40, height: 40, broken: false },
      { x: 1020, y: 200, width: 40, height: 40, broken: false },
      { x: 1360, y: 180, width: 40, height: 40, broken: false },
      { x: 1720, y: 160, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 200, y: 200, width: 20, height: 20, collected: false },
      { x: 300, y: 160, width: 20, height: 20, collected: false },
      { x: 420, y: 140, width: 20, height: 20, collected: false },
      { x: 560, y: 160, width: 20, height: 20, collected: false },
      { x: 720, y: 140, width: 20, height: 20, collected: false },
      { x: 860, y: 160, width: 20, height: 20, collected: false },
      { x: 1000, y: 120, width: 20, height: 20, collected: false },
      { x: 1140, y: 160, width: 20, height: 20, collected: false },
      { x: 1280, y: 140, width: 20, height: 20, collected: false },
      { x: 1420, y: 120, width: 20, height: 20, collected: false },
      { x: 1560, y: 160, width: 20, height: 20, collected: false },
      { x: 1700, y: 140, width: 20, height: 20, collected: false },
      { x: 1840, y: 180, width: 20, height: 20, collected: false },
      { x: 1940, y: 150, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 280, y: 160, type: "anchor", width: 24, height: 24, collected: false },
      { x: 900, y: 140, type: "compass", width: 26, height: 26, collected: false },
      { x: 1560, y: 140, type: "helm", width: 24, height: 24, collected: false },
    ],
    enemies: [
      {
        type: "ufo",
        x: 520,
        y: 160,
        width: 40,
        height: 20,
        vx: 1.4,
        speed: 1.4,
        leftBound: 420,
        rightBound: 780,
        baseY: 150,
        amplitude: 18,
        phaseOffset: Math.PI / 3,
      },
      {
        type: "ufo",
        x: 1180,
        y: 140,
        width: 40,
        height: 20,
        vx: -1.3,
        speed: 1.3,
        leftBound: 1080,
        rightBound: 1400,
        baseY: 130,
        amplitude: 16,
        phaseOffset: (Math.PI * 5) / 6,
      },
      {
        type: "jellyfish",
        x: 860,
        y: 200,
        width: 32,
        height: 34,
        vx: 0.8,
        speed: 0.8,
        leftBound: 780,
        rightBound: 1020,
        baseY: 190,
        amplitude: 26,
        phaseOffset: Math.PI / 4,
      },
      {
        type: "armadillo",
        x: 1460,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: 1.1,
        speed: 1.1,
        leftBound: 1380,
        rightBound: 1680,
        platformY: groundY,
        phaseOffset: Math.PI / 2,
        rollTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 260, width: 240, height: 80, baseColor: "#1a1f33", shadowColor: "#0c0f1a" },
      { x: 900, width: 260, height: 85, baseColor: "#1a1f33", shadowColor: "#0c0f1a" },
      { x: 1520, width: 240, height: 80, baseColor: "#1a1f33", shadowColor: "#0c0f1a" },
    ],
    backgroundHillsNear: [
      { x: 180, width: 200, height: 60, baseColor: "#2a314b", shadowColor: "#161a28" },
      { x: 760, width: 220, height: 65, baseColor: "#2a314b", shadowColor: "#161a28" },
      { x: 1400, width: 210, height: 60, baseColor: "#2a314b", shadowColor: "#161a28" },
    ],
    backgroundClouds: [
      { x: 200, y: 50, scale: 0.4 },
      { x: 520, y: 70, scale: 0.35 },
      { x: 940, y: 40, scale: 0.45 },
      { x: 1400, y: 60, scale: 0.4 },
    ],
    ambientSprites: [
      { type: "spaceship", x: 200, y: 120, vx: 0.9, amplitude: 18, parallax: 0.08, color: "#9be7ff" },
      { type: "spaceship", x: 960, y: 100, vx: -1.1, amplitude: 22, parallax: 0.08, color: "#ffde89" },
      { type: "meteor", x: -200, y: 40, vx: 3.5, vy: 1.2, size: 8, parallax: 0.03, color: "#ffb347" },
      { type: "meteor", x: 400, y: -20, vx: 4.0, vy: 1.4, size: 7, parallax: 0.03, color: "#ffd166" },
      { type: "meteor", x: 1200, y: 10, vx: 3.2, vy: 1.3, size: 9, parallax: 0.03, color: "#ff9f68" },
    ],
  },
  {
    theme: {
      skyColor: "#160c22",
      groundColor: "#2f1b3d",
      groundDark: "#1a0d24",
      groundHighlight: "#784da0",
    },
    settings: {
      gravityScale: 1.05,
    },
    levelData: [
      "                                        ",
      "   XXX       XX       XXX       XX      ",
      "      XXX        XXX       XXX       XX ",
      "  XX      XXX        XX        XXX      ",
      "     XXX       XXXX       XXX       XX  ",
      "  XXX     XX       XXXX       XX     XX ",
      "     XXXX      XXX      XXXX      XXX   ",
      " XX      XXXX      XXX      XXXX      XX",
      "XX   XX      XXXX      XXX      XXXX  XX",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    questionBlocks: [
      { x: 320, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 660, y: 180, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 1000, y: 200, width: 40, height: 40, used: false, reward: "coin" },
      { x: 1340, y: 180, width: 40, height: 40, used: false, reward: POWER_UP_GROWTH },
      { x: 1660, y: 160, width: 40, height: 40, used: false, reward: "coin" },
    ],
    bricks: [
      { x: 360, y: 200, width: 40, height: 40, broken: false },
      { x: 700, y: 180, width: 40, height: 40, broken: false },
      { x: 1040, y: 200, width: 40, height: 40, broken: false },
      { x: 1380, y: 180, width: 40, height: 40, broken: false },
      { x: 1700, y: 160, width: 40, height: 40, broken: false },
    ],
    coins: [
      { x: 220, y: 200, width: 20, height: 20, collected: false },
      { x: 320, y: 160, width: 20, height: 20, collected: false },
      { x: 440, y: 140, width: 20, height: 20, collected: false },
      { x: 580, y: 160, width: 20, height: 20, collected: false },
      { x: 720, y: 140, width: 20, height: 20, collected: false },
      { x: 860, y: 160, width: 20, height: 20, collected: false },
      { x: 1000, y: 140, width: 20, height: 20, collected: false },
      { x: 1140, y: 180, width: 20, height: 20, collected: false },
      { x: 1280, y: 140, width: 20, height: 20, collected: false },
      { x: 1420, y: 160, width: 20, height: 20, collected: false },
      { x: 1560, y: 140, width: 20, height: 20, collected: false },
      { x: 1700, y: 180, width: 20, height: 20, collected: false },
      { x: 1840, y: 140, width: 20, height: 20, collected: false },
      { x: 1960, y: 160, width: 20, height: 20, collected: false },
    ],
    souvenirs: [
      { x: 260, y: 160, type: "compass", width: 26, height: 26, collected: false },
      { x: 940, y: 140, type: "helm", width: 24, height: 24, collected: false },
      { x: 1560, y: 140, type: "anchor", width: 24, height: 24, collected: false },
    ],
    enemies: [
      {
        type: "crab",
        x: 460,
        y: groundY - 26,
        width: 34,
        height: 26,
        vx: 1.1,
        speed: 1.1,
        leftBound: 360,
        rightBound: 580,
        platformY: groundY,
        phaseOffset: Math.PI / 4,
      },
      {
        type: "bat",
        x: 780,
        y: 140,
        width: 36,
        height: 18,
        vx: 1.1,
        speed: 1.1,
        leftBound: 720,
        rightBound: 980,
        baseY: 150,
        amplitude: 26,
        phaseOffset: Math.PI / 3,
        diveTimer: 0,
      },
      {
        type: "bat",
        x: 1220,
        y: 130,
        width: 36,
        height: 18,
        vx: -1.0,
        speed: 1.0,
        leftBound: 1140,
        rightBound: 1340,
        baseY: 140,
        amplitude: 24,
        phaseOffset: Math.PI,
        diveTimer: 0,
      },
      {
        type: "armadillo",
        x: 1480,
        y: groundY - 22,
        width: 26,
        height: 22,
        vx: 1.2,
        speed: 1.2,
        leftBound: 1380,
        rightBound: 1640,
        platformY: groundY,
        phaseOffset: Math.PI / 5,
        rollTimer: 0,
      },
    ],
    backgroundHillsFar: [
      { x: 260, width: 240, height: 90, baseColor: "#412052", shadowColor: "#2a1236" },
      { x: 900, width: 260, height: 95, baseColor: "#412052", shadowColor: "#2a1236" },
      { x: 1520, width: 240, height: 92, baseColor: "#412052", shadowColor: "#2a1236" },
    ],
    backgroundHillsNear: [
      { x: 180, width: 200, height: 80, baseColor: "#5f3179", shadowColor: "#3c1e4f" },
      { x: 780, width: 220, height: 85, baseColor: "#5f3179", shadowColor: "#3c1e4f" },
      { x: 1400, width: 210, height: 82, baseColor: "#5f3179", shadowColor: "#3c1e4f" },
    ],
    backgroundClouds: [
      { x: 220, y: 70, scale: 0.7 },
      { x: 620, y: 80, scale: 0.6 },
      { x: 1040, y: 70, scale: 0.65 },
      { x: 1460, y: 80, scale: 0.6 },
    ],
    ambientSprites: [
      { type: "spark", x: 200, y: 160, amplitude: 28, vx: 0.1, parallax: 0.2, color: "#d8b4ff" },
      { type: "spark", x: 640, y: 150, amplitude: 26, vx: 0.08, parallax: 0.18, color: "#f3d1ff" },
      { type: "spark", x: 1080, y: 160, amplitude: 24, vx: 0.09, parallax: 0.2, color: "#bff6ff" },
      { type: "spark", x: 1520, y: 150, amplitude: 28, vx: 0.11, parallax: 0.18, color: "#ffe29a" },
    ],
  },
];

let levelData = [];
let questionBlocks = [];
let bricks = [];
let coins = [];
let souvenirs = [];
let enemies = [];
let backgroundHillsFar = [];
let backgroundHillsNear = [];
let backgroundClouds = [];
let backgroundSea = null;
let backgroundFish = [];
let ambientSprites = [];
let currentTheme = { skyColor: "#87ceeb", groundColor: "#6b3a1e" };
let souvenirPopupTimer = 0;
let currentLevelSettings = { gravityScale: 1, helmet: false };
let currentGravity = gravity;

function buildPlatformsFromTiles() {
  const platforms = [];

  for (let row = 0; row < levelData.length; row++) {
    const rowString = levelData[row];
    const y = row * tileSize;

    let startX = -1;
    for (let col = 0; col < rowString.length; col++) {
      if (rowString[col] === "X") {
        if (startX === -1) startX = col;
      } else {
        if (startX !== -1) {
          const width = (col - startX) * tileSize;
          platforms.push({
            x: startX * tileSize,
            y,
            width,
            height: 20,
          });
          startX = -1;
        }
      }
    }

    if (startX !== -1) {
      const width = (rowString.length - startX) * tileSize;
      platforms.push({
        x: startX * tileSize,
        y,
        width,
        height: 20,
      });
    }
  }

  return platforms;
}

let platforms = [];

function cloneEntities(list) {
  return list.map((item) => ({ ...item }));
}

function clampEntitiesBeforeFlag(list, flagX, margin = 10) {
  const cutoff = flagX - margin;
  return list.filter((entity) => {
    const width = entity.width || 0;
    return (entity.x || 0) + width <= cutoff;
  });
}

function clampPlatformsBeforeFlag(platformList, flagX) {
  const thresholdY = groundY - tileSize;
  return platformList
    .map((platform) => {
      if (platform.y >= thresholdY) return platform; // leave ground segments intact
      const start = platform.x;
      const end = platform.x + platform.width;
      if (start >= flagX) return null;
      if (end > flagX) {
        return { ...platform, width: Math.max(flagX - start, 0) };
      }
      return platform;
    })
    .filter(Boolean);
}

function resolveAmbientY(sprite) {
  if (typeof sprite.relY === "number") {
    if (backgroundSea) {
      const horizon = backgroundSea.horizonY ?? groundY - 120;
      const height = backgroundSea.height ?? 140;
      return horizon + height * sprite.relY;
    }
    return groundY * sprite.relY;
  }
  if (sprite.y != null) return sprite.y;
  return backgroundSea ? (backgroundSea.horizonY ?? groundY - 100) + 20 : groundY * 0.4;
}

function cloneAmbientSprites(list) {
  return list.map((sprite) => {
    const y = resolveAmbientY(sprite);
    return {
      ...sprite,
      x: sprite.x ?? 0,
      y,
      baseY: sprite.baseY ?? y,
      parallax: sprite.parallax ?? 0.2,
      phase: sprite.phase ?? Math.random() * Math.PI * 2,
      direction: sprite.direction ?? (sprite.vx && sprite.vx < 0 ? -1 : 1),
    };
  });
}

function recomputeWorldWidth() {
  let maxRowLength = 0;
  for (const row of levelData) {
    if (row.length > maxRowLength) maxRowLength = row.length;
  }
  worldWidth = maxRowLength * tileSize;
}

function loadLevelConfig(index) {
  const config = levelConfigs[index] || levelConfigs[levelConfigs.length - 1] || levelConfigs[0];
  levelData = config.levelData.slice();
  questionBlocks = cloneEntities(config.questionBlocks);
  bricks = cloneEntities(config.bricks);
  coins = cloneEntities(config.coins);
  souvenirs = cloneEntities(config.souvenirs);
  enemies = cloneEntities(config.enemies).map((enemy) => ({
    ...enemy,
    dead: false,
    defeated: false,
    fallDelay: 0,
    vy: enemy.vy || 0,
    squishAmount: 0,
  }));
  backgroundHillsFar = cloneEntities(config.backgroundHillsFar);
  backgroundHillsNear = cloneEntities(config.backgroundHillsNear);
  backgroundClouds = cloneEntities(config.backgroundClouds);
  backgroundSea = config.backgroundSea ? { ...config.backgroundSea } : null;
  if (backgroundSea && !backgroundSea.waves) backgroundSea.waves = [];
  backgroundFish = cloneEntities(config.backgroundFish || []).map((fish) => ({
    ...fish,
    bobPhase: fish.bobPhase || 0,
  }));
  ambientSprites = cloneAmbientSprites(config.ambientSprites || []);
  const settings = config.settings || {};
  currentLevelSettings = {
    gravityScale: settings.gravityScale ?? 1,
    helmet: !!settings.helmet,
    playerSpeed: settings.playerSpeed ?? basePlayerSpeed,
    jumpStrength: settings.jumpStrength ?? basePlayerJumpStrength,
  };
  currentGravity = gravity * currentLevelSettings.gravityScale;
  player.speed = currentLevelSettings.playerSpeed;
  player.jumpStrength = currentLevelSettings.jumpStrength;
  player.helmetOn = currentLevelSettings.helmet;
  currentTheme = { ...config.theme };
  platforms = buildPlatformsFromTiles();
  recomputeWorldWidth();
  const flagX = worldWidth - 100;
  questionBlocks = clampEntitiesBeforeFlag(questionBlocks, flagX);
  bricks = clampEntitiesBeforeFlag(bricks, flagX);
  coins = clampEntitiesBeforeFlag(coins, flagX);
  souvenirs = clampEntitiesBeforeFlag(souvenirs, flagX);
  enemies = clampEntitiesBeforeFlag(enemies, flagX);
  platforms = clampPlatformsBeforeFlag(platforms, flagX);
  souvenirPopupTimer = 0;
}

loadLevelConfig(0);

// ------ COINS & LIVES ------
let score = 0;

const maxLives = 3;
let lives = maxLives;

let gameWon = false;
let gameState = "menu"; // "menu", "playing", "gameOver", "win"
let isPaused = false;

let animationFrame = 0;
let invulnerableFrames = 0;
let stompCombo = 0;
let comboTimer = 0;
const comboTimeout = 180;
const heartAnimations = new Array(maxLives).fill(0);

const particles = [];
const AudioContextClass =
  typeof window !== "undefined"
    ? window.AudioContext || window.webkitAudioContext
    : null;
let audioCtx = null;
let soundsEnabled = false;

if (AudioContextClass) {
  try {
    audioCtx = new AudioContextClass();
    soundsEnabled = true;
  } catch (err) {
    console.warn("AudioContext init failed:", err);
    audioCtx = null;
    soundsEnabled = false;
  }
}
let bgMusicPlaying = false;
let musicStep = 0;
let musicTimerId = null;

function playBeep({ frequency = 440, duration = 0.15, type = "square", volume = 0.2 } = {}) {
  if (!soundsEnabled || !audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  gain.gain.value = volume;
  oscillator.connect(gain).connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
}

function playChord(frequencies = [], duration = 0.2, type = "square", volume = 0.15) {
  if (!soundsEnabled || !audioCtx) return;
  const now = audioCtx.currentTime;
  frequencies.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.value = volume / frequencies.length;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + index * 0.01);
    osc.stop(now + duration);
  });
}

const musicSequence = [
  { freq: 262, duration: 0.25 },
  { freq: 330, duration: 0.25 },
  { freq: 392, duration: 0.4 },
  { freq: 330, duration: 0.25 },
  { freq: 262, duration: 0.25 },
  { freq: 349, duration: 0.35 },
  { freq: 415, duration: 0.35 },
  { freq: 349, duration: 0.25 },
  { freq: 294, duration: 0.25 },
  { freq: 262, duration: 0.4 },
];

function ensureBackgroundMusic() {
  if (!soundsEnabled || !audioCtx) return;
  if (bgMusicPlaying) return;
  bgMusicPlaying = true;
  scheduleMusicNote();
}

function scheduleMusicNote() {
  const note = musicSequence[musicStep];
  playBeep({ frequency: note.freq, duration: note.duration, type: "sine", volume: 0.09 });
  musicStep = (musicStep + 1) % musicSequence.length;
  const delay = note.duration * 1000 + 60;
  musicTimerId = setTimeout(scheduleMusicNote, delay);
}

function stopBackgroundMusic() {
  bgMusicPlaying = false;
  if (musicTimerId) {
    clearTimeout(musicTimerId);
    musicTimerId = null;
  }
}

function playCelebrationTune() {
  if (!soundsEnabled || !audioCtx) return;
  const celebration = [
    { freq: 523, duration: 0.3 },
    { freq: 659, duration: 0.3 },
    { freq: 784, duration: 0.3 },
    { freq: 698, duration: 0.35 },
    { freq: 880, duration: 0.4 },
    { freq: 988, duration: 0.4 },
    { freq: 880, duration: 0.3 },
    { freq: 784, duration: 0.3 },
    { freq: 659, duration: 0.35 },
    { freq: 523, duration: 0.4 },
  ];
  let delay = 0;
  celebration.forEach((note) => {
    setTimeout(() => {
      playBeep({ frequency: note.freq, duration: note.duration, type: "triangle", volume: 0.25 });
    }, delay);
    delay += note.duration * 1000;
  });
}

let respawnPauseTimer = 0;

function drawRetroText(text, x, y, options = {}) {
  const {
    size = 24,
    color = "#FFFFFF",
    align = "left",
    baseline = "alphabetic",
    outline = true,
  } = options;
  ctx.save();
  ctx.font = `bold ${size}px 'Courier New', monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (outline) {
    ctx.lineWidth = Math.max(2, size / 8);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineJoin = "round";
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function updateMovingPlatforms() {
  // No moving platforms currently
}

function updateBackgroundFish() {
  if (!backgroundFish.length) return;
  const minX = -300;
  const maxX = worldWidth + 300;
  for (const fish of backgroundFish) {
    const dir = fish.direction || 1;
    const speed = fish.speed || 0.5;
    fish.x = (fish.x ?? 0) + speed * dir;
    if (dir >= 0 && fish.x > maxX) {
      fish.x = minX;
    } else if (dir < 0 && fish.x < minX) {
      fish.x = maxX;
    }
    fish.bobPhase = (fish.bobPhase || 0) + (fish.bobSpeed || 0.02);
  }
}

function updateAmbientSprites() {
  if (!ambientSprites.length) return;
  const minX = -400;
  const maxX = worldWidth + 400;
  for (const sprite of ambientSprites) {
    const type = sprite.type || "spark";
    sprite.phase = (sprite.phase || 0) + (sprite.phaseSpeed || 0.02);
    if (type === "firefly" || type === "spark") {
      const amplitude = sprite.amplitude ?? 20;
      sprite.y = (sprite.baseY ?? sprite.y) + Math.sin(sprite.phase) * amplitude;
      const travel = (sprite.vx ?? 0.2) * (sprite.direction || 1);
      sprite.x += travel;
      if (sprite.x > maxX) sprite.x = minX;
      if (sprite.x < minX) sprite.x = maxX;
    } else if (type === "ember") {
      sprite.y += sprite.vy ?? 1.4;
      sprite.x += sprite.vx ?? 0;
      if (sprite.y > groundY + 40) {
        const resetY = (backgroundSea ? (backgroundSea.horizonY ?? groundY - 120) : 0) - Math.random() * 80;
        sprite.y = resetY;
        sprite.x = Math.random() * (worldWidth + 200) - 100;
      }
    } else if (type === "meteor") {
      sprite.x += sprite.vx ?? 3.4;
      sprite.y += sprite.vy ?? 1.4;
      if (sprite.x > maxX || sprite.y > groundY + 200) {
        sprite.x = -200 - Math.random() * 200;
        sprite.y = Math.random() * 80;
      }
    } else if (type === "spaceship") {
      sprite.x += sprite.vx ?? 1.0;
      sprite.y = (sprite.baseY ?? sprite.y) + Math.sin(sprite.phase) * (sprite.amplitude ?? 15);
      if (sprite.x > maxX) sprite.x = minX;
      if (sprite.x < minX) sprite.x = maxX;
    }
  }
}


const enemyDesigns = {
  crab: {
    shell: "#ff715b",
    shellShadow: "#c44536",
    eye: "#ffffff",
    outline: "#8c2f2c",
  },
  bat: {
    body: "#2f3b4d",
    wing: "#1d252f",
    highlight: "#4d5b70",
    eye: "#f2db6e",
    mouth: "#d94e4e",
  },
  armadillo: {
    shell: "#7c5b3f",
    highlight: "#b48a5c",
    spikes: "#f2e2c4",
    face: "#d9c5a1",
    eye: "#2b1b12",
  },
  jellyfish: {
    bell: "#bde0fe",
    glow: "#79bff7",
    tentacle: "#fdfefe",
    eye: "#203044",
  },
  ufo: {
    hull: "#d0d9ff",
    dome: "#9be7ff",
    light: "#ffef5f",
    trim: "#7f8cba",
  },
  default: {
    body: "#8B0000",
  },
};

// ------ GROWTH POWER-UPS ------
const maxGrowthPowerUps = 2;
const initialGrowthPowerUps = [
  {
    x: 300,
    y: groundY - 34,
    width: 26,
    height: 34,
    direction: 1,
    type: POWER_UP_GROWTH,
  },
  {
    x: 820,
    y: groundY - 34,
    width: 26,
    height: 34,
    direction: -1,
    type: POWER_UP_GROWTH,
  },
];
let growthPowerUps = [];

function resetGrowthPowerUps() {
  growthPowerUps = initialGrowthPowerUps.map((powerUp) => ({
    ...powerUp,
    vx: 0,
    active: false,
    collected: false,
  }));
}

function activeGrowthPowerUpsCount() {
  return growthPowerUps.filter((powerUp) => !powerUp.collected).length;
}

function spawnGrowthPowerUp(spawnX, spawnY, direction = 1) {
  if (activeGrowthPowerUpsCount() >= maxGrowthPowerUps) {
    score += 10;
    const width = 26;
    const cx = spawnX + width / 2;
    const cy = spawnY;
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5,
        life: 18,
        maxLife: 18,
        color: "#ffd54f",
      });
    }
    return false;
  }

  growthPowerUps.push({
    x: spawnX,
    y: spawnY,
    width: 26,
    height: 34,
    vx: 1.5 * Math.sign(direction || 1),
    active: true,
    collected: false,
    direction: Math.sign(direction || 1) || 1,
    type: POWER_UP_GROWTH,
  });
  return true;
}

resetGrowthPowerUps();

// ------ PLAYER STATE HELPERS ------
function makePlayerBig() {
  if (player.state === "big") return;

  player.state = "big";
  // grow upwards so feet stay in place
  const delta = playerBigHeight - playerSmallHeight;
  player.y -= delta;
  player.height = playerBigHeight;
}

function makePlayerSmall() {
  if (player.state === "small") return;

  player.state = "small";
  // shrink downwards a bit
  const delta = playerBigHeight - playerSmallHeight;
  player.y += delta;
  player.height = playerSmallHeight;
}

// ------ RESPAWN & RESET ------
function respawnPlayer() {
  // Put player back at the start
  player.x = 50;
  player.y = 300;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.respawnAnimating = false;
  player.respawnFrame = 0;
  player.fallTriggersGameOver = false;
  stompCombo = 0;
  comboTimer = 0;
  player.idleTimer = 0;
  player.expressionTimer = 0;
  player.currentExpression = "";
  player.celebrationTimer = 0;
  respawnPauseTimer = 0;

  // Reset camera
  cameraX = 0;

  // Temporary invulnerability after a life loss
  invulnerableFrames = 90;
}

function resetGame() {
  // Complete reset for a brand new run
  respawnPlayer();
  makePlayerSmall();
  currentCharacter = levelOrder[currentLevel];
  loadLevelConfig(currentLevel);

  // Reset score
  score = 0;

  // Reset growth power-ups
  resetGrowthPowerUps();

  // Clear particles
  particles.length = 0;

  // Reset lives & win state
  lives = maxLives;
  gameWon = false;

  // Reset flag animation
  flagOffset = 0;
  flagAnimating = false;

  // No invulnerability at very start
  invulnerableFrames = 0;
}

function startGame() {
  resetGame();
  gameState = "playing";
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  ensureBackgroundMusic();
}

// ------ UPDATE LOGIC ------
function update() {
  if (gameState !== "playing" || isPaused) return;

  if (invulnerableFrames > 0) invulnerableFrames--;
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) stompCombo = 0;
  }
  if (souvenirPopupTimer > 0) souvenirPopupTimer--;
  if (player.expressionTimer > 0) {
    player.expressionTimer--;
    if (player.expressionTimer === 0) player.currentExpression = "";
  }

  updateBackgroundFish();
  updateAmbientSprites();

  const prevY = player.y; // used to detect head bumps
  const prevBottom = prevY + player.height;

  if (player.respawnAnimating) {
    player.respawnFrame++;
    if (respawnPauseTimer < 30) {
      respawnPauseTimer++;
    } else {
      player.vy += currentGravity * 1.5;
      player.y += player.vy;
      if (player.y > canvas.height + 100) {
        if (player.fallTriggersGameOver) {
          player.respawnAnimating = false;
          gameState = "gameOver";
        } else {
          respawnPlayer();
        }
      }
    }
    return;
  }

  // Horizontal movement input
  player.vx = 0;

  // Disable controls during flag animation
  if (!flagAnimating) {
    if (keys.left) player.vx = -player.speed;
    if (keys.right) player.vx = player.speed;

    if (keys.up && player.onGround) {
      player.vy = -player.jumpStrength;
      player.onGround = false;
      playBeep({ frequency: 520, duration: 0.1, type: "triangle", volume: 0.12 });
    }
  } else {
    player.vx = 0;
    player.celebrationTimer = Math.max(player.celebrationTimer, 240);
  }

  // Gravity
  player.vy += currentGravity;

  // Apply velocity
  player.x += player.vx;
  player.y += player.vy;

  updateMovingPlatforms();

  if (player.vx > 0.05) {
    player.facing = 1;
  } else if (player.vx < -0.05) {
    player.facing = -1;
  }

  if (Math.abs(player.vx) < 0.1 && Math.abs(player.vy) < 0.1 && player.onGround) {
    player.idleTimer++;
  } else {
    player.idleTimer = 0;
  }

  if (Math.abs(player.vx) > 0.05) {
    player.walkCycle += (Math.abs(player.vx) / player.speed) * 0.4;
  } else {
    player.walkCycle = 0;
  }

  // Stay inside world bounds
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > worldWidth) {
    player.x = worldWidth - player.width;
  }

  // ----- GROUND COLLISION -----
  if (player.y + player.height > groundY) {
    player.y = groundY - player.height;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  // ----- PLATFORM COLLISIONS -----
  for (const p of platforms) {
    const isWithinX =
      player.x + player.width > p.x && player.x < p.x + p.width;
    const isFalling = player.vy >= 0;
    const playerBottom = player.y + player.height;
    const isOnOrJustBelowPlatform =
      playerBottom >= p.y && playerBottom <= p.y + 10;

    if (isWithinX && isFalling && isOnOrJustBelowPlatform) {
      player.y = p.y - player.height;
      player.vy = 0;
      player.onGround = true;
      break;
    }
  }


  // Question blocks act as solid platforms from above
  for (const block of questionBlocks) {
    const isWithinX =
      player.x + player.width > block.x && player.x < block.x + block.width;
    const isFalling = player.vy >= 0;
    const playerBottom = player.y + player.height;
    const isOnOrJustBelowPlatform =
      playerBottom >= block.y && playerBottom <= block.y + 10;

    if (isWithinX && isFalling && isOnOrJustBelowPlatform) {
      player.y = block.y - player.height;
      player.vy = 0;
      player.onGround = true;
      break;
    }
  }

  // Bricks also act as platforms (while not broken)
  for (const brick of bricks) {
    if (brick.broken) continue;

    const isWithinX =
      player.x + player.width > brick.x && player.x < brick.x + brick.width;
    const isFalling = player.vy >= 0;
    const playerBottom = player.y + player.height;
    const isOnOrJustBelowPlatform =
      playerBottom >= brick.y && playerBottom <= brick.y + 10;

    if (isWithinX && isFalling && isOnOrJustBelowPlatform) {
      player.y = brick.y - player.height;
      player.vy = 0;
      player.onGround = true;
      break;
    }
  }

  // Safety: if something goes slightly below ground, still count as onGround
  if (!player.onGround && player.y + player.height >= groundY) {
    player.onGround = true;
  }

  // ----- COIN COLLECTION -----
  for (const coin of coins) {
    if (coin.collected) continue;

    const playerLeft = player.x;
    const playerRight = player.x + player.width;
    const playerTop = player.y;
    const playerBottom = player.y + player.height;

    const coinLeft = coin.x;
    const coinRight = coin.x + coin.width;
    const coinTop = coin.y;
    const coinBottom = coin.y + coin.height;

    if (
      playerRight > coinLeft &&
      playerLeft < coinRight &&
      playerBottom > coinTop &&
      playerTop < coinBottom
    ) {
      coin.collected = true;
      score += 10;
      playBeep({ frequency: 860, type: "sine", duration: 0.1, volume: 0.16 });

      // Coin particles
      const coinCenterX = coin.x + coin.width / 2;
      const coinCenterY = coin.y + coin.height / 2;
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: coinCenterX,
          y: coinCenterY,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 30,
          maxLife: 30,
        });
      }
    }
  }


  // ----- PARTICLE UPDATE -----
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // ----- WIN TRIGGER (start flag animation) -----
  const winX = worldWidth - 100;
  if (player.x >= winX && !gameWon) {
    gameWon = true;
    flagAnimating = true;
    playBeep({ frequency: 660, duration: 0.3, type: "triangle", volume: 0.2 });
    playBeep({ frequency: 880, duration: 0.4, type: "square", volume: 0.25 });
    playCelebrationTune();
    stopBackgroundMusic();
  }

  for (const souvenir of souvenirs) {
    if (souvenir.collected) continue;
    const playerRight = player.x + player.width;
    const playerBottom = player.y + player.height;
    const overlap =
      playerRight > souvenir.x &&
      player.x < souvenir.x + souvenir.width &&
      playerBottom > souvenir.y &&
      player.y < souvenir.y + souvenir.height;
    if (overlap) {
      souvenir.collected = true;
      score += 100;
      souvenirPopupTimer = 120;
      playChord([620, 740], 0.25, "triangle", 0.18);
      for (let i = 0; i < 12; i++) {
        particles.push({
          x: souvenir.x + souvenir.width / 2,
          y: souvenir.y + souvenir.height / 2,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 30,
          maxLife: 30,
          color: "#66e0ff",
        });
      }
    }
  }

  // ----- ENEMY MOVEMENT -----
  const defeatedGravity = 0.65;
  for (const enemy of enemies) {
    if (enemy.dead) continue;

    if (enemy.defeated) {
      enemy.vx = 0;
      enemy.squishAmount = Math.min(0.55, (enemy.squishAmount || 0.35) + 0.03);
      if (enemy.fallDelay && enemy.fallDelay > 0) {
        enemy.fallDelay--;
      } else {
        enemy.vy = (enemy.vy || 0) + defeatedGravity;
        enemy.y += enemy.vy;
        if (enemy.y > canvas.height + enemy.height) {
          enemy.dead = true;
        }
      }
      continue;
    } else if (enemy.squishAmount) {
      enemy.squishAmount = Math.max(0, enemy.squishAmount - 0.08);
    }

    const baseSpeed = enemy.speed || Math.abs(enemy.vx) || 1;
    if (enemy.type === "jellyfish") {
      const drift = enemy.vx || baseSpeed * 0.6;
      enemy.x += drift;
      if (enemy.leftBound != null && enemy.x <= enemy.leftBound) {
        enemy.x = enemy.leftBound;
        enemy.vx = Math.abs(drift);
      } else if (enemy.rightBound != null && enemy.x + enemy.width >= enemy.rightBound) {
        enemy.x = (enemy.rightBound || enemy.x + enemy.width) - enemy.width;
        enemy.vx = -Math.abs(drift);
      }
      const baseY = enemy.baseY ?? enemy.y;
      const amplitude = enemy.amplitude ?? 28;
      enemy.y = baseY + Math.sin(animationFrame * 0.08 + (enemy.phaseOffset || 0)) * amplitude;
      continue;
    }

    if (enemy.type === "bat") {
      const dir = enemy.vx >= 0 ? 1 : -1;
      enemy.vx = (dir === 0 ? 1 : dir) * baseSpeed;
      enemy.x += enemy.vx;
      if (enemy.x <= enemy.leftBound) {
        enemy.x = enemy.leftBound;
        enemy.vx = baseSpeed;
      } else if (enemy.x + enemy.width >= enemy.rightBound) {
        enemy.x = enemy.rightBound - enemy.width;
        enemy.vx = -baseSpeed;
      }

      const baseY = enemy.baseY ?? enemy.y;
      const amplitude = enemy.amplitude ?? 20;
      let waveY =
        baseY +
        Math.sin(animationFrame * 0.15 + (enemy.phaseOffset || 0)) * amplitude;
      if (enemy.diveTimer && enemy.diveTimer > 0) {
        enemy.diveTimer--;
        waveY += 2 + Math.sin(enemy.diveTimer * 0.3) * 2;
      } else {
        const playerCenterX = player.x + player.width / 2;
        const batCenterX = enemy.x + enemy.width / 2;
        if (
          Math.abs(playerCenterX - batCenterX) < 120 &&
          player.y < enemy.y
        ) {
          enemy.diveTimer = 45;
        }
      }
      enemy.y = waveY;
      continue;
    }

    if (enemy.type === "ufo") {
      const dir = enemy.vx >= 0 ? 1 : -1;
      enemy.vx = (dir === 0 ? 1 : dir) * baseSpeed;
      enemy.x += enemy.vx;
      if (enemy.x <= enemy.leftBound) {
        enemy.x = enemy.leftBound;
        enemy.vx = Math.abs(enemy.vx);
      } else if (enemy.x + enemy.width >= enemy.rightBound) {
        enemy.x = enemy.rightBound - enemy.width;
        enemy.vx = -Math.abs(enemy.vx);
      }
      const baseY = enemy.baseY ?? enemy.y;
      const amplitude = enemy.amplitude ?? 18;
      enemy.y = baseY + Math.sin(animationFrame * 0.1 + (enemy.phaseOffset || 0)) * amplitude;
      continue;
    }

    if (enemy.type === "armadillo") {
      if (enemy.rollTimer && enemy.rollTimer > 0) enemy.rollTimer--;
      const rolling = enemy.rollTimer > 0;
      const dir = enemy.vx >= 0 ? 1 : -1;
      const desiredSpeed = baseSpeed * (rolling ? 2 : 1);
      enemy.vx = (dir === 0 ? 1 : dir) * desiredSpeed;
    } else {
      const dir = enemy.vx >= 0 ? 1 : -1;
      enemy.vx = (dir === 0 ? 1 : dir) * baseSpeed;
    }

    enemy.x += enemy.vx;

    if (enemy.x <= enemy.leftBound) {
      enemy.x = enemy.leftBound;
      enemy.vx = Math.abs(enemy.vx);
      if (enemy.type === "armadillo") enemy.rollTimer = 90;
    } else if (enemy.x + enemy.width >= enemy.rightBound) {
      enemy.x = enemy.rightBound - enemy.width;
      enemy.vx = -Math.abs(enemy.vx);
      if (enemy.type === "armadillo") enemy.rollTimer = 90;
    }

    const platformY = enemy.platformY ?? groundY;
    enemy.y = platformY - enemy.height;

    if (enemy.type === "crab") {
      enemy.y += Math.sin(animationFrame * 0.12 + (enemy.phaseOffset || 0)) * 2;
    }

    if (enemy.type === "armadillo" && enemy.rollTimer > 0) {
      enemy.y += Math.sin((enemy.rollTimer / 10) + (enemy.phaseOffset || 0));
    }
  }

  // ----- PLAYER–ENEMY COLLISION -----
  for (const enemy of enemies) {
    if (enemy.dead || enemy.defeated) continue;

    const playerLeft = player.x;
    const playerRight = player.x + player.width;
    const playerTop = player.y;
    const playerBottom = player.y + player.height;

    const enemyLeft = enemy.x;
    const enemyRight = enemy.x + enemy.width;
    const enemyTop = enemy.y;
    const enemyBottom = enemy.y + enemy.height;

    const overlap =
      playerRight > enemyLeft &&
      playerLeft < enemyRight &&
      playerBottom > enemyTop &&
      playerTop < enemyBottom;

    if (!overlap) continue;

    const velocityBonus = Math.min(Math.abs(player.vy) * 1.8, 20);
    const baseMargin = Math.max(14, enemy.height * 0.45);
    const stompMargin = baseMargin + velocityBonus;
    const isFalling = player.vy > 0;
    const playerCenterX = playerLeft + player.width / 2;
    const centerAligned =
      playerCenterX > enemyLeft - 6 && playerCenterX < enemyRight + 6;
    const wasAbove = prevBottom <= enemyTop + stompMargin;
    const nowAbove = playerBottom <= enemyTop + stompMargin;
    const hitFromAbove = isFalling && centerAligned && (nowAbove || wasAbove);

    const stompImmune = enemy.type === "armadillo";
    const airborneEnemy =
      enemy.type === "bat" || enemy.type === "jellyfish" || enemy.type === "ufo";

    if (hitFromAbove && !stompImmune) {
      // Stomp enemy with type-specific reward
      enemy.defeated = true;
      enemy.fallDelay = enemy.type === "bat" ? 6 : 12;
      enemy.vy = 0;
      enemy.squishAmount = Math.max(enemy.squishAmount || 0, airborneEnemy ? 0.3 : 0.45);
      stompCombo = Math.min(stompCombo + 1, 10);
      comboTimer = comboTimeout;
      const comboBonus = stompCombo > 1 ? stompCombo * 5 : 0;
      const stompScore = (airborneEnemy ? 75 : 50) + comboBonus;
      score += stompScore;
      const bounceStrength = airborneEnemy ? 0.9 : 0.7;
      player.vy = -player.jumpStrength * bounceStrength;
      player.onGround = false;
      playChord(
        [480 + stompCombo * 8, 620 + stompCombo * 5],
        0.18,
        "square",
        0.18
      );

      const burstColor =
        enemy.type === "bat" ? "#f7e46a" : "#ffb380";
      const burstCount = airborneEnemy ? 12 : 8;
      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2;
      for (let i = 0; i < burstCount; i++) {
        particles.push({
          x: cx,
          y: cy,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          life: 25,
          maxLife: 25,
          color: burstColor,
        });
      }
      continue;
    }

    // Damage from spikes or side/below collisions
    if (invulnerableFrames > 0) continue;

    if (stompImmune && hitFromAbove) {
      player.vy = -player.jumpStrength * 0.5;
      player.onGround = false;
    }

    if (player.state === "big") {
      makePlayerSmall();
      invulnerableFrames = 60;
      playChord([260, 180], 0.22, "sawtooth", 0.16);
      heartAnimations[lives] = 15;
    } else {
      lives--;
      player.respawnAnimating = true;
      player.respawnFrame = 0;
      player.vx = 0;
      player.vy = -6;
      player.onGround = false;
      player.fallTriggersGameOver = lives <= 0;
      invulnerableFrames = 60;
      player.currentExpression = characters[currentCharacter].expressions?.hit || "ouch";
      player.expressionTimer = 90;
      playChord([200, 160], 0.35, "triangle", 0.25);
      if (lives >= 0) heartAnimations[lives] = 15;
    }

    break;
  }

  // ----- HEAD BUMP: QUESTION BLOCKS + BRICKS -----
  if (player.vy < 0) {
    const playerLeft = player.x;
    const playerRight = player.x + player.width;
    const playerTop = player.y;
    const playerPrevTop = prevY;

    // 1) Hitting ? blocks from below
    for (const block of questionBlocks) {
      const blockLeft = block.x;
      const blockRight = block.x + block.width;
      const blockBottom = block.y + block.height;

      const horizontallyOverlapping =
        playerRight > blockLeft && playerLeft < blockRight;
      const hitFromBelow =
        playerTop <= blockBottom && playerPrevTop > blockBottom;

      if (horizontallyOverlapping && hitFromBelow) {
        // Stop jump at bottom of the block
        player.y = blockBottom;
        player.vy = 0;

        if (!block.used) {
          if (block.reward === "coin") {
            // Reward: coin
            block.used = true;
            score += 10;

            const cx = block.x + block.width / 2;
            const cy = block.y;
            for (let i = 0; i < 8; i++) {
              particles.push({
                x: cx,
                y: cy,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * -3,
                life: 25,
                maxLife: 25,
              });
            }
          } else if (block.reward === POWER_UP_GROWTH) {
            block.used = true;
            const spawnX = block.x + block.width / 2 - 13;
            const spawnY = block.y - 34;
            const launchDir = player.facing >= 0 ? 1 : -1;
            spawnGrowthPowerUp(spawnX, spawnY, launchDir);
          }
        }
      }
    }

    // 2) Hitting bricks from below
    for (const brick of bricks) {
      if (brick.broken) continue;

      const brickLeft = brick.x;
      const brickRight = brick.x + brick.width;
      const brickBottom = brick.y + brick.height;

      const horizontallyOverlapping =
        playerRight > brickLeft && playerLeft < brickRight;
      const hitFromBelow =
        playerTop <= brickBottom && playerPrevTop > brickBottom;

      if (horizontallyOverlapping && hitFromBelow) {
        // Stop jump at bottom of the brick
        player.y = brickBottom;
        player.vy = 0;

        if (player.state === "big") {
          // Big player breaks bricks into particles
          brick.broken = true;

          const cx = brick.x + brick.width / 2;
          const cy = brick.y + brick.height / 2;
          for (let i = 0; i < 12; i++) {
            particles.push({
              x: cx,
              y: cy,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * -4,
              life: 20,
              maxLife: 20,
            });
          }
        }
      }
    }
  }

  // ----- GROWTH POWER-UPS: MOVEMENT & COLLECTION -----
  for (const growth of growthPowerUps) {
    if (growth.collected) continue;

    // Auto-activate when player gets close
    const activationDistance = 150;
    if (!growth.active && Math.abs(player.x - growth.x) < activationDistance) {
      growth.active = true;
      growth.vx = 1.5 * growth.direction;
    }

    // Horizontal movement
    if (growth.active) {
      growth.x += growth.vx;
      if (growth.x < 0) {
        growth.x = 0;
        growth.vx = Math.abs(growth.vx);
      }
      if (growth.x + growth.width > worldWidth) {
        growth.x = worldWidth - growth.width;
        growth.vx = -Math.abs(growth.vx);
      }
    }

    // Keep capsules on the ground (simple version)
    growth.y = groundY - growth.height;

    // Collision with player
    const playerLeft = player.x;
    const playerRight = player.x + player.width;
    const playerTop = player.y;
    const playerBottom = player.y + player.height;

    const powerLeft = growth.x;
    const powerRight = growth.x + growth.width;
    const powerTop = growth.y;
    const powerBottom = growth.y + growth.height;

    const overlap =
      playerRight > powerLeft &&
      playerLeft < powerRight &&
      playerBottom > powerTop &&
      playerTop < powerBottom;

    if (overlap) {
      // Collect capsule -> big player
      growth.collected = true;
      growth.active = false;
      makePlayerBig();
      score += 50;

      // Small particle burst on pickup
      const centerX = growth.x + growth.width / 2;
      const centerY = growth.y + growth.height / 2;
      for (let i = 0; i < 10; i++) {
        particles.push({
          x: centerX,
          y: centerY,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          life: 25,
          maxLife: 25,
        });
      }
    }
  }

  // ----- CAMERA FOLLOW -----
  cameraX = player.x - canvas.width / 2;
  if (cameraX < 0) cameraX = 0;
  if (cameraX > worldWidth - canvas.width) {
    cameraX = worldWidth - canvas.width;
  }

  // ----- FLAG ANIMATION -----
  if (flagAnimating) {
    const flagPoleHeight = 100;
    const flagHeight = 40;
    const maxOffset = flagPoleHeight - flagHeight;
    const speed = 0.4;

    if (flagOffset < maxOffset) {
      flagOffset += speed;
      if (flagOffset > maxOffset) flagOffset = maxOffset;
    } else {
      flagAnimating = false;
      gameState = "win";
    }
  }
}

// ------ PLAYER RENDER: CHARACTER SPRITE ------
// Draw the current brother with Mario-inspired proportions and walking animations.
function drawPlayer() {
  const screenX = player.x - cameraX;
  const screenY = player.y;
  const w = player.width;
  const h = player.height;
  const char = characters[currentCharacter];
  const skinTone = "#f5c49b";
  const facing = player.facing || 1;
  const walkPhase = player.walkCycle || 0;
  const walkStrength = Math.min(Math.abs(player.vx) / player.speed, 1) * (player.onGround ? 1 : 0.5);
  
  ctx.save();
  ctx.translate(screenX + w / 2, screenY);
  ctx.scale(facing, 1);
  ctx.translate(-w / 2, 0);

  const unit = h / 20;
  const hatHeight = unit * 4.2;
  const faceHeight = unit * 7;
  const headHeight = hatHeight + faceHeight;
  const torsoHeight = unit * 7;
  const minLeg = unit * 3.5;
  let legsHeight = h - headHeight - torsoHeight;
  if (legsHeight < minLeg) legsHeight = minLeg;
  const extra = headHeight + torsoHeight + legsHeight - h;
  if (extra > 0) legsHeight -= extra;

  const headTop = 0;
  const faceTop = headTop + hatHeight * 0.8;
  const torsoTop = headTop + headHeight;
  const legsTop = torsoTop + torsoHeight;
  const centerX = w / 2;
  const bodyWidth = w * 0.58;
  const torsoX = centerX - bodyWidth / 2;
  const style = char.style || "captain";
  let armColor = char.coatColor || char.shirtColor || char.overallColor || "#555";

  // -------- LEGS & SHOES WITH ANIMATION --------
  const legWidth = bodyWidth * 0.28;
  const legLength = legsHeight;
  const legSpread = bodyWidth * 0.3;

  function drawLeg(side) {
    const phase = side > 0 ? Math.PI : 0;
    let cycle = walkPhase;
    if (player.celebrationTimer > 0) {
      cycle += player.celebrationTimer * 0.2;
    }
    const applyStrength = player.celebrationTimer > 0 ? 0.6 : walkStrength;
    const angle = Math.sin(cycle + phase) * 0.35 * applyStrength;
    const pivotX = centerX + side * legSpread;
    const pivotY = legsTop;
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angle);
    ctx.fillStyle = char.pantsColor || "#333333";
    ctx.fillRect(-legWidth / 2, 0, legWidth, legLength);
    ctx.fillStyle = char.shoeColor || "#111111";
    ctx.fillRect(-legWidth / 2 - unit * 0.2, legLength - unit * 1.1, legWidth + unit * 0.4, unit * 1.1);
    ctx.restore();
  }
  drawLeg(-1);
  drawLeg(1);

  // -------- TORSO & OUTFIT --------
  if (style === "overalls") {
    armColor = char.undershirtColor;
    ctx.fillStyle = char.undershirtColor;
    ctx.fillRect(torsoX, torsoTop - unit * 0.4, bodyWidth, torsoHeight + unit * 0.4);

    ctx.fillStyle = char.overallColor;
    ctx.fillRect(torsoX + unit * 0.3, torsoTop + unit * 0.6, bodyWidth - unit * 0.6, torsoHeight - unit * 0.8);
    ctx.fillRect(torsoX + unit * 0.3, torsoTop + unit * 0.6, bodyWidth - unit * 0.6, unit * 2.2);

    ctx.fillStyle = char.strapColor;
    const strapWidth = unit * 1;
    ctx.fillRect(torsoX + unit * 0.5, torsoTop - unit * 0.4, strapWidth, torsoHeight);
    ctx.fillRect(torsoX + bodyWidth - strapWidth - unit * 0.5, torsoTop - unit * 0.4, strapWidth, torsoHeight);

    ctx.fillStyle = "#ffe9a8";
    ctx.beginPath();
    ctx.arc(torsoX + unit * 1.2, torsoTop + unit * 1.8, unit * 0.35, 0, Math.PI * 2);
    ctx.arc(torsoX + bodyWidth - unit * 1.2, torsoTop + unit * 1.8, unit * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "hawaiian") {
    armColor = char.shirtColor;
    ctx.fillStyle = char.shirtColor;
    ctx.fillRect(torsoX, torsoTop, bodyWidth, torsoHeight);

    ctx.fillStyle = char.patternColors[0];
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        ctx.fillRect(
          torsoX + unit * 0.5 + x * unit * 1.4,
          torsoTop + unit * 0.4 + y * unit,
          unit * 0.45,
          unit * 0.45
        );
      }
    }
    ctx.fillStyle = char.patternColors[1];
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(
        torsoX + unit * (1.2 + i * 1.8),
        torsoTop + unit * (0.9 + (i % 2)),
        unit * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Collar
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(torsoX, torsoTop + unit * 0.2);
    ctx.lineTo(torsoX + unit * 1.6, torsoTop + unit * 1.5);
    ctx.lineTo(centerX, torsoTop - unit * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(torsoX + bodyWidth, torsoTop + unit * 0.2);
    ctx.lineTo(torsoX + bodyWidth - unit * 1.6, torsoTop + unit * 1.5);
    ctx.lineTo(centerX, torsoTop - unit * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (style === "plaid") {
    const plaid =
      char.plaidColors || {
        base: "#c62828",
        deep: "#8b1f1f",
        stripe: "#141414",
        highlight: "rgba(255,255,255,0.1)",
      };
    const buttonColor = char.buttonColor || "#f4d5a7";
    armColor = char.shirtColor || plaid.base;

    // Base shirt
    ctx.fillStyle = plaid.base;
    ctx.fillRect(torsoX, torsoTop, bodyWidth, torsoHeight);

    // Soft highlight gradient
    const gradient = ctx.createLinearGradient(0, torsoTop, 0, torsoTop + torsoHeight);
    gradient.addColorStop(0, plaid.highlight);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(torsoX, torsoTop, bodyWidth, torsoHeight);

    // Deep red stripes
    ctx.fillStyle = plaid.deep;
    const stripeSpacing = unit * 1.3;
    for (let x = torsoX - unit * 0.2; x <= torsoX + bodyWidth; x += stripeSpacing) {
      ctx.fillRect(x, torsoTop, unit * 0.45, torsoHeight);
    }

    // Dark crossover stripes
    ctx.fillStyle = plaid.stripe;
    const horizontalSpacing = unit * 1.4;
    for (let y = torsoTop + unit * 0.3; y < torsoTop + torsoHeight; y += horizontalSpacing) {
      ctx.fillRect(torsoX, y, bodyWidth, unit * 0.35);
    }
    const thinVerticalSpacing = unit * 2.2;
    for (let x = torsoX + unit * 0.5; x < torsoX + bodyWidth; x += thinVerticalSpacing) {
      ctx.fillRect(x, torsoTop, unit * 0.2, torsoHeight);
    }

    // Collar triangles
    ctx.fillStyle = plaid.stripe;
    ctx.beginPath();
    ctx.moveTo(torsoX + unit * 0.4, torsoTop + unit * 0.6);
    ctx.lineTo(centerX, torsoTop - unit * 0.1);
    ctx.lineTo(centerX - unit * 0.6, torsoTop + unit * 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(torsoX + bodyWidth - unit * 0.4, torsoTop + unit * 0.6);
    ctx.lineTo(centerX, torsoTop - unit * 0.1);
    ctx.lineTo(centerX + unit * 0.6, torsoTop + unit * 1.6);
    ctx.closePath();
    ctx.fill();

    // Buttons down the center
    ctx.fillStyle = buttonColor;
    for (let i = 0; i < 4; i++) {
      const by = torsoTop + unit * (0.9 + i * 1.4);
      ctx.beginPath();
      ctx.arc(centerX, by, unit * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    armColor = char.coatColor;
    ctx.fillStyle = char.coatColor;
    ctx.fillRect(torsoX, torsoTop, bodyWidth, torsoHeight);

    ctx.fillStyle = char.coatTrimColor;
    ctx.fillRect(torsoX + unit * 0.4, torsoTop, unit * 0.5, torsoHeight);
    ctx.fillRect(torsoX + bodyWidth - unit * 0.9, torsoTop, unit * 0.5, torsoHeight);
    ctx.fillRect(torsoX, torsoTop + torsoHeight - unit * 0.9, bodyWidth, unit * 0.8);

    ctx.fillStyle = "#f9d978";
    for (let i = 0; i < 3; i++) {
      const by = torsoTop + unit * (0.9 + i * 1.2);
      ctx.beginPath();
      ctx.arc(centerX, by, unit * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = char.beltColor;
    ctx.fillRect(torsoX, torsoTop + torsoHeight * 0.55, bodyWidth, unit * 0.9);
  }

  // -------- ARMS WITH SWING --------
  const armWidth = w * 0.18;
  const armLength = torsoHeight * 0.9;
  const armPivotY = torsoTop + unit * 1.1;
  const armPivotXOffset = bodyWidth / 2 + unit * 0.5;

  function drawArm(side) {
    const phase = side > 0 ? 0 : Math.PI;
    let cycle = walkPhase;
    if (player.celebrationTimer > 0) cycle += player.celebrationTimer * 0.2;
    const applyStrength = player.celebrationTimer > 0 ? 0.5 : walkStrength;
    const angle = Math.sin(cycle + phase) * 0.25 * applyStrength;
    const pivotX = centerX + side * armPivotXOffset;
    const pivotY = armPivotY;
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angle);
    ctx.fillStyle = armColor;
    ctx.fillRect(-armWidth / 2, 0, armWidth, armLength);
    if (style === "plaid") {
      const plaid =
        char.plaidColors || {
          base: "#c62828",
          deep: "#8b1f1f",
          stripe: "#141414",
        };
      ctx.fillStyle = plaid.deep;
      const armStripeSpacing = unit * 1.2;
      for (let x = -armWidth / 2 - unit * 0.2; x < armWidth / 2; x += armStripeSpacing) {
        ctx.fillRect(x, 0, unit * 0.35, armLength);
      }
      ctx.fillStyle = plaid.stripe;
      for (let y = unit * 0.3; y < armLength; y += unit * 1.3) {
        ctx.fillRect(-armWidth / 2, y, armWidth, unit * 0.25);
      }
      for (let x = -armWidth / 2 + unit * 0.3; x < armWidth / 2; x += unit * 1.8) {
        ctx.fillRect(x, 0, unit * 0.18, armLength);
      }
    }
    ctx.restore();
    const handX = pivotX + Math.sin(angle) * (armLength - unit * 0.4);
    const handY = pivotY + Math.cos(angle) * (armLength - unit * 0.4);
    return { x: handX, y: handY };
  }

  const leftHand = drawArm(-1);
  const rightHand = drawArm(1);

  // -------- ACCESSORIES (between arms and hands) --------
  function drawAccessory() {
    if (char.accessory === "shark") {
      const sharkWidth = bodyWidth * 0.9;
      const sharkHeight = unit * 2;
      const sharkX = centerX - sharkWidth / 2;
      const sharkY = torsoTop + torsoHeight * 0.4;
      ctx.fillStyle = "#7aa9c9";
      ctx.beginPath();
      ctx.moveTo(sharkX, sharkY + sharkHeight / 2);
      ctx.quadraticCurveTo(
        sharkX + sharkWidth * 0.45,
        sharkY - sharkHeight * 0.5,
        sharkX + sharkWidth,
        sharkY + sharkHeight / 2
      );
      ctx.quadraticCurveTo(
        sharkX + sharkWidth * 0.5,
        sharkY + sharkHeight * 1.1,
        sharkX,
        sharkY + sharkHeight / 2
      );
      ctx.fill();
      ctx.fillStyle = "#0f1b2f";
      ctx.beginPath();
      ctx.arc(sharkX + sharkWidth * 0.78, sharkY + sharkHeight * 0.35, unit * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6f9bbd";
      ctx.beginPath();
      ctx.moveTo(sharkX + sharkWidth * 0.35, sharkY + sharkHeight * 0.15);
      ctx.lineTo(sharkX + sharkWidth * 0.48, sharkY - sharkHeight * 0.35);
      ctx.lineTo(sharkX + sharkWidth * 0.58, sharkY + sharkHeight * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (char.accessory === "mushroom") {
      const hand = char.accessoryHand === "left" ? leftHand : rightHand;
      const mushRadius = unit * 1.2;
      ctx.fillStyle = "#ff5c5c";
      ctx.beginPath();
      ctx.arc(hand.x, hand.y - mushRadius * 0.5, mushRadius, Math.PI, 0);
      ctx.lineTo(hand.x + mushRadius, hand.y);
      ctx.lineTo(hand.x - mushRadius, hand.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(hand.x - unit * 0.4, hand.y - mushRadius * 0.9, unit * 0.35, 0, Math.PI * 2);
      ctx.arc(hand.x + unit * 0.4, hand.y - mushRadius * 0.7, unit * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f7dcb1";
      ctx.fillRect(hand.x - mushRadius * 0.5, hand.y, mushRadius, unit * 0.9);
    } else if (char.accessory === "fireflower") {
      const hand = char.accessoryHand === "right" ? rightHand : leftHand;
      ctx.fillStyle = "#ff8b1f";
      ctx.beginPath();
      ctx.arc(hand.x, hand.y - unit * 1.2, unit * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe6a7";
      ctx.beginPath();
      ctx.arc(hand.x, hand.y - unit * 1.2, unit * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3e8b30";
      ctx.fillRect(hand.x - unit * 0.15, hand.y - unit * 1, unit * 0.3, unit * 1.8);
      ctx.beginPath();
      ctx.moveTo(hand.x - unit * 0.7, hand.y - unit * 0.5);
      ctx.lineTo(hand.x - unit * 0.2, hand.y - unit * 0.2);
      ctx.lineTo(hand.x - unit * 0.8, hand.y + unit * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }
  drawAccessory();

  // -------- HANDS --------
  ctx.fillStyle = char.glovesColor || skinTone;
  const handRadius = unit * 0.8;
  function drawHand(pos) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, handRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  drawHand(leftHand);
  drawHand(rightHand);

  if (style === "captain") {
    ctx.fillStyle = "#f9d978";
    ctx.fillRect(leftHand.x - handRadius, leftHand.y - unit * 0.2, handRadius * 2, unit * 0.3);
    ctx.fillRect(rightHand.x - handRadius, rightHand.y - unit * 0.2, handRadius * 2, unit * 0.3);
  }

  // -------- FACE --------
  const faceWidth = w * 0.65;
  const faceX = centerX - faceWidth / 2;

  ctx.fillStyle = skinTone;
  ctx.fillRect(faceX, faceTop, faceWidth, faceHeight);

  if (char.beardColor) {
    ctx.fillStyle = char.beardColor;
    ctx.fillRect(faceX, faceTop + faceHeight * 0.55, faceWidth, faceHeight * 0.45);
  }

  const earRadius = unit * 0.5;
  ctx.beginPath();
  ctx.arc(faceX - earRadius * 0.2, faceTop + faceHeight * 0.6, earRadius, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(faceX + faceWidth + earRadius * 0.2, faceTop + faceHeight * 0.6, earRadius, Math.PI * 1.5, Math.PI * 0.5, true);
  ctx.fillStyle = skinTone;
  ctx.fill();

  const eyeY = faceTop + faceHeight * 0.4;
  const eyeOffsetX = faceWidth * 0.22;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(centerX - eyeOffsetX, eyeY, unit * 0.3, 0, Math.PI * 2);
  ctx.arc(centerX + eyeOffsetX, eyeY, unit * 0.3, 0, Math.PI * 2);
  ctx.fill();

  if (char.hasGlasses) {
    ctx.strokeStyle = "#2f2f2f";
    ctx.lineWidth = unit * 0.15;
    const lensWidth = unit * 1.5;
    const lensHeight = unit * 1;
    const lensY = eyeY - lensHeight / 2;
    ctx.strokeRect(centerX - eyeOffsetX - lensWidth / 2, lensY, lensWidth, lensHeight);
    ctx.strokeRect(centerX + eyeOffsetX - lensWidth / 2, lensY, lensWidth, lensHeight);
    ctx.beginPath();
    ctx.moveTo(centerX - lensWidth / 2, eyeY);
    ctx.lineTo(centerX + lensWidth / 2, eyeY);
    ctx.stroke();
  }

  ctx.strokeStyle = "#1b1b1b";
  ctx.lineWidth = unit * 0.2;
  ctx.beginPath();
  ctx.moveTo(centerX - eyeOffsetX - unit * 0.4, eyeY - unit * 0.7);
  ctx.lineTo(centerX - eyeOffsetX + unit * 0.4, eyeY - unit * 0.7);
  ctx.moveTo(centerX + eyeOffsetX - unit * 0.4, eyeY - unit * 0.7);
  ctx.lineTo(centerX + eyeOffsetX + unit * 0.4, eyeY - unit * 0.7);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX, eyeY);
  ctx.lineTo(centerX, faceTop + faceHeight * 0.72);
  ctx.stroke();

  ctx.fillStyle = char.moustacheColor || "#000000";
  const mustacheY = faceTop + faceHeight * 0.6;
  ctx.fillRect(centerX - faceWidth * 0.3, mustacheY, faceWidth * 0.6, unit * 0.5);

  // -------- HAT --------
  ctx.fillStyle = char.hatColor;
  ctx.fillRect(centerX - w * 0.33, headTop + unit * 0.1, w * 0.66, hatHeight * 0.8);
  ctx.fillStyle = char.hatBrimColor;
  ctx.fillRect(centerX - w * 0.4, headTop + hatHeight * 0.85, w * 0.8, unit * 0.9);

  const badgeRadius = unit * 0.85;
  const badgeCx = centerX;
  const badgeCy = headTop + hatHeight * 0.75;
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(badgeCx, badgeCy, badgeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = char.hatColor;
  ctx.font = `${unit * 1.5}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char.badgeLetter, badgeCx, badgeCy + unit * 0.05);

  // -------- SCARVES / COLLARS --------
  if (style === "captain" && char.hasScarf) {
    ctx.fillStyle = char.scarfColor;
    ctx.fillRect(torsoX, torsoTop - unit * 0.4, bodyWidth, unit * 0.8);
    ctx.fillRect(centerX + unit * 1.2, torsoTop, unit * 1.3, unit * 2.6);
  } else if (style === "plaid" && char.scarfColor) {
    const scarfHeight = unit * 0.8;
    ctx.fillStyle = char.scarfColor;
    ctx.fillRect(torsoX - unit * 0.2, torsoTop - scarfHeight / 2, bodyWidth + unit * 0.4, scarfHeight);
    ctx.fillRect(centerX + unit * 0.6, torsoTop + scarfHeight / 2, unit * 1.2, unit * 2.8);
  } else if (style === "overalls") {
    ctx.fillStyle = char.undershirtColor;
    ctx.fillRect(torsoX, torsoTop - unit * 0.2, bodyWidth, unit * 0.5);
  }

  if (player.helmetOn) {
    ctx.save();
    const visorRadius = faceWidth * 0.8;
    const visorCenterY = faceTop + faceHeight * 0.5;
    ctx.strokeStyle = "rgba(173,216,255,0.8)";
    ctx.lineWidth = unit * 0.5;
    ctx.beginPath();
    ctx.arc(centerX, visorCenterY, visorRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(120,180,255,0.15)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(centerX - visorRadius * 0.4, visorCenterY - visorRadius * 0.3, visorRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawEnemySprite(enemy) {
  if (enemy.dead) return;
  const design = enemyDesigns[enemy.type] || enemyDesigns.default;
  const screenX = enemy.x - cameraX;
  const screenY = enemy.y;
  const w = enemy.width;
  const h = enemy.height;
  const phase =
    animationFrame * 0.15 + (enemy.phaseOffset ? enemy.phaseOffset : 0);
  const squishAmount = Math.max(enemy.squishAmount || 0, 0);

  ctx.save();
  if (squishAmount > 0) {
    const anchorX = screenX + w / 2;
    const anchorY = screenY + h;
    const scaleX = 1 + squishAmount * 0.4;
    const scaleY = Math.max(0.3, 1 - squishAmount);
    ctx.translate(anchorX, anchorY);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-anchorX, -anchorY);
  }

  if (enemy.type === "crab") {
    const unit = h / 8;
    const bodyHeight = h * 0.6;
    const bodyY = screenY + h - bodyHeight;
    ctx.fillStyle = design.shell;
    ctx.beginPath();
    ctx.ellipse(
      screenX + w / 2,
      bodyY + bodyHeight / 2,
      w / 2,
      bodyHeight / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = design.shellShadow;
    ctx.beginPath();
    ctx.ellipse(
      screenX + w / 2,
      bodyY + bodyHeight / 2 + unit * 0.2,
      w / 2.3,
      bodyHeight / 2.8,
      0,
      0,
      Math.PI
    );
    ctx.fill();

    const legWave = Math.sin(phase) * unit * 0.7;
    ctx.strokeStyle = design.outline;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const legY = screenY + h - unit * (0.4 + i * 0.4);
        ctx.beginPath();
        const startX = screenX + w / 2 + side * (w * 0.35);
        ctx.moveTo(startX, legY);
        ctx.lineTo(
          startX + side * (unit * 1.2),
          legY + (i === 0 ? legWave : -legWave)
        );
        ctx.stroke();
      }
      // Claws
      ctx.beginPath();
      const clawY = screenY + h - unit * 2.2;
      const clawX = screenX + w / 2 + side * (w * 0.5);
      ctx.moveTo(clawX, clawY);
      ctx.lineTo(clawX + side * unit * 0.8, clawY - unit * 0.4);
      ctx.lineTo(clawX + side * unit * 0.6, clawY + unit * 0.4);
      ctx.closePath();
      ctx.fillStyle = design.shellShadow;
      ctx.fill();
    }

    // Eyes on stalks
    const eyeRise = Math.sin(phase * 1.5) * unit * 0.6;
    ctx.strokeStyle = design.outline;
    ctx.lineWidth = 2;
    for (const offset of [-unit * 1, unit * 1]) {
      ctx.beginPath();
      ctx.moveTo(screenX + w / 2 + offset, bodyY + unit);
      ctx.lineTo(
        screenX + w / 2 + offset,
        bodyY - unit * 0.8 - eyeRise
      );
      ctx.stroke();
      ctx.fillStyle = design.eye;
      ctx.beginPath();
      ctx.arc(
        screenX + w / 2 + offset,
        bodyY - unit * 1.3 - eyeRise,
        unit * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.fillStyle = design.outline;
      ctx.beginPath();
      ctx.arc(
        screenX + w / 2 + offset,
        bodyY - unit * 1.3 - eyeRise,
        unit * 0.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (enemy.type === "bat") {
    const unit = h / 6;
    const centerX = screenX + w / 2;
    const centerY = screenY + h / 2;
    const flap = Math.sin(phase * 2.5) * unit * 1.2;

    // Wings
    ctx.fillStyle = design.wing;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.quadraticCurveTo(
        centerX + side * w * 0.4,
        centerY - unit * 0.2 - flap,
        centerX + side * w * 0.6,
        centerY + unit * 0.8
      );
      ctx.quadraticCurveTo(
        centerX + side * w * 0.3,
        centerY + unit * 0.2,
        centerX,
        centerY
      );
      ctx.fill();
    }

    // Body
    ctx.fillStyle = design.body;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, w * 0.2, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(centerX + w * 0.05, centerY - unit * 0.8, unit * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(centerX - unit * 0.2, centerY - unit * 1.5);
    ctx.lineTo(centerX - unit * 0.6, centerY - unit * 0.8);
    ctx.lineTo(centerX - unit * 0.1, centerY - unit * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(centerX + unit * 0.2, centerY - unit * 1.5);
    ctx.lineTo(centerX + unit * 0.6, centerY - unit * 0.8);
    ctx.lineTo(centerX + unit * 0.1, centerY - unit * 0.9);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = design.eye;
    ctx.beginPath();
    ctx.arc(centerX - unit * 0.1, centerY - unit, unit * 0.15, 0, Math.PI * 2);
    ctx.arc(centerX + unit * 0.2, centerY - unit, unit * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = design.mouth;
    ctx.lineWidth = unit * 0.1;
    ctx.beginPath();
    ctx.moveTo(centerX - unit * 0.15, centerY - unit * 0.6);
    ctx.lineTo(centerX + unit * 0.25, centerY - unit * 0.6);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (enemy.type === "jellyfish") {
    const unit = h / 6;
    const centerX = screenX + w / 2;
    const centerY = screenY + h / 2;
    const bob = Math.sin(phase * 1.5) * unit * 0.3;
    ctx.fillStyle = design.glow;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + bob, w / 2, h / 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = design.bell;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - unit * 0.4 + bob, w / 2, h / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - unit * 0.6 + bob, w / 2.3, h / 3.2, 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = design.tentacle;
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX + i * unit * 0.8, screenY + h - unit * 1.2);
      ctx.quadraticCurveTo(
        centerX + i * unit * 1.2,
        screenY + h - unit * 0.2,
        centerX + i * unit * 0.6,
        screenY + h + unit * 0.4
      );
      ctx.stroke();
    }
    ctx.fillStyle = design.eye;
    ctx.beginPath();
    ctx.arc(centerX - unit * 0.4, centerY - unit * 0.2, unit * 0.2, 0, Math.PI * 2);
    ctx.arc(centerX + unit * 0.4, centerY - unit * 0.2, unit * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (enemy.type === "ufo") {
    const centerX = screenX + w / 2;
    const centerY = screenY + h / 2;
    ctx.fillStyle = design.hull;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, w / 2, h / 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = design.trim;
    ctx.fillRect(centerX - w * 0.45, centerY + h * 0.1, w * 0.9, h * 0.2);
    ctx.fillStyle = design.dome;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - h * 0.2, w / 3, h / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = design.light;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(centerX + i * w * 0.25, centerY + h * 0.2, h * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (enemy.type === "armadillo") {
    const unit = h / 6;
    const rolling = enemy.rollTimer && enemy.rollTimer > 0;
    const bodyHeight = h * 0.9;
    const bodyY = screenY + h - bodyHeight;
    const centerX = screenX + w / 2;

    ctx.fillStyle = design.shell;
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      bodyY + bodyHeight / 2,
      w / 2,
      bodyHeight / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = design.highlight;
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      bodyY + bodyHeight / 2,
      w / 2.5,
      bodyHeight / 2.5,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Segments
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      const segX = screenX + (w / 4) * i;
      ctx.beginPath();
      ctx.moveTo(segX, bodyY + unit * 0.5);
      ctx.lineTo(segX, bodyY + bodyHeight - unit * 0.5);
      ctx.stroke();
    }

    // Spikes
    ctx.fillStyle = design.spikes;
    const spikeCount = 6;
    for (let i = 0; i < spikeCount; i++) {
      ctx.beginPath();
      const startX =
        screenX + unit * 0.5 + (i / spikeCount) * (w - unit);
      ctx.moveTo(startX, bodyY + unit * 0.6);
      ctx.lineTo(startX + unit * 0.3, bodyY - unit * 1.2);
      ctx.lineTo(startX + unit * 0.6, bodyY + unit * 0.6);
      ctx.closePath();
      ctx.fill();
    }

    // Head
    ctx.fillStyle = design.face;
    const headPos =
      enemy.vx >= 0 ? screenX + w - unit * 0.5 : screenX + unit * 0.5;
    ctx.beginPath();
    ctx.arc(headPos, bodyY + bodyHeight * 0.6, unit * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = design.eye;
    ctx.beginPath();
    const eyeDir = enemy.vx >= 0 ? -1 : 1;
    ctx.arc(
      headPos + eyeDir * unit * 0.3,
      bodyY + bodyHeight * 0.55,
      unit * 0.2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (rolling) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        centerX,
        bodyY + bodyHeight / 2,
        w / 2.5,
        Math.sin(phase) * Math.PI,
        Math.sin(phase) * Math.PI + Math.PI / 1.5
      );
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  // Default fallback
  ctx.fillStyle = design.body || "#8B0000";
  ctx.fillRect(screenX, screenY, w, h);
  ctx.restore();
}

// ------ HEARTS HUD ------
function drawHearts() {
  const baseSize = 18;
  const spacing = 10;
  const totalWidth = maxLives * baseSize + (maxLives - 1) * spacing;
  const startX = canvas.width - totalWidth - 10;
  const y = 15;

  for (let i = 0; i < maxLives; i++) {
    const anim = Math.max(heartAnimations[i], 0);
    const size = baseSize + anim * 0.4;
    const x = startX + i * (baseSize + spacing);
    const filled = i < lives;
    drawHeart(x, y, size, filled);
    if (heartAnimations[i] > 0) heartAnimations[i] -= 1;
  }
}

// Draw a single heart icon
function drawHeart(x, y, size, filled) {
  const topCurveHeight = size * 0.3;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(
    x,
    y,
    x - size / 2,
    y,
    x - size / 2,
    y + topCurveHeight
  );
  ctx.bezierCurveTo(
    x - size / 2,
    y + (size + topCurveHeight) / 2,
    x,
    y + (size * 3) / 4,
    x,
    y + size
  );
  ctx.bezierCurveTo(
    x,
    y + (size * 3) / 4,
    x + size / 2,
    y + (size + topCurveHeight) / 2,
    x + size / 2,
    y + topCurveHeight
  );
  ctx.bezierCurveTo(
    x + size / 2,
    y,
    x,
    y,
    x,
    y + topCurveHeight
  );
  ctx.closePath();

  if (filled) {
    ctx.fillStyle = "#ff0000";
    ctx.fill();
  } else {
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

// ------ BACKGROUND & TILE DRAW HELPERS ------
function drawBackgroundHillsLayer(hills, parallax) {
  for (const hill of hills) {
    const centerX = hill.x - cameraX * parallax;
    const left = centerX - hill.width / 2;
    const right = centerX + hill.width / 2;
    const top = groundY - hill.height;

    // Main hill body
    ctx.fillStyle = hill.baseColor;
    ctx.beginPath();
    ctx.moveTo(left, groundY);
    ctx.quadraticCurveTo(centerX, top, right, groundY);
    ctx.closePath();
    ctx.fill();

    // Side shadow shape
    ctx.fillStyle = hill.shadowColor;
    ctx.beginPath();
    ctx.moveTo(centerX, groundY);
    ctx.quadraticCurveTo(
      centerX + hill.width * 0.2,
      top + hill.height * 0.3,
      right,
      groundY
    );
    ctx.closePath();
    ctx.fill();
  }
}

function drawBackgroundClouds() {
  const parallax = 0.15; // slower than hills

  for (const cloud of backgroundClouds) {
    const screenX = cloud.x - cameraX * parallax;
    drawCloudShape(screenX, cloud.y, cloud.scale);
  }
}

function drawBackgroundSea() {
  if (!backgroundSea) return;
  const horizonY = backgroundSea.horizonY ?? groundY - 120;
  const height = backgroundSea.height ?? 140;
  const parallax = backgroundSea.parallax ?? 0.12;
  const startX = -canvas.width;
  const totalWidth = worldWidth + canvas.width * 2;

  ctx.save();
  ctx.translate(-cameraX * parallax, 0);

  const gradient = ctx.createLinearGradient(0, horizonY, 0, horizonY + height);
  gradient.addColorStop(0, backgroundSea.topColor || "#7ec8ff");
  gradient.addColorStop(1, backgroundSea.bottomColor || "#0b6da3");
  ctx.fillStyle = gradient;
  ctx.fillRect(startX, horizonY, totalWidth, height);

  const waves = backgroundSea.waves || [];
  for (const wave of waves) {
    const amplitude = wave.amplitude ?? 10;
    const speed = wave.speed ?? 0.02;
    const phase = wave.phase || 0;
    const offset = Math.sin(animationFrame * speed + phase) * amplitude;
    const relY = wave.relY ?? 0.3;
    const y =
      horizonY +
      relY * height +
      Math.sin(animationFrame * 0.01 + phase) * 2;
    const width = wave.width ?? 140;
    const thickness = wave.thickness ?? 3;
    const x = startX + (wave.x ?? 0) + offset;
    ctx.save();
    ctx.globalAlpha = wave.alpha ?? 0.5;
    ctx.fillStyle = wave.color || backgroundSea.waveColor || "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y, width / 2, thickness, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawBackgroundFish() {
  if (!backgroundSea || backgroundFish.length === 0) return;
  const horizonY = backgroundSea.horizonY ?? groundY - 120;
  const height = backgroundSea.height ?? 140;
  const parallax = backgroundSea.fishParallax ?? backgroundSea.parallax ?? 0.15;

  ctx.save();
  ctx.translate(-cameraX * parallax, 0);

  for (const fish of backgroundFish) {
    const scale = fish.scale || 1;
    const bodyLength = 36 * scale;
    const bodyHeight = 14 * scale;
    const swimBaseY = horizonY + (fish.relY ?? 0.5) * (height - 20);
    const bob = Math.sin(fish.bobPhase || 0) * (fish.wave ?? 6);
    const y = swimBaseY + bob;
    const x = fish.x || 0;
    const dir = fish.direction || 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = fish.color || "#ffd966";
    ctx.strokeStyle = fish.accent || "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLength / 2, bodyHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-bodyLength / 2, 0);
    ctx.lineTo(-bodyLength / 2 - bodyLength * 0.3, -bodyHeight / 2);
    ctx.lineTo(-bodyLength / 2 - bodyLength * 0.3, bodyHeight / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = fish.accent || "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bodyLength * 0.2, -bodyHeight * 0.35);
    ctx.lineTo(bodyLength * 0.2, bodyHeight * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bodyLength * 0.15, -bodyHeight * 0.2, bodyHeight * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c2b3a";
    ctx.beginPath();
    ctx.arc(bodyLength * 0.18, -bodyHeight * 0.2, bodyHeight * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

function drawAmbientSprites() {
  if (!ambientSprites.length) return;
  ctx.save();
  for (const sprite of ambientSprites) {
    const parallax = sprite.parallax ?? 0.2;
    const screenX = sprite.x - cameraX * parallax;
    const screenY = sprite.y;
    if (sprite.type === "firefly" || sprite.type === "spark") {
      const glow = sprite.color || "#ffe66d";
      ctx.fillStyle = glow;
      ctx.globalAlpha = sprite.type === "spark" ? 0.8 : 0.6;
      ctx.beginPath();
      ctx.arc(screenX, screenY, sprite.size ?? 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (sprite.type === "ember") {
      ctx.fillStyle = sprite.color || "#ffb347";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, 3, sprite.size ?? 6, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (sprite.type === "meteor") {
      ctx.strokeStyle = sprite.color || "#ffd166";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX - 20, screenY - 10);
      ctx.stroke();
      ctx.fillStyle = sprite.color || "#ffd166";
      ctx.beginPath();
      ctx.arc(screenX, screenY, sprite.size ?? 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (sprite.type === "spaceship") {
      ctx.fillStyle = sprite.color || "#9be7ff";
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.ellipse(screenX, screenY - 4, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sprite.color || "#9be7ff";
      ctx.fillRect(screenX - 12, screenY + 2, 24, 3);
    }
  }
  ctx.restore();
}

// Simple cartoon cloud made of circles
function drawCloudShape(x, y, scale) {
  const w = 60 * scale;
  const h = 30 * scale;

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(x, y + h * 0.5, h * 0.6, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + w * 0.3, y, h * 0.7, Math.PI, Math.PI * 2);
  ctx.arc(x + w * 0.7, y + h * 0.1, h * 0.6, Math.PI, Math.PI * 2);
  ctx.arc(x + w, y + h * 0.5, h * 0.5, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();

  // Soft shadow line under the cloud
  ctx.strokeStyle = "rgba(200, 200, 255, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.4, y + h * 0.8);
  ctx.lineTo(x + w + h * 0.4, y + h * 0.8);
  ctx.stroke();
}

// Ground strip with simple layered texture
function drawGround() {
  const base = currentTheme.groundColor || "#5b3a1e";
  const dark = currentTheme.groundDark || "#3f2916";
  const light = currentTheme.groundHighlight || "#8b5a2b";
  ctx.fillStyle = base;
  ctx.fillRect(-cameraX, groundY, worldWidth, canvas.height - groundY);

  // Dark top edge
  ctx.fillStyle = dark;
  ctx.fillRect(-cameraX, groundY - 4, worldWidth, 4);

  // Light strip just under the edge
  ctx.fillStyle = light;
  ctx.fillRect(-cameraX, groundY, worldWidth, 10);
}

// Platforms with grass on top
function drawPlatforms() {
  for (const p of platforms) {
    const screenX = p.x - cameraX;
    const bodyHeight = p.height;
    const grassHeight = 6;

    // Brown body
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(screenX, p.y, p.width, bodyHeight);

    // Dark top border
    ctx.fillStyle = "#3f2916";
    ctx.fillRect(screenX, p.y, p.width, 3);

    // Grass layer
    ctx.fillStyle = "#2ea043";
    ctx.fillRect(screenX, p.y - grassHeight, p.width, grassHeight);

    // Grass highlight
    ctx.fillStyle = "#45c75a";
    ctx.fillRect(screenX + 2, p.y - grassHeight + 1, p.width - 4, 2);
  }
}

// Draw all question blocks with simple pixel-art style
function drawQuestionBlocks() {
  for (const block of questionBlocks) {
    const screenX = block.x - cameraX;
    const { width, height, used } = block;

    // Base color
    ctx.fillStyle = used ? "#b5651d" : "#f5a623";
    ctx.fillRect(screenX, block.y, width, height);

    // Border
    ctx.strokeStyle = "#7a4510";
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, block.y, width, height);

    // Inner square
    ctx.strokeRect(screenX + 5, block.y + 5, width - 10, height - 10);

    // Corner rivets
    ctx.fillStyle = "#7a4510";
    const r = 2;
    ctx.beginPath();
    ctx.arc(screenX + 6, block.y + 6, r, 0, Math.PI * 2);
    ctx.arc(screenX + width - 6, block.y + 6, r, 0, Math.PI * 2);
    ctx.arc(screenX + 6, block.y + height - 6, r, 0, Math.PI * 2);
    ctx.arc(screenX + width - 6, block.y + height - 6, r, 0, Math.PI * 2);
    ctx.fill();

    // Question mark
    if (!used) {
      ctx.fillStyle = "#7a4510";
      ctx.font = "24px Arial";
      ctx.fillText("?", screenX + width / 2 - 6, block.y + height / 2 + 8);
    }
  }
}

// Draw all bricks with a simple tile pattern
function drawBricks() {
  for (const brick of bricks) {
    if (brick.broken) continue;
    const screenX = brick.x - cameraX;
    const { width, height } = brick;

    ctx.fillStyle = "#b35c2e";
    ctx.fillRect(screenX, brick.y, width, height);

    // Outer border
    ctx.strokeStyle = "#7a3b1b";
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, brick.y, width, height);

    // Horizontal middle line
    ctx.beginPath();
    ctx.moveTo(screenX, brick.y + height / 2);
    ctx.lineTo(screenX + width, brick.y + height / 2);
    ctx.stroke();

    // Vertical brick lines
    ctx.beginPath();
    ctx.moveTo(screenX + width / 3, brick.y);
    ctx.lineTo(screenX + width / 3, brick.y + height / 2);
    ctx.moveTo(screenX + (2 * width) / 3, brick.y + height / 2);
    ctx.lineTo(screenX + (2 * width) / 3, brick.y + height);
    ctx.stroke();
  }
}

function drawSouvenirs() {
  for (const souvenir of souvenirs) {
    if (souvenir.collected) continue;
    const screenX = souvenir.x - cameraX;
    const centerX = screenX + souvenir.width / 2;
    const centerY = souvenir.y + souvenir.height / 2;
    const type = souvenir.type;

    if (type === "helm") {
      ctx.strokeStyle = "#be823f";
      ctx.lineWidth = 3;
      ctx.fillStyle = "#e8b372";
      ctx.beginPath();
      ctx.arc(centerX, centerY, souvenir.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#8e5a2c";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i;
        const innerR = souvenir.width * 0.2;
        const outerR = souvenir.width * 0.6;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * innerR, centerY + Math.sin(angle) * innerR);
        ctx.lineTo(centerX + Math.cos(angle) * outerR, centerY + Math.sin(angle) * outerR);
        ctx.stroke();
      }
    } else if (type === "anchor") {
      ctx.strokeStyle = "#445a6b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY + souvenir.height * 0.2, souvenir.width * 0.45, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX, souvenir.y);
      ctx.lineTo(centerX, centerY + souvenir.height * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, souvenir.y + souvenir.height * 0.2, souvenir.width * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX - souvenir.width * 0.25, centerY + souvenir.height * 0.3);
      ctx.lineTo(centerX, centerY);
      ctx.lineTo(centerX + souvenir.width * 0.25, centerY + souvenir.height * 0.3);
      ctx.stroke();
    } else if (type === "compass") {
      const radius = souvenir.width / 2;
      ctx.fillStyle = "#f5f2da";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5d5c5b";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#e63946";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius * 0.7);
      ctx.lineTo(centerX + radius * 0.2, centerY);
      ctx.lineTo(centerX, centerY + radius * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#457b9d";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY + radius * 0.7);
      ctx.lineTo(centerX - radius * 0.2, centerY);
      ctx.lineTo(centerX, centerY - radius * 0.2);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawSouvenirIcon(type, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  const unit = size / 6;
  if (type === "helm") {
    ctx.strokeStyle = "#be823f";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#e8b372";
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#8e5a2c";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const angle = ((Math.PI * 2) / 6) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * unit, Math.sin(angle) * unit);
      ctx.lineTo(Math.cos(angle) * (unit * 2.3), Math.sin(angle) * (unit * 2.3));
      ctx.stroke();
    }
  } else if (type === "anchor") {
    ctx.strokeStyle = "#566b7a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, unit, unit * 2.3, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -unit * 2);
    ctx.lineTo(0, unit * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -unit * 2.4, unit * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-unit * 1.2, unit * 1.5);
    ctx.lineTo(0, unit * 0.5);
    ctx.lineTo(unit * 1.2, unit * 1.5);
    ctx.stroke();
  } else if (type === "compass") {
    ctx.fillStyle = "#f5f2da";
    ctx.beginPath();
    ctx.arc(0, 0, size / 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5d5c5b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.moveTo(0, -unit * 2);
    ctx.lineTo(unit * 0.6, 0);
    ctx.lineTo(0, unit * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#457b9d";
    ctx.beginPath();
    ctx.moveTo(0, unit * 2);
    ctx.lineTo(-unit * 0.6, 0);
    ctx.lineTo(0, -unit * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawGrowthPowerUps() {
  for (const growth of growthPowerUps) {
    if (growth.collected) continue;
    drawGrowthPowerUp(growth);
  }
}

function drawGrowthPowerUp(powerUp) {
  const screenX = powerUp.x - cameraX;
  const y = powerUp.y;
  const width = powerUp.width;
  const height = powerUp.height;
  const centerX = screenX + width / 2;
  const centerY = y + height / 2;

  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, width * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(centerX, centerY);

  const bubbleRadius = Math.min(width, height) * 0.7;
  const bubbleStroke = ctx.createRadialGradient(0, 0, bubbleRadius * 0.4, 0, 0, bubbleRadius);
  bubbleStroke.addColorStop(0, "rgba(255,255,255,0.9)");
  bubbleStroke.addColorStop(1, "rgba(255,255,255,0.2)");

  ctx.lineWidth = 3;
  ctx.strokeStyle = bubbleStroke;
  ctx.beginPath();
  ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
  ctx.stroke();

  const highlightGradient = ctx.createLinearGradient(-bubbleRadius, -bubbleRadius, bubbleRadius, bubbleRadius);
  highlightGradient.addColorStop(0, "rgba(255,255,255,0.35)");
  highlightGradient.addColorStop(1, "rgba(255,255,255,0.05)");
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(-bubbleRadius * 0.4, -bubbleRadius * 0.4, bubbleRadius * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Golden star contained within the bubble
  const starOuter = bubbleRadius * 0.55;
  const starInner = starOuter * 0.45;
  const starGlow = ctx.createRadialGradient(0, 0, starInner * 0.2, 0, 0, starOuter * 1.4);
  starGlow.addColorStop(0, "rgba(255, 244, 196, 0.8)");
  starGlow.addColorStop(0.7, "rgba(255, 209, 103, 0.25)");
  starGlow.addColorStop(1, "rgba(255, 209, 103, 0)");
  ctx.fillStyle = starGlow;
  ctx.beginPath();
  ctx.arc(0, 0, starOuter * 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  const spin = Math.sin(animationFrame * 0.08 + powerUp.x * 0.01) * 0.25;
  ctx.rotate(spin);
  const starGradient = ctx.createRadialGradient(0, 0, starInner * 0.2, 0, 0, starOuter);
  starGradient.addColorStop(0, "#fffde7");
  starGradient.addColorStop(0.45, "#ffe066");
  starGradient.addColorStop(1, "#f6a11b");
  ctx.fillStyle = starGradient;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? starOuter : starInner;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.stroke();
  ctx.restore();

  // Orbiting sparkles
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.4;
  const twinkleCount = 3;
  for (let i = 0; i < twinkleCount; i++) {
    const angle = animationFrame * 0.04 + (i * Math.PI * 2) / twinkleCount;
    const radius = bubbleRadius * 0.5;
    const sx = Math.cos(angle) * radius * 0.6;
    const sy = Math.sin(angle) * radius * 0.6;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy);
    ctx.lineTo(sx + 3, sy);
    ctx.moveTo(sx, sy - 3);
    ctx.lineTo(sx, sy + 3);
    ctx.stroke();
  }

  // Vertical glimmer to reinforce vertical motion
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -bubbleRadius * 0.85);
  ctx.lineTo(0, -bubbleRadius * 0.6);
  ctx.stroke();

  ctx.restore();
}

// ------ UI SCREENS ------
function drawMenuBackdrop() {
  // Soft gradient based on the cover colors
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#9ed7ff");
  gradient.addColorStop(0.45, "#80c6f2");
  gradient.addColorStop(0.75, "#5ba6cf");
  gradient.addColorStop(1, "#f0c38b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const horizonY = canvas.height * 0.58;
  const waterHeight = canvas.height * 0.18;

  // Sun glow
  const sunRadius = 60;
  const sunGradient = ctx.createRadialGradient(
    canvas.width * 0.8,
    canvas.height * 0.22,
    20,
    canvas.width * 0.8,
    canvas.height * 0.22,
    sunRadius
  );
  sunGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  sunGradient.addColorStop(1, "rgba(255, 224, 138, 0)");
  ctx.fillStyle = sunGradient;
  ctx.beginPath();
  ctx.arc(canvas.width * 0.8, canvas.height * 0.22, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // Stylized skyline reminiscent of the cover
  for (const building of menuBackdrop.buildings) {
    ctx.fillStyle = building.color;
    ctx.fillRect(
      building.x,
      horizonY - building.height,
      building.width,
      building.height
    );
  }

  // Water strip
  ctx.fillStyle = "#5c92c7";
  ctx.fillRect(0, horizonY, canvas.width, waterHeight);
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  for (const wave of menuBackdrop.waves) {
    const offset = Math.sin(menuWavePhase * 1.5 + wave.phase) * 20;
    const travelWidth = canvas.width + wave.width;
    const rawX = wave.x + offset;
    const waveX = ((rawX % travelWidth) + travelWidth) % travelWidth;
    const waveY =
      horizonY + wave.relY * (waterHeight - 20) + Math.sin(menuWavePhase + wave.phase) * 2;
    ctx.fillRect(waveX, waveY, wave.width, 2);
  }

  // Retro-inspired sailboats gently bobbing on the water
  for (const boat of menuBackdrop.boats) {
    boat.x += boat.speed;
    if (boat.x > canvas.width + 60) boat.x = -60;

    const bob = Math.sin(menuWavePhase * 2 + boat.phase) * 6;
    const boatWidth = 50;
    const boatHeight = 14;
    const boatY =
      horizonY + boat.relY * (waterHeight - 30) - boatHeight + bob;

    // Hull
    ctx.fillStyle = "#5c3d26";
    ctx.fillRect(boat.x, boatY, boatWidth, boatHeight);

    // Mast
    ctx.fillStyle = "#c9b79c";
    ctx.fillRect(boat.x + boatWidth / 2 - 2, boatY - 30, 4, 30);

    // Sail
    ctx.fillStyle = boat.color;
    ctx.beginPath();
    ctx.moveTo(boat.x + boatWidth / 2 + 2, boatY - 28);
    ctx.lineTo(boat.x + boatWidth / 2 + 2, boatY);
    ctx.lineTo(boat.x + boatWidth / 2 + 20, boatY - 10);
    ctx.closePath();
    ctx.fill();

    // Tiny flag for retro flair
    ctx.fillStyle = "#e63946";
    ctx.fillRect(boat.x + boatWidth / 2 - 2, boatY - 34, 10, 4);
  }

  menuWavePhase += 0.01;

  // Ground (matching the in-game palette)
  ctx.fillStyle = "#6b3b1f";
  ctx.fillRect(0, horizonY + waterHeight, canvas.width, canvas.height);
}

function drawMenu() {
  drawMenuBackdrop();

  const padding = 50;
  const availableWidth = canvas.width - padding * 2;
  const coverTargetWidth = availableWidth * 0.55;
  const coverAspect = coverImageLoaded
    ? coverImage.height / coverImage.width
    : 1.8;
  let coverWidth = coverTargetWidth;
  let coverHeight = coverWidth * coverAspect;
  if (coverHeight > canvas.height * 0.8) {
    coverHeight = canvas.height * 0.8;
    coverWidth = coverHeight / coverAspect;
  }
  const coverX = padding;
  let coverY = canvas.height / 2 - coverHeight / 2;

  // Cover container
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(coverX - 16, coverY - 16, coverWidth + 32, coverHeight + 32);
  ctx.restore();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 3;
  ctx.strokeRect(coverX - 16, coverY - 16, coverWidth + 32, coverHeight + 32);

  if (coverImageLoaded) {
    ctx.drawImage(coverImage, coverX, coverY, coverWidth, coverHeight);
  } else {
    ctx.fillStyle = "#111";
    ctx.fillRect(coverX, coverY, coverWidth, coverHeight);
  }

  // Info panel to the right of the cover art
  const infoSpacing = 30;
  const minInfoWidth = 260;
  let infoX = coverX + coverWidth + infoSpacing;
  let infoWidth = canvas.width - infoX - padding;
  if (infoWidth < minInfoWidth) {
    const shortage = minInfoWidth - infoWidth;
    coverWidth = Math.max(160, coverWidth - shortage);
    coverHeight = coverWidth * coverAspect;
    if (coverHeight > canvas.height * 0.8) {
      coverHeight = canvas.height * 0.8;
      coverWidth = coverHeight / coverAspect;
    }
    coverY = canvas.height / 2 - coverHeight / 2;
    infoX = coverX + coverWidth + infoSpacing;
    infoWidth = canvas.width - infoX - padding;
  }
  coverY = canvas.height / 2 - coverHeight / 2;
  const infoHeight = 280;
  const infoY = canvas.height / 2 - infoHeight / 2;

  const panelGradient = ctx.createLinearGradient(infoX, infoY, infoX, infoY + infoHeight);
  panelGradient.addColorStop(0, "rgba(255,255,255,0.95)");
  panelGradient.addColorStop(1, "rgba(255,255,255,0.85)");
  ctx.fillStyle = panelGradient;
  ctx.fillRect(infoX, infoY, infoWidth, infoHeight);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(infoX, infoY, infoWidth, infoHeight);

  const infoXStart = infoX + 24;
  const textColor = "#3a3c48";
  const retroOpts = { color: textColor, outline: false };
  drawRetroText("Press Space / Enter /", infoXStart, infoY + 45, {
    size: 20,
    ...retroOpts,
  });
  drawRetroText("Arrows to start", infoXStart, infoY + 70, {
    size: 20,
    ...retroOpts,
  });
  drawRetroText("Move: Arrow Keys", infoXStart, infoY + 105, { size: 17, ...retroOpts });
  drawRetroText("Jump: Space or Enter", infoXStart, infoY + 130, {
    size: 17,
    ...retroOpts,
  });
  drawRetroText("Switch brothers: 1 / 2 / 3", infoXStart, infoY + 155, {
    size: 17,
    ...retroOpts,
  });
  drawRetroText("Pause: P", infoXStart, infoY + 180, {
    size: 17,
    ...retroOpts,
  });
  drawRetroText("Bros: Mateo, Nick & Vas", infoXStart, infoY + 205, {
    size: 17,
    ...retroOpts,
  });
  drawRetroText("A retro 2D fan-made platformer", infoXStart, infoY + 230, {
    size: 15,
    ...retroOpts,
  });
  drawRetroText("where three friends travel the world.", infoXStart, infoY + 245, {
    size: 15,
    ...retroOpts,
  });
  drawRetroText("Overcome obstacles together!", infoXStart, infoY + 260, {
    size: 15,
    ...retroOpts,
  });

  ctx.textAlign = "left";
}

function drawOverlayBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#f7dba7");
  gradient.addColorStop(1, "#f2a65a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  const insetX = canvas.width * 0.08;
  const insetY = 90;
  ctx.fillRect(insetX, insetY, canvas.width - insetX * 2, canvas.height - insetY * 2);

  ctx.fillStyle = "#4e3d2b";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
}

function drawGameOver() {
  drawOverlayBackground();
  ctx.textAlign = "center";
  drawRetroText("GAME OVER", canvas.width / 2, 130, {
    size: 54,
    align: "center",
    color: "#fbe2d4",
  });

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(canvas.width / 2 - 160, 170, 320, 140);
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.strokeRect(canvas.width / 2 - 160, 170, 320, 140);

  drawRetroText("Final Score", canvas.width / 2, 205, {
    size: 18,
    align: "center",
    color: "#77533f",
    outline: false,
  });
  drawRetroText(score.toString(), canvas.width / 2, 240, {
    size: 30,
    align: "center",
    color: "#3b241a",
    outline: false,
  });

  drawRetroText("Press SPACE to Restart", canvas.width / 2, 340, {
    size: 20,
    align: "center",
    color: "#ffe491",
  });

  ctx.textAlign = "left";
}

function drawWinScreen() {
  drawOverlayBackground();
  ctx.textAlign = "center";

  drawRetroText("Level Complete", canvas.width / 2, 120, {
    size: 50,
    align: "center",
    color: "#fff0d3",
  });

  const cardsY = 150;
  const cardWidth = 220;
  const cardHeight = 110;
  const gap = 40;
  const totalWidth = cardWidth * 3 + gap * 2;
  const startX = canvas.width / 2 - totalWidth / 2;

  const coinsCollected = coins.filter((c) => c.collected).length;
  const souvenirCount = souvenirs.filter((s) => s.collected).length;

  function statCard(label, value, x) {
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fillRect(x, cardsY, cardWidth, cardHeight);
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.strokeRect(x, cardsY, cardWidth, cardHeight);
    drawRetroText(label, x + cardWidth / 2, cardsY + 30, {
      size: 16,
      align: "center",
      color: "#5b4030",
      outline: false,
    });
    drawRetroText(value, x + cardWidth / 2, cardsY + 70, {
      size: 26,
      align: "center",
      color: "#23140e",
      outline: false,
    });
  }

  statCard("Souvenirs", `${souvenirCount}/${souvenirs.length}`, startX);
  statCard("Score", score.toString(), startX + cardWidth + gap);
  statCard("Coins", `${coinsCollected}/${coins.length}`, startX + (cardWidth + gap) * 2);

  const nextLevelIndex = currentLevel + 1;
  if (nextLevelIndex < totalLevels) {
    const nextName = characters[levelOrder[nextLevelIndex]].name;
    drawRetroText(`Next: ${nextName}`, canvas.width / 2, cardsY + cardHeight + 60, {
      size: 22,
      align: "center",
      color: "#ffe6bd",
    });
    drawRetroText("Press SPACE to continue", canvas.width / 2, cardsY + cardHeight + 105, {
      size: 20,
      align: "center",
      color: "#ffe491",
    });
  } else {
    drawRetroText(
      "All levels completed! Press SPACE to play again from Mateo",
      canvas.width / 2,
      cardsY + cardHeight + 80,
      {
        size: 18,
        align: "center",
        color: "#ffe6bd",
      }
    );
  }

  ctx.textAlign = "left";
}

function drawGrandFinaleScreen() {
  drawMenuBackdrop();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";

  drawRetroText("WINNER!", canvas.width / 2, 90, {
    size: 62,
    align: "center",
    color: "#fff7d1",
  });
  drawRetroText("YOU WIN", canvas.width / 2, 140, {
    size: 48,
    align: "center",
    color: "#ffe28a",
  });

  const mediaWidth = canvas.width * 0.6;
  const defaultAspect = 9 / 16;
  let mediaAspect = defaultAspect;
  if (finaleVideoReady && finaleVideo.videoWidth > 0 && finaleVideo.videoHeight > 0) {
    mediaAspect = finaleVideo.videoHeight / finaleVideo.videoWidth;
  } else if (coverImageLoaded && coverImage.width > 0) {
    mediaAspect = coverImage.height / coverImage.width;
  }
  const mediaHeight = mediaWidth * mediaAspect;
  const mediaX = canvas.width / 2 - mediaWidth / 2;
  const mediaY = 170;

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(mediaX - 10, mediaY - 10, mediaWidth + 20, mediaHeight + 20);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 4;
  ctx.strokeRect(mediaX - 10, mediaY - 10, mediaWidth + 20, mediaHeight + 20);

  let drewMedia = false;
  if (finaleVideoReady && finaleVideo.videoWidth > 0 && finaleVideo.videoHeight > 0) {
    ensureFinaleVideoPlays();
    ctx.drawImage(finaleVideo, mediaX, mediaY, mediaWidth, mediaHeight);
    drewMedia = true;
  }
  if (!drewMedia) {
    if (coverImageLoaded) {
      ctx.drawImage(coverImage, mediaX, mediaY, mediaWidth, mediaHeight);
    } else {
      ctx.fillStyle = "#1b3a57";
      ctx.fillRect(mediaX, mediaY, mediaWidth, mediaHeight);
    }
  }

  drawRetroText("Developed by Vasyl Pavlyuchok", canvas.width / 2, mediaY + mediaHeight + 60, {
    size: 28,
    align: "center",
    color: "#ffe491",
  });
  drawRetroText("Thank you for playing Mateo & Bros!", canvas.width / 2, mediaY + mediaHeight + 100, {
    size: 24,
    align: "center",
    color: "#fff0d3",
  });

  drawRetroText(`Final Score: ${score}`, canvas.width / 2, mediaY + mediaHeight + 150, {
    size: 26,
    align: "center",
    color: "#fff7d1",
  });

  drawRetroText("Press SPACE to return to Mateo", canvas.width / 2, mediaY + mediaHeight + 200, {
    size: 20,
    align: "center",
    color: "#ffe491",
  });

  ctx.textAlign = "left";
}

// ------ DRAW LOGIC ------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Menu / GameOver / Win screens
  if (gameState === "menu") {
    drawMenu();
    return;
  }
  if (gameState === "gameOver") {
    drawGameOver();
    stopBackgroundMusic();
    return;
  }
  if (gameState === "win") {
    if (currentLevel === totalLevels - 1) {
      drawGrandFinaleScreen();
    } else {
      drawWinScreen();
    }
    stopBackgroundMusic();
    return;
  }

  // Sky
  ctx.fillStyle = currentTheme.skyColor || "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background parallax (far hills, near hills, clouds)
  drawBackgroundSea();
  drawBackgroundHillsLayer(backgroundHillsFar, 0.25);
  drawBackgroundHillsLayer(backgroundHillsNear, 0.45);
  drawBackgroundFish();
  drawAmbientSprites();
  drawBackgroundClouds();

  // Ground + platforms + blocks
  drawGround();
  drawPlatforms();
  drawQuestionBlocks();
  drawBricks();

  // Coins (spinning)
  for (const coin of coins) {
    if (coin.collected) continue;

    const coinScreenX = coin.x - cameraX;
    const coinCenterX = coinScreenX + coin.width / 2;
    const coinCenterY = coin.y + coin.height / 2;

    const rotation = (animationFrame * 0.05) % (Math.PI * 2);
    const widthScale = Math.abs(Math.cos(rotation));
    const minThickness = 0.25;
    const adjustedScale = minThickness + widthScale * (1 - minThickness);
    const coinWidth = (coin.width / 2) * adjustedScale;
    const coinHeight = coin.width / 2;

    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.ellipse(
      coinCenterX,
      coinCenterY,
      coinWidth,
      coinHeight,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (widthScale > 0.3) {
      ctx.fillStyle = "#FFED4E";
      ctx.beginPath();
      ctx.ellipse(
        coinCenterX - coinWidth / 3,
        coinCenterY - coinHeight / 4,
        coinWidth / 3,
        coinHeight / 4,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  drawSouvenirs();

  // Particles (coins + bricks)
  for (const p of particles) {
    const particleScreenX = p.x - cameraX;
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color || "#FFD700";
    ctx.beginPath();
    ctx.arc(particleScreenX, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Enemies
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    drawEnemySprite(enemy);
  }

  // Growth capsules (power-ups)
  drawGrowthPowerUps();

  // Flag pole + flag (animated)
  const flagX = worldWidth - 100;
  const flagScreenX = flagX - cameraX;
  const flagPoleHeight = 100;
  const flagPoleTop = groundY - flagPoleHeight;

  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(flagScreenX, flagPoleTop);
  ctx.lineTo(flagScreenX, groundY);
  ctx.stroke();

  const flagHeight = 40;
  const maxOffset = flagPoleHeight - flagHeight;
  let currentOffset = flagOffset;
  if (currentOffset > maxOffset) currentOffset = maxOffset;
  const flagY = flagPoleTop + currentOffset;

  ctx.fillStyle = "#00FF00";
  ctx.beginPath();
  ctx.moveTo(flagScreenX, flagY);
  ctx.lineTo(flagScreenX + 40, flagY + 20);
  ctx.lineTo(flagScreenX, flagY + 40);
  ctx.closePath();
  ctx.fill();

  const trulloX = flagScreenX + 60;
  const trulloBaseWidth = 70;
  const trulloHeight = 70;
  ctx.fillStyle = "#f8f3e1";
  ctx.beginPath();
  ctx.rect(trulloX, groundY - 35, trulloBaseWidth, 35);
  ctx.fill();
  ctx.strokeStyle = "#d0c5a0";
  ctx.strokeRect(trulloX, groundY - 35, trulloBaseWidth, 35);

  ctx.fillStyle = "#f0e8d0";
  ctx.beginPath();
  ctx.moveTo(trulloX - 10, groundY - 35);
  ctx.lineTo(trulloX + trulloBaseWidth / 2, groundY - 35 - trulloHeight);
  ctx.lineTo(trulloX + trulloBaseWidth + 10, groundY - 35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d0c5a0";
  ctx.stroke();

  ctx.fillStyle = "#d9cfba";
  ctx.beginPath();
  ctx.arc(trulloX + trulloBaseWidth / 2, groundY - 35 - trulloHeight, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8a7c63";
  ctx.beginPath();
  ctx.rect(trulloX + trulloBaseWidth * 0.35, groundY - 20, trulloBaseWidth * 0.3, 20);
  ctx.fill();

  ctx.fillStyle = "#b35c2e";
  ctx.fillRect(flagScreenX - 20, groundY, 80, 20);
  ctx.fillStyle = "#7a3b1b";
  ctx.fillRect(flagScreenX - 20, groundY + 10, 80, 10);

  // Player (Mateo & Bros)
  drawPlayer();

  // HUD: score, coins, lives
  drawRetroText("Score: " + score, 10, 25, { size: 20 });

  const coinsCollected = coins.filter((c) => c.collected).length;
  drawRetroText("Coins: " + coinsCollected + "/" + coins.length, 10, 50, { size: 18 });
  const levelLabel = `Level ${currentLevel + 1}/${totalLevels} - ${characters[currentCharacter].name}`;
  drawRetroText(levelLabel, 10, 75, { size: 18 });
  drawRetroText(`Power: ${player.state === "big" ? "Big" : "Small"}`, 10, 100, { size: 18 });
  if (stompCombo > 1 && comboTimer > 0) {
    const comboWidth = 120;
    const fillRatio = Math.min(stompCombo / 10, 1);
    ctx.fillStyle = "#333";
    ctx.fillRect(10, 150, comboWidth, 12);
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(10, 150, comboWidth * fillRatio, 12);
    drawRetroText(`Combo x${stompCombo}`, 10, 145, { size: 16, color: "#ffd54f" });
  }
  const souvenirsCollected = souvenirs.filter((s) => s.collected).length;
  drawRetroText(`Souvenirs:`, 10, 160, {
    size: 18,
  });
  const iconStartY = 185;
  const iconSpacing = 36;
  const iconX = 40;
  for (let i = 0; i < souvenirs.length; i++) {
    const iconY = iconStartY + i * iconSpacing;
    ctx.globalAlpha = souvenirs[i].collected ? 1 : 0.25;
    drawSouvenirIcon(souvenirs[i].type, iconX, iconY, 22);
    ctx.globalAlpha = 1;
  }
  if (souvenirPopupTimer > 0) {
    drawRetroText("Souvenir collected!", canvas.width / 2, 50, {
      size: 22,
      align: "center",
      color: "#66e0ff",
    });
  }
  if (player.currentExpression && player.expressionTimer > 0) {
    drawRetroText(
      player.currentExpression,
      player.x - cameraX + player.width / 2,
      player.y - 10,
      {
        size: 18,
        align: "center",
        color: "#ffeb3b",
      }
    );
    drawRetroText(
      player.currentExpression,
      player.x - cameraX + player.width / 2,
      player.y - 10,
      {
        size: 18,
        align: "center",
        color: "#ffeb3b",
      }
    );
  }

  const progress = Math.min(player.x / (worldWidth - player.width), 1);
  const barWidth = 200;
  const barHeight = 10;
  const barX = canvas.width / 2 - barWidth / 2;
  const barY = 20;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = "#7ed957";
  ctx.fillRect(barX, barY, barWidth * progress, barHeight);
  drawRetroText("Progress", barX + barWidth / 2, barY - 5, {
    size: 12,
    align: "center",
  });

  drawHearts();
}

// ------ GAME LOOP ------
function loop() {
  update();
  draw();
  animationFrame++;
  requestAnimationFrame(loop);
}

loop();
