# Cloud Code (Cloudflare + OpenCode)

**Cloud Code**는 Cloudflare의 강력한 인프라와 OpenCode의 지능형 기능을 결합한 컨테이너 기반 Agent 솔루션입니다.

이 프로젝트는 Cloudflare Workers와 Cloudflare Containers 기반의 TypeScript 프로젝트입니다. Cloudflare 인프라를 활용해 컨테이너화된 워크로드를 실행하고 관리합니다.

English | [简体中文](README.zh-CN.md)

## 🚀 빠른 시작

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/miantiao-me/cloud-code)

### 사전 준비물

- pnpm (권장)
- Node.js (v20+ 권장)
- Wrangler CLI (`pnpm add -g wrangler`)

### 의존성 설치

```bash
pnpm install
```

### 로컬 개발

로컬 개발 서버를 시작합니다:

```bash
pnpm dev
# or
pnpm start
```

이 명령은 `wrangler dev`를 실행하여 Cloudflare Workers 환경을 시뮬레이션합니다.

### 타입 정의 생성

`wrangler.jsonc`의 바인딩을 수정했다면 타입 파일을 다시 생성해야 합니다:

```bash
pnpm cf-typegen
```

## 📦 배포

Cloudflare의 글로벌 네트워크에 코드를 배포합니다:

```bash
pnpm deploy
```

## 📂 프로젝트 구조

```
.
├── src/
│   ├── index.ts        # Workers 엔트리 파일 (ExportedHandler)
│   ├── container.ts    # AgentContainer 클래스 정의 (extends Container)
│   └── sse.ts          # SSE (Server-Sent Events) 스트림 처리 로직
├── worker-configuration.d.ts # 자동 생성된 환경 바인딩 타입
├── wrangler.jsonc      # Wrangler 설정 파일
├── tsconfig.json       # TypeScript 설정
└── package.json
```

## 🔐 보안 접근 (Basic Auth)

Agent에 대한 무단 접근을 방지하기 위해 표준 HTTP Basic Auth 인증을 지원합니다.

### 설정

다음 변수를 `wrangler.jsonc` 또는 Cloudflare 대시보드의 환경 변수에 설정하세요:

| Variable Name     | Description                                           | Default |
| ----------------- | ----------------------------------------------------- | ------- |
| `SERVER_PASSWORD` | 접근 비밀번호. 설정하지 않으면 인증이 **비활성화**됩니다. | (empty) |
| `SERVER_USERNAME` | 접근 사용자 이름                                      | (empty) |

### 검증 로직

1. `SERVER_PASSWORD` 환경 변수가 설정된 경우에만 인증이 활성화됩니다.
2. 클라이언트 요청은 `Authorization: Basic <credentials>` 헤더를 포함해야 합니다.
3. 인증에 실패하면 서버가 `401 Unauthorized` 상태 코드를 반환합니다.

## 💾 데이터 지속성 (S3/R2)

Cloud Code 컨테이너는 `TigrisFS`를 사용해 S3 호환 스토리지(Cloudflare R2, AWS S3 등)를 로컬 파일시스템으로 마운트하여 영속 데이터를 저장할 수 있습니다.

### 환경 변수 설정

데이터 지속성을 활성화하려면 컨테이너 런타임에 다음 환경 변수를 설정하세요:

| Variable Name          | Description                                  | Required | Default  |
| ---------------------- | -------------------------------------------- | -------- | -------- |
| `S3_ENDPOINT`          | S3 API 엔드포인트 주소                       | ✅ Yes   | -        |
| `S3_BUCKET`            | 버킷 이름                                     | ✅ Yes   | -        |
| `S3_ACCESS_KEY_ID`     | 액세스 키 ID                                  | ✅ Yes   | -        |
| `S3_SECRET_ACCESS_KEY` | 액세스 키 시크릿                              | ✅ Yes   | -        |
| `S3_REGION`            | 스토리지 리전                                 | ❌ No    | `auto`   |
| `S3_PATH_STYLE`        | Path Style 접근 사용 여부                     | ❌ No    | `false`  |
| `S3_PREFIX`            | 버킷 내 경로 프리픽스(서브디렉토리)             | ❌ No    | (root)   |
| `TIGRISFS_ARGS`        | TigrisFS 추가 마운트 인자                      | ❌ No    | -        |

### 동작 방식

1. **마운트 포인트**: 컨테이너 시작 시 S3 버킷이 `/root/s3`에 마운트됩니다.
2. **작업 디렉터리**: 실제 워크스페이스는 `/root/s3/workspace`에 위치합니다.
3. **OpenCode 설정**: OpenCode의 설정 파일(XDG 디렉터리)도 `/root/s3/.opencode`에 저장되어 상태가 유지됩니다.
4. **초기화**:
   - S3 버킷(또는 지정한 프리픽스 경로)이 비어 있으면, 컨테이너가 기본 `workspace` 디렉터리 내용을 자동으로 복사합니다.
   - S3 설정이 없으면 영속성이 없는 로컬 디렉터리 모드로 동작합니다.

## 🌐 터널 노출 (Cloudflared)

컨테이너에는 `cloudflared` CLI가 사전 설치되어 있으며, 컨테이너 내부 서비스(개발 서버, 웹 앱 등)를 Cloudflare Tunnel로 외부에 노출할 수 있습니다.

다음과 같은 상황에서 유용합니다:

- 컨테이너 내부 웹 서비스 디버깅
- 개발 환경 임시 공유
- SSH 접근 구성

사용 예시(컨테이너 터미널에서 실행):

```bash
# 컨테이너 내부의 8080 포트를 외부에 노출
cloudflared tunnel --url http://localhost:8080
```

## 🛠 기술 스택

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Core Libraries**:
  - `cloudflare:workers`: Workers 표준 라이브러리
  - `@cloudflare/containers`: 컨테이너 관리 및 상호작용
- **Tools**: Wrangler
- **Container Environment**:
  - `nikolaik/python-nodejs`: Python 3.12 + Node.js 22
  - `tigrisfs`: S3 파일시스템 마운트
  - `cloudflared`: Cloudflare Tunnel 클라이언트
  - `opencode`: 지능형 코딩 Agent

## 📝 개발 가이드라인

이 프로젝트의 공식 언어는 **영어**입니다(코드, 주석, 커밋 메시지는 영어). 이 README는 한국어 버전입니다. 상세한 개발 가이드, 코드 스타일, Agent 행동 규칙은 [AGENTS.md](./AGENTS.md)를 참고하세요.

## 🔄 요청 처리 흐름

1. 클라이언트 요청이 Worker(`src/index.ts`)로 들어옵니다.
2. Basic Auth가 활성화되어 있으면 인증을 검사합니다.
3. 요청은 Durable Object인 `AgentContainer`로 전달됩니다.
4. DO는 컨테이너를 시작하고 `container.fetch`로 요청을 프록시합니다.
5. 컨테이너 내부에서 `/entrypoint.sh`가 실행되며 `opencode web`가 구동됩니다.

## 🧩 R2/S3 디스크 마운트 원리 (TigrisFS/FUSE)

이 프로젝트는 컨테이너 시작 시 `/entrypoint.sh`에서 FUSE 기반의 `tigrisfs`로 S3 호환 버킷을 로컬 디스크처럼 마운트합니다.
Cloudflare도 Containers에서 R2 버킷을 FUSE로 마운트하는 방식을 공식 예제로 안내하고 있습니다.

- 공식 예제: https://developers.cloudflare.com/containers/examples/r2-fuse-mount/
- FUSE 지원 공지: https://developers.cloudflare.com/changelog/post/2025-11-21-fuse-support-in-containers/

### 동작 요약

- 필수 환경 변수(`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`)가 모두 있으면 마운트를 시도합니다.
- 마운트 포인트는 `/root/s3`이며, 성공하면 워크스페이스와 OpenCode 설정이 이 경로 아래에 저장됩니다.
- 마운트 실패 시 컨테이너가 종료되므로, 실제 운영에서는 자격 증명과 네트워크를 반드시 검증해야 합니다.

### 주의 사항

FUSE 마운트는 로컬 디스크와 동일한 성능을 보장하지 않습니다.
객체 스토리지는 POSIX 파일시스템과 특성이 다르므로, 대용량 파일 I/O나 높은 동시성 환경에서는 지연이 커질 수 있습니다.

## 📍 placement.region / containers.constraints.region 설명

### placement.region

`placement.region`은 Worker가 특정 클라우드 리전에 가까운 Cloudflare 데이터센터에서 실행되도록 힌트를 주는 공식 설정입니다.

- 문서: https://developers.cloudflare.com/workers/configuration/placement/
- 공지: https://developers.cloudflare.com/changelog/post/2026-01-22-explicit-placement-hints/

이 프로젝트에서 `aws:us-west-2`를 사용한 이유는, 컨테이너가 사용하는 스토리지(R2/S3)나 외부 인프라가 미국 서부 리전에 있을 경우 지연 시간을 줄이기 위한 선택으로 추정됩니다.

### containers.constraints.region

`containers.constraints.region`은 Wrangler 공식 스키마에 명시된 옵션이 아니므로, 설정 시 경고(예: "프로퍼티 'constraints'은(는) 허용되지 않습니다.")가 발생할 수 있습니다.
특정 리전에 컨테이너 배치를 제한하려는 의도로 보이지만, 비공식 필드이므로 향후 동작이 변경될 가능성이 있습니다.

정식 문서에 없는 필드를 사용할 때는 릴리스 노트와 스키마 변경 사항을 주기적으로 확인하는 것을 권장합니다.
