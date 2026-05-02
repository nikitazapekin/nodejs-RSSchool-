export function getTranslatePrompt(content: string, targetLanguage: string, sourceLanguage?: string): string {
  const source = sourceLanguage ? `from ${sourceLanguage}` : '(auto-detect the source language)';

  return `Translate the following article content ${source} to ${targetLanguage}.

Article content:
${content}

Respond with valid JSON only in this format:
{
  "translatedText": "translated article text",
  "detectedLanguage": "detected source language"
}`;
}
