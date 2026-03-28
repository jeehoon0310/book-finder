# book-finder CI/CD 운영 매뉴얼

## 1. 개요

book-finder는 만화카페 도서 검색 웹앱으로, GitHub Push를 트리거로 Jenkins가 자동 빌드/배포하는 CI/CD 파이프라인으로 운영됩니다.

- **서비스 URL**: https://book.frindle.synology.me/
- **내부 포트**: 3000 (host 네트워크)
- **기술 스택**: Next.js 16 + React 19 + TypeScript + Supabase + TailwindCSS 4

```
GitHub (push) ──Webhook/Polling──> Jenkins (:9090) ──> Docker Build ──> book-finder (:3000)
```

### 배포 흐름

```
1. 개발자가 GitHub main 브랜치에 push
2. Jenkins 감지 (GitHub Webhook 또는 2시간 SCM Polling)
3. Jenkins가 소스 코드 checkout
4. 빌드 파일을 앱 디렉토리로 동기화
5. Docker 이미지 빌드 (multi-stage, no-cache)
6. 기존 컨테이너 종료 → 새 컨테이너 시작
7. Health Check (http://localhost:3000, 3회 재시도)
8. 미사용 Docker 이미지 정리
```

---

## 2. 인프라 정보

| 항목 | 값 |
|------|-----|
| NAS | Synology DS1522+ |
| Jenkins URL | `https://frindle.synology.me:20090` |
| Jenkins 내부 포트 | `9090` |
| book-finder URL | `https://book.frindle.synology.me/` |
| book-finder 내부 | `http://localhost:3000` |
| GitHub 리포지토리 | `https://github.com/jeehoon0310/book-finder.git` |
| 브랜치 | `main` (유일한 브랜치) |

### 주요 경로

| 경로 | 설명 |
|------|------|
| `/volume1/docker/book-finder/` | 앱 소스 및 Docker 설정 |
| `/volume1/docker/jenkins/` | Jenkins 컨테이너 설정 |
| `/volume1/docker/jenkins/jenkins_home/` | Jenkins 홈 (데이터) |
| `/volume1/docker/jenkins/jenkins_home/workspace/book-finder/` | Jenkins 워크스페이스 |
| `/volume1/docker/jenkins/jenkins_home/jobs/book-finder/` | Jenkins Job 설정 및 빌드 이력 |

---

## 3. 프로젝트 폴더 구조

```
/volume1/docker/book-finder/
├── .dockerignore                # Docker 빌드 제외 파일
├── .env.production              # 운영 환경변수 (Supabase, Telegram, Naver, Aladin)
├── .gitignore
├── CLAUDE.md
├── MANUAL.md                    # 이 파일
├── Dockerfile                   # 멀티스테이지 빌드 (node:20-slim)
├── Jenkinsfile                  # CI/CD 파이프라인 정의
├── docker-compose.yml           # 도커 컴포즈 설정
├── components.json              # shadcn/ui 설정
├── next.config.mjs              # Next.js 설정 (standalone output)
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tsconfig.json
│
├── migrations/                  # Supabase DB 마이그레이션
│   ├── 001_trending_rankings.sql
│   └── 002_book_views.sql
│
└── src/
    ├── globals.css
    ├── middleware.ts             # Supabase 인증 미들웨어
    │
    ├── app/                     # Next.js App Router 페이지
    │   ├── layout.tsx           # 루트 레이아웃
    │   ├── page.tsx             # 메인 페이지 (/)
    │   │
    │   ├── search/
    │   │   └── page.tsx         # 검색 페이지 (/search)
    │   │
    │   ├── book/
    │   │   └── [id]/
    │   │       └── page.tsx     # 책 상세 페이지 (/book/:id)
    │   │
    │   ├── zone/
    │   │   └── [name]/
    │   │       └── page.tsx     # 존 페이지 (/zone/:name)
    │   │
    │   ├── feedback/
    │   │   ├── page.tsx         # 피드백 페이지 (/feedback)
    │   │   └── actions.ts       # 피드백 서버 액션
    │   │
    │   ├── admin/               # 관리자 영역
    │   │   ├── layout.tsx       # 관리자 레이아웃
    │   │   ├── logout-button.tsx
    │   │   ├── login/
    │   │   │   └── page.tsx     # 관리자 로그인
    │   │   ├── callback/
    │   │   │   └── page.tsx     # OAuth 콜백
    │   │   └── analytics/
    │   │       └── page.tsx     # 분석 대시보드
    │   │
    │   └── api/                 # API Routes
    │       ├── auth/session/
    │       │   └── route.ts     # 세션 API
    │       ├── cron/
    │       │   ├── update-trending/
    │       │   │   └── route.ts # 트렌딩 업데이트 크론
    │       │   └── update-customer-popular/
    │       │       └── route.ts # 인기도서 업데이트 크론
    │       ├── feedback/
    │       │   ├── delete/
    │       │   │   └── route.ts # 피드백 삭제 API
    │       │   └── hide/
    │       │       └── route.ts # 피드백 숨김 API
    │       └── track/
    │           ├── popular/
    │           │   └── route.ts # 인기 클릭 추적
    │           └── view/
    │               └── route.ts # 조회수 추적
    │
    ├── components/
    │   ├── domain/              # 비즈니스 컴포넌트
    │   │   ├── BookCard.tsx     # 책 카드
    │   │   ├── BookDescription.tsx
    │   │   ├── BookDescriptionModal.tsx
    │   │   ├── BookListSkeleton.tsx
    │   │   ├── FeedbackForm.tsx
    │   │   ├── FeedbackList.tsx
    │   │   ├── InfiniteBookList.tsx  # 무한스크롤 도서 목록
    │   │   ├── LoadMore.tsx
    │   │   ├── PurchaseRequestDialog.tsx
    │   │   ├── SearchBar.tsx
    │   │   ├── TrackBookView.tsx     # 조회 추적
    │   │   └── ZoneBadge.tsx
    │   ├── layout/
    │   │   └── Header.tsx
    │   └── ui/                  # shadcn/ui 컴포넌트
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       ├── input.tsx
    │       ├── scroll-area.tsx
    │       ├── skeleton.tsx
    │       └── tabs.tsx
    │
    ├── hooks/
    │   └── use-debounce.ts
    │
    ├── lib/                     # 유틸리티 및 서비스
    │   ├── bad-words.ts         # 비속어 필터
    │   ├── customer-popular.ts  # 고객 인기도서 로직
    │   ├── hangul.ts            # 한글 처리 (초성검색)
    │   ├── search-logger.ts     # 검색 로그 기록
    │   ├── supabase.ts          # Supabase 클라이언트
    │   ├── telegram.ts          # 텔레그램 봇 알림
    │   ├── timeago.ts           # 시간 표시 유틸
    │   ├── trending.ts          # 트렌딩 로직
    │   ├── utils.ts             # 공통 유틸
    │   └── supabase/
    │       ├── middleware.ts     # Supabase 미들웨어
    │       └── server.ts        # Supabase 서버 클라이언트
    │
    └── types/
        └── database.ts          # Supabase DB 타입 정의
```

---

## 4. 설정 파일

### 4.1 Jenkinsfile

파이프라인 정의 파일. 6개 스테이지로 구성.

```groovy
// 위치: /volume1/docker/book-finder/Jenkinsfile

pipeline {
    agent any
    environment {
        APP_DIR = '/volume1/docker/book-finder'
    }
    stages {
        stage('Checkout')              // GitHub에서 main 브랜치 클론 (github-pat)
        stage('Sync to App Directory') // 워크스페이스 → APP_DIR로 파일 복사
        stage('Build Docker Image')    // docker compose build --no-cache
        stage('Deploy')                // docker compose down → up -d
        stage('Health Check')          // curl http://localhost:3000 (retry 3회, 10초 간격)
        stage('Cleanup')               // docker image prune -f
    }
    post {
        success { echo 'Deploy succeeded!' }
        failure { echo 'Deploy failed — rollback may be needed' }
    }
}
```

**Sync 단계에서 복사되는 파일:**
- `Dockerfile`, `docker-compose.yml`, `Jenkinsfile`
- `package.json`, `package-lock.json`, `tsconfig.json`
- `next.config.mjs`, `postcss.config.mjs`, `components.json`
- `src/`, `public/`, `.dockerignore`

**복사되지 않는 파일:**
- `.env.production` (로컬 파일 보존 — 시크릿 포함)

### 4.2 Dockerfile

Multi-stage 빌드로 이미지 크기 최소화 (최종 254MB).

```dockerfile
# 위치: /volume1/docker/book-finder/Dockerfile

# Stage 1: 빌드
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                          # 의존성 설치
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL        # 빌드 시 주입
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY   # 빌드 시 주입
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build                   # Next.js 빌드

# Stage 2: 실행
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

**주요 포인트:**
- `NEXT_PUBLIC_*` 변수는 빌드 타임에 주입 (ARG → ENV)
- standalone 모드로 빌드하여 `node_modules` 없이 실행
- 최종 이미지에는 빌드된 결과물만 포함

### 4.3 docker-compose.yml (book-finder)

```yaml
# 위치: /volume1/docker/book-finder/docker-compose.yml

services:
  book-finder:
    build:
      context: .
      network: host                   # 빌드 시 호스트 네트워크 사용
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    network_mode: host                 # 런타임도 호스트 네트워크 (포트 3000 직접 노출)
    env_file:
      - .env.production                # 런타임 환경변수
    environment:
      - HOSTNAME=0.0.0.0
      - NODE_OPTIONS=--dns-result-order=ipv4first --no-network-family-autoselection
    restart: unless-stopped
```

**주요 포인트:**
- `network_mode: host` — 포트 매핑 없이 3000 직접 노출
- `build.network: host` — 빌드 시에도 호스트 네트워크 사용 (npm ci DNS 해결용)
- `NODE_OPTIONS` — IPv4 우선 DNS 해석 (Synology 환경 호환성)
- `env_file`로 런타임 환경변수 주입
- 컨테이너 비정상 종료 시 자동 재시작

### 4.4 docker-compose.yml (Jenkins)

```yaml
# 위치: /volume1/docker/jenkins/docker-compose.yml

services:
  jenkins:
    image: jenkins/jenkins:lts-jdk17
    container_name: jenkins
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock          # Docker 소켓 공유
      - /usr/local/bin/docker:/usr/local/bin/docker         # Docker CLI
      - /usr/local/bin/docker-compose:/usr/local/bin/docker-compose
      - /usr/lib/libdevmapper.so.1.02:/usr/lib/libdevmapper.so.1.02
      - /usr/lib/libdevmapper.so:/usr/lib/libdevmapper.so
      - /usr/local/bin/docker-compose:/usr/local/lib/docker/cli-plugins/docker-compose
      - /volume1/docker:/volume1/docker                    # 앱 디렉토리 접근
    environment:
      - TZ=Asia/Seoul
      - JENKINS_OPTS=--httpPort=9090
    user: root
```

**주요 포인트:**
- `network_mode: host` — NAS 네트워크를 직접 사용
- Docker 소켓 + CLI를 마운트하여 Jenkins 내부에서 Docker 명령 실행 가능
- `libdevmapper` 공유 라이브러리 마운트 (Docker CLI 의존성)
- `/volume1/docker` 전체 마운트 — Jenkins에서 앱 디렉토리에 파일 복사 가능
- `docker-compose`를 CLI 플러그인 경로에도 마운트 (`docker compose` 서브커맨드 지원)
- `host` 모드이므로 포트 매핑 없이 9090 포트로 직접 접근

### 4.5 .dockerignore

```
node_modules
.next
.git
.omc
.playwright-mcp
.env.local
.env.production
scripts/
*.png
```

### 4.6 next.config.mjs

```javascript
const nextConfig = {
  output: 'standalone',       // Docker 최적화 (.next/standalone 생성)
  images: {
    remotePatterns: [          // 허용된 외부 이미지 도메인
      'contents.kyobobook.co.kr',        // 교보문고
      'sryqiljtqfplyzebnlgh.supabase.co', // Supabase Storage
      'i.namu.wiki',                      // 나무위키
      'shopping-phinf.pstatic.net',       // 네이버 쇼핑
      'image.aladin.co.kr',              // 알라딘
    ]
  }
};
```

---

## 5. Jenkins 관리

### 5.1 접속

- **URL**: `https://frindle.synology.me:20090`
- **Job**: `book-finder` (대시보드에서 클릭)
- **Job 설정 파일**: `/volume1/docker/jenkins/jenkins_home/jobs/book-finder/config.xml`

### 5.2 빌드 트리거

| 트리거 | 설정 | 비고 |
|--------|------|------|
| GitHub Push Trigger | 활성화 | Webhook 기반 |
| SCM Polling | `H/2 * * * *` | 매 2시간마다 변경 감지 (Webhook 실패 시 fallback) |

### 5.3 등록된 Credentials

| ID | 종류 | 용도 |
|----|------|------|
| `github-pat` | Username with Password (PAT) | GitHub 리포지토리 클론 |

**Credential 추가/수정:**
1. Jenkins 대시보드 → `Jenkins 관리` → `Credentials`
2. `(global)` 도메인 선택
3. `Add Credentials` 또는 기존 항목 수정

### 5.4 필수 플러그인

| 플러그인 | 용도 |
|----------|------|
| Docker Pipeline | Docker 빌드/배포 |
| Pipeline Utility Steps | 파이프라인 유틸리티 |
| GitHub Integration | Webhook 수신 |

### 5.5 빌드 확인

- **빌드 이력**: Job 페이지 좌측 `Build History` (현재 총 9회 빌드 완료)
- **콘솔 출력**: 빌드 번호 클릭 → `Console Output`
- **빌드 트리거**: `Build Now` 버튼으로 수동 실행 가능

---

## 6. Docker 컨테이너 현황

| 항목 | 값 |
|------|-----|
| 컨테이너 이름 | `book-finder-book-finder-1` |
| 이미지 | `book-finder-book-finder:latest` |
| 이미지 크기 | 254MB (가상), ~12MB (쓰기 레이어) |
| 최근 빌드 | 2026-03-25 23:34 KST |
| 네트워크 모드 | host (포트 3000 직접 노출) |
| 재시작 정책 | unless-stopped |

---

## 7. Git 정보

| 항목 | 값 |
|------|-----|
| 저장소 URL | `https://github.com/jeehoon0310/book-finder.git` |
| 브랜치 | `main` (유일한 브랜치) |
| 로컬 경로 | `/volume1/docker/book-finder/` |
| 인증 | GitHub PAT (Personal Access Token) |

### 최근 커밋 이력

| 해시 | 메시지 |
|------|--------|
| `eecea8e` | fix(analytics): replace missing RPC functions with direct table queries |
| `86761c8` | feat: add analytics dashboard, search logging, and popular book click tracking |
| `00452ba` | fix(docker): add network: host for build stage |
| `c6b9402` | fix(ci): revert to cp (rsync not available in Jenkins container) |
| `9924abd` | fix(ci): mount /volume1/docker in Jenkins + use rsync for sync |
| `3ab28c4` | fix(ci): correct credential ID in Jenkinsfile |
| `50d6091` | fix: Supabase service role key로 RLS 우회 (update/delete 동작) |
| `766321f` | merge: resolve Jenkinsfile conflict (keep remote version) |
| `4f01a68` | feat: 피드백 수정/삭제 기능 + 비밀번호 선택 + 텔레그램 삭제 버튼 |
| `e813114` | fix(ci): stop docker-compose container before deploy |
| `08cb262` | ci: add Jenkinsfile for CI/CD pipeline |
| `655426e` | fix: Dockerfile 디버그 코드 제거, 클린 버전 |
| `ef6f383` | debug: npm ci 결과 확인용 디버그 로그 추가 |
| `13c8987` | fix: Alpine → Debian slim으로 변경 (DNS/libc 호환성) |
| `45a581c` | fix: Alpine libc6-compat 추가 + node로 직접 next build 실행 |

---

## 8. 환경변수 (.env.production)

| 변수명 | 용도 | 주입 시점 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | 빌드 + 런타임 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 (클라이언트) | 빌드 + 런타임 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 (RLS 우회) | 런타임 |
| `TOON_BOT_TOKEN` | Telegram 봇 토큰 | 런타임 |
| `TOON_BOT_CHAT_ID` | Telegram 채팅 ID | 런타임 |
| `FEEDBACK_ADMIN_SECRET` | 피드백 관리자 시크릿 | 런타임 |
| `FEEDBACK_BASE_URL` | 피드백 서비스 URL | 런타임 |
| `NAVER_CLIENT_ID` | 네이버 API 클라이언트 ID | 런타임 |
| `NAVER_CLIENT_SECRET` | 네이버 API 시크릿 | 런타임 |
| `ALADIN_TTB_KEY` | 알라딘 도서 API 키 | 런타임 |
| `CRON_SECRET` | 크론 작업 인증 시크릿 | 런타임 |

> `NEXT_PUBLIC_*` 변수는 Next.js 빌드 시 코드에 포함되므로, 값 변경 시 반드시 재빌드가 필요합니다.

---

## 9. 주요 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| next | ^16.2.0 | React 프레임워크 (App Router) |
| react / react-dom | ^19.2.4 | UI 라이브러리 |
| @supabase/supabase-js | ^2.99.3 | Supabase 클라이언트 |
| @supabase/ssr | ^0.9.0 | Supabase SSR 지원 |
| tailwindcss | ^4.2.2 | CSS 프레임워크 |
| framer-motion | ^12.38.0 | 애니메이션 |
| lucide-react | ^0.577.0 | 아이콘 |
| shadcn | ^4.1.0 | UI 컴포넌트 라이브러리 |
| playwright | ^1.58.2 | E2E 테스트 (dev) |

---

## 10. 수동 배포

Jenkins 없이 직접 배포해야 할 경우:

```bash
# 1. 앱 디렉토리로 이동
cd /volume1/docker/book-finder

# 2. GitHub에서 최신 코드 가져오기
git pull origin main

# 3. Docker 이미지 빌드
docker compose build --no-cache

# 4. 컨테이너 재배포
docker compose down
docker compose up -d

# 5. 정상 동작 확인
curl -f http://localhost:3000

# 6. (선택) 미사용 이미지 정리
docker image prune -f
```

---

## 11. 트러블슈팅

### 빌드 실패: `npm ci` 에러

```
npm error Exit handler never called!
```

**원인**: Docker 빌드 중 메모리 부족 또는 네트워크 문제
**해결**:
```bash
docker builder prune -f
docker compose build --no-cache
```

### 빌드 실패: `next: not found`

**원인**: `npm ci`가 정상 완료되지 않아 의존성 미설치
**해결**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
docker compose build --no-cache
```

### Health Check 실패

**원인**: 앱 시작에 시간이 오래 걸리거나 포트 충돌
**해결**:
```bash
# 컨테이너 로그 확인
docker logs book-finder-book-finder-1

# 포트 사용 확인
netstat -tlnp | grep 3000
```

### Jenkins에서 Docker 명령 실행 불가

**원인**: Docker 소켓 권한 문제
**해결**:
```bash
docker exec jenkins docker ps
ls -la /var/run/docker.sock
```

### DNS/네트워크 문제 (npm ci 실패)

**원인**: Synology 환경에서 IPv6 DNS 우선 해석
**해결**: docker-compose.yml에서 `build.network: host` 확인, `NODE_OPTIONS` 환경변수 확인

### Webhook이 동작하지 않을 때

1. GitHub 리포지토리 → `Settings` → `Webhooks` 에서 Delivery 기록 확인
2. Jenkins → `Jenkins 관리` → `System Log`에서 에러 확인
3. 방화벽에서 Jenkins 포트(20090)가 열려있는지 확인
4. SCM Polling이 매 2시간 fallback으로 동작하므로 긴급하지 않으면 대기

---

## 12. 유지보수

### 로그 확인

```bash
# book-finder 앱 로그
docker logs book-finder-book-finder-1
docker logs -f book-finder-book-finder-1    # 실시간 로그

# Jenkins 로그
docker logs jenkins
```

### 디스크 정리

```bash
docker system prune -f              # 컨테이너, 네트워크, 이미지
docker volume prune -f              # 미사용 볼륨
```

### 백업

| 대상 | 경로 | 백업 방법 |
|------|------|-----------|
| 앱 소스 | GitHub | 자동 (git) |
| 환경변수 | `/volume1/docker/book-finder/.env.production` | 수동 복사 |
| Jenkins 설정 | `/volume1/docker/jenkins/jenkins_home/` | 디렉토리 백업 |
| DB 마이그레이션 | `/volume1/docker/book-finder/migrations/` | git 포함 |

### 컨테이너 상태 확인

```bash
docker ps --filter "name=book-finder" --filter "name=jenkins"

# 예상 출력:
# NAMES                       IMAGE                         STATUS
# book-finder-book-finder-1   book-finder-book-finder        Up
# jenkins                     jenkins/jenkins:lts-jdk17      Up
```

---

## 13. 기술 스택 요약

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, standalone) |
| 언어 | TypeScript, React 19 |
| 스타일링 | Tailwind CSS v4, shadcn/ui |
| 백엔드/DB | Supabase (PostgreSQL) |
| CI/CD | Jenkins (LTS, JDK17) |
| 컨테이너 | Docker, Docker Compose |
| 알림 | Telegram Bot |
| 외부 API | 네이버 검색, 알라딘 도서 |
| 테스트 | Playwright (E2E) |
