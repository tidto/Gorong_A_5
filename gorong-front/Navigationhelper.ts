// axiosInstance(훅 외부)에서 React Router의 navigate를 사용하기 위한 브릿지
// AppRouter에서 navigate를 등록해두면 어디서든 호출 가능

type NavigateFn = (path: string, options?: { replace?: boolean; state?: unknown }) => void

let _navigate: NavigateFn = (path) => {
  window.location.href = path // navigate 등록 전 fallback
}

export const setNavigate = (fn: NavigateFn) => {
  _navigate = fn
}

export const navigateTo = (path: string, options?: { replace?: boolean; state?: unknown }) => {
  _navigate(path, options)
}
