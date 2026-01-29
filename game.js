/* ==================== CORE SETUP ==================== */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let peer = null;
let connection = null;
let roomId = null;

// Game Config
const CONF = {
    fov: 600,
    speed: 15,
    colors: {
        sky: '#050510',
        grid: '#bc13fe',
        gridGlow: '#bc13fe',
        ship: '#00f3ff',
        shipGlow: '#00f3ff'
    }
};

// Game State
let state = {
    tiltX: 0,
    playerX: 0,
    bankAngle: 0,
    zOffset: 0, // For moving grid
    particles: [],
    isPlaying: false
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

/* ==================== PEERJS / CONNECTION ==================== */
function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = 'NEON-';
    for (let i = 0; i < 4; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function initPeer() {
    roomId = generateRoomId();
    document.getElementById('roomCode').textContent = roomId;

    const basePath = window.location.pathname.replace(/\/[^\/]*$/, '/');
    const controllerUrl = `${window.location.origin}${basePath}controller.html#${roomId}`;
    document.getElementById('controllerUrl').textContent = controllerUrl;

    // Generate QR
    new QRCode(document.getElementById('qrCode'), {
        text: controllerUrl,
        width: 180,
        height: 180,
        colorDark: "#050510",
        colorLight: "#00f3ff",
        correctLevel: QRCode.CorrectLevel.M
    });

    peer = new Peer(roomId);

    peer.on('open', (id) => {
        console.log('Host ready:', id);
        updateStatus('waiting', 'Scanning for Pilot...');
    });

    peer.on('connection', (conn) => {
        connection = conn;

        conn.on('open', () => {
            updateStatus('connected', 'Pilot Connected! Signal Locked.');
            document.getElementById('connectionPanel').classList.add('hidden');
            state.isPlaying = true;
            initParticles();
        });

        conn.on('data', (data) => {
            if (data.type === 'control') {
                state.tiltX = data.tiltX;
                // Map tilt (-9.8 to 9.8) to player X position
                // Clamping to keep consistent
                state.playerX = state.tiltX * 80;

                // Banking effect (lean ship)
                // Tilt > 0 means leaning right? or left? Depends on phone. 
                // Let's assume tiltX is gravity X.
                state.bankAngle = state.tiltX * 5; // degrees
            }
        });

        conn.on('close', () => {
            updateStatus('waiting', 'Signal Lost.');
            document.getElementById('connectionPanel').classList.remove('hidden');
            state.isPlaying = false;
        });
    });
}

function updateStatus(stateName, msg) {
    const el = document.getElementById('statusIndicator');
    el.className = 'status-indicator ' + stateName;
    el.querySelector('.status-text').textContent = msg;
}

/* ==================== ENGINE & VISUALS ==================== */

// Create starfield effect
function initParticles() {
    state.particles = [];
    for (let i = 0; i < 100; i++) {
        state.particles.push({
            x: (Math.random() - 0.5) * canvas.width * 2,
            y: (Math.random() - 0.5) * canvas.height * 2,
            z: Math.random() * 2000
        });
    }
}

function drawPerspectiveGrid() {
    state.zOffset = (state.zOffset + CONF.speed) % 100;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const horizon = cy; // Center of screen is horizon

    ctx.strokeStyle = CONF.colors.grid;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 10;
    ctx.shadowColor = CONF.colors.gridGlow;

    // Draw Vertical Lines (vanishing to center)
    // We want a floor effect, so only draw below horizon
    // But for a "Tunnel" or "Void", maybe top and bottom? 
    // Let's do a classic Synthwave grid floor for now.

    ctx.beginPath();
    // Radiating lines
    for (let i = -10; i <= 10; i++) {
        const x = cx + i * 200; // Base spacing at bottom
        // Connect from (cx, cy) to (x, height)
        // But in perspective, parallel lines converge at vanishing point
        // Line equation: start at vanishing point (cx, cy), go to some point on bottom edge

        // Calculate angle based on i
        // Simple way: Draw lines from VP to off-screen coordinates
        const spread = i * 150;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + spread, canvas.height);
    }
    ctx.stroke();

    // Horizontal Lines (Moving towards us)
    // In perspective, distance between lines decreases as Z increases.
    // y = cy + (H * fov) / (z + offset) ??
    // Simplified: Just draw lines at exponentially decreasing Y

    const floorHeight = canvas.height / 2;
    // We want to simulate Z movement.
    // Z goes from near (0) to far (infinity).
    // Let's scan Z plane

    for (let z = 0; z < 2000; z += 100) {
        // Effective Z moves towards us
        const effectiveZ = z - state.zOffset;
        if (effectiveZ < 10) continue; // Behind camera

        // Projection
        // y = cy + (some_height_constant) / effectiveZ
        // If effectiveZ is small (near), y is large (bottom of screen)
        // If effectiveZ is huge (far), y is small (near cy)

        const scale = CONF.fov / effectiveZ;
        const y = cy + 100 * scale;

        if (y > canvas.height) continue;
        if (y < cy) continue;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
}

function drawParticles() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = 'white';

    state.particles.forEach(p => {
        // Move particle towards camera
        p.z -= CONF.speed;
        if (p.z <= 0) {
            p.z = 2000;
            p.x = (Math.random() - 0.5) * canvas.width * 2;
            p.y = (Math.random() - 0.5) * canvas.height * 2;
        }

        // Project
        const scale = CONF.fov / p.z;
        const x = cx + p.x * scale;
        const y = cy + p.y * scale;
        const size = Math.max(0.5, 3 * scale);

        // Parallax / Movement effect based on turn
        // If we turn right (positive playerX), particles should shift left
        const parallaxX = -state.playerX * (scale * 0.05);

        ctx.globalAlpha = Math.min(1, scale);
        ctx.beginPath();
        ctx.arc(x + parallaxX, y, size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function drawShip() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 200; // Position ship near bottom

    // Apply player movement
    const shipX = cx + state.playerX;
    const shipY = cy;

    ctx.save();
    ctx.translate(shipX, shipY);
    ctx.rotate((state.bankAngle * Math.PI) / 180);

    // Glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = CONF.colors.shipGlow;
    ctx.strokeStyle = CONF.colors.ship;
    ctx.lineWidth = 3;
    ctx.fillStyle = '#000';

    // Draw Ship Paths (Triangle Fighter)
    ctx.beginPath();
    ctx.moveTo(0, -40); // Nose
    ctx.lineTo(30, 40); // Right Wing
    ctx.lineTo(0, 25);  // Rear center notch
    ctx.lineTo(-30, 40); // Left Wing
    ctx.closePath();

    ctx.fill(); // Black body
    ctx.stroke(); // Neon outline

    // Engine Thruster
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff0055';
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.moveTo(-10, 35);
    ctx.lineTo(10, 35);
    ctx.lineTo(0, 60 + Math.random() * 10); // Flicker
    ctx.fill();

    ctx.restore();
}

function loop() {
    // Clear / Fade
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Use semi-transparent fill for trails? No, clean redraw for smooth 60fps
    ctx.fillStyle = CONF.colors.sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    drawParticles();

    // Draw Floor Grid
    drawPerspectiveGrid();

    // Draw Player
    if (state.isPlaying) {
        drawShip();
    } // Else maybe attract mode?

    // Debug Text
    // ctx.fillStyle = 'white';
    // ctx.fillText(`TILT: ${state.tiltX.toFixed(2)}`, 20, 30);

    requestAnimationFrame(loop);
}

// Start
initPeer();
initParticles();
loop();
