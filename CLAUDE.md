# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@ui.md

## 커스텀 슬래시 명령어

### `/news-workflow [브랜치명]`

새 기능 개발 시 브랜치 생성부터 main 병합까지 전체 흐름을 안내하는 명령어.
정의 파일: `.claude/commands/news-workflow.md`

```
/news-workflow keyword-filter   # 브랜치명 직접 지정
/news-workflow                  # 생략 시 기능 설명을 입력받아 이름 자동 제안
```

실행 순서:
1. 현재 브랜치 확인 → main이 아니면 경고 후 이동 여부 질문
2. 브랜치 생성 (`$ARGUMENTS` 또는 대화로 이름 결정)
3. 기술 스택·컨벤션 리마인드 후 개발 시작 안내
4. "완료" 또는 "done" 입력 시 → 변경 파일 확인 + 커밋 메시지 자동 제안 + 커밋 + main 병합
5. 작업 요약 출력

---

## 개발 명령어

```bash
npm run dev      # 개발 서버 시작
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 실행
```

### DB 마이그레이션 (Drizzle)

```bash
npx drizzle-kit generate   # 마이그레이션 파일 생성
npx drizzle-kit migrate    # 마이그레이션 실행
npx drizzle-kit studio     # DB 브라우저 실행
```

## 아키텍처

**Next.js 16 App Router** 기반 AI 뉴스 수집 웹앱. 해외 AI 뉴스를 RSS로 수집하고 Claude API로 한국어 번역/요약 후 카드 형태로 표시.

### 라우트 그룹 구조

- `app/(auth)/` — Clerk 로그인/회원가입 페이지 (인증 불필요)
- `app/(main)/` — 대시보드 레이아웃 (Clerk 인증 필요, `middleware.js`가 `/dashboard` 보호)
- `app/api/` — REST API 엔드포인트

### 데이터 흐름

1. `POST /api/news/fetch` → `lib/rss/parser.js`로 3개 RSS 피드 병렬 수집 → `lib/claude/processor.js`로 번역/요약/카테고리 분류 → Neon DB 저장
2. `GET /api/news` → DB에서 기사 조회 (카테고리 필터, 페이지네이션)
3. `POST /api/notion` → `lib/notion/mcp.js`로 Notion MCP 서버에 저장

### 핵심 라이브러리 위치

| 역할 | 파일 |
|------|------|
| DB 연결 | `lib/db/index.js` |
| DB 스키마 | `lib/db/schema.js` (`categories`, `articles` 테이블) |
| RSS 파싱 | `lib/rss/parser.js` |
| Claude 처리 | `lib/claude/processor.js` |
| Notion 저장 | `lib/notion/mcp.js` |

### 중복 수집 방지

`articles.guid` 컬럼에 unique 제약이 있어 동일 RSS 항목은 재저장되지 않음.

## 환경변수 (.env.local)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
DATABASE_URL=
ANTHROPIC_API_KEY=
NOTION_MCP_SERVER_URL=
NOTION_DATABASE_ID=
ADMIN_USER_IDS=       # 쓰기 API를 허용할 Clerk userId (쉼표로 여러 개). 미설정 시 모든 쓰기 요청이 403
```

### 권한 모델

읽기 API(`GET /api/news`, `/api/news/count`, `/api/categories`)는 로그인만 요구.
쓰기 API(`POST /api/news/fetch`·`/process`, `DELETE /api/news/[id]`, `POST`·`PUT`·`DELETE /api/categories`, `POST /api/notion`)는
`lib/auth.js`의 `requireAdmin()`으로 `ADMIN_USER_IDS`에 포함된 userId만 허용.
