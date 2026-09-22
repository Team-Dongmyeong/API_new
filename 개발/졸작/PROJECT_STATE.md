# 마음잇기 — PROJECT_STATE

> 최종 갱신: 2026-09-07 · 저장소: `C:\Git\capstone_project`
> 새 대화를 열 때는 이 파일부터 읽고 시작할 것. 대화 로그 옮겨적기 금지 — 항상 압축된 최신 상태만 유지.

## 1. 현재 아키텍처

- 프론트엔드만 구현 중 (React 18 + Vite 5 + react-router-dom 6, 아이콘은 `@phosphor-icons/react`). 백엔드(FastAPI)/DB(Supabase+pgvector)/LLM(GPT-4o mini RAG)는 아직 코드 없음 — `마음잇기_개발_로드맵.md`(Project Knowledge) 기준 2단계 이후 작업.
- 스타일링: Tailwind 3, `tailwind.config.js`에 커스텀 디자인 토큰 정의(`bg-ink`, `text-canvas`, `rounded-card`, `text-h2` 등). 공통 버튼/라벨 클래스는 `src/index.css`에 `.btn-primary`(검정) / `.btn-secondary`(아웃라인) / `.btn-accent`(coral 배경, 흰 텍스트 — 로그인/회원가입처럼 "지금 바로 행동" CTA 전용) / `.eyebrow-label`로 정리.
- 라우팅(`src/App.jsx`): `/`(Landing), `/login`, `/signup`, `/home/*`(로그인 후 영역, `AppLayout` 하위에 `chat`/`jobs`/`mypage` 중첩 라우트, index는 `chat`으로 리다이렉트).
- 인증: 백엔드가 아직 없어 `src/context/AuthContext.jsx`의 모의(mock) 인증으로 대체. `login({ email, name })` 호출 시 사용자 정보를 localStorage(`maeum:auth-user`)에 저장하고, `AppLayout`이 `isAuthenticated`가 false면 `/login`으로 리다이렉트하는 방식으로 `/home/*` 라우트를 보호. 실제 인증 API 연동 시 `AuthContext.jsx`의 `login`/`logout` 내부만 교체하면 됨.
- 페이지 구성(`src/pages/Landing.jsx`): `Header → HomeBanner → ServiceIntro → TrustSection → BottomCTA → Footer` 순서로 조립.
- `Login.jsx` / `Signup.jsx`도 랜딩과 동일한 `Header` + `Footer` 사이에 폼 섹션을 배치하는 구조로 통일(참고: itdaa `/users/sign_in`, `/users/sign_up` 패턴) — 이전처럼 헤더/푸터 없이 화면 전체를 덮는 독립 카드 화면이 아님. 별도의 "홈으로 돌아가기" 버튼은 제거하고 Header의 로고 링크로 대체.
- `Header.jsx`는 "로그인 전" 랜딩·인증 페이지 공용 상단바(검색창 + 로그인 전 기능 메뉴: 대화시작/감정케어/직무매칭/채용정보 + AI 진단검사 드롭다운) — 로그인 후 전용 메뉴바는 별도 컴포넌트 `src/components/AppHeader.jsx`로 분리되어 있음(채팅/채용공고/마이페이지 NavLink + 로그아웃 버튼).
- `ServiceIntro.jsx`(랜딩의 "어떻게 이어지나요" 섹션)는 스크롤 위치에 직접 연동되는 등장 애니메이션 적용 — `src/hooks/useScrollProgress.js`(스크롤 이벤트마다 요소의 뷰포트 통과 진행도 0~1을 재계산, 한 번만 재생되지 않고 위/아래 스크롤 모두에 반응). 헤드라인은 짧은 구간(뷰포트 95%~60%)에서 빠르게, 3개 원+화살표는 조금 더 늦게 시작해 더 긴 구간(85%~40%)에 걸쳐 스태거링되며 채워짐. 이전에 만들었던 `src/hooks/useInView.js`(1회성 IntersectionObserver 훅)는 이제 미사용 — 다른 곳에 쓸 계획 없으면 정리 대상.
- 참고 문서: 저장소 루트의 `getdesign.md`(디자인 레퍼런스, itdaa 사이트 UI 패턴 기반)와 Project Knowledge의 `구성도.png`(시스템 구성도), 결과보고서 PDF들.

## 2. 완료된 작업

- Landing 페이지 전체 섹션 조립 완료(Header/HomeBanner/ServiceIntro/TrustSection/BottomCTA/Footer).
- `HomeBanner.jsx`: 3슬라이드 배너 캐러셀 자체 구현(외부 라이브러리 미사용). 실사용 이미지 3장 적용 완료 — `src/assets/banner-chat.webp`(대화), `banner-emotion.webp`(감정 케어/상담), `banner-jobs.webp`(채용정보). 5초 자동 전환 + hover/focus 시 정지, `prefers-reduced-motion` 대응. 클론 슬라이드 기반 완전 무한 루프, 전환 중 재입력 크래시 수정, 자식 요소 `transitionend` 버블링 오작동 수정 완료.
- `ServiceIntro.jsx` 스크롤 등장 애니메이션 적용 — 헤드라인 페이드업, 3개 원 스태거 등장, 화살표 clip-path 드로잉, 스크롤 양방향 재생 대응(위 "1. 현재 아키텍처" 참고).
- `Login.jsx` / `Signup.jsx` 실제 폼 구현 완료 — 이메일/비밀번호(+회원가입은 이름/비밀번호 확인/약관 동의) 클라이언트 검증, 에러 메시지, 제출 시 `AuthContext.login()` 호출 후 `/home`으로 이동. 랜딩과 동일한 Header/Footer 레이아웃으로 통일, 제출 버튼은 `.btn-accent`(coral) 적용. 기존 "준비 중이에요" 자리표시자 화면은 완전히 제거됨.
- 로그인 후 첫 화면(`/home/*`) 골격 완성: `AppLayout.jsx`(비로그인 접근 시 `/login` 리다이렉트) + `AppHeader.jsx`(채팅/채용공고/마이페이지 NavLink, 활성 탭 하이라이트, 로그아웃) + 하위 페이지 `Chat.jsx`/`Jobs.jsx`/`MyPage.jsx`(자리표시자 콘텐츠, `MyPage`는 로그인된 사용자 이름/이메일 표시).

## 3. 주요 결정 사항

- 캐러셀은 슬릭(slick) 등 외부 라이브러리 대신 직접 구현(트랙 translateX 방식 + 클론 슬라이드로 무한 루프).
- 이미지 자산은 1200px 폭 WebP로 통일, 어두운 배경(`bg-ink`)에 바로 얹는 형태로 카드/프레임 없이 사용.
- 상태관리는 Context API로 시작(`AuthContext`) — 채팅 세션/유저 정보 정도만 전역화하면 충분하다는 기존 판단대로, 실제 인증 백엔드 붙기 전까지는 localStorage 기반 모의 로그인으로 대체.
- 로그인/회원가입은 백엔드 인증 API가 없는 상태라 서버 검증 없이 "형식만 맞으면 통과"하는 모의 처리 — FastAPI 인증 붙일 때 `AuthContext.jsx`만 교체 대상.
- 로그인/회원가입 페이지는 헤더/푸터 없는 독립 전체화면 카드 대신, 랜딩과 동일한 Header/Footer 사이에 섹션으로 끼워 넣는 구조로 변경(itdaa 참고). 브랜드 CTA 색상은 기존 `coral`(#CF4500, 흰 배경 대비 4.6:1로 WCAG AA 충족) 토큰을 재활용해 `.btn-accent`로 새로 정의 — 완전히 새 색상을 추가하지 않고 기존 디자인 토큰 안에서 해결. 현재는 로그인/회원가입 제출 버튼에만 적용했고, 랜딩의 다른 CTA(BottomCTA 등)까지 검정 대신 coral로 바꿀지는 아직 결정 안 됨 — 확대 적용은 별도 논의 필요.
- 모델/데이터셋 관련 스플릿 비율, 패키지 선정 등은 백엔드 단계 착수 전이라 아직 미정.

## 4. 다음 작업 (Todo)

- [ ] `Chat.jsx`에 실제 채팅 UI(메시지 리스트/입력창) 붙이기 — 현재는 안내 문구만 있는 자리표시자. 백엔드(kcELECTRA/SBERT + RAG) 연동 전까지는 UI만 우선 구현 가능.
- [ ] `Jobs.jsx`에 채용공고 리스트/카드 UI 붙이기 — 현재는 안내 문구만 있는 자리표시자.
- [ ] `MyPage.jsx`에 진단 결과/자기소개서 피드백 이력/관심 기업 관리 등 실제 섹션 추가.
- [ ] 실제 인증 API(FastAPI) 연동 시 `AuthContext.jsx`의 `login`/`logout`을 서버 호출로 교체하고, 토큰 저장 방식(httpOnly 쿠키 등) 재검토 필요 — 지금은 데모용으로 localStorage에 사용자 정보만 저장.
- [ ] `.btn-accent`(coral CTA)를 로그인/회원가입 외 다른 곳(BottomCTA 등)까지 확대 적용할지 결정 필요.
- [ ] 미사용 파일 정리(로컬에서 수동 삭제 필요 — 이 환경은 삭제 권한 없음): `src/components/ThemeToggle.jsx`, `src/hooks/useDarkMode.js`, `src/components/Hero.jsx`, `src/components/HomeBanner-1.jsx`, `src/assets/banner-chat.jpg`, `src/assets/banner-chat-dark.webp`, `src/hooks/useInView.js`(ServiceIntro가 useScrollProgress로 교체되며 미사용).
- [ ] `README.md`의 파일 트리가 최신 구조(HomeBanner.jsx, AuthContext.jsx, pages/app/*, hooks/* 등 반영 안 됨)와 어긋남 — 갱신 필요.
- [ ] 이후 로드맵(백엔드 FastAPI 모델 서빙 → Supabase/RAG → GPT-4o mini 연동 → 채용공고 API → 배포)은 `마음잇기_개발_로드맵.md` 참고, 아직 착수 전.
