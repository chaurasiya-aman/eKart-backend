export const AI_CONFIG = {
  model: "meta/llama-3.1-70b-instruct",
  temperature: 0.6,
  max_tokens: 250,
  history_limit: 8,
};

export const SHOPPING_KEYWORDS =
  /mobile|phone|smartphone|laptop|notebook|tablet|ipad|buy|show|find|suggest|recommend|budget|price|under|above|cheap|brand|compare|vs|which/i;

export const CATEGORY_MAP = {
  mobile: /mobile|phone|smartphone/,
  laptop: /laptop|notebook|computer/,
  tab: /tab|tablet|ipad|tablets/,
};