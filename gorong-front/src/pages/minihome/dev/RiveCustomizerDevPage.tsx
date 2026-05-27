import { Link } from "react-router-dom";
import GoCatRiveCustomizerTest from "../../../components/minihome/dev/GoCatRiveCustomizerTest";

/** 개발 전용 — cat-customizer.riv (seal) SM 실험. 프로덕션 CatTower에는 미노출 */
export default function RiveCustomizerDevPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-bold">개발 참고용 (seal Rive)</p>
        <p className="mt-1 text-xs leading-relaxed opacity-90">
          최종 화면은 Go냥이 overlay(<code className="text-[10px]">GoCatVisual</code>,{" "}
          <code className="text-[10px]">DecorateCatPreview</code>)입니다. CatTower·꾸미기 모달은
          Go냥이 + 모자/리본/안경 아이템을 사용합니다.
        </p>
        <Link to="/cattower" className="mt-2 inline-block text-xs font-bold text-orange-700 underline">
          ← CatTower로 돌아가기
        </Link>
      </div>

      <GoCatRiveCustomizerTest />
    </div>
  );
}
