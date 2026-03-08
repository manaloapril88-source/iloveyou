const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const { YtDlp } = require('ytdlp-nodejs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Your YouTube Data API Key (ilagay sa .env later para secure)
const API_KEY = 'AIzaSyBwc-TtchkgQzTWu2ubd3IkPCvcIgwdIgU';

// Initialize YouTube API
const youtube = google.youtube({
  version: 'v3',
  auth: API_KEY,
});

// Initialize ytdlp-nodejs
const ytdlp = new YtDlp(); // Auto-handles binary & updates

// Cookies file path (same folder ng index.js)
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');

app.use(cors());
app.use(express.json());

// Endpoint 1: YouTube Search
app.get('/yt/search', async (req, res) => {
  const { q, max = 10 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing search query. Add ?q=your search term' });
  }

  const maxResults = Math.min(Math.max(1, parseInt(max, 10)), 50);

  try {
    const response = await youtube.search.list({
      part: 'id,snippet',
      q: q.trim(),
      maxResults,
      type: 'video',
      order: 'relevance',
    });

    const videos = response.data.items.map(item => ({
      title: item.snippet.title
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'"),
      description: item.snippet.description,
      videoId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || '',
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

    res.json({
      success: true,
      query: q,
      count: videos.length,
      results: videos,
    });
  } catch (error) {
    console.error('Search Error:', error?.message);
    res.status(500).json({ error: 'Search failed', details: error?.message });
  }
});

// Endpoint 2: Download MP3 (with cookies for bot bypass)
app.get('/yt/mp3', async (req, res) => {
  const { url } = req.query;

  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    return res.status(400).json({ error: 'Add valid YouTube URL: ?url=https://youtube.com/watch?v=...' });
  }

  try {
    // Get info for filename
    const info = await ytdlp.getInfoAsync(url);
    let title = (info.title || 'youtube_audio')
      .replace(/[^a-zA-Z0-9\s-]/g, '_')
      .trim();
    const fileName = `${title}.mp3`;

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    console.log(`Downloading MP3: ${title} from ${url} (using cookies)`);

    // Use cookies file + stream to response
    await ytdlp
      .downloadAudio(url, 'mp3')
      .cookies(COOKIES_PATH)  // <-- Key: gamit cookies mo!
      .on('progress', (progress) => {
        console.log(`Progress: ${progress.percentage_str || progress.percent}% | Speed: ${progress.speed || 'N/A'}`);
      })
      .run(res);  // Pipe/stream direct sa response

  } catch (error) {
    console.error('MP3 Download Error:', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Hindi ma-download ang MP3',
        details: error?.message || 'Check cookies.txt validity, FFmpeg install, or video restrictions.',
      });
    } else {
      res.end();
    }
  }
});

// Home route
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'YT API Ready! Use /yt/search or /yt/mp3',
    note: 'MP3 uses cookies.txt for YouTube bot bypass. Ensure FFmpeg is installed.',
  });
});

app.listen(port, () => {
  console.log(`Server running sa http://localhost:${port}`);
  console.log(`Test search: http://localhost:${port}/yt/search?q=hiling`);
  console.log(`Test MP3: http://localhost:${port}/yt/mp3?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ`);
});
