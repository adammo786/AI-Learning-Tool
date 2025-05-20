+require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json({limit: '50mb'}));

// ChatGPT endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that teaches people about artificial intelligence. Keep your responses concise and easy to understand."
        },
        {
          role: "user",
          content: message
        }
      ],
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

// Google Vision API endpoint
app.post('/api/analyse-image', async (req, res) => {
  try {
    const { image } = req.body;
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    
    if (!apiKey) {
      console.error('Google Vision API key is missing');
      return res.status(500).json({ error: 'API key configuration error' });
    }

    if (!image) {
      console.error('No image data received');
      return res.status(400).json({ error: 'No image data provided' });
    }

    console.log('Making request to Google Vision API...'); // Debug log

    const visionApiResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          image: { content: image },
          features: [{ type: 'LABEL_DETECTION', maxResults: 10 }]
        }]
      })
    });

    if (!visionApiResponse.ok) {
      const errorText = await visionApiResponse.text();
      console.error('Vision API Error:', errorText);
      throw new Error(`Vision API error: ${visionApiResponse.status} - ${errorText}`);
    }

    const data = await visionApiResponse.json();
    console.log('Vision API Response:', data); // Debug log
    res.json(data);
  } catch (error) {
    console.error('Error in /api/analyse-image:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});