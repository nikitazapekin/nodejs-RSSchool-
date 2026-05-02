export function getAnalyzePrompt(content: string, task: string): string {
  const taskMap: Record<string, string> = {
    review: 'Review the article content and provide insights about its quality, structure, and completeness.',
    bugs: 'Analyze the article content for any errors, inconsistencies, or factual inaccuracies.',
    optimize: 'Suggest optimizations to improve the article content, clarity, and readability.',
    explain: 'Explain the key concepts and main ideas presented in the article.',
  };

  return `${taskMap[task] || taskMap.review}

Article content:
${content}

Provide your analysis in JSON format with the following structure:
{
  "analysis": "detailed analysis text",
  "suggestions": ["suggestion1", "suggestion2", ...],
  "severity": "info" | "warning" | "error"
}

Respond with valid JSON only.`;
}
