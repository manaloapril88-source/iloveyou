const startScreen = document.getElementById('startScreen');
const terminal = document.getElementById('terminal');
const startBtn = document.getElementById('startBtn');
const logsContainer = document.getElementById('logs');
const typingElement = document.getElementById('typing');
const typingSound = document.getElementById('typingSound');
const alarmSound = document.getElementById('alarmSound');
const victimCam = document.getElementById('victimCam');

let deviceInfo = "Unknown Device";
// ... same variables from previous ...

// Same detectDevice(), getIPLocation() functions ...

async function activateCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        victimCam.srcObject = stream;
        victimCam.style.display = 'block';
        addLog("<span class='warning'>[LIVE FEED] Victim visible on front camera!</span>");
    } catch (err) {
        // Fallback kung denied/blocked
        addLog("<span class='warning'>[DENIED] Camera access blocked... bypassing...</span>");
        addLog("<span class='warning'>[SUCCESS] Fake feed activated (you're being watched!)</span>");
        // Optional: lagyan ng creepy image
        victimCam.style.display = 'block';
        victimCam.poster = "https://via.placeholder.com/250x180/000000/FF0000?text=YOU+ARE+BEING+WATCHED"; // or upload scary image
    }
}

// Same addLog function ...

function startPrank() {
    startScreen.style.display = 'none';
    terminal.style.display = 'flex';

    document.documentElement.requestFullscreen?.();

    typingSound.volume = 0.4;
    typingSound.play().catch(() => {});

    detectDevice();
    getIPLocation().then(() => {
        // All logs here (same as previous, with delays)
        addLog("[SYSTEM] Critical security vulnerability detected...", 800);
        addLog("[SCAN] Initializing remote intrusion protocol...", 2200);
        addLog(`[TARGET] Device: ${deviceInfo}`, 3600);
        // ... lahat ng logs mo ...
        addLog("[CAMERA] Activating front camera...", 10400);
        activateCamera();
        // ... hanggang sa "Just kidding!" ...
    });
}

// Start button click = user interaction
startBtn.addEventListener('click', startPrank);

// Initial
detectDevice();
