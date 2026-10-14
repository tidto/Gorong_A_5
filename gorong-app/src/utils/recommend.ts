import { Venue } from '../types'

export type WeatherType = 'Clear' | 'Clouds' | 'Rain' | 'Snow'

// true면 추천 결과 상위 5개를 Metro 터미널에 출력 (확인 끝나면 false)
const DEBUG = false
// 시간대 테스트용: 0~23을 넣으면 그 시각 기준으로 계산 (null이면 실제 시각)
const DEBUG_HOUR: number | null = null
// 날씨 테스트용: 'Clear' | 'Clouds' | 'Rain' | 'Snow' 를 넣으면 서버 날씨 대신 이 값을 사용 (null이면 실제 날씨)
const DEBUG_WEATHER: WeatherType | null = null
// 세분화 날씨 테스트용: 'Thunderstorm' / 'Drizzle' / 'Fog' 등 OpenWeather 원본 main 값을 넣으면
// 이모지·문구·뇌우 감점까지 그 값 기준으로 동작 (DEBUG_WEATHER보다 낮은 우선순위, null이면 실제 날씨)
const DEBUG_WEATHER_RAW: string | null = null

// ── 날씨 표시(이모지/문구) ────────────────────────────────
// [수정] 탭 이모지가 '실제로 추천에 쓰인 날씨'와 어긋나던 문제
//  - 기존: MapScreen이 서버 날씨(weatherState)로 이모지를 그렸는데,
//    점수 계산은 DEBUG_WEATHER로 덮어써서 "☀️인데 비 기준 정렬"이 나왔음
//  - 이제 아래 getEffectiveWeather*() 한 군데에서만 DEBUG_WEATHER를 적용하고,
//    화면/점수 모두 이 함수를 거치게 해서 항상 같은 날씨를 바라보게 함

// 점수 계산에 쓸 4단계 날씨 (DEBUG_WEATHER 우선)
export function getEffectiveWeather(weather: WeatherType | null): WeatherType | null {
    if (DEBUG_WEATHER) return DEBUG_WEATHER
    if (DEBUG_WEATHER_RAW) return normalizeWeatherMain(DEBUG_WEATHER_RAW)
    return weather
}

// 표시용 원본 날씨 (OpenWeather의 main 값 그대로. DEBUG_WEATHER가 켜져 있으면 그 값 우선)
// normalizeWeatherMain()이 Rain/Drizzle/Thunderstorm을 전부 'Rain'으로 뭉개기 때문에,
// 이모지만큼은 원본을 따로 들고 있어야 뇌우 ⛈️ / 안개 🌫️ 같은 구분이 가능함
export function getEffectiveWeatherRaw(raw: string | null): string | null {
    return DEBUG_WEATHER_RAW ?? DEBUG_WEATHER ?? raw
}

// 뇌우: 비보다 위험해서 야외 장소를 더 강하게 뒤로 보냄 (점수 계산에만 사용)
export function isThunderstorm(raw: string | null): boolean {
    return raw === 'Thunderstorm'
}

// OpenWeather main → 이모지 (원본 기준, 세분화)
const EMOJI_BY_RAW: Record<string, string> = {
    Clear: '☀️',
    Clouds: '☁️',
    Rain: '☔',
    Drizzle: '🌦️',
    Thunderstorm: '⛈️',
    Snow: '❄️',
    Mist: '🌫️',
    Fog: '🌫️',
    Haze: '🌫️',
    Smoke: '🌫️',
    Dust: '😷',
    Sand: '😷',
    Ash: '🌋',
    Squall: '🌬️',
    Tornado: '🌪️',
}

// 4단계로 뭉갠 날씨 기준 이모지 (원본을 모를 때 쓰는 폴백)
const EMOJI_BY_TYPE: Record<WeatherType, string> = {
    Clear: '☀️',
    Clouds: '☁️',
    Rain: '☔',
    Snow: '❄️',
}

// 원본 main이 있으면 세분화된 이모지, 없으면 4단계 폴백, 둘 다 없으면 중립 아이콘
export function weatherEmoji(raw: string | null, weather: WeatherType | null): string {
    if (raw && EMOJI_BY_RAW[raw]) return EMOJI_BY_RAW[raw]
    if (weather) return EMOJI_BY_TYPE[weather]
    return '🎯'
}

// 이모지 옆에 붙일 한국어 날씨 이름 (원본 기준)
const LABEL_BY_RAW: Record<string, string> = {
    Clear: '맑음',
    Clouds: '흐림',
    Rain: '비',
    Drizzle: '이슬비',
    Thunderstorm: '뇌우',
    Snow: '눈',
    Mist: '안개',
    Fog: '짙은 안개',
    Haze: '연무',
    Smoke: '연무',
    Dust: '먼지',
    Sand: '황사',
    Ash: '화산재',
    Squall: '돌풍',
    Tornado: '토네이도',
}

const LABEL_BY_TYPE: Record<WeatherType, string> = {
    Clear: '맑음',
    Clouds: '흐림',
    Rain: '비',
    Snow: '눈',
}

export function weatherLabel(raw: string | null, weather: WeatherType | null): string | null {
    if (raw && LABEL_BY_RAW[raw]) return LABEL_BY_RAW[raw]
    if (weather) return LABEL_BY_TYPE[weather]
    return null
}

// 탭 옆에 붙일 '왜 이렇게 정렬했는지' 한 줄 근거
// (weatherFit/weatherGate가 Rain·Snow일 때만 실내를 밀어주므로 문구도 그 기준에 맞춤)
export function weatherReason(raw: string | null, weather: WeatherType | null): string {
    const label = weatherLabel(raw, weather)
    if (!weather || !label) return '날씨 정보 없음 · 가까운 곳 위주로 추천'
    if (isThunderstorm(raw)) return '뇌우 · 야외는 피하고 실내 위주로 추천'
    if (weather === 'Rain' || weather === 'Snow') return `${label} 오는 날 · 실내 위주로 추천`
    // '맑음은 날' 처럼 어색한 조사가 붙지 않도록 자연스러운 표현으로 직접 지정
    if (weather === 'Clear') return '맑은 날 · 야외 위주로 추천'
    if (label === '흐림') return '흐린 날 · 실내외 무난한 곳 위주로 추천'
    return `${label} · 실내외 무난한 곳 위주로 추천`
}

// 거리 상한 단계: 가까운 곳부터 시도해서 후보가 MIN_RESULTS 미만이면 범위를 넓힘
// (기존 50km 시작은 '주변'이라 하기엔 너무 넓어서 거리 점수가 사실상 무의미했음)
const DISTANCE_STEPS_M = [10_000, 30_000, 100_000, Infinity]
const MIN_RESULTS = 5

// ── MapScreen.tsx에서 옮겨온 유틸 ─────────────────────────
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 'YYYYMMDD' / 'YYYY-MM-DD' / 'YYYY.MM.DD' / 'YYYY/MM/DD' 모두 '로컬 자정'으로 파싱
// (new Date('2026-09-21')은 UTC 자정이라 KST 오전 9시가 되어 '오늘 시작' 행사가 9시 전까지 제외되던 문제 방지)
export function parseLooseDate(value?: string | null) {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    const m = trimmed.match(/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})/)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

// 날짜가 없으면(상설 관광지) true, 날짜가 있으면 오늘이 기간 안인지 검사
export function isVenueActiveToday(venue: Venue) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = parseLooseDate(venue.eventStartDate)
    const end = parseLooseDate(venue.eventEndDate)
    if (!start && !end) return true
    if (start && today < start) return false
    if (end) {
        const endOfDay = new Date(end)
        endOfDay.setHours(23, 59, 59, 999)
        if (today > endOfDay) return false
    }
    return true
}

export function normalizeWeatherMain(raw: string): WeatherType {
    if (raw === 'Clear') return 'Clear'
    if (raw === 'Snow') return 'Snow'
    if (['Rain', 'Drizzle', 'Thunderstorm'].includes(raw)) return 'Rain'
    return 'Clouds' // Mist, Fog, Haze, Dust, Smoke 등은 흐림으로 처리
}

// ── 실내/야외 분류 ────────────────────────────────────────
// 이름 기반 키워드 (실제 데이터 보면서 계속 다듬기)
const INDOOR_KEYWORDS = ['전시', '박물관', '미술관', '과학관', '기념관', '전시관', '도서관', '체험관', '공연', '콘서트', '뮤지컬', '연극', '영화']
const OUTDOOR_KEYWORDS = ['축제', '마라톤', '캠핑', '야시장', '불꽃', '걷기', '공원', '벚꽃', '페스티벌', '야외', '기찻길', '둘레길', '정원', '수목원', '숲', '계곡', '호수', '산책']
// 이름에 이게 있으면 다른 키워드와 섞여 있어도 야외로 확정 ('야외공연장', '야외 전시' 등이 실내로 분류되던 문제)
const STRONG_OUTDOOR_KEYWORDS = ['야외', '야시장', '불꽃', '마라톤', '캠핑', '걷기', '둘레길', '산책']

type VenueType = 'indoor' | 'outdoor' | 'unknown'

function getVenueType(v: Venue): VenueType {
    const name = v.name ?? ''
    if (STRONG_OUTDOOR_KEYWORDS.some((k) => name.includes(k))) return 'outdoor'

    const inDoor = INDOOR_KEYWORDS.some((k) => name.includes(k))
    const outDoor = OUTDOOR_KEYWORDS.some((k) => name.includes(k))
    // 이름에 둘 다 있으면(예: '뮤지컬 페스티벌') 판단 보류 → 카테고리로 넘김
    if (inDoor && !outDoor) return 'indoor'
    if (outDoor && !inDoor) return 'outdoor'
    if (inDoor && outDoor) return 'unknown'

    // 이름으로 못 정하면 소개글 앞부분에서 '실내'/'야외'가 한쪽만 나오는지 확인
    const text = (v.overview ?? '').slice(0, 300)
    const overviewIn = text.includes('실내')
    const overviewOut = text.includes('야외')
    if (overviewIn && !overviewOut) return 'indoor'
    if (overviewOut && !overviewIn) return 'outdoor'
    return 'unknown'
}

// ── 날씨 적합도 ───────────────────────────────────────────
// TourAPI cat1: A01 자연 / A02 인문(문화·예술·역사) / A03 레포츠 / A04 쇼핑
// ⚠️ 웹(gorong-front)의 기존 매핑과 다름 — 웹도 손볼 때 기준을 통일할 것
const GOOD_WEATHER_CATS = ['A01', 'A03'] // 맑음/흐림 → 야외 활동
const BAD_WEATHER_CATS = ['A02', 'A04'] // 비/눈 → 실내 위주

function weatherFit(v: Venue, weather: WeatherType, stormy = false): number {
    const bad = weather === 'Rain' || weather === 'Snow'
    const type = getVenueType(v)

    // 1순위: 이름에서 실내/야외가 판별되면 그걸 사용
    if (type !== 'unknown') {
        // 뇌우일 땐 야외 0.1 → 0 (일반 비보다 더 강하게 배제)
        if (bad) return type === 'indoor' ? 1 : stormy ? 0 : 0.1
        return type === 'outdoor' ? 1 : 0.5
    }

    // 2순위: 판별 불가면 cat1 카테고리로 판단
    const cat = (v.category ?? '').toUpperCase()
    const preferred = bad ? BAD_WEATHER_CATS : GOOD_WEATHER_CATS
    return preferred.some((c) => cat.startsWith(c)) ? 0.7 : 0.4
}

// ── 시간대 적합도 ─────────────────────────────────────────
// ⚠️ API 데이터에 운영시간 정보가 없어서, 이름 키워드로 추정하는 휴리스틱임
type TimeSlot = 'day' | 'evening' | 'night'

function getTimeSlot(hour: number): TimeSlot {
    if (hour >= 6 && hour < 17) return 'day'
    if (hour >= 17 && hour < 21) return 'evening'
    return 'night' // 21시 ~ 다음날 6시
}

const NIGHT_KEYWORDS = ['야시장', '야경', '야간', '불꽃', '나이트']

function isNightVenue(v: Venue): boolean {
    const name = v.name ?? ''
    return NIGHT_KEYWORDS.some((k) => name.includes(k))
}

function timeFit(v: Venue, slot: TimeSlot): number {
    // 야간 장소(야시장 등): 낮엔 뒤로, 저녁·밤엔 앞으로
    if (isNightVenue(v)) return slot === 'day' ? 0.2 : 1

    // 실내(박물관·도서관 등): 보통 저녁 이후엔 닫음
    if (getVenueType(v) === 'indoor') {
        return slot === 'day' ? 1 : slot === 'evening' ? 0.5 : 0.1
    }

    // 야외/미분류: 낮이 가장 무난, 밤은 낮춤
    return slot === 'day' ? 0.8 : slot === 'evening' ? 0.7 : 0.4
}

// ── 기타 점수 ─────────────────────────────────────────────
function hasEventDates(v: Venue): boolean {
    return Boolean(parseLooseDate(v.eventStartDate) || parseLooseDate(v.eventEndDate))
}

// 종료 임박도 (날짜 있는 행사 전용)
function urgencyScore(v: Venue): number {
    const end = parseLooseDate(v.eventEndDate)
    if (!end) return 0.5 // 시작일만 있고 종료일이 없는 행사
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000)
    if (daysLeft <= 3) return 1
    if (daysLeft <= 7) return 0.7
    if (daysLeft <= 14) return 0.4
    return 0.2
}

// '행사'다움: 기간이 있는 진행 중 행사 > 기간 없는 상설 시설
// (기존엔 상설 시설이 0.3, 종료까지 2주 넘게 남은 행사가 0.2라서 상설 시설이 행사보다 위로 올라오는 역전이 있었음)
const PERMANENT_BASE = 0.2
const EVENT_BASE = 0.6

function eventScore(v: Venue): number {
    if (!hasEventDates(v)) return PERMANENT_BASE
    return EVENT_BASE + (1 - EVENT_BASE) * urgencyScore(v) // 0.68 ~ 1.0
}

// 기간 없는 시설 중 '행사 추천'으로는 부적절한 것들 (예: 대학교 도서관) — 제외 대신 감점
const LOW_VALUE_KEYWORDS = ['도서관']
const LOW_VALUE_MULTIPLIER = 0.6

function lowValuePenalty(v: Venue): number {
    if (hasEventDates(v)) return 1
    const name = v.name ?? ''
    return LOW_VALUE_KEYWORDS.some((k) => name.includes(k)) ? LOW_VALUE_MULTIPLIER : 1
}

// 거리 점수: 0km=1, 5km=0.5, 10km≈0.33, 30km≈0.14 (도심 내 거리 차이가 점수에 반영되도록 기존보다 가파르게)
function distanceScore(distanceM: number): number {
    return 1 / (1 + distanceM / 5_000)
}

// 비/눈일 때는 '야외 행사'가 다른 점수(거리·행사임박)로 상쇄돼 1위에 오르지 않도록 곱셈으로 한 번 더 억제
// 야외(0.1) → ×0.46, 실내(1.0) → ×1.0. 맑음/흐림/날씨 없음은 영향 없음
// 뇌우: 야외(0) → ×0.2, 실내(1.0) → ×1.0 (일반 비의 야외 ×0.46보다 강함)
function weatherGate(weather: WeatherType | null, weatherScore: number, stormy = false): number {
    if (weather !== 'Rain' && weather !== 'Snow') return 1
    return stormy ? 0.2 + 0.8 * weatherScore : 0.4 + 0.6 * weatherScore
}

// ── 추천 ─────────────────────────────────────────────────
type Ctx = { weather: WeatherType | null; weatherRaw?: string | null; lat: number; lng: number; hour?: number }

export function recommendVenues(venues: Venue[], ctx: Ctx, limit = 10): Venue[] {
    const hour = DEBUG_HOUR ?? ctx.hour ?? new Date().getHours()
    // [수정] DEBUG_WEATHER 적용을 getEffectiveWeather() 한 군데로 모음 (화면 이모지와 동일한 값 사용)
    const weather = getEffectiveWeather(ctx.weather)
    // 뇌우 여부는 4단계로 뭉개기 전의 원본 main으로만 알 수 있음
    const stormy = isThunderstorm(getEffectiveWeatherRaw(ctx.weatherRaw ?? null))
    const slot = getTimeSlot(hour)

    // 1) 진행 기간이 지난/아직 안 열린 행사는 제외 (날짜 없는 상설 관광지는 통과)
    const candidates = venues
        .filter((v) => isVenueActiveToday(v))
        .map((v) => ({
            venue: v,
            distance: distanceMeters(ctx.lat, ctx.lng, v.lat, v.lng),
            weatherScore: weather ? weatherFit(v, weather, stormy) : 0.5, // 날씨 없으면 중립
            timeScore: timeFit(v, slot),
            eventScore: eventScore(v),
            penalty: lowValuePenalty(v),
        }))

    // 2) 가까운 범위부터 시도, 후보가 부족하면 범위를 넓힘
    let pool = candidates
    for (const maxD of DISTANCE_STEPS_M) {
        const inRange = candidates.filter((c) => c.distance <= maxD)
        pool = inRange
        if (inRange.length >= MIN_RESULTS) break
    }

    // 3) 점수 계산 후 정렬 (동점이면 가까운 순)
    const ranked = pool
        .map((c) => ({
            ...c,
            score:
                (0.30 * distanceScore(c.distance) +
                    0.25 * c.weatherScore +
                    0.10 * c.timeScore +
                    0.35 * c.eventScore) *
                c.penalty *
                weatherGate(weather, c.weatherScore, stormy),
        }))
        .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.distance - b.distance))
        .slice(0, limit)

    if (DEBUG) {
        // 진단: 날짜 있는 '진짜 행사'가 데이터에 몇 건 있고, 범위 안에는 몇 건인지
        const datedAll = venues.filter(hasEventDates)
        const datedActive = candidates.filter((c) => hasEventDates(c.venue))
        const datedInPool = pool.filter((c) => hasEventDates(c.venue))
        console.log(
            '[recommend:data]',
            `전체 ${venues.length} / 날짜있음 ${datedAll.length} / 진행중 ${datedActive.length} / 범위내 ${datedInPool.length}`,
            datedAll.slice(0, 5).map((v) => `${v.name} ${v.eventStartDate}~${v.eventEndDate}`),
        )
        console.log(
            '[recommend]',
            weather,
            stormy ? '(뇌우)' : '',
            `${hour}시(${slot})`,
            `후보 ${candidates.length} → 범위내 ${pool.length}`,
            ranked.slice(0, 5).map(
                (r) =>
                    `${r.venue.name} | ${Math.round(r.distance / 1000)}km | 날씨 ${r.weatherScore.toFixed(1)} | 시간 ${r.timeScore.toFixed(1)} | 행사 ${r.eventScore.toFixed(2)} | 점수 ${r.score.toFixed(2)}`,
            ),
        )
    }

    return ranked.map((r) => r.venue)
}