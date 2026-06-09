export function isPrivateMiniHomeForbidden(e: unknown): boolean {
  const err = e as { response?: { status?: number; data?: { message?: string } } };
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.message;
  return status === 403 && typeof serverMsg === "string" && serverMsg.includes("비공개");
}

/** 미니홈 API 공통 에러 메시지 (401/403/500) */
export function mapMiniHomeApiError(e: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  const err = e as {
    message?: string;
    response?: { status?: number; data?: { message?: string } };
  };
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.message;

  if (typeof serverMsg === "string" && serverMsg.trim()) return serverMsg;

  if (status === 401) {
    return serverMsg?.includes("Firebase")
      ? serverMsg
      : "로그인이 필요합니다. 다시 로그인한 뒤 저장해 주세요.";
  }
  if (status === 403) {
    if (typeof serverMsg === "string" && serverMsg.includes("비공개")) return serverMsg;
    return "접근할 수 없습니다.";
  }
  if (status === 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

  if (!status && err?.message?.includes("Network Error")) {
    return "백엔드에 연결할 수 없습니다. 서버가 실행 중인지 확인한 뒤 새로고침해 주세요.";
  }

  if (err?.message === "AUTH_REQUIRED") return "로그인이 필요합니다.";

  if (typeof err?.message === "string" && err.message.trim()) return err.message;
  return fallback;
}
