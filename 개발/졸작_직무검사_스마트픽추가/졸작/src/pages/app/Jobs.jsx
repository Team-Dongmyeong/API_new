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
} from '@phosphor-icons/react'
import { DUMMY_JOBS } from '../../mocks/jobs.js'
import { SMART_PICK_JOBS } from '../../mocks/smartPickJobs.js'
import { JOB_ROLES, useJobPreference } from '../../features/jobPreference.js'
import JobPreferenceAssessment from '../../components/JobPreferenceAssessment.jsx'

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

const CATEGORIES = ['신입', '인턴', 'IT·개발', '디자인', '마케팅', '콘텐츠·영상']

// 스마트픽 "관심 직무" 선택용 — CATEGORIES에서 경력 수준('신입'/'인턴')을 뺀 순수 직무만.
const JOB_CATEGORIES = ['IT·개발', '디자인', '마케팅', '콘텐츠·영상']

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
  const [activeCategory, setActiveCategory] = useState(null)
  const { result: preferenceResult } = useJobPreference()

  const filteredJobs = useMemo(() => {
    const trimmed = keyword.trim()
    return DUMMY_JOBS.filter((job) => {
      const matchesKeyword =
        trimmed === '' || job.title.includes(trimmed) || job.company.includes(trimmed)
      const matchesRegion = region === ALL_REGION || job.location.includes(region)
      const matchesCategory =
        !activeCategory || job.category === activeCategory || job.type === activeCategory
      return matchesKeyword && matchesRegion && matchesCategory
    })
  }, [keyword, region, activeCategory])

  // interestedCategory를 state로 관리하기 때문에 값이 바뀌는 순간 아래 smartPickJobs가
  // 자동으로 재계산되고 화면이 실시간으로 갱신됨(별도의 "다시 불러오기" 로직 불필요).
  // TODO: KcELECTRA/SBERT 진단 결과 연동 후, 초기값(useState의 인자)을 사용자가 가장
  // 고민이 많은 것으로 추론된 직무 카테고리로 넣기. 지금은 칩을 눌러 수동으로 바꿀 수
  // 있게 해뒀고, 나중엔 "진단 결과 기본값 + 사용자가 원하면 직접 변경" 조합이 되면 됨.
  const [interestedCategory, setInterestedCategory] = useState(JOB_CATEGORIES[0])

  // 검사 답변 또는 채팅 분석 점수가 달라지면 추천 카테고리도 즉시 따라감.
  // 사용자는 아래 관심 직무 칩으로 결과를 잠시 직접 둘러볼 수도 있음.
  useEffect(() => {
    setInterestedCategory(preferenceResult.preferredCategory)
  }, [preferenceResult.preferredCategory])

  // 관심 직무와 일치하는 공고를 앞으로 정렬한 뒤 3건만 자름 — 해당 카테고리 공고가
  // 3건 미만이어도 나머지 공고로 채워져서 항상 3건이 나오도록 함(더미가 "많아야"
  // 하는 건 아니고, 보여주려는 카테고리에 최소 3건만 있으면 충분).
  const smartPickGroups = useMemo(() => {
    const roles = JOB_ROLES.filter((role) => role.category === interestedCategory).sort(
      (a, b) => preferenceResult.combinedScores[b.id] - preferenceResult.combinedScores[a.id],
    )

    return roles.map((role) => ({
      ...role,
      score: preferenceResult.combinedScores[role.id],
      jobs: SMART_PICK_JOBS.filter((job) => job.roleId === role.id).slice(0, 3),
    }))
  }, [interestedCategory, preferenceResult.combinedScores])

  const smartPickCount = smartPickGroups.reduce((count, group) => count + group.jobs.length, 0)

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
            <span className="text-footer text-white/60">API 연동 준비중</span>
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

        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const isActive = activeCategory === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(isActive ? null : c)}
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
      </section>

      {/* 직무 검사 결과는 스마트픽과 마이페이지 추천직업이 함께 구독함 */}
      <JobPreferenceAssessment />

      {/* 스마트픽 — 관심 직무 기반 TOP 3 추천 */}
      <section className="rounded-card bg-white p-6 shadow-1 sm:p-8">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-2 text-nav text-ink">
            <Sparkle size={18} weight="fill" className="text-coral" aria-hidden="true" />
            스마트픽
          </p>
          <span className="rounded-pill bg-coral-bg px-3 py-1 text-footer text-coral-deep">
            {interestedCategory} 맞춤 {smartPickCount}건
          </span>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-footer text-slate">관심 직무</span>
          {JOB_CATEGORIES.map((c) => {
            const isActive = interestedCategory === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setInterestedCategory(c)}
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

        <div className="space-y-6">
          {smartPickGroups.map((group) => (
            <div key={group.id}>
              <div className="mb-2 flex items-center justify-between border-b border-canvas-lift pb-2">
                <h3 className="text-body font-bold text-ink">{group.title} 공고 3개</h3>
                <span className="text-footer font-semibold text-coral-deep">통합 매칭 {group.score}점</span>
              </div>
              <div className="divide-y divide-canvas-lift">
                {group.jobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-4 py-4 first:pt-1 last:pb-0">
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
          <p className="text-footer text-taupe">* 실제 연동 전 예시 데이터입니다</p>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-card bg-white p-10 text-center shadow-1">
            <p className="text-body text-slate">조건에 맞는 공고가 없어요. 키워드나 지역을 바꿔보세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-card bg-white p-6 shadow-1 transition-transform duration-150 hover:-translate-y-0.5 sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-footer text-slate">
                      <Buildings size={14} aria-hidden="true" />
                      {job.company}
                    </p>
                    <h2 className="mt-1 text-h3 text-ink">{job.title}</h2>
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
                    className="shrink-0 rounded-full p-2 text-taupe transition-colors hover:bg-canvas-lift hover:text-ink"
                  >
                    <BookmarkSimple size={20} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* API 연동 안내 */}
      <section className="rounded-card bg-canvas-lift p-6 text-center shadow-1 sm:p-8">
        <p className="text-body text-slate">
          잡코리아·사람인 채용공고 API는 현재 발급 신청 후 승인 대기 중이에요. 연동이 완료되면 위 목록이 실제 공고로
          자동으로 채워집니다.
        </p>
      </section>
    </div>
  )
}
