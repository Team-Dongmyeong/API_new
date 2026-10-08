"""
채용공고 API -> 프론트엔드 목데이터 변환 스크립트
================================================================

목적: 재정경제부_공공기관 채용정보 조회서비스(/list)에서 우리 5개 카테고리별로
실제 공고를 가져와서, Jobs.jsx가 기대하는 것과 똑같은 모양(id/company/title/
subJob/location/category/type/tags/deadline)으로 바꾼 뒤
src/mocks/jobsReal.js 파일로 저장한다.

(고용24/워크넷 채용정보 API는 개인회원에게 사용 권한을 주지 않아서
"개인회원은 사용할 수 없는 OPEN-API입니다" 오류가 나는 것을 확인했고,
그래서 다시 이 소스(재정경제부 API)로 되돌렸다.)

이 파일은 "테스트용" 스크립트다 — 정식 백엔드가 생기기 전까지, 화면에 실제
데이터가 뜨는지 눈으로 확인하기 위한 용도. 나중에 백엔드 + DB가 생기면 이
로직은 배치 스케줄러 코드로 옮기고, 프론트는 이 파일 대신 백엔드 API를
fetch하도록 바뀐다.

사용법:
    pip install requests
    이 파일과 같은 폴더(job-fetch)에 있는 service_key.txt에 인증키가 이미
    들어있음. 그대로 실행:
        python fetch_jobs_to_mock.py

    성공하면 ../src/mocks/jobsReal.js 파일이 새로 생기거나 덮어써진다.
"""

import os
import sys
import json
import requests
from datetime import datetime

BASE_URL = "https://apis.data.go.kr/1051000/recruitment"

# 코드정의서 기준 NCS 대분류 코드 (우리 5개 카테고리 매핑). 카테고리 하나에 코드가
# 여러 개 걸리는 경우(예: 디자인 안의 패션디자이너는 NCS상 "섬유·의복"으로 분류됨)가
# 있어서 리스트로 관리 — 각 코드로 따로 조회한 뒤 중복(recrutPblntSn) 제거해서 합침.
NCS_CODES_BY_CATEGORY = {
    "IT/SW": ["R600020"],                # 정보통신
    "디자인": ["R600008", "R600018"],     # 문화·예술·디자인·방송 + 섬유·의복(패션디자이너)
    "공공·복지": ["R600007"],             # 사회복지·종교
    "식·음료": ["R600013", "R600021"],    # 음식서비스 + 식품가공(제과제빵사)
    "MD/상품기획": ["R600010", "R600002"],  # 영업판매 + 경영·회계·사무(마케팅 직군)
}

# 위 NCS 코드 -> 한글 라벨. src/constants/jobCategories.js의 NCS_GROUPS_BY_CATEGORY에
# 적어둔 문자열과 정확히 똑같아야 함(프론트에서 ncsGroup 값으로 그대로 비교/필터링하므로).
# 이 라벨이 곧 공고별 "ncsGroup" 필드 값이 되고, 대분류 안에 NCS 코드가 2개인
# 카테고리(디자인/식·음료/MD·상품기획)에서만 실제로 쓸모가 있는 구분값임.
NCS_CODE_LABELS = {
    "R600020": "정보통신",
    "R600008": "문화예술디자인방송",
    "R600018": "섬유의복",
    "R600007": "사회복지종교",
    "R600013": "음식서비스",
    "R600021": "식품가공",
    "R600010": "영업판매",
    "R600002": "경영회계사무",
}

# 카테고리당 최대 몇 건까지 가져올지. 실제로 그만큼 없는 카테고리는 있는 만큼만
# 가져옴(아래 totalCount 로그로 카테고리별 실제 최대치를 확인할 수 있음).
MAX_ROWS_PER_CATEGORY = 100
# 한 번의 API 호출로 요청할 건수(페이지당 건수) — 이 값을 넘게 필요하면 자동으로
# 다음 페이지를 추가 호출함.
PAGE_SIZE = 100

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "src", "mocks", "jobsReal.js"
)


def load_service_key() -> str:
    """이 스크립트와 같은 폴더의 service_key.txt에서 인증키를 읽어온다."""
    key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "service_key.txt")
    if not os.path.exists(key_path):
        sys.exit(
            f"[오류] {key_path} 파일이 없습니다.\n"
            f"이 스크립트와 같은 폴더에 'service_key.txt' 파일을 만들고,\n"
            f"채용정보 API 인증키만 한 줄로 붙여넣어주세요."
        )
    with open(key_path, "r", encoding="utf-8") as f:
        key = f.read().strip()
    if not key:
        sys.exit(f"[오류] {key_path} 파일이 비어있습니다. 인증키를 붙여넣어주세요.")
    return key


SERVICE_KEY = load_service_key()


def fetch_job_list_page(ncs_code: str, page_no: int, num_of_rows: int) -> tuple:
    """채용공시 목록조회(/list) 한 페이지 호출. (결과 리스트, totalCount) 반환.
    실패해도 예외 없이 ([], 0) 반환."""
    url = f"{BASE_URL}/list"
    params = {
        "serviceKey": SERVICE_KEY,
        "resultType": "json",
        "numOfRows": num_of_rows,
        "pageNo": page_no,
        "ongoingYn": "Y",
        "ncsCdLst": ncs_code,
    }
    try:
        res = requests.get(url, params=params, timeout=15)
        if res.status_code != 200:
            print(f"  ⚠ HTTP {res.status_code} — 응답 원문: {res.text[:200]}")
            return [], 0
        data = res.json()
    except Exception as e:
        print(f"  ⚠ 호출 실패: {e}")
        return [], 0

    if data.get("resultCode") != 200:
        print(f"  ⚠ API 오류: {data.get('resultMsg')}")
        return [], 0

    return data.get("result", []) or [], data.get("totalCount", 0) or 0


def fetch_job_list(ncs_code: str, max_rows: int) -> list:
    """totalCount를 보고 필요한 만큼 페이지를 이어서 호출해 최대 max_rows건까지 모음."""
    collected = []
    page_no = 1
    total_count = None

    while len(collected) < max_rows:
        remaining = max_rows - len(collected)
        page_size = min(PAGE_SIZE, remaining)
        items, total_count = fetch_job_list_page(ncs_code, page_no, page_size)
        if not items:
            break
        collected.extend(items)
        if total_count and len(collected) >= total_count:
            break
        page_no += 1

    if total_count is not None:
        print(f"  (이 카테고리에 현재 존재하는 전체 공고 수: {total_count}건)")

    return collected


def to_yyyy_mm_dd(ymd: str) -> str:
    """'20261013' -> '2026-10-13'. 값이 없으면 '상시채용'."""
    if not ymd or len(ymd) != 8:
        return "상시채용"
    try:
        return datetime.strptime(ymd, "%Y%m%d").strftime("%Y-%m-%d")
    except ValueError:
        return "상시채용"


def clean_url(raw_url) -> str:
    """API의 srcUrl이 빈 문자열이 아니라 '없음'/'없음.'/'해당없음'/'.' 같은 안내
    텍스트로 오는 경우가 실제로 있음(예: 한전KDN 공고들 — 기관이 공식 지원
    URL 대신 문의처 안내만 남긴 경우). 이런 값을 그대로 job.url에 넣으면
    프론트가 "링크가 있다"고 착각해서 버튼/카드를 클릭 가능하게 만드는데,
    실제로는 유효한 주소가 아니라서 눌러도 아무 데도 안 넘어가는 문제가 생김.
    그래서 http(s)로 시작하는 진짜 URL만 통과시키고, 나머지는 전부 빈 문자열로
    바꿔서 프론트(Jobs.jsx)가 "URL 없음"으로 올바르게 처리하게 함(링크/버튼을
    아예 안 보여줌)."""
    cleaned = (raw_url or "").strip()
    if cleaned.lower().startswith("http"):
        return cleaned
    return ""


# 37개 세부직무 키워드 매칭표 — src/constants/jobCategories.js의 SUB_JOBS_BY_CATEGORY와
# 같은 체계를 따름. 공공기관 채용정보 API는 세부직무를 따로 안 줘서, 공고 제목에
# 이 키워드가 들어있으면 그 세부직무로 추정하는 방식(완벽하진 않음 — 대부분의
# 공공기관 공고는 "일반행정/사무" 같은 포괄적인 제목이라 '직무공통'으로 떨어지는
# 경우가 많고, 그게 정상임).
SUBJOB_KEYWORDS = {
    "IT/SW": {
        "백엔드개발자": ["백엔드", "서버개발", "backend"],
        "AI/ML 엔지니어": ["인공지능", "머신러닝", "딥러닝", " ai", "ai ", "ai엔지니어", "데이터사이언"],
        "QA": ["품질보증", "qa", "테스터", "품질관리"],
        "게임개발자": ["게임개발", "게임 프로그래머", "유니티", "언리얼"],
        "네트워크엔지니어": ["네트워크"],
        "시스템엔지니어": ["시스템엔지니어", "서버관리", "인프라"],
        "앱개발자": ["앱개발", "모바일개발", "안드로이드", "ios개발"],
        "웹개발자": ["웹개발", "홈페이지개발", "웹퍼블리셔"],
        "프론트엔드개발자": ["프론트엔드", "프론트 개발", "frontend"],
    },
    "디자인": {
        "UI/UX 디자이너": ["ui/ux", "ui 디자", "ux 디자", "ui디자", "ux디자"],
        "공간 디자이너": ["공간디자인", "공간 디자인", "전시디자인"],
        "광고 디자이너": ["광고디자인", "광고 디자인"],
        "그래픽 디자이너": ["그래픽디자인", "그래픽 디자인"],
        "시각 디자이너": ["시각디자인", "시각 디자인"],
        "실내 디자이너": ["실내디자인", "인테리어"],
        "웹 디자이너": ["웹디자인", "웹 디자인"],
        "제품 디자이너": ["제품디자인", "프로덕트 디자인"],
        "캐릭터 디자이너": ["캐릭터디자인", "캐릭터 디자인"],
        "패션 디자이너": ["패션디자인", "의상디자인"],
        "편집 디자이너": ["편집디자인", "출판디자인"],
    },
    "공공·복지": {
        "사회복지사": ["사회복지사", "복지사", "사회복지"],
    },
    "식·음료": {
        "바리스타": ["바리스타"],
        "셰프·주방장": ["셰프", "주방장"],
        "요리사": ["요리사"],
        "제과제빵사": ["제과", "제빵", "베이커리"],
        "조리사": ["조리사", "조리실무"],
        "카페·레스토랑 매니저": ["카페매니저", "레스토랑매니저", "매장관리자"],
        "홀 서버": ["홀서빙", "플로어스태프"],
    },
    "MD/상품기획": {
        "MD": [" md", "md ", "상품기획", "머천다이저"],
        "콘텐츠마케터": ["콘텐츠마케팅", "콘텐츠 마케터"],
        "홍보": ["홍보"],
        "온라인마케터": ["온라인마케팅", "디지털마케팅", "온라인 마케터"],
    },
}


def classify_subjob(title: str, category: str) -> str:
    """공고 제목에 포함된 키워드로 37개 세부직무 중 하나를 추정. 매칭 안 되면
    '직무공통'(대분류 안에서 특정 세부직무로 단정 짓기 어려운 공고)."""
    lowered = f" {(title or '').lower()} "
    for subjob, keywords in SUBJOB_KEYWORDS.get(category, {}).items():
        for kw in keywords:
            if kw.lower() in lowered:
                return subjob
    return "직무공통"


def transform(item: dict, category: str, ncs_group: str) -> dict:
    region_list = (item.get("workRgnNmLst") or "").split(",")
    region = region_list[0].strip() if region_list and region_list[0] else "지역 미정"

    tag_list = [t.strip() for t in (item.get("hireTypeNmLst") or "").split(",") if t.strip()]
    title = item.get("recrutPbancTtl") or "제목 없음"

    return {
        "id": item.get("recrutPblntSn"),
        "company": item.get("instNm") or "기관명 미상",
        "title": title,
        "subJob": classify_subjob(title, category),
        "location": region,
        "category": category,
        # 대분류 안에서 실제로 어떤 NCS 코드로 수집됐는지(추정이 아니라 사실 그대로).
        # jobCategories.js의 NCS_GROUPS_BY_CATEGORY 필터가 이 값으로 매칭함.
        "ncsGroup": ncs_group,
        "type": item.get("recrutSeNm") or "전체",
        "tags": tag_list[:2] if tag_list else ["공공기관"],
        "deadline": to_yyyy_mm_dd(item.get("pbancEndYmd")),
        "url": clean_url(item.get("srcUrl")),  # 실제 지원/채용 페이지 링크 ('없음'류 안내 텍스트는 빈 문자열로 정리)
    }


def main():
    all_jobs = []
    for category, ncs_codes in NCS_CODES_BY_CATEGORY.items():
        print(f"=== {category} ({', '.join(ncs_codes)}) 채용공고 조회 ===")
        seen_ids = set()
        # (raw, ncs_code) 쌍으로 담아서, 나중에 transform할 때 "이 공고가 어떤 NCS
        # 코드로 수집됐는지"(ncsGroup)를 잃어버리지 않게 함.
        category_items = []
        for ncs_code in ncs_codes:
            print(f"  [{ncs_code}] 최대 {MAX_ROWS_PER_CATEGORY}건 조회")
            raw_items = fetch_job_list(ncs_code, MAX_ROWS_PER_CATEGORY)
            new_count = 0
            for raw in raw_items:
                rid = raw.get("recrutPblntSn")
                if rid in seen_ids:
                    continue  # 코드 두 개에 동시에 걸리는 공고는 한 번만 담음(먼저 걸린 코드 기준)
                seen_ids.add(rid)
                category_items.append((raw, ncs_code))
                new_count += 1
            print(f"    -> {len(raw_items)}건 수신 ({new_count}건 신규)")

        print(f"  => {category} 합계 {len(category_items)}건")
        for raw, ncs_code in category_items:
            ncs_group = NCS_CODE_LABELS.get(ncs_code, ncs_code)
            all_jobs.append(transform(raw, category, ncs_group))

    if not all_jobs:
        sys.exit("[오류] 어떤 카테고리에서도 공고를 가져오지 못했습니다. 위 로그를 확인해주세요.")

    # 실제 지원 페이지로 연결되는 URL이 없는 공고(위 clean_url()이 "없음"/"해당없음"/
    # "." 같은 안내 텍스트를 빈 문자열로 정리해준 것들, 예: 한전KDN 일부 공고)는
    # 화면에서 클릭이 안 되는 채로 남느니, 아예 목록에서 빼기로 함 — "클릭하면
    # 실제 채용 페이지로 넘어가는 공고만 보여주자"는 결정.
    before_count = len(all_jobs)
    all_jobs = [job for job in all_jobs if job["url"]]
    dropped = before_count - len(all_jobs)
    if dropped:
        print(f"\n[안내] 실제 지원 URL이 없는 공고 {dropped}건을 목록에서 제외했습니다.")

    if not all_jobs:
        sys.exit("[오류] URL이 있는 공고가 하나도 없습니다. 위 로그를 확인해주세요.")

    js_content = (
        "// 자동 생성 파일 — fetch_jobs_to_mock.py 실행 결과 (재정경제부_공공기관 채용정보 API)\n"
        "// 이 파일은 임시 테스트용입니다. 백엔드 + DB 연동이 끝나면 이 파일은 삭제하고\n"
        "// Jobs.jsx가 백엔드 API를 직접 fetch하도록 바꾸면 됩니다.\n"
        f"// 생성 시각: {datetime.now().isoformat(timespec='seconds')}\n\n"
        "export const REAL_JOBS = "
        + json.dumps(all_jobs, ensure_ascii=False, indent=2)
        + ";\n"
    )

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"\n총 {len(all_jobs)}건 저장 완료: {os.path.abspath(OUTPUT_PATH)}")

    # 세부직무 분류 결과 요약 — 키워드 매칭이 얼마나 되는지 눈으로 확인할 수 있게.
    print("\n=== 세부직무 분류 결과 요약 ===")
    for category in NCS_CODES_BY_CATEGORY:
        cat_jobs = [j for j in all_jobs if j["category"] == category]
        if not cat_jobs:
            continue
        matched = sum(1 for j in cat_jobs if j["subJob"] != "직무공통")
        print(f"  {category}: {matched}/{len(cat_jobs)}건 세부직무 매칭됨")


if __name__ == "__main__":
    main()
