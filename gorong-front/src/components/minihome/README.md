# Minihome (Go냥이 · CatTower)

## Pages (`src/pages/minihome/`)

| File | Route | Role |
|------|-------|------|
| `CatTower.tsx` | `/cattower`, `/cattower/:userId` | CatTower 메인 (본인 편집 / 타인 읽기 전용) |
| `MiniHome.tsx` | `/minihome` | 갤러리·성장·꾸미기 통합 페이지 |
| `hooks/` | — | 페이지 전용 React hooks |
| `dev/` | `/dev/rive-customizer` | Rive 커스터마이저 개발 페이지 |

## Components (`src/components/minihome/`)

| Folder | Contents |
|--------|----------|
| `cat-tower/` | CatTower 대시보드·방·활동 UI |
| `decoration/` | 아이템 장착·커스터마이즈 패널 |
| `rive/` | Rive 캐릭터·오버레이 렌더링 |
| `growth/` | 성장 단계 배지·이펙트 |
| `onboarding/` | 최초 고양이 생성 플로우 |
| `mini-home/` | MiniHome 전용 (갤러리, 활동, DecorationModal 등) |
| `dev/` | Rive 실험 컴포넌트 |

## Utils (`src/utils/minihome/`)

| Folder | Contents |
|--------|----------|
| `cat-tower/` | 라우트, 방 테마, 프레젠테이션, 활동 표시 |
| `gocat/` | 장착·아이템·외형·카탈로그 |
| `rive/` | Rive SM·인터랙션 |
| `growth/` | 성장 단계 계산·시각 |
| `core/` | activity, gallery, API 에러, 페이지 merge |

## Data (`src/data/minihome/`)

- `gocatItems.ts` — MVP 장착 아이템 카탈로그
- `catTowerDashboardMock.ts` — CatTower 목업 (방문자·데코 등)

## Public assets (`public/assets/cat/`)

```
assets/cat/
  items/      # SVG 장식 아이템
  overlays/   # 420×420 PNG 정렬 오버레이
  faces/      # matching_cat_faces
public/rive/  # cat.riv, cat-customizer.riv
```
