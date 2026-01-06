// ==========================================
// CANVAS SETUP
// ==========================================

const canvas = document.getElementById('explosionCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const colorPalettes = [
    ['#ff2d2d', '#ff6a00', '#ffffff'], // anger
    ['#ff004c', '#ff9f1c', '#ffffff'], // hot
    ['#ff3b3b', '#ffd166', '#ffffff'], // energy
    ['#ff1e56', '#ffac41', '#ffffff']  // intense
];

let currentPaletteIndex = 0;
let lastPaletteChange = Date.now();

// ==========================================
// AUDIO SETUP (NO FILES)
// ==========================================

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playImpactSound(intensity = 1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 80 + intensity * 40; // low, punchy
    gain.gain.value = 0.2;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
}

// ==========================================
// PARTICLES
// ==========================================

const particles = [];
let lastClickTime = 0;

function Particle(x, y, force) {
    this.x = x;
    this.y = y;

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 6 + force * 2;

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = Math.random() * 4 + 2;

    const palette = colorPalettes[currentPaletteIndex];
this.color = palette[Math.floor(Math.random() * palette.length)];

    this.life = 1;
    this.decay = Math.random() * 0.02 + 0.015;
}

Particle.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
};

Particle.prototype.draw = function () {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
};

let rage = 0;
const RAGE_THRESHOLD = 6;
let collapsing = false;

// ==========================================
// EXPLOSION + FEEDBACK
// ==========================================

function triggerShake() {
    document.body.classList.remove('shake');
    void document.body.offsetWidth; // reset animation
    document.body.classList.add('shake');
}

function vibrateDevice() {
    if (navigator.vibrate) {
        navigator.vibrate(40);
    }
}

function createExplosion(x, y) {
    const now = Date.now();
    const delta = now - lastClickTime;
    lastClickTime = now;

    const force = delta < 200 ? 2 : delta < 400 ? 1 : 0;

    rage += force;

    const count = 40 + force * 30;
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, force));
    }

    triggerShake();
    vibrateDevice();
    playImpactSound(force);

    if (rage >= RAGE_THRESHOLD && !collapsing) {
        rage = 0;
        triggerGravityCollapse();
    }
}

function triggerGravityCollapse() {
    collapsing = true;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Short dramatic pause
    setTimeout(() => {
        particles.forEach(p => {
            const dx = centerX - p.x;
            const dy = centerY - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            // Pull inward violently
            p.vx = (dx / distance) * 15;
            p.vy = (dy / distance) * 15;
        });

        playImpactSound(3);
        triggerShake();
        vibrateDevice();

        // After collapse, explode outward
        setTimeout(() => {
            particles.forEach(p => {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 12 + 8;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
            });

            collapsing = false;
        }, 120);

    }, 80);
}


// ==========================================
// INPUT HANDLING
// ==========================================

canvas.addEventListener('click', e => {
    createExplosion(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    for (let touch of e.touches) {
        createExplosion(touch.clientX, touch.clientY);
    }
});

// ==========================================
// ANIMATION LOOP
// ==========================================
if (Date.now() - lastPaletteChange > 25000) {
    currentPaletteIndex =
        (currentPaletteIndex + 1) % colorPalettes.length;
    lastPaletteChange = Date.now();
}

function animate() {
    ctx.fillStyle = collapsing
  ? 'rgba(0, 0, 0, 0.35)'
  : 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();

        if (p.life <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(animate);
}

animate();
