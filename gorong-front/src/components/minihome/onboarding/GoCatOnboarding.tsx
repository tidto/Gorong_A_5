import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import DecorateCatPreview from "../rive/DecorateCatPreview";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import {
  DEFAULT_CAT_APPEARANCE,
  type CatAppearance,
} from "../../../utils/minihome/gocat/catAppearance";

export type GoCatOnboardingSubmit = {
  appearance: CatAppearance;
  catName: string;
};

type GoCatOnboardingProps = {
  growthStage: GrowthStage;
  initialCatName?: string;
  initialAppearance?: CatAppearance;
  saving?: boolean;
  error?: string | null;
  onSubmit: (payload: GoCatOnboardingSubmit) => Promise<void>;
};

export default function GoCatOnboarding({
  growthStage,
  initialCatName = "고냥이",
  saving = false,
  error = null,
  onSubmit,
}: GoCatOnboardingProps) {
  const [catName, setCatName] = useState(initialCatName);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = catName.trim() || "고냥이";
    await onSubmit({ appearance: { ...DEFAULT_CAT_APPEARANCE }, catName: name });
  }

  return (
    <div className="mx-auto max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[2rem] border-2 border-amber-100 bg-white shadow-xl"
      >
        <div className="bg-gradient-to-br from-orange-400 via-amber-300 to-pink-300 px-6 py-5 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">Welcome</p>
          <h2 className="mt-1 text-2xl font-extrabold">나만의 Go냥이 만들기</h2>
          <p className="mt-1 text-sm font-medium text-white/90">이름을 지어 주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          <div className="flex justify-center rounded-3xl bg-gradient-to-b from-sky-100/80 via-amber-50 to-orange-50 p-4">
            <DecorateCatPreview
              growthStage={growthStage}
              activityCount={0}
              equipped={null}
              interactive
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-amber-800/50">
              이름
            </label>
            <input
              type="text"
              maxLength={20}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              disabled={saving}
              placeholder="고냥이"
              className="w-full rounded-2xl border-2 border-amber-100 px-4 py-2.5 text-sm font-bold text-amber-950 outline-none focus:border-amber-400"
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-orange-600 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? "만드는 중…" : "Go냥이 완성하기"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
