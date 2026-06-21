import sword from "@/assets/items/sword.png";
import axe from "@/assets/items/axe.png";
import crystal from "@/assets/items/crystal.png";
import smp from "@/assets/items/smp.png";
import uhc from "@/assets/items/uhc.png";
import pot from "@/assets/items/pot.png";
import nethpot from "@/assets/items/nethpot.png";
import mace from "@/assets/items/mace.png";
import vanilla from "@/assets/items/vanilla.png";
import bedwars from "@/assets/items/bedwars.png";

export const MC_ITEMS: Record<string, string> = {
  sword, axe, crystal, smp, uhc, pot, nethpot, mace, vanilla, bedwars,
};

export function itemForSlug(slug?: string | null): string | undefined {
  if (!slug) return undefined;
  return MC_ITEMS[slug.toLowerCase()];
}
