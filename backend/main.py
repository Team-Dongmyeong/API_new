import os
import time
import threading
import uuid
from datetime import datetime
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv, find_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

from prompts import SYSTEM_PROMPT

# 프로젝트 루트(capstone_project/.env)를 위로 올라가며 찾아서 로드.
# backend 폴더 안에서 uvicorn을 실행해도, 루트에 있는 .env를 그대로 찾습니다.
load_dotenv(find_dotenv())

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="마음잇기 Chat API")

# 로컬 개발 주소(Vite) + 배포된 Vercel 프론트 주소를 기본으로 허용.
# Render 배포 시 ALLOWED_ORIGINS 환경변수에 콤마(,)로 추가 주소를 넣으면
# (예: 다른 브랜치 프리뷰 배포 주소 등) 코드 수정 없이 늘릴 수 있음.
_default_origins = [
    "http://localhost:5173",
    "https://svhvun.vercel.app",
]
_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
allow_origins = _default_origins + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO: Supabase 연동 후 실제 DB로 교체 예정.
# 지금은 서버가 켜져 있는 동안만 세션별 대화 맥락을 메모리에 유지합니다
# (서버 재시작하면 사라짐 — 여러 대화 세션을 동시에 이어갈 수 있게 하기 위한
# 최소한의 구조이며, 감정/키워드 분석 결과 저장은 kcELECTRA/SBERT 서빙(/analyze)과
# Supabase가 붙는 다음 단계에서 이어집니다).
session_store: Dict[str, List[dict]] = {}


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # 없으면 새 세션으로 시작


class ChatResponse(BaseModel):
    session_id: str
    reply: str


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())

    history = session_store.get(session_id, [])
    history.append({"role": "user", "content": req.message})

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )
    reply = completion.choices[0].message.content

    history.append({"role": "assistant", "content": reply})
    session_store[session_id] = history

    return ChatResponse(session_id=session_id, reply=reply)


@app.get("/")
def root():
    return {"status": "ok", "service": "maeum-itgi backend"}


# ============================================================
# 채용공고 (/api/jobs) — job-fetch/fetch_jobs_to_mock.py가 로컬에서 하던 일
# (재정경제부_공공기관 채용정보 API 호출 + 가공)을 그대로 백엔드로 옮긴 것.
# 팀 회의에서 "채용공고 자체는 DB에 저장하지 않는다"고 정한 대로, DB 없이
# 요청이 올 때마다(단, 캐시 TTL 안에서는 캐시된 값을) 공공데이터 API를 직접
# 호출해서 그 자리에서 응답한다.
# ============================================================

# 공공데이터포털 서비스키. job-fetch/service_key.txt처럼 파일로 읽지 않고
# 환경변수로 받음 — 그 파일은 .gitignore로 막혀있어서 배포 서버엔 존재하지
# 않기 때문. Render "Environment" 탭에 JOB_API_SERVICE_KEY로 등록해야 함.
JOB_API_SERVICE_KEY = os.getenv("JOB_API_SERVICE_KEY", "")

JOB_API_BASE_URL = "https://apis.data.go.kr/1051000/recruitment"

# 코드정의서 기준 NCS 대분류 코드 (우리 5개 카테고리 매핑). fetch_jobs_to_mock.py와
# 완전히 동일한 값 — 프론트(src/constants/jobCategories.js)의 분류 체계와 맞춰야 함.
JOB_NCS_CODES_BY_CATEGORY = {
    "IT/SW": ["R600020"],
    "디자인": ["R600008", "R600018"],
    "공공·복지": ["R600007"],
    "식·음료": ["R600013", "R600021"],
    "MD/상품기획": ["R600010", "R600002"],
}

JOB_NCS_CODE_LABELS = {
    "R600020": "정보통신",
    "R600008": "문화예술디자인방송",
    "R600018": "섬유의복",
    "R600007": "사회복지종교",
    "R600013": "음식서비스",
    "R600021": "식품가공",
    "R600010": "영업판매",
    "R600002": "경영회계사무",
}

JOB_MAX_ROWS_PER_CATEGORY = 100
JOB_PAGE_SIZE = 100

JOB_SUBJOB_KEYWORDS = {
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


def _job_fetch_page(ncs_code: str, page_no: int, num_of_rows: int) -> tuple:
    """채용공시 목록조회(/list) 한 페이지 호출. (결과 리스트, totalCount) 반환.
    실패해도 예외 없이 ([], 0) 반환 — 한 카테고리 호출이 실패해도 나머지
    카테고리는 계속 처리되도록."""
    url = f"{JOB_API_BASE_URL}/list"
    params = {
        "serviceKey": JOB_API_SERVICE_KEY,
        "resultType": "json",
        "numOfRows": num_of_rows,
        "pageNo": page_no,
        "ongoingYn": "Y",
        "ncsCdLst": ncs_code,
    }
    try:
        res = requests.get(url, params=params, timeout=15)
        if res.status_code != 200:
            print(f"  ⚠ [jobs] HTTP {res.status_code} — {res.text[:200]}")
            return [], 0
        data = res.json()
    except Exception as e:
        print(f"  ⚠ [jobs] 호출 실패: {e}")
        return [], 0

    if data.get("resultCode") != 200:
        print(f"  ⚠ [jobs] API 오류: {data.get('resultMsg')}")
        return [], 0

    return data.get("result", []) or [], data.get("totalCount", 0) or 0


def _job_fetch_list(ncs_code: str, max_rows: int) -> list:
    collected = []
    page_no = 1
    total_count = None
    while len(collected) < max_rows:
        remaining = max_rows - len(collected)
        page_size = min(JOB_PAGE_SIZE, remaining)
        items, total_count = _job_fetch_page(ncs_code, page_no, page_size)
        if not items:
            break
        collected.extend(items)
        if total_count and len(collected) >= total_count:
            break
        page_no += 1
    return collected


def _job_to_yyyy_mm_dd(ymd: str) -> str:
    if not ymd or len(ymd) != 8:
        return "상시채용"
    try:
        return datetime.strptime(ymd, "%Y%m%d").strftime("%Y-%m-%d")
    except ValueError:
        return "상시채용"


def _job_clean_url(raw_url) -> str:
    """srcUrl이 '없음'/'해당없음'/'.' 같은 안내 텍스트로 오는 경우가 있어서,
    http(s)로 시작하는 진짜 URL만 통과시키고 나머지는 빈 문자열로 정리."""
    cleaned = (raw_url or "").strip()
    if cleaned.lower().startswith("http"):
        return cleaned
    return ""


def _job_classify_subjob(title: str, category: str) -> str:
    lowered = f" {(title or '').lower()} "
    for subjob, keywords in JOB_SUBJOB_KEYWORDS.get(category, {}).items():
        for kw in keywords:
            if kw.lower() in lowered:
                return subjob
    return "직무공통"


def _job_transform(item: dict, category: str, ncs_group: str) -> dict:
    region_list = (item.get("workRgnNmLst") or "").split(",")
    region = region_list[0].strip() if region_list and region_list[0] else "지역 미정"
    tag_list = [t.strip() for t in (item.get("hireTypeNmLst") or "").split(",") if t.strip()]
    title = item.get("recrutPbancTtl") or "제목 없음"

    return {
        "id": item.get("recrutPblntSn"),
        "company": item.get("instNm") or "기관명 미상",
        "title": title,
        "subJob": _job_classify_subjob(title, category),
        "location": region,
        "category": category,
        "ncsGroup": ncs_group,
        "type": item.get("recrutSeNm") or "전체",
        "tags": tag_list[:2] if tag_list else ["공공기관"],
        "deadline": _job_to_yyyy_mm_dd(item.get("pbancEndYmd")),
        "url": _job_clean_url(item.get("srcUrl")),
    }


def build_job_list() -> list:
    """카테고리별로 공공데이터 API를 호출해 전체 채용공고 리스트를 만든다.
    DB에 저장하지 않고 매번(캐시 TTL 안에서는 캐시로) 이 함수를 다시 호출하는
    방식 — job-fetch/fetch_jobs_to_mock.py의 main()과 동일한 로직이지만
    파일로 저장하는 대신 그대로 리스트를 반환한다."""
    all_jobs = []
    for category, ncs_codes in JOB_NCS_CODES_BY_CATEGORY.items():
        seen_ids = set()
        category_items = []
        for ncs_code in ncs_codes:
            raw_items = _job_fetch_list(ncs_code, JOB_MAX_ROWS_PER_CATEGORY)
            for raw in raw_items:
                rid = raw.get("recrutPblntSn")
                if rid in seen_ids:
                    continue
                seen_ids.add(rid)
                category_items.append((raw, ncs_code))
        for raw, ncs_code in category_items:
            ncs_group = JOB_NCS_CODE_LABELS.get(ncs_code, ncs_code)
            all_jobs.append(_job_transform(raw, category, ncs_group))

    # 실제 지원 페이지로 연결되는 URL이 없는 공고는 목록에서 제외
    # (클릭해도 안 넘어가는 공고를 보여주지 않기로 한 팀 결정, fetch_jobs_to_mock.py와 동일)
    all_jobs = [job for job in all_jobs if job["url"]]
    return all_jobs


# 간단한 인메모리 캐시 — DB가 없으므로, 매 요청마다 공공데이터 API를 다시 부르지
# 않도록 30분간 결과를 들고 있는다(팀 설계 문서의 "같은 조건 30분~1시간 캐시
# 권장"을 반영). 서버가 재시작되면 캐시도 비워짐 — 괜찮음, 다음 요청 때 다시 채움.
_jobs_cache = {"data": None, "fetched_at": 0.0}
_jobs_cache_lock = threading.Lock()
JOBS_CACHE_TTL_SECONDS = 30 * 60


def get_jobs_cached() -> list:
    now = time.time()
    with _jobs_cache_lock:
        is_stale = _jobs_cache["data"] is None or (now - _jobs_cache["fetched_at"]) >= JOBS_CACHE_TTL_SECONDS
        if is_stale:
            _jobs_cache["data"] = build_job_list()
            _jobs_cache["fetched_at"] = now
        return _jobs_cache["data"]


@app.get("/api/jobs")
def get_jobs():
    if not JOB_API_SERVICE_KEY:
        raise HTTPException(
            status_code=500,
            detail="JOB_API_SERVICE_KEY 환경변수가 설정되지 않았습니다. Render(또는 로컬 .env)에 등록해주세요.",
        )
    jobs = get_jobs_cached()
    return {
        "jobs": jobs,
        "count": len(jobs),
        "cachedAt": datetime.fromtimestamp(_jobs_cache["fetched_at"]).isoformat(timespec="seconds"),
    }
