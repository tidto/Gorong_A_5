import { useNavigate } from "react-router-dom";

export default function MiniHomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-center">
            🏠 미니홈
          </h1>
          <p className="text-center text-gray-600 mt-2">미니홈과 고양이 성장은 CatTower에서 관리합니다.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-xl">
          <p className="text-lg text-gray-700">
            고양이 꾸미기, 아이템 장착, 캐릭터 성장 기능은 CatTower 전용입니다.
          </p>
          <button
            onClick={() => navigate("/cattower")}
            className="mt-6 rounded-lg bg-orange-500 px-6 py-3 font-bold text-white transition-colors hover:bg-orange-600"
          >
            CatTower로 이동
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-orange-500">🎨</p>
            <p className="text-sm text-gray-600 mt-2">고양이 꾸미기</p>
            <p className="text-xs text-gray-500">CatTower에서 이용 가능</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-pink-500">🔗</p>
            <p className="text-sm text-gray-600 mt-2">미니홈 활동</p>
            <p className="text-xs text-gray-500">기록과 성장 데이터를 확인</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-purple-500">💬</p>
            <p className="text-sm text-gray-600 mt-2">커뮤니티</p>
            <p className="text-xs text-gray-500">동행/후기 중심 기능 유지</p>
          </div>
        </div>
      </div>
    </div>
  );
}