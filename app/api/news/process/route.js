import { NextResponse } from 'next/server';
import { isNull, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { articles, categories } from '@/lib/db/schema';
import { processArticles } from '@/lib/claude/processor';
import { requireAdmin } from '@/lib/auth';

// POST /api/news/process - DB의 미처리 기사 Claude로 번역/요약/카테고리 분류
export async function POST() {
  const { response } = await requireAdmin();
  if (response) return response;

  // 미처리 기사 조회 (translated_title 이 없는 기사)
  const unprocessed = await db
    .select()
    .from(articles)
    .where(isNull(articles.translatedTitle));

  if (unprocessed.length === 0) {
    return NextResponse.json({ processed: 0, failed: 0, skipped: 0 });
  }

  // 카테고리 목록 조회
  const categoryList = await db
    .select()
    .from(categories)
    .orderBy(categories.id);

  // Claude로 번역/요약/카테고리 분류
  const processed = await processArticles(unprocessed, categoryList);

  // 처리 결과를 DB에 업데이트
  let successCount = 0;
  let failedCount = 0;

  for (const article of processed) {
    // translatedTitle이 원본과 같으면 처리 실패로 간주
    const isFailed =
      article.translatedTitle === article.originalTitle &&
      !article.translatedSummary;

    if (isFailed) {
      failedCount++;
      continue;
    }

    await db
      .update(articles)
      .set({
        translatedTitle: article.translatedTitle,
        translatedSummary: article.translatedSummary,
        categoryId: article.categoryId,
      })
      .where(eq(articles.id, article.id));

    successCount++;
  }

  return NextResponse.json({
    processed: successCount,
    failed: failedCount,
    skipped: 0,
  });
}
