const micBtn = document.getElementById("micBtn");
const ttsAudio = document.getElementById("ttsAudio");
const ledDiv = document.getElementById("led");

// LED simulation
function ledWrite(brightness) {
  const bar = Math.floor(brightness / 2.55);
  ledDiv.style.background = `rgb(${bar}, ${255-bar}, 0)`;
}

// Record audio
async function recordAudio() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  let chunks = [];
  return new Promise((resolve) => {
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      resolve(blob);
    };
    mediaRecorder.start();
    micBtn.innerText = "Recording... Release to stop";
    micBtn.onmouseup = () => {
      mediaRecorder.stop();
      micBtn.innerText = "🎤 Press to Speak";
    };
  });
}

// Main workflow
micBtn.addEventListener("mousedown", async () => {
  try {
    ledWrite(255);
    const audioBlob = await recordAudio();
    ledWrite(0);

    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");

    // STT
    const sttResp = await fetch("/stt", { method: "POST", body: formData });
    const sttJson = await sttResp.json();
    const transcript = sttJson.text || "Hello";
    console.log("Transcript:", transcript);

    // AI
    const aiResp = await fetch("/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    const aiJson = await aiResp.json();
    const aiText = aiJson.text;
    console.log("AI Response:", aiText);

    // TTS
    const ttsResp = await fetch("/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: aiText })
    });
    const ttsBlob = await ttsResp.blob();
    const url = URL.createObjectURL(ttsBlob);
    ttsAudio.src = url;

    // LED pulse during TTS
    let pulse = 0;
    const interval = setInterval(() => {
      pulse = (pulse + 10) % 255;
      ledWrite(pulse);
    }, 100);
    ttsAudio.onended = () => { clearInterval(interval); ledWrite(0); };

  } catch (err) {
    console.error(err);
    ledWrite(0);
  }
});
