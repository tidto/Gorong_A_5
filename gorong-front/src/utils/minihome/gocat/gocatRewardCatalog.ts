/** @deprecated gocatItemCatalog.ts 사용 */
export {
  GOCAT_ITEM_CATALOG as REWARD_CATALOG,
  findCatalogItemById as findRewardCatalogEntry,
  catalogItemsForSlot as rewardsForSlot,
  DEFAULT_ITEM_IDS,
  filterOwnedUserItems,
  type GoCatCatalogItem as RewardCatalogEntry,
  type UnlockType,
} from "./gocatItemCatalog";

export function rewardSourceLabel(): string {
  return "보상";
}
