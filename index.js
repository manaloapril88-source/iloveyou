const express = require('express');
const { google } = require('googleapis');
const cors = require('cors'); // optional, para pwede i-access from frontend (e.g. browser or React)

const app = express();
const port = process.env.PORT || 3000;

// Your YouTube API Key (CHANGE THIS TO ENV VAR IN PRODUCTION!)
const API_KEY = 'AIzaSyBwc-TtchkgQzTWu2ubd3IkPCvcIgwdIgU';

// Initialize YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: API_KEY,
});

// Enable CORS if needed (allow all origins for dev)
app.use(cors());

// Main endpoint: /yt/search?q=your+search+term
app.get('/yt/search', async (req, res) => {
  const { q, max = 10 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing search query. Add ?q=your search term' });
  }

  const maxResults = Math.min(Math.max(1, parseInt(max, 10)), 50); // limit 1-50

  try {
    const response = await youtube.search.list({
      part: 'id,snippet',
      q: q.trim(),
      maxResults: maxResults,
      type: 'video', // video lang (pwede ring 'channel' o 'playlist' kung gusto mo)
      order: 'relevance', // pwede: date, viewCount, rating, etc.
      // regionCode: 'PH', // optional: para mas PH-relevant results
      // videoDuration: 'medium', // optional: short | medium | long
    });

    // Format the results nicely
    const videos = response.data.items.map(item => ({
      title: item.snippet.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"'), // clean HTML entities
      description: item.snippet.description,
      videoId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
    }));

    res.json({
      success: true,
      query: q,
      results: videos,
      totalResultsApprox: response.data.pageInfo.totalResults,
      nextPageToken: response.data.nextPageToken, // for pagination if needed later
    });
  } catch (error) {
    console.error('YouTube API Error:', error?.response?.data || error.message);

    let errorMsg = 'Error fetching YouTube results';
    let status = 500;

    if (error?.response?.status === 403 && error?.response?.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
      errorMsg = 'YouTube API quota exceeded (10,000 units/day limit). Try again tomorrow or request quota increase.';
      status = 429;
    } else if (error?.response?.status === 400) {
      errorMsg = 'Invalid request parameters.';
      status = 400;
    }

    res.status(status).json({ error: errorMsg, details: error?.message });
  }
});

// Health check endpoint (optional)
app.get('/', (req, res) => {
  res.json({ message: 'YouTube Search API is running! Use /yt/search?q=your+query' });
});

app.listen(port, () => {
  console.log(`YouTube Search API running on http://localhost:${port}`);
  console.log(`Example: http://localhost:${port}/yt/search?q=hiling`);
});
