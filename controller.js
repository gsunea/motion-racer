const urlParams = new URLSearchParams(window.location.search);
const roomId = window.location.hash.slice(1) || urlParams.get('room');

// Elements
const enableBtn = document.getElementById('enableBtn');
const permissionScreen = document.getElementById('permissionScreen');
const controlScreen = document.getElementById('controlScreen');
const tiltBar = document.getElementById('tiltBar');
const tiltVal = document.getElementById('tiltVal');

let peer = null;
let conn = null;
let lastTiltX = 0;

// Init
if (roomId) {
    enableBtn.addEventListener('click', startController);
} else {
    document.getElementById('errorMsg').textContent = "No Room ID found in URL.";
}

async function startController() {
    try {
        // Request Permission
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            const response = await DeviceMotionEvent.requestPermission();
            if (response !== 'granted') throw new Error("Permission denied");
        }

        // Connect
        enableBtn.textContent = 'CONNECTING...';
        initPeer();

    } catch (e) {
        document.getElementById('errorMsg').textContent = e.message;
    }
}

function initPeer() {
    peer = new Peer();

    peer.on('open', (id) => {
        conn = peer.connect(roomId);

        conn.on('open', () => {
            console.log('Connected to Host');
            showControlScreen();
            startSensorLoop();
        });

        conn.on('error', (err) => {
            console.error(err);
            document.getElementById('errorMsg').textContent = "Connection Failed";
        });
    });
}

function showControlScreen() {
    permissionScreen.classList.add('hidden');
    controlScreen.classList.remove('hidden');
}

function startSensorLoop() {
    window.addEventListener('devicemotion', (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc) return;

        // Raw Data
        const rawX = acc.x || 0;

        // Smoothing (Low Pass Filter)
        // smoothed = current * alpha + last * (1 - alpha)
        const alpha = 0.1;
        const smoothX = (rawX * alpha) + (lastTiltX * (1 - alpha));
        lastTiltX = smoothX;

        // Update Local UI
        tiltVal.textContent = smoothX.toFixed(2);

        // Visualizer (-10 to 10 range mapped to rotation or position)
        // Let's rotate the bar to show angle. 
        // 9.8 m/s^2 is approx 90 degrees if mostly gravity. 
        // We can just map raw gravity X to rotation.
        const angle = -(smoothX / 9.8) * 90; // Approx angle
        tiltBar.style.transform = `rotate(${angle}deg)`;

        // Send to Host
        if (conn && conn.open) {
            conn.send({
                type: 'control',
                tiltX: smoothX
            });
        }
    });
}
