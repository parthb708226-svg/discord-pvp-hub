// Minecraft skin helpers using mc-heads.net (no auth, supports usernames)
export const mcHead = (name: string, size = 64) =>
  `https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size}`;
export const mcBody = (name: string, size = 256) =>
  `https://mc-heads.net/body/${encodeURIComponent(name)}/${size}`;
export const mcFullBody = (name: string) =>
  `https://mc-heads.net/player/${encodeURIComponent(name)}/256`;

export const TIER_ORDER = [
  "HT1","LT1","HT2","LT2","HT3","LT3","HT4","LT4","HT5","LT5","Retired"
] as const;
export type TierRank = typeof TIER_ORDER[number];

export const TIER_LABEL: Record<TierRank, string> = {
  HT1: "High Tier 1", LT1: "Low Tier 1",
  HT2: "High Tier 2", LT2: "Low Tier 2",
  HT3: "High Tier 3", LT3: "Low Tier 3",
  HT4: "High Tier 4", LT4: "Low Tier 4",
  HT5: "High Tier 5", LT5: "Low Tier 5",
  Retired: "Retired",
};

export const TIER_BG: Record<TierRank, string> = {
  HT1: "bg-tier-ht1 text-black",
  LT1: "bg-tier-lt1 text-black",
  HT2: "bg-tier-ht2 text-white",
  LT2: "bg-tier-lt2 text-black",
  HT3: "bg-tier-ht3 text-white",
  LT3: "bg-tier-lt3 text-white",
  HT4: "bg-tier-ht4 text-black",
  LT4: "bg-tier-lt4 text-black",
  HT5: "bg-tier-ht5 text-black",
  LT5: "bg-tier-lt5 text-black",
  Retired: "bg-tier-retired text-white",
};

export const REGIONS = ["NA","EU","AS","SA","OC","AF","Unknown"] as const;
