# 온글 개발

이 프로젝트는 프론트엔드(`frontend`)와 백엔드(`backend`)가 분리된 구조입니다.

## GitHub 연동 준비

### 1. Git 설치
Windows에서는 https://git-scm.com/ 에서 Git을 설치하세요.

### 2. 로컬 저장소 초기화
```powershell
cd "c:\Users\soyeo\Desktop\시스템 분석\온글 개발"
git init
git add .
git commit -m "Initial Ongle project setup"
```

### 3. GitHub 저장소 생성
GitHub에서 새 리포지토리를 만듭니다.

### 4. 원격 저장소 연결
```powershell
git remote add origin https://github.com/<username>/<repo>.git
git branch -M main
git push -u origin main
```

### 5. GitHub CLI 사용 시
`gh`가 설치되어 있으면 다음 명령으로 바로 생성 및 푸시할 수 있습니다.
```powershell
gh repo create <username>/<repo> --public --source=. --remote=origin --push
```

## 프론트엔드 실행
```powershell
cd frontend
pnpm install
pnpm dev
```

## 백엔드 실행
```powershell
cd backend
npm install
npm run dev
```
