let mediaRecorder;
let chunks = [];

async function startRecord() {
  chunks = [];

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = e => chunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    // STT
    const stt = await fetch("/stt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: base64 })
    }).then(r => r.json());

    console.log("STT:", stt.text);

    // AI
    const ai = await fetch("/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: stt.text })
    }).then(r => r.json());

    console.log("AI:", ai.text);

    // TTS
    const audioResp = await fetch("/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: ai.text })
    });

    const audio = new Audio(URL.createObjectURL(await audioResp.blob()));
    audio.play();
  };

  mediaRecorder.start();

  // auto stop after 4 seconds
  setTimeout(() => mediaRecorder.stop(), 4000);
}
