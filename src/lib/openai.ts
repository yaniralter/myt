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
    `Small compact centered icon of: ${userPrompt}. This is standalone artwork — just the design element itself as a clean graphic on a plain white background. Vector art quality.`
  );

  if (style && STYLE_INSTRUCTIONS[style]) {
    parts.push(`Art style: ${STYLE_INSTRUCTIONS[style]}.`);
  }

  if (colors && colors.length > 0) {
    parts.push(`Dominant color palette: ${colors.join(", ")}.`);
  }

  parts.push(
    "MANDATORY SIZE RULES: The design element must occupy MAXIMUM 25% of the total canvas area. The main design should be TINY and well-centered — imagine a small stamp in the middle of a large white page. Huge empty white margins: at least 35% pure white space above, 35% below, 20% left, 20% right. Minimalist composition with maximum negative space. The entire background must be solid pure white (#FFFFFF). Do NOT fill the canvas — keep the artwork extremely small and compact. No text, no lettering, no words. High resolution isolated design element."
  );

  return parts.join(" ");
}
