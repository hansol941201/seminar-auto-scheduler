# B2B Partner Management (B2B 업체관리)

건물 유지보수·보수공법 B2B 업무에서 시공사/협력업체를 관리하는 내부 운영 시스템.
**이번 단계는 제품 구조 / 화면 구조 / 정보 구조 / UI 뼈대까지**이며,
실제 데이터 연결·저장·Excel 처리·Firebase 연동은 포함하지 않는다.

## 로컬 미리보기

정적 파일만 사용하므로 빌드 도구·설치 과정이 없다. ES 모듈을 쓰기 때문에
`file://`로 열면 동작하지 않고, 간단한 로컬 서버가 필요하다.

```bash
cd b2b-partner
python3 -m http.server 8765
# 브라우저에서 http://localhost:8765 접속
```

Node를 쓰는 경우:

```bash
cd b2b-partner
npx serve .      # 또는: npx http-server -p 8765
```

## 폴더 구조

```
b2b-partner/
  index.html              진입점 (CSS/모듈 로드만 담당)
  docs/data-model.md      데이터 모델 초안
  src/
    app.js                앱 셸 · 해시 라우터 · 이벤트 위임
    components/           재사용 UI (헤더/탭/카드/테이블/모달/타임라인)
    pages/                화면 단위 (메인 탭 1개 = 파일 1개)
      companyDetail/      업체 상세 + 서브 탭 10종
    data/                 열거값 정의 + mock data
    services/             조회·집계·규칙 (화면과 데이터 사이 경계)
    utils/                포맷·DOM 유틸
    styles/               토큰 / base / layout / components
```

렌더링은 "각 페이지가 HTML 문자열을 반환하고, 상호작용은 `data-action` 위임으로 처리"하는
얇은 구조다. 프레임워크(React 등)로 옮기더라도 `pages / components / services` 경계는 그대로 유지된다.

## 화면 구조

상단 헤더(제품명 · 전체검색 · 알림 · 설정 · 사용자) + **상단 메인 탭 9개**. 좌측 고정 사이드바는 사용하지 않는다.

| 탭 | 경로 | 내용 |
| --- | --- | --- |
| 대시보드 | `#/dashboard` | KPI 9종, 최근 활동, 미팅 예정, MOU 진행현황, 매출 변화, 최근 등록 업체 |
| 업체 | `#/companies` | 검색·필터·정렬, 11개 컬럼 목록, 신규 등록 |
| 업체 상세 | `#/companies/:id` | 요약 헤더 + 3열 개요(기본정보·미팅·MOU·매출·실적·메모) + 서브 탭 10종 |
| 영업 | `#/sales` | 단계별 현황, 1·2차 미팅 예정, 활동 피드 |
| MOU | `#/mou` | 상태 분포, 협약 목록(기간·특허·현장·문서) |
| 매출 | `#/revenue` | 연도별 합계, 유형 구성, 업체 순위, 거래내역 |
| 매출 업로드 | `#/revenue/upload` | 파일 선택 → 분석 → Preview → 확인 → 반영 |
| 시공실적 | `#/performance` | 공종/지역/연도 필터, 통합 실적 목록 |
| 지도 | `#/map` | 업체·현장 레이어 placeholder, 지역 분포 |
| 분석 | `#/analytics` | 매출/실적/종합 순위, 전환율, 지역 분포 |
| 관리 | `#/admin/:section` | 코드·중복검토·정합화·업로드·데이터 이전·삭제·종료·설정 |

메인 탭은 `src/components/appShell.js`의 `MAIN_TABS` 배열에, 업체 상세 서브 탭은
`src/pages/companyDetail/index.js`의 `DETAIL_TABS` 배열에 항목을 추가하면 확장된다.

## 이번 단계에서 하지 않은 것

- Firebase·DB·API 연결 (모든 데이터는 `src/data/` 의 mock)
- 저장/수정/삭제 처리 — 해당 버튼은 자리만 있고 누르면 안내 토스트만 표시된다
- 실제 Excel 파싱 및 반영
- 중복검사·업체명 정합화 매칭 로직 (기준·판정상태·화면만 확정)
- 지도 SDK 연동

## 다음 단계 연결 순서 (권장)

1. 데이터 계층 (`services/*`의 조회 함수를 실제 저장소로 교체)
2. 신규 업체 등록 저장 + 업체코드 부여 트랜잭션
3. 중복검사 로직 (사업자번호 → 정규화 업체명 → 보조 기준)
4. 업체 정보 수정 / soft delete
5. 활동이력·메모 등록
6. 1차·2차 미팅 등록/수정/완료 + 영업단계 자동 전환
7. MOU 상태 전환 및 문서 업로드
8. 시공실적 등록
9. 매출 등록 → Excel 업로드 파싱/판정/반영
10. 업체명 정합화 판정 저장
11. 지도 SDK 연동 (주소 → 좌표)
12. 분석 지표 산식 확정
