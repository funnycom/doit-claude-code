import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { articles, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

// POST /api/notion - Notion에 뉴스 저장
export async function POST(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json();
  const { articleId } = body;

  if (!articleId) {
    return NextResponse.json(
      { error: 'articleId가 필요합니다.' },
      { status: 400 }
    );
  }

  // 기사 조회
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId));
  if (!article) {
    return NextResponse.json(
      { error: '기사를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  // 이미 저장된 경우
  if (article.notionPageId) {
    return NextResponse.json({
      notionPageId: article.notionPageId,
      alreadySaved: true,
    });
  }

  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    return NextResponse.json(
      { error: 'NOTION_DATABASE_ID가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  // Notion MCP 서버로 페이지 생성
  const notionApiBase = 'https://api.notion.com/v1';
  const notionToken = process.env.NOTION_API_TOKEN;

  if (!notionToken) {
    return NextResponse.json(
      { error: 'Notion API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  const properties = {
    제목: {
      title: [
        {
          text: {
            content:
              article.translatedTitle ?? article.originalTitle ?? '제목 없음',
          },
        },
      ],
    },
    출처: {
      url: article.sourceUrl ?? null,
    },
    요약: {
      rich_text: [
        {
          text: {
            content: article.translatedSummary ?? article.originalSummary ?? '',
          },
        },
      ],
    },
  };

  if (article.publishedAt) {
    properties['날짜'] = {
      date: {
        start: new Date(article.publishedAt).toISOString().split('T')[0],
      },
    };
  }

  // 카테고리명 조회 후 텍스트로 저장
  if (article.categoryId) {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, article.categoryId));
    if (category?.name) {
      properties['카테고리'] = {
        rich_text: [{ text: { content: category.name } }],
      };
    }
  }

  const notionRes = await fetch(`${notionApiBase}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  if (!notionRes.ok) {
    const err = await notionRes.json().catch(() => ({}));
    console.error('Notion API 오류:', err);
    return NextResponse.json(
      { error: 'Notion 저장에 실패했습니다.', detail: err },
      { status: 502 }
    );
  }

  const notionPage = await notionRes.json();
  const notionPageId = notionPage.id;

  // DB에 notionPageId 업데이트
  await db
    .update(articles)
    .set({ notionPageId })
    .where(eq(articles.id, articleId));

  return NextResponse.json({ notionPageId });
}
