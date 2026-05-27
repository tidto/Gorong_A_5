/** 행사 키워드 → 아이템 코드 (백엔드 EventCategoryItemRewardService 와 동일 개념) */
export const EVENT_CATEGORY_REWARDS = [
  { keywords: ["벚꽃", "cherry", "벚꽃축제"], itemCode: "CHERRY_HAT", slot: "HEAD" as const },
  { keywords: ["야시장", "night market", "야경시장"], itemCode: "NEON_GLASSES", slot: "ACCESSORY" as const },
  { keywords: ["전통축제", "전통", "한복", "hanbok"], itemCode: "HANBOK", slot: "BODY" as const },
  { keywords: ["바다축제", "바다", "해양", "해변", "조개"], itemCode: "SHELL_ACCESSORY", slot: "ACCESSORY" as const },
] as const;
