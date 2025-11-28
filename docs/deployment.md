# 배포 가이드

API Doc Manager를 Render + MongoDB Atlas에 배포하는 방법을 설명합니다.

## 목차

1. [사전 준비](#사전-준비)
2. [MongoDB Atlas 설정](#mongodb-atlas-설정)
3. [GitHub 저장소 준비](#github-저장소-준비)
4. [Render 배포](#render-배포)
5. [배포 후 확인](#배포-후-확인)
6. [문제 해결](#문제-해결)

---

## 사전 준비

### 필수 계정

- [GitHub](https://github.com) 계정
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 계정 (무료)
- [Render](https://render.com) 계정 (무료, GitHub 연동 권장)

### 로컬 환경 확인

```bash
# Node.js 18 이상 필요
node --version  # v18.x.x 이상

# 로컬에서 정상 동작하는지 확인
npm install
npm run dev
```

---

## MongoDB Atlas 설정

### 1. 클러스터 생성

1. [MongoDB Atlas](https://cloud.mongodb.com) 로그인
2. **Create a Deployment** 클릭
3. **M0 FREE** 선택 (512MB 무료)
4. 클라우드 제공자 및 리전 선택 (예: AWS - Seoul)
5. 클러스터 이름 입력 후 **Create Deployment**

### 2. 데이터베이스 사용자 생성

1. 좌측 메뉴 **Database Access** 클릭
2. **Add New Database User** 클릭
3. Authentication Method: **Password**
4. 사용자명/비밀번호 입력 (안전한 비밀번호 사용)
5. Database User Privileges: **Read and write to any database**
6. **Add User** 클릭

> ⚠️ **비밀번호에 특수문자가 있으면 URL 인코딩 필요**
> 예: `p@ssword!` → `p%40ssword%21`

### 3. 네트워크 접근 허용

1. 좌측 메뉴 **Network Access** 클릭
2. **Add IP Address** 클릭
3. **Allow Access from Anywhere** 선택 (0.0.0.0/0)
   - Render의 IP가 동적으로 변경되므로 모든 IP 허용 필요
4. **Confirm** 클릭

### 4. 연결 문자열 복사

1. 좌측 메뉴 **Database** → **Connect** 클릭
2. **Drivers** 선택
3. 연결 문자열 복사:
   ```
   mongodb+srv://dnvkfnvk1_db_user:MmtiXaKtuaXjBYDQ@cluster0.fptqfea.mongodb.net/?appName=Cluster0
   ```
4. `<username>`, `<password>`, `<dbname>`을 실제 값으로 교체

**예시:**

```
mongodb+srv://myuser:MyP%40ssword@cluster0.abc123.mongodb.net/api-doc-manager?retryWrites=true&w=majority
```

---

## GitHub 저장소 준비

### 1. 저장소 생성

```bash
# 프로젝트 폴더에서
git init
git add .
git commit -m "Initial commit"

# GitHub에서 새 저장소 생성 후
git remote add origin https://github.com/<username>/<repo-name>.git
git branch -M main
git push -u origin main
```

### 2. 보안 확인

`.env` 파일이 `.gitignore`에 포함되어 있는지 확인:

```bash
# .env 파일이 추적되지 않아야 함
git status
```

---

## Render 배포

### 1. Render 가입 및 연결

1. [Render](https://render.com) 접속
2. **GitHub으로 가입** 선택 (권장)
3. GitHub 저장소 접근 권한 부여

### 2. Web Service 생성

1. 대시보드에서 **New +** → **Web Service** 클릭
2. **Connect a repository** 선택
3. 배포할 GitHub 저장소 선택
4. 다음 설정 입력:

| 항목          | 값                                   |
| ------------- | ------------------------------------ |
| Name          | `api-doc-manager` (또는 원하는 이름) |
| Region        | Singapore (가장 가까운 리전)         |
| Branch        | `main`                               |
| Runtime       | `Node`                               |
| Build Command | `npm install`                        |
| Start Command | `npm start`                          |
| Plan          | `Free`                               |

### 3. 환경변수 설정

**Environment** 섹션에서 다음 변수 추가:

| Key           | Value                                                |
| ------------- | ---------------------------------------------------- |
| `NODE_ENV`    | `production`                                         |
| `MONGODB_URI` | `mongodb+srv://...` (Atlas 연결 문자열)              |
| `CORS_ORIGIN` | `https://api-doc-manager.onrender.com` (배포 후 URL) |
| `LOG_LEVEL`   | `combined`                                           |

### 4. 배포 실행

1. **Create Web Service** 클릭
2. 빌드 로그 확인 (약 2-3분 소요)
3. 배포 완료 시 URL 제공: `https://api-doc-manager.onrender.com`

---

## 배포 후 확인

### 1. 헬스체크

```bash
curl https://api-doc-manager.onrender.com/api/health
```

정상 응답:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 123.456
  }
}
```

### 2. 메인 페이지 확인

브라우저에서 `https://api-doc-manager.onrender.com` 접속

### 3. API 기능 테스트

- URL 등록 테스트
- Swagger JSON Fetch 테스트
- 버전 비교 테스트

---

## 문제 해결

### 배포 실패

**증상:** Build failed

**해결:**

1. Render 대시보드에서 **Logs** 확인
2. `npm install` 에러 시 `package-lock.json` 확인
3. Node.js 버전 호환성 확인 (18.x 이상)

### MongoDB 연결 실패

**증상:** `MongoNetworkError` 또는 `MongoServerSelectionError`

**해결:**

1. Atlas Network Access에서 `0.0.0.0/0` 허용 확인
2. 연결 문자열의 사용자명/비밀번호 확인
3. 비밀번호 특수문자 URL 인코딩 확인

### CORS 에러

**증상:** 브라우저 콘솔에 CORS 에러

**해결:**

1. `CORS_ORIGIN` 환경변수가 정확한 배포 URL인지 확인
2. `https://` 프로토콜 포함 확인
3. 뒤에 슬래시(`/`) 없이 입력

### Sleep 모드 (Cold Start)

**증상:** 첫 요청 시 30초 이상 대기

**원인:** Render 무료 티어는 15분 미사용 시 Sleep 모드 진입

**해결:**

- 업그레이드 (유료)
- 또는 외부 모니터링 서비스로 주기적 ping (UptimeRobot 등)

---

## 환경변수 요약

| 변수          | 설명                           | 예시                       |
| ------------- | ------------------------------ | -------------------------- |
| `NODE_ENV`    | 실행 환경                      | `production`               |
| `PORT`        | 서버 포트 (Render가 자동 설정) | -                          |
| `MONGODB_URI` | MongoDB 연결 문자열            | `mongodb+srv://...`        |
| `CORS_ORIGIN` | 허용 도메인                    | `https://app.onrender.com` |
| `LOG_LEVEL`   | 로그 형식                      | `combined`                 |

---

## 다음 단계

배포 완료 후 고려사항:

1. **커스텀 도메인** 연결
2. **모니터링** 설정 (UptimeRobot, Better Stack)
3. **백업 전략** 수립 (MongoDB Atlas 자동 백업 활용)
4. **유료 플랜** 업그레이드 (Sleep 모드 제거 필요시)
