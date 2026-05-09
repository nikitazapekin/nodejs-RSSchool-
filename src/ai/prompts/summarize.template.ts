export function getSummarizePrompt(content: string, maxLength: string): string {
  const lengthMap: Record<string, string> = {
    short: '1-2 sentences',
    medium: '1 paragraph (3-5 sentences)',
    detailed: '2-3 paragraphs with key points',
  };

  return `Summarize the following article content in ${lengthMap[maxLength] || lengthMap.medium}.

Article content:
${content}

Provide only the summary without any additional commentary.`;
}
