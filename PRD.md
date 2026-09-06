# PRD: AI 뉴스 수집 앱

## 1. 개요

### 제품 설명
해외 AI 뉴스를 RSS로 자동 수집하고, Claude AI가 한국어로 번역/요약/카테고리 분류하여 카드 형태로 보여주는 웹 애플리케이션.

### 목적
- 해외 AI 뉴스를 빠르게 한국어로 파악
- 카테고리별로 관심 분야 뉴스만 선별해서 소비
- 중요 뉴스를 Notion에 저장하여 아카이빙

---

## 2. 사용자 플로우

```
1. 앱 접속 → 로그인 페이지 (미인증 시 자동 리디렉션)
2. Clerk 로그인/회원가입
3. 대시보드 진입 → 기존 수집된 뉴스 카드 목록 표시
4. '뉴스 가져오기' 버튼 클릭 → RSS 수집 → Claude 처리 → 카드 갱신
5. 카테고리 필터 클릭 → 해당 카테고리 뉴스만 표시
6. 뉴스 카드의 'Notion 저장' 버튼 → Notion DB에 저장
7. (선택) 카테고리 관리 모달에서 카테고리 추가/수정/삭제
```

---

## 3. 기능 요구사항

### 3.1 인증
- Clerk 기반 로그인/회원가입
- 비인증 사용자는 `/dashboard` 접근 시 로그인 페이지로 리디렉션
- 헤더에 로그인한 사용자 정보 및 로그아웃 버튼 표시

### 3.2 뉴스 수집
- '뉴스 가져오기' 버튼 클릭 시 3개 RSS 피드 병렬 수집
- 이미 수집된 뉴스는 중복 저장하지 않음 (guid 기준)
- 수집 중 로딩 상태 표시, 완료 후 결과 건수 알림

**수집 대상 RSS 피드:**
| 사이트 | RSS URL |
|--------|---------|
| TechCrunch AI | `https://techcrunch.com/category/artificial-intelligence/feed/` |
| The Verge Tech | `https://www.theverge.com/rss/tech/index.xml` |

### 3.3 Claude AI 처리
- 수집된 각 기사를 Claude API로 처리
- 처리 내용: 한국어 번역, 3~4문장 요약, 카테고리 자동 분류
- 처리 방식: 3~5개씩 병렬 처리 (속도 우선)
- 카테고리는 현재 DB에 등록된 카테고리 목록 기준으로 분류
- 해당 카테고리 없을 시 '기타'로 분류

### 3.4 뉴스 카드 UI
각 뉴스 카드에 표시되는 정보:
- 번역된 제목 (한국어)
- 3~4문장 한국어 요약
- 카테고리 뱃지
- 출처 (TechCrunch / The Verge)
- 발행일
- 원문 보기 링크
- Notion 저장 버튼 (저장 완료 시 체크 표시로 변경, 버튼 비활성화)

### 3.5 카테고리 관리
**기본 카테고리 (7개):**
- LLM/생성AI
- 로보틱스
- 이미지/영상AI
- 자율주행
- AI 정책/규제
- 기업/투자
- 기타

**기능:**
- 카테고리 필터 버튼으로 해당 카테고리 뉴스만 표시 (전체 보기 포함)
- 카테고리 관리 모달에서 추가/수정/삭제 가능
- 카테고리 삭제 시 해당 카테고리의 기사는 미분류 상태로 유지

### 3.6 Notion 저장
- 뉴스 카드의 'Notion 저장' 버튼 클릭 시 Notion MCP 서버를 통해 저장
- 저장 항목: 번역 제목, 원문 제목, 한국어 요약, 카테고리, 출처, 원문 링크, 발행일
- 저장 완료 후 카드에 저장 완료 상태 표시

---

## 4. 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | JavaScript (카멜 케이스, 2칸 들여쓰기, 한글 주석) |
| 스타일링 | Tailwind CSS (라이트 모드) |
| 인증 | Clerk |
| 데이터베이스 | Neon (PostgreSQL) + Drizzle ORM |
| AI 처리 | Claude API (@anthropic-ai/sdk) |
| Notion 저장 | Notion MCP 서버 (@modelcontextprotocol/sdk) |
| RSS 파싱 | rss-parser |

---

## 5. 데이터 모델

### categories 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | 자동 증가 ID |
| name | varchar(100) | 카테고리 이름 (예: "LLM/생성AI") |
| slug | varchar(100) | URL용 슬러그 (예: "llm") |
| color | varchar(7) | HEX 색상 코드 |
| created_at | timestamp | 생성일 |
| updated_at | timestamp | 수정일 |

### articles 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | 자동 증가 ID |
| guid | varchar(500) | RSS 고유 식별자 (중복 방지) |
| original_title | varchar(500) | 원문 제목 (영어) |
| original_summary | text | 원문 요약/본문 (영어) |
| translated_title | varchar(500) | 번역된 제목 (한국어) |
| translated_summary | text | 번역된 요약 (한국어) |
| source_url | varchar(1000) | 원문 링크 |
| source_name | varchar(100) | 출처 사이트명 |
| image_url | varchar(1000) | 썸네일 이미지 URL |
| category_id | integer FK | categories 테이블 참조 |
| published_at | timestamp | 원문 발행일 |
| fetched_at | timestamp | 수집 시각 |
| notion_page_id | varchar(200) | Notion 저장 후 페이지 ID |
| created_at | timestamp | DB 저장일 |

---

## 6. API 설계

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/news/fetch` | RSS 수집 → Claude 처리 → DB 저장 |
| GET | `/api/news` | 뉴스 목록 조회 (카테고리 필터, 페이지네이션) |
| GET | `/api/categories` | 카테고리 목록 조회 |
| POST | `/api/categories` | 카테고리 추가 |
| PUT | `/api/categories/[id]` | 카테고리 수정 |
| DELETE | `/api/categories/[id]` | 카테고리 삭제 |
| POST | `/api/notion` | 선택한 뉴스를 Notion에 저장 |

---

## 7. 디렉토리 구조

```
ai-news-collector/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.js
│   │   └── sign-up/page.js
│   ├── (main)/
│   │   ├── layout.js
│   │   └── dashboard/page.js
│   ├── api/
│   │   ├── news/
│   │   │   ├── fetch/route.js
│   │   │   └── route.js
│   │   ├── categories/
│   │   │   ├── route.js
│   │   │   └── [id]/route.js
│   │   └── notion/route.js
│   ├── layout.js
│   └── page.js
├── components/
│   ├── news/
│   │   ├── NewsCard.js
│   │   ├── NewsGrid.js
│   │   └── FetchNewsButton.js
│   ├── category/
│   │   ├── CategoryFilter.js
│   │   └── CategoryManager.js
│   └── layout/
│       └── Header.js
├── lib/
│   ├── db/
│   │   ├── index.js
│   │   └── schema.js
│   ├── rss/parser.js
│   ├── claude/processor.js
│   └── notion/mcp.js
├── middleware.js
├── drizzle.config.js
└── .env.local
```

---

## 8. 환경변수

```
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

# Notion MCP
NOTION_MCP_SERVER_URL=
NOTION_DATABASE_ID=
```

---

## 9. 구현 단계

| 단계 | 내용 |
|------|------|
| Phase 1 | Next.js 초기화, Clerk 인증, 로그인 페이지 |
| Phase 2 | Neon DB 연결, Drizzle 스키마, 기본 카테고리 seed |
| Phase 3 | RSS 수집, Claude 처리 파이프라인, `/api/news/fetch` |
| Phase 4 | 뉴스 조회 API, 대시보드 페이지, 뉴스 카드 UI |
| Phase 5 | 카테고리 필터 + 관리 CRUD |
| Phase 6 | Notion MCP 연동, Notion 저장 버튼 |
| Phase 7 | 에러 핸들링, 로딩 UX, 반응형 점검 |

---

## 10. 비기능 요구사항

- **중복 수집 방지**: RSS guid 기준으로 이미 저장된 기사는 건너뜀
- **Claude API 비용 관리**: 동일 기사를 중복 처리하지 않음
- **에러 내성**: RSS 피드 1~2개 실패 시 나머지 피드는 정상 처리
- **반응형**: 데스크탑/태블릿/모바일 레이아웃 지원
