import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// 관리자로 허용할 Clerk userId 목록 (.env.local 의 ADMIN_USER_IDS, 쉼표로 구분)
function getAdminUserIds() {
  return (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

// 쓰기 작업용 관리자 인증.
// 관리자면 { userId } 반환, 아니면 { response } 에 401/403 응답을 담아 반환.
export async function requireAdmin() {
  const { userId } = await auth();

  if (!userId) {
    return {
      response: NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      ),
    };
  }

  const adminIds = getAdminUserIds();
  if (adminIds.length === 0 || !adminIds.includes(userId)) {
    return {
      response: NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      ),
    };
  }

  return { userId };
}
