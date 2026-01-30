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
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      resolve(base64);
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
    const audioBase64 = await recordAudio();
    ledWrite(0);

    // STT
    const sttResp = await fetch("/stt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64 })
    }).then(r => r.json());
    const transcript = sttResp.text || "Hello";
    console.log("Transcript:", transcript);

    // AI
    const aiResp = await fetch("/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    }).then(r => r.json());
    const aiText = aiResp.choices[0].message.content;
    console.log("AI Response:", aiText);

    // TTS
    const ttsBlob = await fetch("/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: aiText })
    }).then(r => r.blob());
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
