import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const STYLE_INSTRUCTIONS: Record<string, string> = {
  vintage:
    "retro vintage aesthetic, distressed texture, faded warm tones, hand-drawn feel, classic Americana style",
  minimalist:
    "clean minimalist design, simple geometric shapes, lots of negative space, single-weight line art, modern simplicity",
  streetwear:
    "bold streetwear graphic, urban culture inspired, high contrast, graffiti influence, edgy and contemporary",
  anime:
    "anime and manga inspired illustration, cel-shaded look, vibrant colors, dynamic pose, Japanese pop art style",
  abstract:
    "abstract artistic composition, bold shapes and forms, expressive brushstrokes, modern art inspired, visually striking",
  retro:
    "80s/90s retro style, neon colors, synthwave aesthetic, chrome effects, nostalgic pop culture vibes",
};

export function buildEnhancedPrompt(
  userPrompt: string,
  style?: string,
  colors?: string[]
): string {
  const parts: string[] = [];

  parts.push(
    `A simple centered icon or illustration of: ${userPrompt}.`
  );

  if (style && STYLE_INSTRUCTIONS[style]) {
    parts.push(`Art style: ${STYLE_INSTRUCTIONS[style]}.`);
  }

  if (colors && colors.length > 0) {
    parts.push(`Dominant color palette: ${colors.join(", ")}.`);
  }

  parts.push(
    "CRITICAL LAYOUT RULES: The artwork must occupy ONLY 30-40% of the total canvas area. It must be a small, centered icon/illustration with LOTS of pure white (#FFFFFF) empty space surrounding it on ALL sides. Leave huge white margins — at least 30% empty space above, below, left, and right. Minimalist composition with maximum breathing room. Think of a small logo centered on a large white page. Do NOT fill the canvas. Do NOT include any t-shirt, clothing, mockup, or garment. Output ONLY the flat graphic artwork on a plain solid pure white background. No text or lettering. High resolution, isolated design element suitable for printing."
  );

  return parts.join(" ");
}
