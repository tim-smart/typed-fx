import { Just, Maybe } from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import type { FiberRefs } from '../FiberRefs/FiberRefs.js'

import { Platform } from '@/Platform/Platform.js'

export interface FiberContext {
  readonly fiberRefs: FiberRefs
  readonly concurrencyLevel: NonNegativeInteger
  readonly interruptStatus: boolean
  readonly platform: Platform
  readonly parent: Maybe<FiberContext>
}

export function fork(context: FiberContext, overrides?: Partial<FiberContext>): FiberContext {
  return {
    ...context,
    ...overrides,
    fiberRefs: overrides?.fiberRefs ?? context.fiberRefs.fork(),
    parent: overrides?.parent ?? Just(context),
  }
}