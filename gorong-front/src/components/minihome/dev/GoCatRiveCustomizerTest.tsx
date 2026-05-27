import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import type { RiveRuntime } from "../../../utils/minihome/riveInteract";
import {
  RIVE_CAT_CUSTOMIZER_HEAD_WEAR_INPUTS,
  RIVE_CAT_CUSTOMIZER_PREVIEW_SIZE,
  RIVE_CAT_CUSTOMIZER_SRC,
  RIVE_CAT_CUSTOMIZER_STATE_MACHINE,
  applyHeadWearSelection,
  resolveCatCustomizerStateMachine,
  type RiveCustomizerHeadWearIndex,
} from "../../../utils/minihome/riveCatCustomizer";

type GoCatRiveCustomizerTestProps = {
  className?: string;
};

const HAT_LABELS = ["모자 1", "모자 2", "모자 3", "모자 4"] as const;
const PREVIEW_PX = RIVE_CAT_CUSTOMIZER_PREVIEW_SIZE;
const SM = RIVE_CAT_CUSTOMIZER_STATE_MACHINE;

/**
 * cat-customizer.riv (seal) — Rive SM 구조 참고·실험용.
 * 최종 UI는 GoCatVisual / DecorateCatPreview (Go냥이 overlay) 사용.
 * 접근: 개발 모드 `/dev/rive-customizer`
 */
export default function GoCatRiveCustomizerTest({ className = "" }: GoCatRiveCustomizerTestProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedHat, setSelectedHat] = useState<RiveCustomizerHeadWearIndex>(0);
  const smWarned = useRef(false);
  const initialHatApplied = useRef(false);

  const { rive, RiveComponent } = useRive({
    src: RIVE_CAT_CUSTOMIZER_SRC,
    stateMachines: SM,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.TopCenter,
    }),
    onLoadError: () => {
      console.warn("[GoCatRiveCustomizerTest] cat-customizer.riv load failed");
      setLoadFailed(true);
    },
    onRiveReady: (instance) => {
      const r = instance as RiveRuntime;
      const sm = resolveCatCustomizerStateMachine(r.stateMachineNames) ?? SM;

      if (import.meta.env.DEV) {
        const smInputs = r.stateMachineInputs?.(sm) ?? [];
        console.info(
          "[GoCatRiveCustomizerTest] SM:",
          sm,
          "HeadWear:",
          smInputs.filter((i) => i.name.startsWith("HeadWear")).map((i) => i.name)
        );
      }

      try {
        r.play(sm);
      } catch {
        try {
          r.play();
        } catch {
          /* ignore */
        }
      }

      if (!smWarned.current && sm !== SM) {
        console.warn(`[GoCatRiveCustomizerTest] Expected "${SM}", using "${sm}"`);
        smWarned.current = true;
      }
    },
  });

  const headWear0 = useStateMachineInput(rive, SM, "HeadWear0");
  const headWear1 = useStateMachineInput(rive, SM, "HeadWear1");
  const headWear2 = useStateMachineInput(rive, SM, "HeadWear2");
  const headWear3 = useStateMachineInput(rive, SM, "HeadWear3");

  const headWearHookInputs = useMemo(
    () => [headWear0, headWear1, headWear2, headWear3],
    [headWear0, headWear1, headWear2, headWear3]
  );

  const inputsReady = useMemo(
    () =>
      headWearHookInputs.every(Boolean) ||
      RIVE_CAT_CUSTOMIZER_HEAD_WEAR_INPUTS.every((name) =>
        Boolean(rive?.stateMachineInputs?.(SM)?.some((i) => i.name === name))
      ),
    [headWearHookInputs, rive]
  );

  const applyHat = useCallback(
    (index: RiveCustomizerHeadWearIndex) => {
      applyHeadWearSelection(rive as RiveRuntime | null, SM, headWearHookInputs, index);
    },
    [rive, headWearHookInputs]
  );

  const selectHat = useCallback(
    (index: RiveCustomizerHeadWearIndex) => {
      setSelectedHat(index);
      applyHat(index);
    },
    [applyHat]
  );

  useEffect(() => {
    if (initialHatApplied.current || !inputsReady) return;
    initialHatApplied.current = true;
    applyHat(0);
    setSelectedHat(0);
  }, [inputsReady, applyHat]);

  if (loadFailed) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-sm font-semibold text-red-700 ${className}`}
        style={{ width: PREVIEW_PX, height: PREVIEW_PX, maxWidth: "100%" }}
      >
        cat-customizer.riv 를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className={`mx-auto flex w-full max-w-md flex-col items-center gap-4 ${className}`}>
      <div
        className="relative shrink-0 overflow-hidden rounded-2xl border border-violet-100 bg-[#2b2b2b] shadow-inner"
        style={{ width: PREVIEW_PX, height: PREVIEW_PX, maxWidth: "100%" }}
      >
        {!RiveComponent ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-violet-200/80">
            Rive 로딩 중…
          </div>
        ) : (
          <RiveComponent className="h-full w-full [&>canvas]:!block [&>canvas]:!h-full [&>canvas]:!max-h-full [&>canvas]:!w-full [&>canvas]:!max-w-full [&>canvas]:!object-contain" />
        )}
      </div>

      <div className="w-full rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        <p className="text-center text-xs font-bold text-slate-700">모자 선택 (HeadWear0~3)</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {HAT_LABELS.map((label, index) => {
            const hatIndex = index as RiveCustomizerHeadWearIndex;
            const isActive = selectedHat === hatIndex;
            const inputName = RIVE_CAT_CUSTOMIZER_HEAD_WEAR_INPUTS[hatIndex];

            return (
              <button
                key={inputName}
                type="button"
                aria-pressed={isActive}
                aria-label={`${label} (${inputName})`}
                onClick={() => selectHat(hatIndex)}
                disabled={!inputsReady}
                className={`rounded-xl py-2.5 text-xs font-bold transition ${
                  isActive
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-200 ring-2 ring-violet-300 ring-offset-1"
                    : "border border-violet-200 bg-violet-50/60 text-violet-900 hover:bg-violet-100"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
