const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const ytdlp = require('ytdlp-nodejs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Your YouTube Data API Key (ilagay sa .env sa production!)
const API_KEY = 'AIzaSyBwc-TtchkgQzTWu2ubd3IkPCvcIgwdIgU';

// Initialize YouTube API
const youtube = google.youtube({
  version: 'v3',
  auth: API_KEY,
});

app.use(cors());           // Allow frontend access (e.g. browser fetch)
app.use(express.json());   // Para sa future POST if needed

// Endpoint 1: Search YouTube videos
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
      // regionCode: 'PH', // Uncomment kung gusto PH-focused
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
      channelId: item.snippet.channelId,
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
    res.status(500).json({
      error: 'Error sa YouTube search',
      details: error?.message || 'Unknown error',
    });
  }
});

// Endpoint 2: Download MP3 (actual audio extraction & download)
app.get('/yt/mp3', async (req, res) => {
  const { url } = req.query;

  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    return res.status(400).json({ error: 'Add valid YouTube URL: ?url=https://youtube.com/watch?v=...' });
  }

  try {
    // Get video metadata para sa filename
    const info = await ytdlp.getVideoInfo(url);
    let title = (info.title || 'youtube_audio')
      .replace(/[^a-zA-Z0-9\s-]/g, '_')  // Clean special chars
      .trim();
    const fileName = `${title}.mp3`;

    // Set headers para maging download sa browser
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    console.log(`Starting MP3 download: ${title} from ${url}`);

    // Stream audio direct to response (no disk save)
    await ytdlp.downloadAudio(url, {
      format: 'bestaudio/best',     // Best audio quality available
      audioFormat: 'mp3',           // Convert to MP3
      audioQuality: '320K',         // Target 320kbps if possible
      output: '-',                  // Output to stdout (para i-pipe sa res)
      // Optional: Add more yt-dlp args if needed
      // extraArgs: ['--embed-thumbnail', '--add-metadata']
      progress: (progress) => {
        console.log(`Progress: ${progress.percent}% | Speed: ${progress.speed}`);
      },
    }, res);  // Pipe direct sa Express response

    // Note: Process ends when download finishes or errors

  } catch (error) {
    console.error('MP3 Download Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Hindi ma-download ang MP3',
        details: error.message || 'Check FFmpeg installation or try shorter video',
      });
    } else {
      res.end(); // Close stream if already started
    }
  }
});

// Home / health check
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'YT Search + MP3 Downloader API',
    endpoints: [
      'GET /yt/search?q=hiling&max=5',
      'GET /yt/mp3?url=https://www.youtube.com/watch?v=VIDEO_ID',
    ],
    note: 'MP3 endpoint requires FFmpeg installed',
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running sa http://localhost:${port}`);
  console.log(`   Search example: http://localhost:${port}/yt/search?q=hiling`);
  console.log(`   MP3 example:   http://localhost:${port}/yt/mp3?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ`);
});
