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
    `Create a flat graphic illustration of: ${userPrompt}. This is standalone artwork — just the design element itself as a clean graphic on a plain white background. Icon style, centered composition, vector art quality.`
  );

  if (style && STYLE_INSTRUCTIONS[style]) {
    parts.push(`Art style: ${STYLE_INSTRUCTIONS[style]}.`);
  }

  if (colors && colors.length > 0) {
    parts.push(`Dominant color palette: ${colors.join(", ")}.`);
  }

  parts.push(
    "CRITICAL LAYOUT RULES: The artwork must occupy ONLY 30-40% of the total canvas area. It must be a small, centered icon or illustration with LOTS of pure white (#FFFFFF) empty space surrounding it on ALL sides. Leave at least 30% white margin above, below, left, and right. Think of a small logo centered on a large white page. Do NOT fill the canvas. Output ONLY the flat graphic artwork on a solid pure white (#FFFFFF) background. No text, no lettering, no words. High resolution isolated design element."
  );

  return parts.join(" ");
}
