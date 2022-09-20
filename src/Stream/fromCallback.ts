import { flow, pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/index.js'
import { Fiber, Synthetic } from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import * as Fx from '@/Fx/index.js'
import { Runtime } from '@/Runtime/Runtime.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { closeOrWait, wait } from '@/Scope/Closeable.js'
import { Sink, addTrace } from '@/Sink/Sink.js'
import { Exit } from '@/index.js'

export interface CallbackSink<E, A> {
  readonly event: (a: A) => Promise<any>
  readonly error: (cause: Cause<E>) => Promise<any>
  readonly end: () => Promise<any>
}

export function fromCallback<E, A>(
  f: (sink: CallbackSink<E, A>) => Finalizer | void | Promise<Finalizer | void>,
  __trace?: string,
): Stream<never, E, A> {
  return new FromCallback<E, A>(f, __trace)
}

export class FromCallback<E, A> implements Stream<never, E, A> {
  constructor(
    readonly f: (sink: CallbackSink<E, A>) => Finalizer | void | Promise<Finalizer | void>,
    readonly __trace?: string,
  ) {}

  fork = <E2>(
    sink: Sink<E, A, E2>,
    _: Scheduler,
    context: FiberContext<FiberId.Live>,
  ): Fx.RIO<never, Fiber<E2, any>> => {
    return Fx.lazy(() => {
      const { f, __trace } = this

      const runtime = Runtime(context)
      const tracedSink = addTrace(sink, __trace)
      const cbSink: CallbackSink<E, A> = {
        event: flow(tracedSink.event, runtime.run),
        error: (cause) =>
          pipe(
            cause,
            tracedSink.error,
            Fx.tap(() => Fx.fork(context.scope.close(Left(cause)))),
            runtime.run,
          ),
        end: () =>
          pipe(
            tracedSink.end,
            Fx.tap(() => Fx.fork(context.scope.close(Right(undefined)))),
            runtime.run,
          ),
      }

      const synthetic = Synthetic({
        id: new FiberId.Synthetic([context.id]),
        exit: wait(context.scope),
        inheritFiberRefs: pipe(
          Fx.getFiberRefs,
          Fx.flatMap((refs) => Fx.fromLazy(() => FiberRefs.join(refs, context.fiberRefs))),
        ),
        interruptAs: (id) => closeOrWait(context.scope)(Exit.interrupt(id)),
      })

      return pipe(
        Fx.fromPromise(async () => await f(cbSink)),
        Fx.tap(
          (finalizer) =>
            (finalizer &&
              (context.scope.state.tag === 'Open'
                ? Fx.fromLazy(() => context.scope.ensuring(finalizer))
                : finalizer(context.scope.state.exit))) ??
            Fx.unit,
        ),
        Fx.fork,
        Fx.map(() => synthetic),
      )
    })
  }
}
