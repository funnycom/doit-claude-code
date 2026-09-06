import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 단일 기사 Claude 처리 (번역, 요약, 카테고리 분류)
async function processArticle(article, categoryNames) {
  const prompt = `다음 영어 기사를 한국어로 처리해주세요.

제목: ${article.originalTitle}
본문: ${article.originalSummary}

사용 가능한 카테고리: ${categoryNames.join(', ')}, 기타

JSON 형식으로 응답해주세요:
{
  "translatedTitle": "한국어 번역 제목",
  "translatedSummary": "3~4문장 한국어 요약",
  "category": "위 카테고리 중 가장 적합한 것"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON 파싱 실패');

  return JSON.parse(jsonMatch[0]);
}

// 여러 기사 병렬 처리 (3~5개씩 배치)
export async function processArticles(articles, categories) {
  const categoryNames = categories.map((c) => c.name);
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (article) => {
        try {
          const processed = await processArticle(article, categoryNames);
          const matchedCategory = categories.find(
            (c) => c.name === processed.category
          );
          return {
            ...article,
            translatedTitle: processed.translatedTitle,
            translatedSummary: processed.translatedSummary,
            categoryId: matchedCategory?.id || null,
          };
        } catch (error) {
          // 처리 실패 시 DB에 저장하지 않음 (guid가 남지 않아 다음 수집 때 재시도됨)
          console.error(
            `기사 처리 실패 (${article.originalTitle}):`,
            error.message
          );
          return null;
        }
      })
    );
    results.push(...batchResults);
  }

  // 처리 실패한 기사(null) 제외
  return results.filter((r) => r !== null);
}
