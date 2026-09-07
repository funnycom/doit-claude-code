import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories as categoriesTable } from '@/lib/db/schema';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 새 카테고리에 순환 배정할 색상 팔레트 (ui.md 팔레트 기준)
const categoryColors = [
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#65A30D',
];

// 카테고리 이름 정규화 (공백/따옴표/슬래시/대소문자 차이 흡수)
function normalizeCategoryName(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/^["'`]|["'`]$/g, '') // 앞뒤 따옴표 제거
    .replace(/\s+/g, '') // 모든 공백 제거
    .replace(/[/·・|]/g, '/') // 구분자 통일
    .toLowerCase();
}

// 한글 이름을 slug 로 변환 (영문/숫자만 남기고, 없으면 타임스탬프 기반)
function toSlug(name) {
  const base = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `category-${Date.now()}`;
}

// Claude 가 답한 카테고리 문자열을 기존 카테고리 목록과 매칭
export function matchCategory(rawCategory, categories) {
  const target = normalizeCategoryName(rawCategory);
  if (!target) return null;

  // 1) 정규화 완전 일치
  let matched = categories.find(
    (c) => normalizeCategoryName(c.name) === target
  );
  if (matched) return matched;

  // 2) 부분 포함 (한쪽이 다른 쪽을 포함)
  matched = categories.find((c) => {
    const name = normalizeCategoryName(c.name);
    return name.includes(target) || target.includes(name);
  });
  return matched || null;
}

// 기존 카테고리에서 찾고, 없으면 새로 생성하여 카테고리 행 반환.
// 배치 병렬 처리 중 동시에 같은 이름을 만들 수 있어 slug unique 충돌은 재조회로 흡수.
async function findOrCreateCategory(rawCategory, cache) {
  const existing = matchCategory(rawCategory, cache.list);
  if (existing) return existing;

  const name = String(rawCategory)
    .trim()
    .replace(/^["'`]|["'`]$/g, '');
  if (!name) return null;

  const slug = toSlug(name);
  const color = categoryColors[cache.list.length % categoryColors.length];

  const [created] = await db
    .insert(categoriesTable)
    .values({ name, slug, color })
    .onConflictDoNothing()
    .returning();

  let category = created;
  // 충돌로 insert 가 스킵됐으면 기존 행을 다시 읽어옴
  if (!category) {
    [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, slug));
  }

  if (category) cache.list.push(category);
  return category || null;
}

// 단일 기사 Claude 처리 (번역, 요약, 카테고리 분류)
async function processArticle(article, categoryNames) {
  const knownList = categoryNames.length
    ? categoryNames.map((name) => `- ${name}`).join('\n')
    : '(아직 없음)';

  const prompt = `다음 영어 기사를 한국어로 처리해주세요.

제목: ${article.originalTitle}
본문: ${article.originalSummary}

[카테고리 규칙]
아래는 지금까지 사용 중인 카테고리 목록입니다.
${knownList}

- 목록에 이 기사에 어울리는 카테고리가 있으면 그 이름을 글자 그대로 사용하세요.
- 어울리는 것이 없을 때만 새 카테고리 이름을 지으세요.
- 카테고리 이름은 한국어로 2~6글자의 넓은 주제 단위로 만드세요 (예: "AI 기술", "AI 정책", "AI 투자", "AI 안전").
- 지나치게 세분화하지 말고, 기존 카테고리와 의미가 겹치면 새로 만들지 마세요.

JSON 형식으로만 응답해주세요:
{
  "translatedTitle": "한국어 번역 제목",
  "translatedSummary": "3~4문장 한국어 요약",
  "category": "카테고리 이름"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  // content 배열에서 text 블록만 골라 이어붙임 (thinking 블록 등이 앞에 올 수 있음)
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  if (!text) throw new Error('응답에 text 블록이 없습니다');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON 파싱 실패');

  return JSON.parse(jsonMatch[0]);
}

// 여러 기사 병렬 처리 (3~5개씩 배치)
export async function processArticles(articles, categories) {
  // 배치 사이에 새로 만들어진 카테고리를 다음 배치가 재사용하도록 캐시 공유
  const cache = { list: [...categories] };
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (article) => {
        try {
          const categoryNames = cache.list.map((c) => c.name);
          const processed = await processArticle(article, categoryNames);
          const matchedCategory = await findOrCreateCategory(
            processed.category,
            cache
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
