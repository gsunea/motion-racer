const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let peer = null;
let connection = null;
let roomId = null;

// Game State
let player = {
    x: 0,
    tiltX: 0
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2;
}
window.addEventListener('resize', resize);
resize();

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
        updateStatus('waiting', 'Waiting for pilot...');
    });

    peer.on('connection', (conn) => {
        console.log('Pilot connected');
        connection = conn;
        
        conn.on('open', () => {
            updateStatus('connected', 'Pilot Connected!');
            setTimeout(() => {
               document.getElementById('connectionPanel').classList.add('hidden');
            }, 1000);
        });

        conn.on('data', (data) => {
            if (data.type === 'control') {
                player.tiltX = data.tiltX;
            }
        });

        conn.on('close', () => {
             updateStatus('waiting', 'Pilot disconnected');
             document.getElementById('connectionPanel').classList.remove('hidden');
        });
    });
}

function updateStatus(state, msg) {
    const el = document.getElementById('statusIndicator');
    el.className = 'status-indicator ' + state;
    el.querySelector('.status-text').textContent = msg;
}

// Simple Loop to Visualize Data
function loop() {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Player Proxy
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Map tiltX (-9.8 to 9.8) to screen width
    // Smoothing could happen here or on phone. We'll receive raw/smoothed from phone.
    // Let's assume tiltX is gravity.x. 9.8 is full left (landscape left).
    const offset = player.tiltX * 50; // Arbitrary scale for now
    
    ctx.fillStyle = '#00f3ff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00f3ff';
    ctx.fillRect(cx + offset - 25, cy - 25, 50, 50);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'white';
    ctx.font = '20px monospace';
    ctx.fillText(`TILT X: ${player.tiltX.toFixed(2)}`, 50, 50);

    requestAnimationFrame(loop);
}

initPeer();
loop();
