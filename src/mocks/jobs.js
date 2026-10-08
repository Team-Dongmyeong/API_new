// 채용공고 데이터 — 재정경제부_공공기관 채용정보 API에서 실제로 가져온 데이터를
// jobsReal.js에서 그대로 가져와 씁니다. 더미데이터는 완전히 제거했습니다.
//
// 갱신 방법: job-fetch 폴더에서 `python fetch_jobs_to_mock.py`를 다시 실행하면
// jobsReal.js가 최신 공고로 갱신되고, 이 파일은 손댈 필요 없이 자동으로 반영됩니다.
//
// 백엔드 + DB 연동이 끝나면 이 파일 자체를 지우고, Jobs.jsx에서 fetch('/api/jobs')로
// 바로 받아오도록 바꾸면 됩니다.
export { REAL_JOBS as DUMMY_JOBS } from './jobsReal.js'
