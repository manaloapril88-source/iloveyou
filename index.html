<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Text Portrait Auto</title>
<style>
  body {
    background: black;
    color: white;
    font-family: monospace;
    white-space: pre;
    font-size: 5px;
    line-height: 5px;
  }
</style>
</head>
<body>

<pre id="output"></pre>

<script>
const output = document.getElementById("output");
const img = new Image();

// DITO naka-set agad image mo
img.src = "love.jpg"; 

img.onload = function() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const WIDTH = 160;
  const ratio = img.height / img.width;
  canvas.width = WIDTH;
  canvas.height = WIDTH * ratio;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const TEXT = "ILOVEYOU";
  let textIndex = 0;
  let result = "";

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];

      const brightness = (r + g + b) / 3;

      let char = " ";
      if (brightness < 210) {
        char = TEXT[textIndex % TEXT.length];
        textIndex++;
      }

      result += char;
    }
    result += "\n";
  }

  output.textContent = result;
};
</script>

</body>
</html>
