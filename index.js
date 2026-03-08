const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const { YtDlp } = require('ytdlp-nodejs');

const app = express();
const port = process.env.PORT || 3000;

// Your YouTube Data API Key (mas maganda sa .env later!)
const API_KEY = 'AIzaSyBwc-TtchkgQzTWu2ubd3IkPCvcIgwdIgU';

// Initialize YouTube API
const youtube = google.youtube({
  version: 'v3',
  auth: API_KEY,
});

// Initialize ytdlp-nodejs
const ytdlp = new YtDlp(); // Auto-handles yt-dlp binary & FFmpeg if available

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
      // regionCode: 'PH', // Uncomment para PH-focused
    });

    const videos = response.data.items.map(item => ({
      title: item.snippet.title
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'"),
      description: item.snippet.description,
      videoId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url ||
                 item.snippet.thumbnails?.high?.url ||
                 item.snippet.thumbnails?.default?.url || '',
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

    res.json({
      success: true,
      query: q,
      count: videos.length,
      results: videos,
      totalApprox: response.data.pageInfo?.totalResults,
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error) {
    console.error('Search Error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Error sa YouTube search', details: error?.message });
  }
});

// Endpoint 2: Download MP3 (actual audio download/stream)
app.get('/yt/mp3', async (req, res) => {
  const { url } = req.query;

  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    return res.status(400).json({ error: 'Add valid YouTube URL: ?url=https://youtube.com/watch?v=...' });
  }

  try {
    // Get video info for filename
    const info = await ytdlp.getInfoAsync(url);
    let title = (info.title || 'youtube_audio')
      .replace(/[^a-zA-Z0-9\s-]/g, '_')
      .trim();
    const fileName = `${title}.mp3`;

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    console.log(`Starting MP3 download: ${title} (${url})`);

    // Download audio as MP3 and stream directly to response
    await ytdlp.downloadAudio(url, 'mp3', {
      onProgress: (progress) => {
        console.log(`Progress: ${progress.percentage_str || progress.percent}% | Speed: ${progress.speed || 'N/A'}`);
      },
      // Extra options if needed: quality, etc.
      // quality: 'best', // or specific like '0' for best VBR
    }, res); // Pipe to res (streams direct, no disk save)

  } catch (error) {
    console.error('MP3 Download Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Hindi ma-download ang MP3',
        details: error.message || 'Check FFmpeg, internet, or try shorter video. Baka kailangan i-update yt-dlp binary (auto-try ng library).',
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
    message: 'YT Search + MP3 Downloader API Ready!',
    endpoints: [
      'GET /yt/search?q=hiling&max=5',
      'GET /yt/mp3?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ],
    note: 'MP3 requires FFmpeg installed. First run may download yt-dlp binary.',
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running sa http://localhost:${port}`);
  console.log(`   Search: http://localhost:${port}/yt/search?q=hiling`);
  console.log(`   MP3:    http://localhost:${port}/yt/mp3?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ`);
});
