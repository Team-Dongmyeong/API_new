// 세부 직무별 스마트픽 예시 공고입니다. 실제 채용 API 연결 시 같은 roleId만
// 응답 데이터에 매핑하면 화면 로직을 바꾸지 않고 교체할 수 있습니다.
const makeJob = (id, company, title, location, category, roleId, type, deadline) => ({
  id: `smart-${id}`,
  company,
  title,
  location,
  category,
  roleId,
  type,
  deadline,
})

export const SMART_PICK_JOBS = [
  makeJob(1, '아틀리에누아', '신입 패션 디자이너', '서울 성동구', '디자인', 'fashion-designer', '신입', '2026-10-18'),
  makeJob(2, '모드컴퍼니', '여성복 패션 디자이너', '서울 강남구', '디자인', 'fashion-designer', '신입', '2026-10-25'),
  makeJob(3, '스튜디오웨어', '패션 디자인 인턴', '서울 동대문구', '디자인', 'fashion-designer', '인턴', '상시채용'),
  makeJob(4, '페이지앤코', '브랜드 편집 디자이너', '서울 마포구', '디자인', 'editorial-designer', '신입', '2026-10-20'),
  makeJob(5, '그래픽룸', '출판·편집 디자이너', '경기 성남시', '디자인', 'editorial-designer', '신입', '2026-10-28'),
  makeJob(6, '오브젝트프레스', '콘텐츠 편집 디자인 인턴', '인천 연수구', '디자인', 'editorial-designer', '인턴', '상시채용'),

  makeJob(7, '픽셀웨이브', 'React 프론트엔드 개발자', '서울 강남구', 'IT·개발', 'frontend-developer', '신입', '2026-10-22'),
  makeJob(8, '플로우랩', '웹 프론트엔드 엔지니어', '경기 성남시', 'IT·개발', 'frontend-developer', '신입', '상시채용'),
  makeJob(9, '브릿지소프트', '프론트엔드 개발 인턴', '원격/재택', 'IT·개발', 'frontend-developer', '인턴', '2026-10-30'),
  makeJob(10, '데이터웍스', 'Java 백엔드 개발자', '서울 구로구', 'IT·개발', 'backend-developer', '신입', '2026-10-19'),
  makeJob(11, '클라우드핀', 'Node.js 서버 개발자', '서울 영등포구', 'IT·개발', 'backend-developer', '신입', '상시채용'),
  makeJob(12, '코어시스템', '백엔드 개발 인턴', '인천 부평구', 'IT·개발', 'backend-developer', '인턴', '2026-10-27'),

  makeJob(13, '브랜드스토리', '콘텐츠 마케터', '서울 마포구', '마케팅', 'content-marketer', '신입', '2026-10-21'),
  makeJob(14, '소셜메이트', 'SNS 콘텐츠 마케터', '서울 성동구', '마케팅', 'content-marketer', '신입', '상시채용'),
  makeJob(15, '메시지랩', '브랜드 콘텐츠 인턴', '부산 해운대구', '마케팅', 'content-marketer', '인턴', '2026-10-29'),
  makeJob(16, '그로스웨이', '퍼포먼스 마케터', '서울 강남구', '마케팅', 'performance-marketer', '신입', '2026-10-17'),
  makeJob(17, '애드인사이트', '디지털 광고 운영 담당자', '서울 서초구', '마케팅', 'performance-marketer', '신입', '상시채용'),
  makeJob(18, '클릭데이터', '퍼포먼스 마케팅 인턴', '경기 고양시', '마케팅', 'performance-marketer', '인턴', '2026-10-31'),

  makeJob(19, '컷앤씬', '유튜브 영상 편집자', '서울 용산구', '콘텐츠·영상', 'video-editor', '신입', '2026-10-23'),
  makeJob(20, '프레임웍스', '숏폼 영상 편집자', '원격/재택', '콘텐츠·영상', 'video-editor', '신입', '상시채용'),
  makeJob(21, '모션스튜디오', '영상 편집 인턴', '경기 고양시', '콘텐츠·영상', 'video-editor', '인턴', '2026-10-26'),
  makeJob(22, '크리에이티브온', '디지털 콘텐츠 기획자', '서울 마포구', '콘텐츠·영상', 'content-planner', '신입', '2026-10-24'),
  makeJob(23, '채널메이커', '유튜브 콘텐츠 기획자', '서울 영등포구', '콘텐츠·영상', 'content-planner', '신입', '상시채용'),
  makeJob(24, '스토리팩토리', '콘텐츠 기획 인턴', '인천 남동구', '콘텐츠·영상', 'content-planner', '인턴', '2026-11-02'),
]
