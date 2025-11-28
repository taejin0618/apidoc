# 배포 가이드

API Doc Manager를 무료로 인터넷에 배포하는 방법을 설명한다.

> **총 소요 시간**: 약 45분
> **난이도**: 초보자 가능
> **비용**: 무료 (MongoDB Atlas M0 + Render Free Tier)

---

## 목차

1. [시작하기 전에](#1-시작하기-전에) (5분)
2. [MongoDB Atlas 설정](#2-mongodb-atlas-설정) (15분)
3. [GitHub에 코드 올리기](#3-github에-코드-올리기) (10분)
4. [Render에서 배포하기](#4-render에서-배포하기) (10분)
5. [배포 확인하기](#5-배포-확인하기) (5분)
6. [문제가 생겼을 때](#6-문제가-생겼을-때)
7. [다음 단계](#7-다음-단계)

---

## 1. 시작하기 전에

### 무엇을 할 건가요?

```
[내 컴퓨터] → [GitHub] → [Render] ← [MongoDB Atlas]
     코드 저장       웹 서버        데이터베이스
```

- **MongoDB Atlas**: 데이터베이스를 클라우드에 무료로 호스팅
- **GitHub**: 코드를 저장하고 Render와 연결
- **Render**: 웹 서버를 무료로 운영

### 필요한 것들

| 항목 | 설명 | 준비 방법 |
|------|------|----------|
| GitHub 계정 | 코드 저장소 | [github.com](https://github.com) 가입 |
| MongoDB Atlas 계정 | 클라우드 데이터베이스 | [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) 가입 |
| Render 계정 | 웹 서버 호스팅 | [render.com](https://render.com) 가입 (GitHub 연동 권장) |

### 로컬에서 정상 작동 확인

배포 전에 로컬에서 먼저 테스트한다.

```bash
# Node.js 버전 확인 (18 이상 필요)
node --version

# 의존성 설치 및 실행
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 정상 작동 확인

✅ **완료**: 로컬에서 앱이 정상 작동함

---

## 2. MongoDB Atlas 설정

> **소요 시간**: 약 15분
> **목표**: 클라우드 데이터베이스 생성 및 연결 주소 얻기

### 2.1 계정 만들기

<!-- 스크린샷: MongoDB Atlas 회원가입 페이지 -->

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) 접속
2. 이메일, 비밀번호 입력 또는 **Sign up with Google** 클릭
3. 이용약관 동의 후 **Create your Atlas account** 클릭

✅ **완료**: Atlas 계정 생성됨

### 2.2 클러스터 생성하기

> **클러스터란?**: 데이터베이스 서버를 말한다. 무료 M0 클러스터는 512MB 저장공간을 제공한다.

<!-- 스크린샷: Atlas 대시보드 - Deploy your database 화면 -->

1. 로그인 후 **Deploy your database** 화면이 나온다
2. **M0 FREE** 선택 (무료, 512MB)

<!-- 스크린샷: M0 FREE 선택 화면 -->

3. **Provider**: AWS 선택 (권장)
4. **Region**: 가장 가까운 리전 선택
   - 한국: `ap-northeast-2` (Seoul) 또는 `ap-northeast-1` (Tokyo)
5. **Name**: 기본값 `Cluster0` 그대로 사용
6. **Create Deployment** 클릭

<!-- 스크린샷: 클러스터 생성 중 화면 -->

> ⏳ 클러스터 생성에 약 1-3분 소요

✅ **완료**: 무료 클러스터 생성됨

### 2.3 데이터베이스 사용자 만들기

클러스터 생성 직후 **Security Quickstart** 화면이 나온다.

<!-- 스크린샷: Security Quickstart - 사용자 생성 화면 -->

**Authentication Method** 섹션:

1. **Username** 입력 (예: `apidoc_user`)
2. **Password** 입력 또는 **Autogenerate Secure Password** 클릭
3. 비밀번호를 반드시 **메모장에 저장**한다
4. **Create Database User** 클릭

> ⚠️ **중요**: 비밀번호에 특수문자(`@`, `!`, `#` 등)가 있으면 나중에 문제가 생길 수 있다.
> 영문+숫자 조합의 단순한 비밀번호를 권장한다. 예: `MyPass1234`

✅ **완료**: 데이터베이스 사용자 생성됨

### 2.4 네트워크 설정하기

같은 **Security Quickstart** 화면의 **Where would you like to connect from?** 섹션:

<!-- 스크린샷: IP Access List 설정 화면 -->

1. **My Local Environment** 선택됨 확인
2. **IP Access List** 섹션에서 **IP Address** 입력란에 `0.0.0.0/0` 입력
3. **Description**에 `Allow all` 입력
4. **Add Entry** 클릭
5. 화면 하단 **Finish and Close** 클릭

<!-- 스크린샷: 0.0.0.0/0 추가된 화면 -->

> 💡 **왜 모든 IP를 허용하나요?**
> Render 서버의 IP가 동적으로 변경되기 때문이다. 무료 티어에서는 고정 IP를 사용할 수 없다.

✅ **완료**: 네트워크 접근 설정됨

### 2.5 연결 주소 복사하기

<!-- 스크린샷: Atlas 대시보드 - Connect 버튼 -->

1. Atlas 대시보드에서 **Database** 메뉴 클릭
2. 클러스터 옆 **Connect** 버튼 클릭

<!-- 스크린샷: Connect 팝업 - Drivers 선택 -->

3. **Drivers** 선택
4. 연결 문자열(Connection String) 복사

<!-- 스크린샷: Connection String 복사 화면 -->

복사된 문자열 예시:
```
mongodb+srv://apidoc_user:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

5. `<password>` 부분을 실제 비밀번호로 교체
6. `?` 앞에 데이터베이스 이름 추가: `/api-doc-manager`

**최종 연결 문자열** (메모장에 저장):
```
mongodb+srv://apidoc_user:MyPass1234@cluster0.abc123.mongodb.net/api-doc-manager?retryWrites=true&w=majority&appName=Cluster0
```

> ⚠️ **주의사항**:
> - `<password>`를 실제 비밀번호로 교체 (꺾쇠 괄호 제거)
> - 데이터베이스 이름 `/api-doc-manager`를 `?` 앞에 추가
> - 비밀번호에 `@` 문자가 있으면 `%40`으로 변경

✅ **완료**: MongoDB 연결 주소 준비됨

---

## 3. GitHub에 코드 올리기

> **소요 시간**: 약 10분
> **목표**: 코드를 GitHub에 업로드

### 3.1 저장소 생성

<!-- 스크린샷: GitHub - New Repository 버튼 -->

1. [GitHub](https://github.com) 로그인
2. 오른쪽 상단 **+** 버튼 → **New repository** 클릭

<!-- 스크린샷: Create a new repository 화면 -->

3. **Repository name** 입력 (예: `api-doc-manager`)
4. **Public** 또는 **Private** 선택 (둘 다 가능)
5. **Create repository** 클릭

✅ **완료**: GitHub 저장소 생성됨

### 3.2 package.json에 engines 추가

Render에서 Node.js 버전을 인식하도록 `package.json`에 engines 필드를 추가한다.

```json
{
  "name": "api-doc-manager",
  "version": "1.0.0",
  "engines": {
    "node": ">=18.0.0"
  },
  ...
}
```

### 3.3 코드 푸시

터미널에서 프로젝트 폴더로 이동 후 실행:

```bash
# Git 초기화 (이미 했다면 생략)
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit"

# 원격 저장소 연결 (GitHub에서 복사한 URL 사용)
git remote add origin https://github.com/사용자명/api-doc-manager.git

# 푸시
git branch -M main
git push -u origin main
```

> ⚠️ **확인**: `.gitignore`에 `.env` 파일이 포함되어 있어야 한다.
> 민감한 정보가 GitHub에 올라가면 안 된다!

✅ **완료**: 코드가 GitHub에 업로드됨

---

## 4. Render에서 배포하기

> **소요 시간**: 약 10분
> **목표**: GitHub 코드를 웹 서버에 배포

### 4.1 Render 가입하기

<!-- 스크린샷: Render 로그인 페이지 -->

1. [Render](https://render.com) 접속
2. **Sign in with GitHub** 클릭 (권장)
3. GitHub 권한 요청 → **Authorize Render** 클릭

<!-- 스크린샷: GitHub 권한 승인 화면 -->

> 💡 **왜 GitHub으로 가입하나요?**
> GitHub 저장소에 코드를 푸시할 때마다 자동으로 배포가 진행된다.

✅ **완료**: Render 계정 생성됨

### 4.2 새 웹 서비스 만들기

<!-- 스크린샷: Render 대시보드 - New + 버튼 -->

1. Render 대시보드에서 **New +** 버튼 클릭
2. **Web Service** 선택

<!-- 스크린샷: Build and deploy from a Git repository 선택 -->

3. **Build and deploy from a Git repository** 선택 → **Next** 클릭
4. 배포할 저장소 찾기:
   - 목록에 없으면 **Configure account** 클릭
   - GitHub에서 해당 저장소에 대한 권한 부여
5. 저장소 옆 **Connect** 클릭

<!-- 스크린샷: 저장소 연결 화면 -->

6. 다음 설정 입력:

| 항목 | 값 | 설명 |
|------|-----|------|
| **Name** | `api-doc-manager` | 서비스 이름 (URL에 사용됨) |
| **Region** | `Singapore` | 한국에서 가장 가까움 |
| **Branch** | `main` | 배포할 브랜치 |
| **Runtime** | `Node` | 자동 감지됨 |
| **Build Command** | `npm install` | 의존성 설치 |
| **Start Command** | `npm start` | 서버 시작 명령어 |
| **Instance Type** | `Free` | 무료 티어 선택 |

<!-- 스크린샷: 서비스 설정 화면 -->

✅ **완료**: 기본 설정 완료

### 4.3 환경변수 설정하기

같은 페이지 아래로 스크롤 → **Environment Variables** 섹션

<!-- 스크린샷: Environment Variables 섹션 -->

**Add Environment Variable** 버튼을 클릭하여 다음 변수들을 추가:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://apidoc_user:MyPass1234@cluster0...` (2.5에서 저장한 연결 주소) |
| `CORS_ORIGIN` | `https://api-doc-manager.onrender.com` (배포 후 실제 URL로 변경) |
| `LOG_LEVEL` | `combined` |

<!-- 스크린샷: 환경변수 입력된 화면 -->

> ⚠️ **중요**: `MONGODB_URI`는 따옴표 없이 입력한다.
> `CORS_ORIGIN`의 URL은 배포 완료 후 실제 URL로 수정해야 할 수 있다.

✅ **완료**: 환경변수 설정됨

### 4.4 배포하기

<!-- 스크린샷: Create Web Service 버튼 -->

1. 페이지 맨 아래 **Create Web Service** 클릭
2. 빌드 로그 화면으로 자동 이동

<!-- 스크린샷: 빌드 로그 화면 -->

3. 빌드 진행 상황 확인 (약 2-5분 소요)
4. **==> Your service is live** 메시지 확인

<!-- 스크린샷: 배포 완료 화면 -->

배포 완료 시 URL 확인:
```
https://api-doc-manager.onrender.com
```

✅ **완료**: 배포 성공!

---

## 5. 배포 확인하기

> **소요 시간**: 약 5분
> **목표**: 배포된 서비스가 정상 작동하는지 확인

### 5.1 사이트 접속 테스트

1. 배포된 URL 클릭 (예: `https://api-doc-manager.onrender.com`)
2. 메인 페이지가 정상적으로 표시되는지 확인

<!-- 스크린샷: 배포된 메인 페이지 -->

> ⏳ **첫 접속이 느려요?**
> Render 무료 티어는 15분 동안 사용하지 않으면 Sleep 모드로 전환된다.
> 첫 요청 시 깨어나는 데 30초~1분 정도 걸린다.

### 5.2 헬스체크

터미널에서 실행:

```bash
curl https://api-doc-manager.onrender.com/api/health
```

정상 응답:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "uptime": 123.456
  }
}
```

### 5.3 기능 테스트

1. **URL 등록**: 새 Swagger URL 등록 테스트
2. **Swagger Fetch**: JSON 다운로드 테스트
3. **버전 비교**: 버전 비교 페이지 테스트

✅ **완료**: 모든 기능 정상 작동 확인

---

## 6. 문제가 생겼을 때

### 자주 묻는 질문 (FAQ)

#### Q: 빌드가 실패해요

**증상**: Render 로그에 `Build failed` 표시

**해결**:
1. Render 대시보드 → 서비스 → **Logs** 탭 확인
2. 에러 메시지 확인 후 아래 표 참고

| 에러 메시지 | 원인 | 해결 방법 |
|------------|------|----------|
| `npm ERR! Cannot find module` | 의존성 누락 | `package.json` 확인, `npm install` 재실행 |
| `ENOENT: no such file` | 파일 경로 오류 | 대소문자 확인 (Linux는 대소문자 구분) |
| `node: not found` | Node.js 버전 문제 | `package.json`에 `engines` 필드 추가 |

---

#### Q: MongoDB 연결이 안 돼요

**증상**: 로그에 `MongoNetworkError` 또는 `MongoServerSelectionError`

**해결 체크리스트**:

- [ ] Atlas Network Access에서 `0.0.0.0/0` 허용됨
- [ ] 연결 문자열의 비밀번호가 정확함
- [ ] 비밀번호에 특수문자가 있다면 URL 인코딩됨
- [ ] 연결 문자열에 데이터베이스 이름(`/api-doc-manager`)이 포함됨

**특수문자 URL 인코딩 표**:

| 문자 | 인코딩 |
|------|--------|
| `@` | `%40` |
| `!` | `%21` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |

예시: `p@ssword!` → `p%40ssword%21`

---

#### Q: CORS 에러가 나요

**증상**: 브라우저 콘솔에 `Access-Control-Allow-Origin` 에러

**해결**:
1. Render 대시보드 → 서비스 → **Environment** 탭
2. `CORS_ORIGIN` 값이 정확한 배포 URL인지 확인
3. URL 형식 확인:
   - ✅ `https://api-doc-manager.onrender.com`
   - ❌ `https://api-doc-manager.onrender.com/` (뒤에 슬래시 X)
   - ❌ `http://...` (https 필수)

---

#### Q: 첫 접속이 너무 느려요 (30초 이상)

**원인**: Render 무료 티어는 15분 미사용 시 Sleep 모드 진입

**해결 방법**:

1. **그냥 기다린다** (권장): 첫 요청 후 30초~1분 후 정상 속도
2. **모니터링 서비스 사용**: 주기적으로 ping을 보내 Sleep 방지
   - [UptimeRobot](https://uptimerobot.com) (무료)
   - [Better Stack](https://betterstack.com) (무료 티어 있음)
3. **유료 플랜 업그레이드**: Render Starter ($7/월)

---

#### Q: 환경변수를 수정했는데 반영이 안 돼요

**해결**:
1. Render 대시보드 → 서비스
2. 우측 상단 **Manual Deploy** → **Deploy latest commit** 클릭
3. 재배포 완료 후 확인

---

### 로그 확인 방법

Render 대시보드에서 디버깅에 필요한 로그를 확인한다:

<!-- 스크린샷: Render Logs 탭 -->

1. Render 대시보드 → 해당 서비스 클릭
2. **Logs** 탭 클릭
3. 실시간 로그 확인

**유용한 로그 필터**:
- 에러만 보기: `level=error`
- MongoDB 관련: `mongo`

---

## 7. 다음 단계

배포가 완료되면 다음 사항을 고려한다:

### 권장 설정

| 항목 | 설명 | 링크 |
|------|------|------|
| 커스텀 도메인 | `api-doc.mycompany.com` 같은 도메인 연결 | [Render Docs](https://render.com/docs/custom-domains) |
| 모니터링 | 서비스 상태 모니터링 및 알림 | [UptimeRobot](https://uptimerobot.com) |
| 백업 | MongoDB Atlas 자동 백업 활성화 | [Atlas Docs](https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/) |

### 유료 플랜 고려 시점

| 상황 | 권장 플랜 |
|------|----------|
| Sleep 모드가 불편함 | Render Starter ($7/월) |
| 데이터 512MB 초과 예상 | MongoDB Atlas M2 ($9/월) |
| 트래픽 증가 예상 | 두 서비스 모두 업그레이드 |

---

## 환경변수 요약

| 변수 | 설명 | 예시 |
|------|------|------|
| `NODE_ENV` | 실행 환경 | `production` |
| `PORT` | 서버 포트 (Render가 자동 설정) | - |
| `MONGODB_URI` | MongoDB 연결 문자열 | `mongodb+srv://...` |
| `CORS_ORIGIN` | 허용 도메인 | `https://app.onrender.com` |
| `LOG_LEVEL` | 로그 형식 | `combined` |

---

## 참고 자료

- [MongoDB Atlas 시작 가이드](https://www.mongodb.com/docs/atlas/getting-started/)
- [Render Node.js 배포 문서](https://render.com/docs/deploy-node-express-app)
- [MongoDB Atlas 무료 티어 FAQ](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)

---

> 📝 **문서 업데이트**: 2025년 11월
> MongoDB Atlas와 Render의 UI가 변경될 수 있다. 최신 정보는 공식 문서를 참고한다.
