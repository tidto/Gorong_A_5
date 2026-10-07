// ─────────────────────────────────────────────────────────────────
// accessibility.ts — 무장애(배리어프리) 정보 공통 유틸
// 웹 EventList.tsx / EventDetail.tsx 의 isAccessible() · 그룹 구분과 같은 기준을 사용
// (판정 기준을 한 곳에서만 관리해야 화면마다 배지가 달라지지 않음)
// ─────────────────────────────────────────────────────────────────
import { AccessibilityInfo } from '../types'

export type AccessibilityField = keyof AccessibilityInfo

// 웹 isAccessible()과 동일: 비어 있거나 N / NO / 없음 이면 '정보 없음'
export const isAccessible = (field?: string | null): boolean => {
    if (!field) return false
    const v = field.trim().toUpperCase()
    return v !== '' && v !== 'N' && v !== 'NO' && v !== '없음'
}

// TourAPI는 값이 'Y' / '있음' 처럼 설명 없이 내려오는 경우가 있음 → 라벨만 보여주기 위해 구분
const PLAIN_YES = new Set(['Y', 'YES', '있음', '가능', '유'])
const isPlainYes = (value: string) => PLAIN_YES.has(value.trim().toUpperCase())

export interface AccessibilityItem {
    field: AccessibilityField
    label: string
    description?: string // 'Y' 같은 단순 값이면 undefined
}

export interface AccessibilityGroup {
    key: 'mobility' | 'visual' | 'hearing' | 'family'
    icon: string
    title: string
    items: AccessibilityItem[]
}

// 웹 EventDetail.tsx 의 그룹/라벨과 동일
const GROUP_DEFS: {
    key: AccessibilityGroup['key']
    icon: string
    title: string
    fields: { field: AccessibilityField; label: string }[]
}[] = [
    {
        key: 'mobility',
        icon: '🦽',
        title: '이동 편의',
        fields: [
            { field: 'parking', label: '주차 가능' },
            { field: 'elevator', label: '엘리베이터' },
            { field: 'restroom', label: '장애인 화장실' },
            { field: 'route', label: '접근 경로' },
            { field: 'wheelchair', label: '휠체어 대여' },
            { field: 'exit', label: '출입통로 경사로' },
            { field: 'publicTransport', label: '대중교통 접근' },
        ],
    },
    {
        key: 'visual',
        icon: '👁',
        title: '시각 지원',
        fields: [
            { field: 'braileBlock', label: '점자블록' },
            { field: 'audioGuide', label: '오디오 가이드' },
            { field: 'helpDog', label: '보조견 동반' },
        ],
    },
    {
        key: 'hearing',
        icon: '👂',
        title: '청각 지원',
        fields: [
            { field: 'signGuide', label: '수화 안내' },
            { field: 'videoGuide', label: '자막 영상' },
        ],
    },
    {
        key: 'family',
        icon: '👶',
        title: '영유아 가족',
        fields: [{ field: 'stroller', label: '유모차 대여' }],
    },
]

const ALL_FIELDS: AccessibilityField[] = GROUP_DEFS.flatMap((g) => g.fields.map((f) => f.field))

// 서버 응답(PublicEvent 등)에서 '실제로 있는' 무장애 항목만 추려서 반환 (하나도 없으면 undefined)
export function buildAccessibility(item: AccessibilityInfo): AccessibilityInfo | undefined {
    const result: AccessibilityInfo = {}
    for (const field of ALL_FIELDS) {
        const value = item[field]
        if (isAccessible(value)) result[field] = value!.trim()
    }
    return Object.keys(result).length > 0 ? result : undefined
}

// 화면 표시용: 값이 있는 항목만 그룹별로 묶어서 반환
export function getAccessibilityGroups(info?: AccessibilityInfo): AccessibilityGroup[] {
    if (!info) return []
    return GROUP_DEFS.map((def) => ({
        key: def.key,
        icon: def.icon,
        title: def.title,
        items: def.fields
            .filter(({ field }) => isAccessible(info[field]))
            .map(({ field, label }) => {
                const value = info[field]!.trim()
                return { field, label, description: isPlainYes(value) ? undefined : value }
            }),
    })).filter((g) => g.items.length > 0)
}

export const hasAccessibilityInfo = (info?: AccessibilityInfo): boolean =>
    ALL_FIELDS.some((field) => isAccessible(info?.[field]))