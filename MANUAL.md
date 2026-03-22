# book-finder CI/CD 운영 매뉴얼

## 1. 개요

book-finder는 만화카페 도서 검색 웹앱으로, GitHub Push를 트리거로 Jenkins가 자동 빌드/배포하는 CI/CD 파이프라인으로 운영됩니다.

```
GitHub (push) ──Webhook──> Jenkins (:9090) ──> Docker Build ──> book-finder (:3000)
```

### 배포 흐름

```
1. 개발자가 GitHub main 브랜치에 push
2. GitHub Webhook이 Jenkins에 알림 전송
3. Jenkins가 소스 코드 checkout
4. 빌드 파일을 앱 디렉토리로 동기화
5. Docker 이미지 빌드 (multi-stage)
6. 기존 컨테이너 종료 → 새 컨테이너 시작
7. Health Check (http://localhost:3000)
8. 미사용 Docker 이미지 정리
```

---

## 2. 인프라 정보

| 항목 | 값 |
|------|-----|
| NAS | Synology DS1522+ |
| Jenkins URL | `https://frindle.synology.me:20090` |
| Jenkins 내부 포트 | `9090` |
| book-finder URL | `http://localhost:3000` |
| GitHub 리포지토리 | `https://github.com/jeehoon0310/book-finder.git` |
| 브랜치 | `main` |

### 주요 경로

| 경로 | 설명 |
|------|------|
| `/volume1/docker/book-finder/` | 앱 소스 및 Docker 설정 |
| `/volume1/docker/jenkins/` | Jenkins 컨테이너 설정 |
| `/volume1/docker/jenkins/jenkins_home/` | Jenkins 홈 (데이터) |
| `/volume1/docker/jenkins/jenkins_home/workspace/book-finder/` | Jenkins 워크스페이스 |

---

## 3. 설정 파일

### 3.1 Jenkinsfile

파이프라인 정의 파일. 6개 스테이지로 구성.

```groovy
// 위치: /volume1/docker/book-finder/Jenkinsfile

pipeline {
    agent any
    environment {
        APP_DIR = '/volume1/docker/book-finder'
    }
    stages {
        stage('Checkout')              // GitHub에서 소스 클론
        stage('Sync to App Directory') // 워크스페이스 → 앱 디렉토리 복사
        stage('Build Docker Image')    // docker compose build --no-cache
        stage('Deploy')                // docker compose down → up -d
        stage('Health Check')          // curl로 3회 재시도 (10초 간격)
        stage('Cleanup')               // docker image prune -f
    }
}
```

**주요 포인트:**
- Checkout 시 `github-credentials` Credential 사용
- Sync 단계에서 `.env.production`은 복사하지 않음 (로컬 파일 보존)
- Health Check 실패 시 빌드가 FAILURE로 표시됨

### 3.2 Dockerfile

Multi-stage 빌드로 이미지 크기 최소화.

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
RUN npm run build                   # Next.js 빌드

# Stage 2: 실행
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

**주요 포인트:**
- `NEXT_PUBLIC_*` 변수는 빌드 타임에 주입 (ARG)
- standalone 모드로 빌드하여 `node_modules` 없이 실행
- 최종 이미지에는 빌드된 결과물만 포함

### 3.3 docker-compose.yml

```yaml
# 위치: /volume1/docker/book-finder/docker-compose.yml

services:
  book-finder:
    build:
      context: .
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    ports:
      - "3000:3000"
    env_file:
      - .env.production    # 런타임 환경변수
    restart: unless-stopped
```

**주요 포인트:**
- `build.args`는 `.env.production`에서 자동으로 읽어옴
- `env_file`로 런타임 환경변수 주입
- 컨테이너 비정상 종료 시 자동 재시작

### 3.4 Jenkins docker-compose.yml

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
      - /var/run/docker.sock:/var/run/docker.sock      # Docker 소켓 공유
      - /usr/local/bin/docker:/usr/local/bin/docker     # Docker CLI
      - /usr/local/bin/docker-compose:/usr/local/bin/docker-compose
    environment:
      - TZ=Asia/Seoul
      - JENKINS_OPTS=--httpPort=9090
    user: root   # Docker 소켓 접근을 위해 root로 실행
```

**주요 포인트:**
- `network_mode: host` — NAS 네트워크를 직접 사용
- Docker 소켓을 마운트하여 Jenkins 내부에서 Docker 명령 실행 가능
- `host` 모드이므로 포트 매핑 없이 9090 포트로 직접 접근

---

## 4. Jenkins 관리

### 4.1 접속

- **URL**: `https://frindle.synology.me:20090`
- **Job**: `book-finder` (대시보드에서 클릭)

### 4.2 등록된 Credentials

| ID | 종류 | 용도 |
|----|------|------|
| `github-credentials` / `github-pat` | Username with Password (PAT) | GitHub 리포지토리 클론 |

**Credential 추가/수정:**
1. Jenkins 대시보드 → `Jenkins 관리` → `Credentials`
2. `(global)` 도메인 선택
3. `Add Credentials` 또는 기존 항목 수정

### 4.3 필수 플러그인

| 플러그인 | 용도 |
|----------|------|
| Docker Pipeline | Docker 빌드/배포 |
| Pipeline Utility Steps | 파이프라인 유틸리티 |
| GitHub Integration | Webhook 수신 |

### 4.4 빌드 확인

- **빌드 이력**: Job 페이지 좌측 `Build History`
- **콘솔 출력**: 빌드 번호 클릭 → `Console Output`
- **빌드 트리거**: `Build Now` 버튼으로 수동 실행 가능

---

## 5. 수동 배포

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

## 6. 환경변수 (.env.production)

| 변수명 | 용도 | 주입 시점 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | 빌드 + 런타임 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | 빌드 + 런타임 |
| `TOON_BOT_TOKEN` | Telegram 봇 토큰 | 런타임 |
| `TOON_BOT_CHAT_ID` | Telegram 채팅 ID | 런타임 |
| `FEEDBACK_ADMIN_SECRET` | 피드백 관리자 시크릿 | 런타임 |
| `FEEDBACK_BASE_URL` | 피드백 서비스 URL | 런타임 |
| `NAVER_CLIENT_ID` | 네이버 API 클라이언트 ID | 런타임 |
| `NAVER_CLIENT_SECRET` | 네이버 API 시크릿 | 런타임 |
| `ALADIN_TTB_KEY` | 알라딘 도서 API 키 | 런타임 |

> `NEXT_PUBLIC_*` 변수는 Next.js 빌드 시 코드에 포함되므로, 값 변경 시 반드시 재빌드가 필요합니다.

---

## 7. 트러블슈팅

### 빌드 실패: `npm ci` 에러

```
npm error Exit handler never called!
```

**원인**: Docker 빌드 중 메모리 부족 또는 네트워크 문제
**해결**:
```bash
# Docker 빌드 캐시 정리 후 재시도
docker builder prune -f
docker compose build --no-cache
```

### 빌드 실패: `next: not found`

**원인**: `npm ci`가 정상 완료되지 않아 의존성 미설치
**해결**:
```bash
# 로컬에서 의존성 확인
rm -rf node_modules package-lock.json
npm install
npm run build
# 정상 빌드 확인 후 다시 Docker 빌드
docker compose build --no-cache
```

### Health Check 실패

**원인**: 앱 시작에 시간이 오래 걸리거나 포트 충돌
**해결**:
```bash
# 컨테이너 로그 확인
docker logs book-finder

# 포트 사용 확인
netstat -tlnp | grep 3000
```

### Jenkins에서 Docker 명령 실행 불가

**원인**: Docker 소켓 권한 문제
**해결**:
```bash
# Jenkins 컨테이너에서 docker 접근 확인
docker exec jenkins docker ps

# 소켓 권한 확인
ls -la /var/run/docker.sock
```

### Webhook이 동작하지 않을 때

1. GitHub 리포지토리 → `Settings` → `Webhooks` 에서 Delivery 기록 확인
2. Jenkins → `Jenkins 관리` → `System Log`에서 에러 확인
3. 방화벽에서 Jenkins 포트(20090)가 열려있는지 확인

---

## 8. 유지보수

### 로그 확인

```bash
# book-finder 앱 로그
docker logs book-finder
docker logs -f book-finder          # 실시간 로그

# Jenkins 로그
docker logs jenkins
```

### 디스크 정리

```bash
# 미사용 Docker 리소스 정리
docker system prune -f              # 컨테이너, 네트워크, 이미지
docker volume prune -f              # 미사용 볼륨

# Jenkins 빌드 기록은 자동 관리
# 수동 정리: Jenkins 대시보드 → Job → Build History에서 삭제
```

### 백업

| 대상 | 경로 | 백업 방법 |
|------|------|-----------|
| 앱 소스 | GitHub | 자동 (git) |
| 환경변수 | `/volume1/docker/book-finder/.env.production` | 수동 복사 |
| Jenkins 설정 | `/volume1/docker/jenkins/jenkins_home/` | 디렉토리 백업 |

### 컨테이너 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker ps

# 예상 출력:
# CONTAINER   IMAGE                      STATUS    PORTS
# book-finder book-finder:latest          Up        0.0.0.0:3000->3000
# jenkins     jenkins/jenkins:lts-jdk17   Up        (host network)
```

---

## 9. 기술 스택 요약

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, standalone) |
| 언어 | TypeScript, React 19 |
| 스타일링 | Tailwind CSS v4, shadcn/ui |
| 백엔드 | Supabase (PostgreSQL) |
| CI/CD | Jenkins (LTS, JDK17) |
| 컨테이너 | Docker, Docker Compose |
| 알림 | Telegram Bot |
| 외부 API | 네이버 검색, 알라딘 도서 |
