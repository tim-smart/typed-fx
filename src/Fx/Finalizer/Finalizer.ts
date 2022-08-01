import { Branded } from 'hkt-ts/Branded'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Eff } from '../Eff/Eff.js'

import { Exit } from '@/Fx/Exit/Exit.js'

export interface Finalizer<Y> {
  (exit: Exit<any, any>): Eff<Y, unknown>
}

export type FinalizerKey = Branded<{ readonly FinalizerKey: FinalizerKey }, symbol>
export const FinalizerKey = Branded<FinalizerKey>()

export type FinalizationStrategy = SequentialStrategy | ConcurrentStrategy | ConcurrentNStrategy

export interface SequentialStrategy {
  readonly strategy: 'Sequential'
}
export const SequentialStrategy: SequentialStrategy = { strategy: 'Sequential' }

export interface ConcurrentStrategy {
  readonly strategy: 'Concurrent'
}
export const ConcurrentStrategy: ConcurrentStrategy = { strategy: 'Concurrent' }

export interface ConcurrentNStrategy {
  readonly strategy: 'ConcurrentN'
  readonly concurrency: NonNegativeInteger
}

export const ConcurrentNStrategy = (concurency: NonNegativeInteger): ConcurrentNStrategy => ({
  strategy: 'ConcurrentN',
  concurrency: concurency,
})

export function finalizationStrategyToConcurrency(
  strategy: FinalizationStrategy,
): NonNegativeInteger {
  if (strategy.strategy === 'Sequential') {
    return NonNegativeInteger(1)
  }

  if (strategy.strategy === 'Concurrent') {
    return NonNegativeInteger(Number.MAX_SAFE_INTEGER)
  }

  return strategy.concurrency
}
