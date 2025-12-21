const logsContainer = document.getElementById('logs');
const typingElement = document.getElementById('typing');
const typingSound = document.getElementById('typingSound');
const alarmSound = document.getElementById('alarmSound');
const victimCam = document.getElementById('victimCam');

let deviceInfo = "Unknown Device";
let batteryLevel = "Unknown (API not supported)";
let screenRes = `${screen.width}x${screen.height}`;
let ramApprox = "Unknown";
let storageFake = "Unknown";
let networkType = "Unknown";
let fakeSerial = "SN" + Math.random().toString(36).substring(2, 12).toUpperCase();
let fakeIMEI = Math.floor(Math.random() * 900000000000000) + 100000000000000;
let ipAddress = "Hidden (Blocked/VPN)";
let locationInfo = "Hidden Location";

function detectDevice() {
    const ua = navigator.userAgent.toLowerCase();
    let brand = "Unknown";
    let model = "";

    // Approximate RAM (Chrome only)
    if ('deviceMemory' in navigator) {
        ramApprox = `${navigator.deviceMemory} GB (approx)`;
    } else {
        ramApprox = "4-8 GB (estimated)";
    }

    // Fake storage
    storageFake = `${Math.floor(Math.random() * 80 + 30)}GB used / 128GB total`;

    // Network
    networkType = ('connection' in navigator) ? navigator.connection?.effectiveType || "WiFi/4G" : "WiFi or Mobile Data";

    if (ua.includes('realme')) {
        brand = "Realme";
        model = ua.match(/(c\d+|rmx\d+)/i) ? ua.match(/(c\d+|rmx\d+)/i)[0].toUpperCase() : "C/RMX Series";
    } else if (ua.includes('samsung')) {
        brand = "Samsung";
        model = ua.match(/sm-[a-z0-9]+/i) ? ua.match(/sm-[a-z0-9]+/i)[0].toUpperCase() : "Galaxy";
    } else if (ua.includes('windows')) {
        brand = "Windows Laptop/PC";
    } else if (ua.includes('mac os')) {
        brand = "Apple MacBook";
    } else if (ua.includes('iphone')) {
        brand = "Apple iPhone";
    } // add more if needed

    deviceInfo = `${brand} ${model}`.trim();
}

// Battery (real if supported)
async function getBattery() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            batteryLevel = Math.round(battery.level * 100) + "% " + (battery.charging ? "(Charging)" : "(Discharging)");
        } catch (e) {
            batteryLevel = "50-80% (estimated)";
        }
    } else {
        batteryLevel = "60% (estimated - API not supported)";
    }
}

async function getIPLocation() {
    try {
        const res = await fetch('https://freeipapi.com/api/json');
        const data = await res.json();
        ipAddress = data.ipAddress || "Hidden IP";
        locationInfo = [data.cityName, data.regionName, data.countryName].filter(Boolean).join(', ') || "Hidden Location";
    } catch (e) {
        ipAddress = "Blocked by Firewall";
        locationInfo = "VPN Detected";
    }
}

async function activateCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        victimCam.srcObject = stream;
        victimCam.style.display = 'block';
        addLog("<span class='warning'>[LIVE FEED] Victim visible on camera!</span>", 1000);
    } catch (err) {
        addLog("<span class='warning'>[DENIED] Camera blocked... simulating feed!</span>", 1000);
    }
}

function addLog(line, delay = 1500) {
    setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'line';
        div.innerHTML = line;
        logsContainer.appendChild(div);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        if (line.includes('warning') || line.includes('CRITICAL') || line.includes('LIVE')) {
            alarmSound.play().catch(() => {});
        }
    }, delay);
}

window.onload = async () => {
    document.documentElement.requestFullscreen().catch(() => {});

    typingSound.volume = 0.4;
    typingSound.play().catch(() => {});

    detectDevice();
    await getBattery();
    await getIPLocation();

    addLog("[SYSTEM] Critical security vulnerability detected...", 1000);
    addLog("[SCAN] Initializing remote access protocol...", 2500);
    addLog(`[TARGET] Device: ${deviceInfo}`, 4000);
    addLog(`[SCREEN] Resolution: ${screenRes}`, 5500);
    addLog(`[BATTERY] Level: ${batteryLevel}`, 7000);
    addLog(`[RAM] Approximate: ${ramApprox}`, 8500);
    addLog(`[STORAGE] Used: ${storageFake}`, 10000);
    addLog(`[NETWORK] Type: ${networkType}`, 11500);
    addLog(`[SERIAL] Number: ${fakeSerial}`, 13000);
    addLog(`[IMEI] Identifier: ${fakeIMEI}`, 14500);
    addLog(`[IP] Your IP: ${ipAddress}`, 16000);
    addLog(`[LOCATION] Approx: ${locationInfo}`, 17500);
    addLog("[BREACH] Firewall bypassed...", 19000);
    addLog("[ACCESS] Root privileges gained...", 20500);
    addLog("[ROOT] Full access GRANTED", 22000);
    addLog("[CAMERA] Activating front camera...", 23500);
    activateCamera();
    addLog("[EXFIL] Extracting data...", 26000);
    addLog("[BANK] Accessing financial apps...", 27500);
    addLog("<span class='warning'>[CRITICAL] DEVICE FULLY COMPROMISED</span>", 29000);
    addLog("<span class='warning'>[ALERT] DO NOT TURN OFF YOUR DEVICE</span>", 30500);
    addLog("Just kidding! 😂 This was a PRANK!", 33000);
    addLog("Gotcha! Send this to your friends 😈", 34500);
};
