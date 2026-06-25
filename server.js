const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/api/generate', async (req, res) => {
  const { biz, city, lang, prob, category } = req.body;

  if (!biz) {
    return res.status(400).json({ error: 'Business type required' });
  }

  const prompt = `You are an expert prompt engineer for Indian small businesses.
Create 5 ready-to-use AI prompts for a ${biz} in ${city || 'India'}.
Category: ${category || 'Social Media'}
Language: ${lang || 'English'}
Main problem: ${prob || 'Getting more customers'}

Respond ONLY in valid JSON, no markdown, no backticks:
{
  "title": "5 ${category} prompts for your ${biz}",
  "prompts": [
    {
      "use_case": "3-4 word label",
      "prompt": "Full prompt in ${lang} with [placeholders]. Min 3 sentences. Specific to a ${biz} in India. Include Indian context where relevant.",
      "tip": "One practical tip on using this prompt. Start with Tip:"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: 'You are an expert prompt engineer for Indian small businesses. Always respond in valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    let text = data.choices[0].message.content;
    text = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
