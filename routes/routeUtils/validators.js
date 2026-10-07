export const validateChatRequest = (req, res, next) => {
  const { prompt, conversationHistory } = req.body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      error: "prompt is required and must be a non-empty string.",
    });
  }

  if (prompt.trim().length > 500) {
    return res.status(400).json({
      success: false,
      error: "prompt must be 500 characters or fewer.",
    });
  }

  if (conversationHistory !== undefined) {
    if (!Array.isArray(conversationHistory)) {
      return res.status(400).json({
        success: false,
        error: "conversationHistory must be an array.",
      });
    }

    if (conversationHistory.length > 20) {
      return res.status(400).json({
        success: false,
        error: "conversationHistory must contain 20 messages or fewer.",
      });
    }

    const isValid = conversationHistory.every(
      (msg) =>
        msg &&
        typeof msg === "object" &&
        typeof msg.content === "string" &&
        msg.content.length <= 5000 &&
        ["user", "assistant"].includes(msg.role)
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error:
          "Each history message must have a valid role and content of at most 5000 characters.",
      });
    }
  }

  next();
};
