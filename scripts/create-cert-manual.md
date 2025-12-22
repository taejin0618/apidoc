# SSL 인증서 생성 가이드

## 방법 1: OpenSSL 사용 (권장)

### OpenSSL 설치
1. **Win32 OpenSSL 다운로드**: https://slproweb.com/products/Win32OpenSSL.html
2. 또는 **Git for Windows 설치** (OpenSSL 포함)

### 인증서 생성
```bash
# cert 디렉토리로 이동
cd cert

# 자체 서명 인증서 생성
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes -subj "/C=KR/ST=Seoul/L=Seoul/O=API Doc Manager/CN=211.39.156.53"
```

## 방법 2: win-acme로 Let's Encrypt 인증서 발급 (프로덕션 권장)

1. **win-acme 다운로드**: https://www.win-acme.com/
2. 관리자 권한으로 실행
3. 인증서 발급 및 자동 갱신 설정

## 방법 3: IIS에서 인증서 내보내기

IIS가 설치되어 있다면:
1. IIS Manager 열기
2. Server Certificates에서 인증서 내보내기
3. cert 디렉토리에 복사

## 인증서 파일 위치
- 키 파일: `cert/server.key`
- 인증서 파일: `cert/server.crt`

## 참고
- 자체 서명 인증서는 브라우저에서 보안 경고가 표시됩니다
- 프로덕션 환경에서는 Let's Encrypt 같은 공인 인증서 사용 권장

