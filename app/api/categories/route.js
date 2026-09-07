import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

// GET /api/categories - 카테고리 목록 조회
export async function GET() {
  try {
    const result = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.id));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: '카테고리 조회 실패' }, { status: 500 });
  }
}

// POST /api/categories - 카테고리 추가
export async function POST(request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { name, slug, color } = await request.json();

  try {
    const [newCategory] = await db
      .insert(categories)
      .values({ name, slug, color })
      .returning();
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '카테고리 추가 실패' }, { status: 500 });
  }
}
