// axiosInstance(훅 외부)에서 React Router의 navigate를 사용하기 위한 브릿지
type NavigateFn = (path: string, options?: { replace?: boolean; state?: unknown }) => void

let _navigate: NavigateFn = (path) => {
  window.location.href = path  // navigate 등록 전 fallback
}

export const setNavigate = (fn: NavigateFn) => {
  _navigate = fn
}

export const navigateTo = (path: string, options?: { replace?: boolean; state?: unknown }) => {
  _navigate(path, options)
}