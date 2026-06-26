const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/generate', async (req, res) => {
  try {
    const { biz, city, lang, prob, category, outputTypes } = req.body;

    if (!biz) return res.status(400).json({ error: 'Business type required' });

    const types = (outputTypes && outputTypes.length > 0)
      ? outputTypes
      : ['Instagram Caption', 'WhatsApp Message', 'Google Business Post', 'Ad Copy', 'Sales Pitch'];

    const cityStr = city ? ` in ${city}` : '';

    const systemPrompt = `You are an expert Indian small business marketing AI. You generate ready-to-use content for local Indian businesses. Always write content that is practical, culturally relevant, and sounds natural for Indian audiences. Return ONLY valid JSON, no markdown, no extra text.`;

    const userPrompt = `Generate business content for the following:
- Business: ${biz}${cityStr}
- Language: ${lang}
- Biggest challenge: ${prob}
- Category: ${category}
- Content types needed: ${types.join(', ')}

Generate exactly ${types.length} pieces of content — one for each content type.

Return a JSON object in this exact format:
{
  "title": "Content for [business] ${cityStr}",
  "prompts": [
    {
      "output_type": "<exact content type from the list>",
      "use_case": "<short descriptive name, e.g. 'Festival Offer Post'>",
      "prompt": "<the actual ready-to-use content, 3-6 sentences, in ${lang}>",
      "tip": "<one practical tip for using this content>"
    }
  ]
}

Rules:
- prompt must be actual usable content (post text, message text), NOT a meta-prompt
- Include relevant emojis for social content
- Make content specific to ${biz}${cityStr}
- For WhatsApp: keep it conversational and short
- For Instagram: include hashtags at the end
- For Google Post: professional tone, mention location
- For Ad Copy: strong hook + clear call to action
- For SEO Blog: start with an engaging intro paragraph`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content || '';

    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse failed:', cleaned.substring(0, 300));
      return res.status(500).json({ error: 'AI response parse error. Please try again.' });
    }

    if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
      return res.status(500).json({ error: 'Invalid AI response format. Please try again.' });
    }

    res.json(parsed);

  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PromptKit running on port ${PORT}`));
