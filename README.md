# 모래시계 (Hourglass) — Expo 버전

Windows에서 개발하고 iPhone의 Expo Go로 테스트할 수 있는 React Native 앱입니다.

## 1. 준비

- Windows에 Node.js LTS 설치: https://nodejs.org/
- iPhone App Store에서 **Expo Go** 설치
- PC와 iPhone을 같은 Wi-Fi에 연결

## 2. QR 코드로 실행

`Hourglass-Expo` 폴더에서 PowerShell 또는 터미널을 연 다음 아래 명령을 실행합니다.

```powershell
.\node_modules\.bin\expo.cmd start
```

터미널에 나타난 QR 코드를 iPhone 기본 카메라로 스캔하고 `Expo Go에서 열기`를 누릅니다. 앱을 종료할 때는 터미널에서 `Ctrl + C`를 누릅니다.

> 처음 실행하거나 `node_modules` 폴더가 없는 경우에만 아래 명령으로 패키지를 설치합니다.

```powershell
npm.cmd install
```

## 조작

- 메인 화면의 `+` 또는 하단 `새 카테고리`: 이름과 색상을 정해 카테고리 생성
- 카테고리 선택 후 하단 `할 일 추가`: 이름, 게이지 캐릭터, 기한 설정
- 할 일의 반복을 `매일`, `매주`, `매월`, `지정 요일`로 설정 가능
- 반복 할 일은 마감 다음 날 다음 기한으로 이동하며 게이지와 완료 상태가 초기화
- 체크 원: 완료/미완료 전환
- 할 일 길게 누르기: 삭제
- 카테고리 길게 누르기: 카테고리 삭제
- 월간 캘린더의 각 날짜 칸에서 할 일과 일정을 바로 확인
- 캘린더 `일정 추가`: 이모지, 메모, 갤러리 사진과 함께 일정 기록
- 일정 길게 누르기: 일정 삭제
- 모든 데이터는 기기 안에 자동 저장
