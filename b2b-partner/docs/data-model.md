# 데이터 모델 초안

DB는 연결하지 않았지만, 화면이 사용하는 데이터 형태는 아래로 고정한다.
`src/data/mockCompanies.js`의 각 원소가 곧 `company` 문서 1건이다.

## company (루트 문서)

```
company {
  id,                       // 내부 문서 ID
  companyCode,              // 업체 고유코드 (B2B001 …) — 업체명과 무관한 추적 식별자

  name,                     // 현재 업체명
  normalizedName,           // 정규화 업체명 (중복검사·정합화 기준)
  businessNumber,           // 사업자번호 (숫자 10자리, 중복검사 1순위)

  aliases: [],              // 별칭 / 축약 표기
  formerNames: [],          // 구상호
  nameReconciliation: {     // 업체명 정합화 판정
    status,                 // SAME | CHECK | SEPARATE
    reviewedAt, reviewer,
  },

  representative, contactName, phone, email, address, region,

  companyType,              // CONSTRUCTOR | PARTNER | OTHER
  status,                   // ACTIVE | TERMINATED | DELETED
  salesStage,               // NEW_CONTACT … MOU_SIGNED
  mapPoint: { x, y },       // 지도 표시용 좌표 (실제 연동 시 lat/lng로 교체)
  note,

  salesPipeline: [ salesStep ],
  firstMeeting: firstMeeting,
  secondMeeting: secondMeeting,
  mou: mou,

  activities: [ activity ],
  memos: [ memo ],
  questionnaire: questionnaire,

  performances: [ performance ],
  revenues: [ revenue ],
  documents: [ document ],

  createdAt, updatedAt,
  deleted,                  // soft delete 플래그 (실제 삭제 없음)
}
```

## 하위 구조

```
salesStep      { stage, status, plannedAt, completedAt, owner, memo }

firstMeeting   { status, plannedDate, time, place, attendees, internalOwner,
                 content, customerReaction, requests, remarks,
                 followUp, nextSchedule, internalMemo }

secondMeeting  { status, plannedDate, time, place, attendees, internalOwner,
                 discussion, requestedDocs, customerOpinion, mouDiscussion,
                 followUp, internalMemo }

mou            { status, signedDate, periodFrom, periodTo, owner,
                 patentNumbers: [], relatedSites: [], note, documents: [] }

activity       { id, date, time, type, owner, content, followUp }
memo           { id, createdAt, author, important, content }
questionnaire  { status, sentAt, repliedAt, owner, items: [{ q, a }] }
performance    { id, siteName, region, workType, patentNumber, year, status, note }
revenue        { id, year, issuedAt, siteName, type, amount, status }
document       { id, name, category, size, uploadedAt, uploader }
```

## 설계 의도

- **1차/2차 미팅은 별도 구조.** 필드 집합이 다르므로 공통 `meetings[]`로 합치지 않는다.
  3차 이상이 필요해지면 `meetings[]` + `round` 필드로 확장한다.
- **활동이력은 append-only.** 미팅·MOU 등 다른 영역의 변화도 활동으로 남겨 하나의 timeline을 만든다.
- **매출/실적은 업체 하위 배열.** 규모가 커지면 별도 컬렉션(`revenues`, `performances`)으로 분리하고
  `companyCode`로 조인한다. 현재 서비스 계층(`revenueService`, `performanceService`)이
  이미 "평면 목록"을 반환하므로 화면 수정 없이 교체 가능하다.
- **삭제는 soft delete.** `deleted` + `status=DELETED`로만 표시하고 실제 레코드는 남긴다.
- **모든 상태값은 key로 저장하고 label은 화면에서만 사용**한다 (`src/data/constants.js`).

## 업체코드 규칙

```
형식     B2B + 3자리 순번 (B2B001)
부여     현재 최대번호 확인 → 다음 번호 생성 → 중복검사 → 저장
성격     업체명과 별개인 내부 식별자. 상호가 바뀌어도 코드는 유지된다.
상태     ASSIGNED(부여 완료) / RESERVED(자동생성 예정) / PENDING(미부여) / CONFLICT(중복 확인 필요)
```

## 중복검사 기준

| 기준 | 구분 | 비교 방식 |
| --- | --- | --- |
| 사업자번호 | 필수 | 완전일치 → 즉시 중복 판정 |
| 정규화 업체명 | 필수 | (주)·공백·특수문자 제거 후 비교 |
| 업체코드 | 보조 | 수동 입력 시에만 검사 |
| 대표자 | 보조 | 업체명 유사 시 가중치 |
| 전화번호 | 보조 | 숫자만 추출 후 비교 |
| 주소 | 참고 | 시·군·구 + 도로명 단위 비교 |

판정상태: `중복 없음` / `유사 업체 있음` / `사업자번호 중복` / `확인 필요`
