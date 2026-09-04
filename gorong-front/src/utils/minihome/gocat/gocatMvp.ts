import { sanitizeEquipDraft as sanitize } from "./gocatEquipRules";

export { sanitizeEquipDraft } from "./gocatEquipRules";

/** @deprecated sanitizeEquipDraft */
export const stripDraftToMvpHead = sanitize;
