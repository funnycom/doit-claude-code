import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { articles, categories } from '@/lib/db/schema';
import { fetchAllFeeds } from '@/lib/rss/parser';
import { processArticles } from '@/lib/claude/processor';
import { requireAdmin } from '@/lib/auth';

// POST /api/news/fetch - RSS 수집 → Claude 처리 → DB 저장
export async function POST() {
  const { response } = await requireAdmin();
  if (response) return response;

  // 카테고리 목록 조회
  const categoryList = await db
    .select()
    .from(categories)
    .orderBy(categories.id);

  // RSS 피드 수집
  const feedArticles = await fetchAllFeeds();

  // 기존 guid 목록 조회하여 중복 제거
  const existingGuids = new Set(
    (await db.select({ guid: articles.guid }).from(articles)).map((r) => r.guid)
  );
  const newArticles = feedArticles.filter((a) => !existingGuids.has(a.guid));

  if (newArticles.length === 0) {
    return NextResponse.json({ saved: 0, skipped: feedArticles.length });
  }

  // Claude로 번역/요약/카테고리 분류
  const processed = await processArticles(newArticles, categoryList);

  // DB 저장 (guid 충돌 시 무시)
  await db.insert(articles).values(processed).onConflictDoNothing();

  return NextResponse.json({
    saved: processed.length,
    skipped: feedArticles.length - newArticles.length,
  });
}
