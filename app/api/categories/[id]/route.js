import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, articles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

// PUT /api/categories/[id] - 카테고리 수정
export async function PUT(request, { params }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { name, slug, color } = await request.json();
  const id = parseInt(params.id);

  try {
    const [updated] = await db
      .update(categories)
      .set({ name, slug, color, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: '카테고리 수정 실패' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] - 카테고리 삭제
export async function DELETE(request, { params }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const id = parseInt(params.id);

  try {
    // 해당 카테고리의 기사를 미분류 상태로 변경
    await db
      .update(articles)
      .set({ categoryId: null })
      .where(eq(articles.categoryId, id));
    await db.delete(categories).where(eq(categories.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '카테고리 삭제 실패' }, { status: 500 });
  }
}
