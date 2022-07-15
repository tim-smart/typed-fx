import { isLeft } from 'hkt-ts/Either'

import { Stream } from './Stream'

import { Fiber } from '@/Fiber/Fiber'
import { FiberContext } from '@/FiberContext/index'
import { Fx, Of } from '@/Fx/Fx'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { result } from '@/Fx/index'
import { Drain, Sink, makeSink } from '@/Sink/Sink'

/**
 * The default method for creating a new FiberContext in which a Stream can safely run
 */
export const forkStreamContext = (fiberContext?: FiberContext): Of<FiberContext> =>
  Fx(function* () {
    // Use or get the fiber context to fork from
    const current = fiberContext ?? (yield* getFiberContext)

    // Always Fork a Fresh Scope + Scheduler to have most expected behaviors.
    const scope = yield* current.scope.fork
    const scheduler = current.scheduler.fork()
    const context: FiberContext = {
      ...current,
      scope,
      scheduler,
    }

    return context
  })

/**
 * Subscribe to a Stream
 */
export const subscribe = <R, E, A>(
  stream: Stream<R, E, A>,
  sink: Sink<E, A>,
  context: FiberContext,
) => stream.run(sink, context)

export const observe =
  <A, R2, E2>(f: (a: A) => Fx<R2, E2, any>) =>
  <R, E>(stream: Stream<R, E, A>): Fx<R | R2, never, Fiber<E | E2, unknown>> =>
    Fx(function* () {
      const context = yield* forkStreamContext()
      const sink = yield* makeSink((x: A) =>
        Fx(function* () {
          const exit = yield* result(f(x))

          if (isLeft(exit)) {
            yield* context.scope.close(exit)
          }
        }),
      )

      return yield* subscribe(stream, sink, context)
    })

export const drain = <R, E, A>(stream: Stream<R, E, A>) =>
  Fx(function* () {
    return yield* subscribe(stream, Drain, yield* forkStreamContext())
  })