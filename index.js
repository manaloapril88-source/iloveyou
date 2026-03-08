const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main endpoint: /ytmp3?link=https://youtube.com/watch?v=...
app.get('/ytmp3', async (req, res) => {
  const { link } = req.query;

  if (!link || (!link.includes('youtube.com') && !link.includes('youtu.be'))) {
    return res.status(400).json({ success: false, error: 'Add valid ?link=YouTube URL' });
  }

  try {
    // Get video info
    const info = await ytdl.getInfo(link);
    const videoDetails = info.videoDetails;

    const title = videoDetails.title || 'Unknown Title';
    const thumbnail = videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || 'https://i.ytimg.com/vi/default.jpg';
    const duration = parseFloat(videoDetails.lengthSeconds) || 0;

    // Estimate size (approx, since stream)
    const approxSize = Math.round(duration * 16000); // rough 160kbps estimate in bytes

    // Stream audio
    const audioStream = ytdl(link, {
      filter: 'audioonly',
      quality: 'highestaudio',
      requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
    });

    // Set response headers for direct download
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // Convert to MP3 and pipe to response
    ffmpeg(audioStream)
      .audioBitrate(192)
      .format('mp3')
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        if (!res.headersSent) res.status(500).json({ success: false, error: 'Conversion failed' });
      })
      .pipe(res, { end: true });

    // Optional: Log or return JSON first if you want Ferdev-like response (but for direct download, stream is better)
    // If you want JSON response like Ferdev, uncomment below and comment stream part
    /*
    res.json({
      success: true,
      status: 200,
      author: "April",
      data: {
        title,
        thumbnail,
        size: approxSize,
        duration,
        dlink: `${req.protocol}://${req.get('host')}/ytmp3?link=${encodeURIComponent(link)}` // self-link or external if hosted
      }
    });
    */

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Hindi ma-download',
      details: error.message.includes('bot') ? 'YouTube detection - try different video' : error.message
    });
  }
});

// Home
app.get('/', (req, res) => {
  res.json({ message: 'Sarili mong YTMP3 API running! Use /ytmp3?link=YOUTUBE_URL' });
});

app.listen(port, () => {
  console.log(`My YTMP3 API running sa http://localhost:${port}`);
  console.log(`Example: http://localhost:${port}/ytmp3?link=https://www.youtube.com/watch?v=BRyl0EgUj9g`);
});
