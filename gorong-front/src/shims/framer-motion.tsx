import React from 'react'

export type Transition = Record<string, unknown>
export type Variants = Record<string, unknown>

type AnyProps = Record<string, unknown>

type MotionFactory = {
  [K in keyof JSX.IntrinsicElements]: React.ForwardRefExoticComponent<any>
} & ((props: AnyProps) => JSX.Element)

function buildComponent(tag: keyof JSX.IntrinsicElements) {
  return React.forwardRef<any, any>(function MotionTag(props, ref) {
    const {
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      layout,
      layoutId,
      variants,
      ...rest
    } = props || {}

    void initial
    void animate
    void exit
    void transition
    void whileHover
    void whileTap
    void layout
    void layoutId
    void variants

    return React.createElement(tag, { ...rest, ref })
  })
}

const motionProxy = new Proxy(
  (props: AnyProps) => <div {...props} />,
  {
    get: (_target, prop: string) => buildComponent(prop as keyof JSX.IntrinsicElements),
  }
) as MotionFactory

export const motion = motionProxy

export function AnimatePresence({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

export function useSpring(value: number) {
  return value
}

export function useTransform<T>(value: T, _input?: unknown, _output?: unknown) {
  return value
}
