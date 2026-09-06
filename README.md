> 💬 **궁금한 점이 있으신가요?**
> 이 저장소는 [Discussions](https://github.com/funnycom/doit-claude-code/discussions)에서 독자님들과 소통하고 있어요.
> - 📢 [알립니다](https://github.com/doit-claude-code/discussions/categories/announcements) — 책 관련 공지사항 및 정정 안내
> - 💬 [질문/답변](https://github.com/doit-claude-code/discussions/categories/q-a) — 책 내용이나 코드가 막힐 때
> - 🎉 [자랑해요](https://github.com/doit-claude-code/discussions/categories/show-and-tell) — 클로드 코드로 만든 나만의 앱 소개
>
> 📝 오탈자나 책 내용 오류는 [Issues](https://github.com/사용자명/저장소명/issues)로 제보해 주세요!

--------

# AI 뉴스 수집기

해외 AI 뉴스를 RSS로 자동 수집하고, Claude AI가 한국어로 번역/요약/카테고리 분류하여 카드 형태로 보여주는 웹 애플리케이션입니다.

## 주요 기능

- **뉴스 자동 수집**: TechCrunch, The Verge 등 RSS 피드 병렬 수집
- **AI 번역/요약**: Claude API로 영문 기사를 한국어로 번역 및 3~4문장 요약
- **카테고리 분류**: LLM/생성AI, 로보틱스, 이미지/영상AI 등 자동 분류
- **Notion 저장**: 중요 기사를 Notion 데이터베이스에 아카이빙
- **중복 방지**: RSS guid 기준으로 동일 기사 재수집 방지

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 스타일링 | Tailwind CSS |
| 인증 | Clerk |
| 데이터베이스 | Neon (PostgreSQL) + Drizzle ORM |
| AI 처리 | Claude API (`@anthropic-ai/sdk`) |
| RSS 파싱 | rss-parser |

## 시작하기

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 생성하고 아래 값을 채워주세요.

```env
# Clerk 인증
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Neon PostgreSQL
DATABASE_URL=

# Claude AI
ANTHROPIC_API_KEY=

# Notion
NOTION_API_TOKEN=
NOTION_DATABASE_ID=
```

### 3. DB 마이그레이션

```bash
npx drizzle-kit generate   # 마이그레이션 파일 생성
npx drizzle-kit migrate    # 마이그레이션 실행
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 앱이 표시됩니다.

## 프로젝트 구조

```
ai-news-collector/
├── app/
│   ├── (auth)/               # 로그인/회원가입 페이지
│   ├── (main)/               # 대시보드 (인증 필요)
│   └── api/                  # REST API 엔드포인트
├── components/
│   ├── news/                 # 뉴스 카드, 그리드, 수집 버튼
│   ├── category/             # 카테고리 필터, 관리 모달
│   └── layout/               # 사이드바, 헤더
└── lib/
    ├── db/                   # Neon DB 연결 및 스키마
    ├── rss/                  # RSS 파싱
    ├── claude/               # Claude AI 처리
    └── notion/               # Notion 저장
```

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/news/fetch` | RSS 수집 → Claude 처리 → DB 저장 |
| GET | `/api/news` | 뉴스 목록 조회 (카테고리 필터, 페이지네이션) |
| GET | `/api/categories` | 카테고리 목록 조회 |
| POST | `/api/categories` | 카테고리 추가 |
| PUT | `/api/categories/[id]` | 카테고리 수정 |
| DELETE | `/api/categories/[id]` | 카테고리 삭제 |
| POST | `/api/notion` | 선택한 뉴스를 Notion에 저장 |

## 개발 명령어

```bash
npm run dev      # 개발 서버 시작
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 실행
npx drizzle-kit studio   # DB 브라우저 실행
```

## 사용한 플러그인

- Frontend Design: UI 디자인 품질 향상
- commit-commands: 깃 워크플로우 자동화
