import type {
  ReviewExtractor,
  ReviewExtractionInput,
  ReviewExtractorConfig,
  ReviewData,
} from '../domain/ports/review-extractor.port';

export class GeminiReviewExtractor implements ReviewExtractor {
  async extract(input: ReviewExtractionInput, config: ReviewExtractorConfig): Promise<ReviewData> {
    const { itemName, category, url } = input;
    const { provider, apiKey, model, customPrompt, endpoint } = config;

    if (provider !== 'local' && !apiKey) {
      return this.generateMockReviews(itemName, category);
    }

    return this.extractWithAI(itemName, category, url, provider, apiKey, model, customPrompt, endpoint);
  }

  private compilePrompt(
    customPrompt: string,
    itemName: string,
    category: string,
    url: string,
    pageContext: string
  ): string {
    if (!customPrompt) {
      return `
      You are an expert shopping reviewer assistant. Analyze this product link and details:
      Product Name: "${itemName}"
      Product Category: "${category}"
      Product URL: ${url}
      ${pageContext ? `Scraped Page Metadata:\n${pageContext}` : ''}

      Generate a review synthesis in JSON format. Provide:
      1. A paragraph summarizing the overall consensus/reviews of the product ("summary").
      2. 3-4 bullet points detailing key positive aspects ("pros").
      3. 3-4 bullet points detailing key negative/critical aspects ("cons").
      4. 2 representative reviews from real online sources:
         - 1 positive review (rating 4 or 5) completely describing what makes the item great.
         - 1 negative/critical review (rating 1 or 2) describing real shortcomings.
         Include "author", "rating", "content", and "type" ("positive" or "negative") for each.

      Your output MUST be a valid JSON object matching this structure:
      {
        "summary": "overall summary paragraph...",
        "pros": ["pro point 1", "pro point 2"],
        "cons": ["con point 1", "con point 2"],
        "reviews": [
          {
            "author": "Author Name",
            "rating": 5,
            "content": "Full text of positive review...",
            "type": "positive"
          },
          {
            "author": "Author Name",
            "rating": 2,
            "content": "Full text of critical/negative review...",
            "type": "negative"
          }
        ]
      }

      Do not include markdown blocks like \`\`\`json. Output raw JSON only.
      `;
    }

    return customPrompt
      .replace(/{itemName}/g, itemName)
      .replace(/{category}/g, category)
      .replace(/{url}/g, url)
      .replace(/{pageContext}/g, pageContext);
  }

  private parseJsonClean(text: string): ReviewData {
    let clean = text.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(json)?/i, '');
      clean = clean.replace(/```$/, '');
      clean = clean.trim();
    }
    return JSON.parse(clean) as ReviewData;
  }

  private async extractWithAI(
    itemName: string,
    category: string,
    url: string,
    provider: ReviewExtractorConfig['provider'],
    apiKey: string,
    model: string,
    customPrompt: string,
    endpoint: string
  ): Promise<ReviewData> {
    let pageContext = '';
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        const metaDescMatch =
          html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);

        pageContext = `
          Page Title: ${titleMatch ? titleMatch[1].trim() : ''}
          Meta Description: ${metaDescMatch ? metaDescMatch[1].trim() : ''}
        `;
      }
    } catch {
      // Ignore fetching failure and proceed with item name
    }

    const compiledPrompt = this.compilePrompt(customPrompt, itemName, category, url, pageContext);
    let textResponse = '';

    if (provider === 'openrouter') {
      const targetModel = model || 'google/gemini-2.5-flash';
      const openrouterUrl = endpoint
        ? endpoint.endsWith('/')
          ? `${endpoint}chat/completions`
          : `${endpoint}/chat/completions`
        : 'https://openrouter.ai/api/v1/chat/completions';

      const response = await fetch(openrouterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Giftistry',
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: compiledPrompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API returned status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      textResponse = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'openai') {
      const targetModel = model || 'gpt-4o-mini';
      const openaiUrl = endpoint
        ? endpoint.endsWith('/')
          ? `${endpoint}chat/completions`
          : `${endpoint}/chat/completions`
        : 'https://api.openai.com/v1/chat/completions';

      const response = await fetch(openaiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: compiledPrompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API returned status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      textResponse = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'anthropic') {
      const targetModel = model || 'claude-3-5-sonnet-20240620';
      const anthropicUrl = endpoint
        ? endpoint.endsWith('/')
          ? `${endpoint}messages`
          : `${endpoint}/messages`
        : 'https://api.anthropic.com/v1/messages';

      const response = await fetch(anthropicUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 2000,
          messages: [{ role: 'user', content: compiledPrompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API returned status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      textResponse = data.content?.[0]?.text || '';
    } else if (provider === 'local') {
      const targetModel = model || 'llama3';
      let baseEndpoint = endpoint || 'http://localhost:11434/v1';
      if (
        baseEndpoint.includes('localhost:11434') &&
        !baseEndpoint.endsWith('/v1') &&
        !baseEndpoint.endsWith('/v1/')
      ) {
        baseEndpoint = baseEndpoint.endsWith('/') ? `${baseEndpoint}v1` : `${baseEndpoint}/v1`;
      }
      const localUrl = baseEndpoint.endsWith('/')
        ? `${baseEndpoint}chat/completions`
        : `${baseEndpoint}/chat/completions`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const response = await fetch(localUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: compiledPrompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`Local API returned status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      textResponse = data.choices?.[0]?.message?.content || '';
    } else {
      const targetModel = model || 'gemini-1.5-flash';
      let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
      if (endpoint) {
        geminiUrl = endpoint.endsWith('/')
          ? `${endpoint}models/${targetModel}:generateContent?key=${apiKey}`
          : `${endpoint}/models/${targetModel}:generateContent?key=${apiKey}`;
      }

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: compiledPrompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (!textResponse) {
      throw new Error(`Empty response returned from ${provider} API.`);
    }

    return this.parseJsonClean(textResponse);
  }

  private generateMockReviews(itemName: string, category: string): ReviewData {
    const cleanName = itemName.trim();
    const lowerCategory = (category || 'generic').toLowerCase();

    if (
      lowerCategory.includes('tech') ||
      cleanName.match(/phone|laptop|ipad|watch|headphone|mouse|keyboard|screen|monitor|charger/i)
    ) {
      return {
        summary: `The overall consensus on the "${cleanName}" highlights it as a top-tier piece of technology with exceptional performance and a sleek design, though it comes at a premium price point.`,
        pros: [
          'Incredibly fast processing speeds and responsive user interface.',
          'Stunning, high-refresh-rate display with vibrant color accuracy.',
          'Outstanding battery efficiency, easily lasting a full day of heavy usage.',
          'Premium, lightweight build materials that feel solid in the hand.',
        ],
        cons: [
          'High retail price makes it a substantial investment.',
          'Limited out-of-the-box accessories included in the packaging.',
          'Can run slightly warm under intense gaming or rendering tasks.',
          'Proprietary ecosystem lock-in makes third-party integration tedious.',
        ],
        reviews: [
          {
            author: 'TechEnthusiast99',
            rating: 5,
            content: `I've been using the ${cleanName} for two weeks now and it has completely exceeded my expectations. The display is gorgeous, and it handles everything I throw at it without lag. Highly recommended!`,
            type: 'positive',
          },
          {
            author: 'SkepticalBuyer',
            rating: 2,
            content: `While the ${cleanName} is undoubtedly fast, the price is simply hard to justify. It doesn't even come with a power brick in the box anymore! Also, it gets uncomfortable to hold when playing games.`,
            type: 'negative',
          },
        ],
      };
    }

    if (
      lowerCategory.includes('clothing') ||
      cleanName.match(/shirt|pants|jacket|shoes|dress|socks|hat|coat|sweater|boots/i)
    ) {
      return {
        summary: `Reviewers agree that the "${cleanName}" offers great comfort, modern styling, and soft fabrics, though some users note size discrepancies and color fading after washing.`,
        pros: [
          'Extremely soft fabric blend that feels comfortable all day.',
          'Highly breathable material, perfect for active or casual wear.',
          'Tailored, flattering fit that matches modern styling.',
          'Sturdy stitching details along seams prevent tearing.',
        ],
        cons: [
          'Sizing tends to run slightly smaller than standard charts.',
          'Requires gentle wash cycles to prevent shrinking.',
          'Colors may fade slightly after multiple laundry cycles.',
          'Limited stretch in waist/shoulders depending on build.',
        ],
        reviews: [
          {
            author: 'FashionForward',
            rating: 5,
            content: `The fit of the ${cleanName} is absolutely perfect. It feels premium and looks great. I've washed it twice and it still looks brand new. I'm going to order it in another color!`,
            type: 'positive',
          },
          {
            author: 'LaundressReview',
            rating: 2,
            content: `Be careful with the size! I bought my usual size for this ${cleanName} and it was way too tight. Also, after one wash on normal, it shrunk about half a size. Definitely size up.`,
            type: 'negative',
          },
        ],
      };
    }

    return {
      summary: `The "${cleanName}" generally receives positive feedback from consumers for its overall reliability and build quality, offering a solid experience with minor flaws.`,
      pros: [
        'Solid build quality that feels durable and long-lasting.',
        'Intuitive usability, requiring minimal setup or instructions.',
        'Sleek and modern aesthetics that fit any background/environment.',
        'Great value-for-money compared to main brand competitors.',
      ],
      cons: [
        'Minor shipping delays reported by some retail customers.',
        'Material finish is prone to collecting fingerprints or smudges.',
        'Customer support response times can be hit or miss.',
        'Lacks advanced features found in higher-end alternatives.',
      ],
      reviews: [
        {
          author: 'HappyCustomer',
          rating: 4,
          content: `Very pleased with the ${cleanName}. It does exactly what it says on the box, the quality is good, and it feels like it will last. Will buy again!`,
          type: 'positive',
        },
        {
          author: 'CritiqueGuru',
          rating: 3,
          content: `The ${cleanName} is average. It works fine but doesn't feel special. The plastic casing feels a bit cheap, and the customer support took three days to answer my simple setup question.`,
          type: 'negative',
        },
      ],
    };
  }
}
