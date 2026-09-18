# 남은 시간 — Expo 버전

Windows에서 개발하고 iPhone의 Expo Go로 테스트할 수 있는 React Native 앱입니다.

## 1. 준비

- Windows에 Node.js LTS 설치: https://nodejs.org/
- iPhone App Store에서 **Expo Go** 설치
- PC와 iPhone을 같은 Wi-Fi에 연결

## 2. 실행

PowerShell에서 이 폴더로 이동한 다음 실행합니다.

```powershell
npm install
npx expo start
```

터미널 또는 브라우저에 나타난 QR 코드를 iPhone 기본 카메라로 스캔하고 Expo Go로 엽니다.

같은 Wi-Fi에서 연결되지 않으면 다음 명령을 사용합니다.

```powershell
npx expo start --tunnel
```

## 조작

- 메인 화면 하단 `새 카테고리`: 카테고리 생성
- 카테고리 선택 후 하단 `할 일 추가`: 이름과 기한 설정
- 체크 원: 완료/미완료 전환
- 할 일 길게 누르기: 삭제
- 카테고리 길게 누르기: 카테고리 삭제
- 모든 데이터는 기기 안에 자동 저장
