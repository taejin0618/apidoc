# Git 워크플로우 가이드 (초보자용)

## 목차
1. [브랜치 구조 이해하기](#브랜치-구조-이해하기)
2. [일상적인 개발 흐름](#일상적인-개발-흐름)
3. [실전 사용 예제](#실전-사용-예제)
4. [브랜치 보호 규칙 설정](#브랜치-보호-규칙-설정)
5. [자주 하는 실수와 해결법](#자주-하는-실수와-해결법)

---

## 브랜치 구조 이해하기

### 우리가 사용하는 브랜치 (3개만!)

```
main (메인 브랜치)
  └─ 배포용 브랜치
  └─ 항상 안정적인 버전만 유지
  └─ 직접 푸시하면 안 됨! (Pull Request로만 머지)

develop (개발 브랜치)
  └─ 평소 작업하는 곳
  └─ 여러 기능이 통합되는 곳
  └─ 여기서 feature 브랜치를 만듦

feature/기능명 (기능 브랜치)
  └─ 새 기능 개발할 때만 사용
  └─ 작업 완료 후 삭제
```

### 비유로 이해하기 🏠

- **main**: 완성된 집 (사람이 살 수 있는 상태)
- **develop**: 공사 현장 (여러 작업이 진행되는 곳)
- **feature**: 작업실 (특정 작업만 하는 곳, 예: 화장실 만들기)

---

## 일상적인 개발 흐름

### 평소 개발할 때 (90%의 경우)

```
1. develop 브랜치로 이동
2. feature/기능명 브랜치 만들기
3. 코드 작성
4. 완성되면 develop에 Pull Request
5. 머지 후 feature 브랜치 삭제
```

### 배포할 때

```
1. develop에서 main으로 Pull Request
2. 리뷰 후 머지
3. main 브랜치를 배포
```

---

## 실전 사용 예제

### 예제 1: 새 기능 추가하기 (가장 자주 사용)

**시나리오**: "사용자 로그인 기능"을 추가하고 싶어요

```bash
# 1단계: develop 브랜치로 이동
git checkout develop

# 2단계: 최신 코드 가져오기
git pull origin develop

# 3단계: 새 기능 브랜치 만들기
git checkout -b feature/사용자-로그인

# 4단계: 코드 작성 (여러 번 커밋 가능)
git add .
git commit -m "feat: 로그인 페이지 UI 추가"
git add .
git commit -m "feat: 로그인 API 연동"

# 5단계: 원격 저장소에 푸시
git push origin feature/사용자-로그인

# 6단계: GitHub에서 Pull Request 생성
# feature/사용자-로그인 → develop
# PR 제목: "feat: 사용자 로그인 기능 추가"
# 설명: 로그인 페이지와 API 연동 완료

# 7단계: PR 머지 후 로컬에서 브랜치 삭제
git checkout develop
git pull origin develop
git branch -d feature/사용자-로그인
```

### 예제 2: 버그 수정하기

**시나리오**: develop 브랜치에 버그가 있어요

```bash
# 1단계: develop에서 버그 수정 브랜치 만들기
git checkout develop
git pull origin develop
git checkout -b feature/로그인-오류-수정

# 2단계: 버그 수정
git add .
git commit -m "fix: 로그인 시 오류 수정"

# 3단계: 푸시하고 PR 생성
git push origin feature/로그인-오류-수정
# feature/로그인-오류-수정 → develop

# 4단계: 머지 후 브랜치 삭제
git checkout develop
git pull origin develop
git branch -d feature/로그인-오류-수정
```

### 예제 3: develop을 main에 배포하기

**시나리오**: 개발이 완료되어 배포하고 싶어요

```bash
# 1단계: develop 브랜치 최신화
git checkout develop
git pull origin develop

# 2단계: GitHub에서 Pull Request 생성
# develop → main
# PR 제목: "Release: v1.0.0 배포"
# 설명: 주요 기능 완료, 배포 준비 완료

# 3단계: 리뷰 후 머지
# (GitHub 웹사이트에서 머지 버튼 클릭)

# 4단계: 로컬 main 업데이트
git checkout main
git pull origin main

# 5단계: 태그 생성 (선택사항)
git tag v1.0.0
git push origin v1.0.0
```

---

## 브랜치 보호 규칙 설정

### GitHub에서 main 브랜치 보호하기

main 브랜치에 직접 푸시하는 것을 방지하려면:

1. **GitHub 저장소 페이지**로 이동
2. **Settings** → **Branches** 클릭
3. **Add branch protection rule** 클릭
4. **Branch name pattern**에 `main` 입력
5. 다음 옵션 체크:
   - ✅ **Require a pull request before merging**
   - ✅ **Require approvals** (1명 이상)
   - ✅ **Require status checks to pass before merging** (선택사항)
   - ✅ **Do not allow bypassing the above settings**
6. **Create** 클릭

이제 main 브랜치에는 Pull Request를 통해서만 머지할 수 있습니다!

### develop 브랜치도 보호하기 (선택사항)

같은 방법으로 develop 브랜치도 보호할 수 있습니다.
다만 develop은 더 자주 머지되므로, 승인 없이도 머지 가능하게 설정하는 것도 좋습니다.

---

## 자주 하는 실수와 해결법

### 실수 1: develop 브랜치를 만들지 않고 main에서 작업

**문제**: main 브랜치에서 직접 작업하고 있어요

**해결**:
```bash
# 1. 현재 작업을 임시 저장
git stash

# 2. develop 브랜치 만들기 (처음 한 번만)
git checkout -b develop
git push origin develop

# 3. 저장한 작업 가져오기
git stash pop

# 4. feature 브랜치 만들기
git checkout -b feature/내-기능
```

### 실수 2: feature 브랜치를 develop이 아닌 main에서 만들었어요

**문제**: `git checkout main` → `git checkout -b feature/기능` 했어요

**해결**:
```bash
# 1. 현재 브랜치 확인
git branch

# 2. develop으로 이동
git checkout develop
git pull origin develop

# 3. feature 브랜치를 develop에서 다시 만들기
git checkout -b feature/기능-v2

# 4. 이전 feature 브랜치의 커밋 가져오기 (선택사항)
git cherry-pick <커밋해시>
```

### 실수 3: feature 브랜치를 삭제하지 않았어요

**문제**: PR 머지 후 로컬에 브랜치가 남아있어요

**해결**:
```bash
# 로컬 브랜치 삭제
git branch -d feature/브랜치명

# 강제 삭제 (머지 안 된 경우)
git branch -D feature/브랜치명

# 원격 브랜치도 삭제
git push origin --delete feature/브랜치명
```

### 실수 4: develop 브랜치가 없어요

**문제**: 처음 시작하는데 develop 브랜치가 없어요

**해결**:
```bash
# 1. main 브랜치에서 시작
git checkout main
git pull origin main

# 2. develop 브랜치 만들기
git checkout -b develop

# 3. 원격 저장소에 푸시
git push origin develop

# 4. 기본 브랜치를 develop으로 설정 (선택사항)
# GitHub Settings → Branches → Default branch 변경
```

### 실수 5: 다른 사람이 만든 코드와 충돌났어요

**문제**: PR을 만들었는데 충돌(conflict)이 발생했어요

**해결**:
```bash
# 1. develop 브랜치 최신화
git checkout develop
git pull origin develop

# 2. feature 브랜치로 돌아가기
git checkout feature/내-기능

# 3. develop을 feature 브랜치에 머지
git merge develop

# 4. 충돌 파일 수정
# (에디터에서 <<<<<<< 표시 부분 수정)

# 5. 충돌 해결 후 커밋
git add .
git commit -m "fix: develop 브랜치와 충돌 해결"

# 6. 다시 푸시
git push origin feature/내-기능
```

---

## 브랜치 네이밍 규칙

### Feature 브랜치 이름

```
feature/기능명
feature/버그수정명
feature/UI-개선명
```

**좋은 예**:
- `feature/사용자-로그인`
- `feature/API-에러-처리`
- `feature/다크모드-추가`

**나쁜 예**:
- `feature/test` (너무 모호함)
- `feature/작업` (무엇을 하는지 모름)
- `feature/123` (의미 없음)

### 커밋 메시지 규칙

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅 (기능 변경 없음)
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 설정, 패키지 관리 등
```

**예시**:
- `feat: 사용자 로그인 기능 추가`
- `fix: 로그인 시 오류 수정`
- `docs: README 업데이트`

---

## 체크리스트

### 새 기능 개발 시작 전
- [ ] develop 브랜치로 이동했나요?
- [ ] `git pull origin develop` 했나요?
- [ ] feature 브랜치 이름이 명확한가요?

### 작업 완료 후
- [ ] 코드가 정상 작동하나요?
- [ ] 커밋 메시지가 명확한가요?
- [ ] Pull Request 설명을 작성했나요?

### PR 머지 후
- [ ] 로컬 feature 브랜치를 삭제했나요?
- [ ] develop 브랜치를 업데이트했나요?

---

## 요약

1. **평소에는**: `develop` → `feature/기능명` → 작업 → PR → 머지 → 삭제
2. **배포할 때**: `develop` → `main` → PR → 머지 → 배포
3. **main 브랜치는 보호**: 직접 푸시 금지, PR로만 머지
4. **브랜치 이름은 명확하게**: `feature/사용자-로그인` 같은 형식
5. **작업 후 정리**: feature 브랜치는 머지 후 삭제

---

## 추가 도움말

- [Git 공식 문서](https://git-scm.com/doc)
- [GitHub Flow 가이드](https://guides.github.com/introduction/flow/)
- [Git 브랜치 전략 비교](https://www.atlassian.com/git/tutorials/comparing-workflows)

질문이 있으면 팀에 물어보세요! 🚀
