import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  MagnifyingGlass,
  MapPin,
  Buildings,
  CalendarBlank,
  BookmarkSimple,
  Sparkle,
  Heart,
  Star,
  ArrowSquareOut,
} from '@phosphor-icons/react'
// TODO(임시 연동 전환): 원래는 더미데이터(mocks/jobs.js)를 썼는데, 지금은
// 재정경제부_공공기관 채용정보 API로 실제로 가져온 데이터(mocks/jobsReal.js)를
// 대신 씁니다. 백엔드+DB 연동이 끝나면 이 줄을 지우고 fetch('/api/jobs')로
// 바꾸면 됩니다. (원본 더미데이터는 mocks/jobs.js에 그대로 남아있어서 언제든
// 아래 줄만 원래대로 되돌리면 복원 가능)
import { REAL_JOBS as DUMMY_JOBS } from '../../mocks/jobsReal.js'
import { usePreference } from '../../context/PreferenceContext.jsx'
import { JOB_CATEGORIES, SUB_JOBS_BY_CATEGORY } from '../../constants/jobCategories.js'

const ALL_REGION = '전체 지역'
const REMOTE_REGION = '원격/재택'

// 그룹 구분(특별시·광역시 / 도) 없이 17개 지역을 한 줄로 쭉 보여줌.
// value(필터링용 짧은 표기, job.location과 대조됨)와 label(드롭다운에 보여줄 공식
// 명칭)을 분리해뒀어요 — value를 '서울특별시'처럼 통째로 바꾸면 '서울 강남구' 같은
// 더미 location 문자열과 안 겹쳐서 검색 결과가 0건이 되니, 화면에 보이는 이름만 label로
// 바꿔서 씁니다.
const REGIONS = [
  { value: '서울', label: '서울특별시' },
  { value: '부산', label: '부산광역시' },
  { value: '대구', label: '대구광역시' },
  { value: '인천', label: '인천광역시' },
  { value: '광주', label: '광주광역시' },
  { value: '대전', label: '대전광역시' },
  { value: '울산', label: '울산광역시' },
  { value: '세종', label: '세종특별자치시' },
  { value: '경기', label: '경기도' },
  { value: '강원', label: '강원특별자치도' },
  { value: '충북', label: '충청북도' },
  { value: '충남', label: '충청남도' },
  { value: '전북', label: '전북특별자치도' },
  { value: '전남', label: '전라남도' },
  { value: '경북', label: '경상북도' },
  { value: '경남', label: '경상남도' },
  { value: '제주', label: '제주특별자치도' },
]

// 경력 수준 필터 — 대분류/세부직무와는 별개 축이라 따로 뺌.
const CAREER_LEVELS = ['신입', '인턴']

// 채용공고 리스트 전용 페이지네이션 — 스마트픽/필터 영역은 이 값과 무관하게
// 항상 그대로 있고, 리스트 섹션만 이 크기로 잘려서 페이지가 바뀜.
const JOBS_PER_PAGE = 10

// deadline('YYYY-MM-DD' | '상시채용')을 스마트픽 리스트용 'D-N' 표기로 변환.
// 오늘 날짜 기준으로 매번 계산되므로 새로고침할 때마다 자동으로 갱신됨.
function formatDday(deadline) {
  if (deadline === '상시채용') return '상시채용'
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return '마감'
  return diff === 0 ? '오늘마감' : `D-${diff}`
}

export default function Jobs() {
  const [keyword, setKeyword] = useState('')
  const [region, setRegion] = useState(ALL_REGION)
  // 대분류 -> 세부직무 -> 지역 -> 경력, 4단계로 하나씩 눌러서 좁혀가는 필터.
  // 대분류가 바뀌면 세부직무 목록 자체가 달라지므로, 대분류를 바꾸거나 해제할 때
  // activeSubJob도 같이 초기화함(아래 handleCategoryClick 참고).
  const [activeCategory, setActiveCategory] = useState(null)
  const [activeSubJob, setActiveSubJob] = useState(null)
  const [careerLevel, setCareerLevel] = useState(null)

  const handleCategoryClick = (category) => {
    const isActive = activeCategory === category
    setActiveCategory(isActive ? null : category)
    setActiveSubJob(null) // 대분류가 바뀌면 이전 대분류의 세부직무 선택은 의미가 없어짐
  }

  const filteredJobs = useMemo(() => {
    const trimmed = keyword.trim()
    return DUMMY_JOBS.filter((job) => {
      const matchesKeyword =
        trimmed === '' || job.title.includes(trimmed) || job.company.includes(trimmed)
      const matchesRegion = region === ALL_REGION || job.location.includes(region)
      const matchesCategory = !activeCategory || job.category === activeCategory
      const matchesSubJob =
        !activeSubJob || job.subJob === activeSubJob || job.subJob === '직무공통'
      const matchesCareer = !careerLevel || job.type.includes(careerLevel)
      return matchesKeyword && matchesRegion && matchesCategory && matchesSubJob && matchesCareer
    })
  }, [keyword, region, activeCategory, activeSubJob, careerLevel])

  // 채용공고 리스트 페이지네이션. 필터 조건이 바뀌어서 결과가 달라지면 1페이지로
  // 되돌아감 — 그래야 필터 바꿨는데 화면엔 없는 4페이지에 머물러서 "결과 없음"처럼
  // 보이는 상황을 방지함.
  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [keyword, region, activeCategory, activeSubJob, careerLevel])

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE))
  const pagedJobs = useMemo(
    () => filteredJobs.slice((page - 1) * JOBS_PER_PAGE, page * JOBS_PER_PAGE),
    [filteredJobs, page]
  )

  // preferredCategory = 적성 검사 60% + 채팅 분석 40%로 계산된 "선호 추천 분야".
  // AppLayout에 올려둔 PreferenceProvider를 앱 내 모든 화면이 같이 구독하기 때문에,
  // 마이페이지 쪽에서 검사/채팅 결과가 반영돼 이 값이 바뀌면 이 페이지를 벗어나지
  // 않아도(혹은 나중에 다시 들어와도) 아래 smartPickJobs가 자동으로 다시 계산됨.
  const { preferredCategory, setTestResult } = usePreference()

  // 관심 직무와 일치하는 공고를 앞으로 정렬한 뒤 3건만 자름 — 해당 카테고리 공고가
  // 3건 미만이어도 나머지 공고로 채워져서 항상 3건이 나오도록 함(더미가 "많아야"
  // 하는 건 아니고, 보여주려는 카테고리에 최소 3건만 있으면 충분 — 지금 mocks/jobs.js엔
  // 4개 직무 카테고리 전부 3건씩 있어서 어떤 걸 골라도 실제로 그 직무 공고 3개가 뜸).
  const smartPickJobs = useMemo(() => {
    const matched = DUMMY_JOBS.filter((job) => job.category === preferredCategory)
    const rest = DUMMY_JOBS.filter((job) => job.category !== preferredCategory)
    return [...matched, ...rest].slice(0, 3)
  }, [preferredCategory])

  return (
    <div className="space-y-6">
      {/* 히어로 배너 — 브랜드 팔레트(ink → coral) 그라디언트로 참고 이미지의 구성을 재해석 */}
      <section className="relative overflow-hidden rounded-card bg-ink p-8 shadow-2 sm:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(120deg, #141413 0%, #2B2B2A 45%, #9A3A0A 100%)' }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-pill bg-white/15 px-3 py-1 text-eyebrow text-white">
              취업 준비를 한 번에
            </span>
            <h1 className="mt-4 text-h2 text-white sm:text-h2-md">
              자신에게 맞는 공고를
              <br />
              빠르게 찾아보세요.
            </h1>
            <p className="mt-3 text-body text-white/70">
              직무 키워드와 지역을 입력하면 신입·인턴 중심의 채용정보를 빠르게 검색할 수 있습니다.
            </p>
          </div>
          <div className="hidden h-28 w-28 shrink-0 flex-col items-center justify-center rounded-card bg-white/15 text-center text-white sm:flex">
            <Briefcase size={28} weight="bold" aria-hidden="true" />
            <span className="mt-1 text-h3">JOB</span>
            <span className="text-footer text-white/60">API 테스트 연동중</span>
          </div>
        </div>
      </section>

      {/* 검색 / 필터 */}
      <section className="rounded-card bg-white p-6 shadow-1 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="text-nav text-ink">키워드</span>
            <div className="mt-2 flex items-center gap-2 rounded-btn border-[1.5px] border-taupe px-4 py-2.5 focus-within:border-ink">
              <MagnifyingGlass size={18} className="shrink-0 text-slate" aria-hidden="true" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 개발자, 마케팅, 영상편집"
                className="w-full bg-transparent text-body text-ink placeholder:text-taupe focus:outline-none"
              />
            </div>
          </label>

          <label className="sm:w-48">
            <span className="text-nav text-ink">지역</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-2 w-full rounded-btn border-[1.5px] border-taupe bg-white px-4 py-2.5 text-body text-ink focus:border-ink focus:outline-none"
            >
              <option value={ALL_REGION}>{ALL_REGION}</option>
              {REGIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
              <option value={REMOTE_REGION}>{REMOTE_REGION}</option>
            </select>
          </label>

          <button type="button" className="btn-accent sm:w-auto">
            공고 검색
          </button>
        </div>

        {/* 1단계: 대분류 */}
        <div className="mt-4">
          <span className="text-footer text-slate">대분류</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {JOB_CATEGORIES.map((c) => {
              const isActive = activeCategory === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCategoryClick(c)}
                  aria-pressed={isActive}
                  className={`rounded-pill border-[1.5px] px-4 py-1.5 text-nav transition-colors ${
                    isActive
                      ? 'border-ink bg-ink text-white'
                      : 'border-taupe bg-white text-ink hover:border-ink'
                  }`}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* 2단계: 세부직무 — 대분류를 골라야만 나타남(그 대분류 안의 세부직무 목록) */}
        {activeCategory && (
          <div className="mt-4">
            <span className="text-footer text-slate">세부직무</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUB_JOBS_BY_CATEGORY[activeCategory].map((sub) => {
                const isActive = activeSubJob === sub
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setActiveSubJob(isActive ? null : sub)}
                    aria-pressed={isActive}
                    className={`rounded-pill border-[1.5px] px-3 py-1 text-footer transition-colors ${
                      isActive
                        ? 'border-coral bg-coral text-white'
                        : 'border-taupe bg-white text-ink hover:border-coral'
                    }`}
                  >
                    {sub}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 3단계: 경력 (지역은 위쪽 드롭다운에서 이미 선택) */}
        <div className="mt-4">
          <span className="text-footer text-slate">경력</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {CAREER_LEVELS.map((c) => {
              const isActive = careerLevel === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCareerLevel(isActive ? null : c)}
                  aria-pressed={isActive}
                  className={`rounded-pill border-[1.5px] px-4 py-1.5 text-nav transition-colors ${
                    isActive
                      ? 'border-ink bg-ink text-white'
                      : 'border-taupe bg-white text-ink hover:border-ink'
                  }`}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* 스마트픽 — 관심 직무 기반 TOP 3 추천 */}
      <section className="rounded-card bg-white p-6 shadow-1 sm:p-8">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-2 text-nav text-ink">
            <Sparkle size={18} weight="fill" className="text-coral" aria-hidden="true" />
            스마트픽
          </p>
          <span className="rounded-pill bg-coral-bg px-3 py-1 text-footer text-coral-deep">
            {preferredCategory} 맞춤 TOP 3
          </span>
        </div>

        {/* TODO(임시 테스트용): 지금은 적성 검사·채팅 화면이 실제로 연동되기 전이라
            여기서 칩을 눌러 setTestResult를 직접 호출해 preferredCategory를 흉내
            내볼 수 있게 해둠. 검사/채팅 연동이 끝나면 이 칩 대신 그쪽 화면에서
            setTestResult / setChatResult를 호출하게 되고, 여기 칩은 지워도 됨. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-footer text-slate">선호 추천 분야 (테스트용)</span>
          {JOB_CATEGORIES.map((c) => {
            const isActive = preferredCategory === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setTestResult(c)}
                aria-pressed={isActive}
                className={`rounded-pill border-[1.5px] px-3 py-1 text-footer transition-colors ${
                  isActive
                    ? 'border-coral bg-coral text-white'
                    : 'border-taupe bg-white text-ink hover:border-coral'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>

        <div className="divide-y divide-canvas-lift">
          {smartPickJobs.map((job) => (
            <div key={job.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-btn bg-canvas-lift text-nav text-ink-soft"
                aria-hidden="true"
              >
                {job.company.replace(/[()]/g, '').slice(0, 2)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-footer text-slate">
                  {job.company}
                  <Heart size={12} className="text-taupe" aria-hidden="true" />
                </p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-body text-ink">
                  {job.title}
                  <Star size={12} className="shrink-0 text-taupe" aria-hidden="true" />
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-footer text-slate">
                  <span>{job.type}</span>
                  <span>{job.location}</span>
                </div>
              </div>

              <span className="shrink-0 text-footer text-taupe">{formatDday(job.deadline)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 채용공고 리스트 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow-label">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" />
            채용공고 {filteredJobs.length}건
          </p>
          <p className="text-footer text-taupe">* 공공기관 채용정보 API 실제 데이터 (테스트 연동)</p>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-card bg-white p-10 text-center shadow-1">
            <p className="text-body text-slate">조건에 맞는 공고가 없어요. 키워드나 지역을 바꿔보세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pagedJobs.map((job) => (
              <article
                key={job.id}
                role={job.url ? 'link' : undefined}
                tabIndex={job.url ? 0 : undefined}
                onClick={() => {
                  if (job.url) window.open(job.url, '_blank', 'noopener,noreferrer')
                }}
                onKeyDown={(e) => {
                  if (job.url && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    window.open(job.url, '_blank', 'noopener,noreferrer')
                  }
                }}
                className={`rounded-card bg-white p-6 shadow-1 transition-transform duration-150 hover:-translate-y-0.5 sm:p-8 ${
                  job.url ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-footer text-slate">
                      <Buildings size={14} aria-hidden="true" />
                      {job.company}
                    </p>
                    <h2 className="mt-1 flex items-center gap-1.5 text-h3 text-ink">
                      {job.title}
                      {job.url && (
                        <ArrowSquareOut
                          size={16}
                          className="shrink-0 text-taupe"
                          aria-hidden="true"
                        />
                      )}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-footer text-slate">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} aria-hidden="true" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarBlank size={14} aria-hidden="true" />
                        마감 {job.deadline}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="공고 저장"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 rounded-full p-2 text-taupe transition-colors hover:bg-canvas-lift hover:text-ink"
                  >
                    <BookmarkSimple size={20} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-pill bg-coral-bg px-3 py-1 text-footer text-coral-deep">
                    {job.type}
                  </span>
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-pill bg-canvas-lift px-3 py-1 text-footer text-ink-soft"
                    >
                      {tag}
                    </span>
                  ))}

                  {job.url && (
                    <span className="ml-auto flex items-center gap-1 text-footer font-medium text-coral">
                      지원하러 가기
                      <ArrowSquareOut size={14} aria-hidden="true" />
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* 페이지네이션 — 리스트 섹션 안에서만 동작. 위쪽 스마트픽/검색·필터 영역은
            그대로 있고 이 카드 목록만 페이지가 바뀜. */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-btn border-[1.5px] border-taupe px-3 py-1.5 text-nav text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={page === p ? 'page' : undefined}
                className={`h-9 w-9 rounded-btn border-[1.5px] text-nav transition-colors ${
                  page === p
                    ? 'border-ink bg-ink text-white'
                    : 'border-taupe bg-white text-ink hover:border-ink'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-btn border-[1.5px] border-taupe px-3 py-1.5 text-nav text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </section>

      {/* API 연동 안내 */}
      <section className="rounded-card bg-canvas-lift p-6 text-center shadow-1 sm:p-8">
        <p className="text-body text-slate">
          공공기관 채용정보 API(재정경제부)를 테스트 연동해 위 목록을 실제 공고로 채우고 있어요. 원티드 등 민간
          채용공고 API가 승인되면 함께 합쳐질 예정입니다.
        </p>
      </section>
    </div>
  )
}
