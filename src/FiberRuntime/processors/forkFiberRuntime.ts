import { Just } from 'hkt-ts/Maybe'

// eslint-disable-next-line import/no-cycle
import { FiberRuntime } from '../FiberRuntime'
import { FiberRuntimeParams } from '../FiberRuntimeParams'
import { GetCurrentFiberContext, GetEnvironment } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'

import { Env } from '@/Env/Env'
import { LiveFiber } from '@/Fiber/Fiber'
import { FiberContext } from '@/FiberContext/index'
import { FiberId } from '@/FiberId/FiberId'
import { wait } from '@/Future/wait'
import { Fx } from '@/Fx/Fx'
import type { ForkParams } from '@/Fx/InstructionSet/Fork'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { fromLazy } from '@/Fx/lazy'
import { acquire } from '@/Semaphore/Semaphore'
import { None } from '@/Supervisor/None'

export function* forkFiberRuntime<R, E, A>(
  fx: Fx<R, E, A>,
  options: ForkParams<R>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
) {
  const context: FiberContext = yield new GetCurrentFiberContext()
  const env: Env<R> = yield new GetEnvironment()
  const fiberId = FiberId(
    context.platform.sequenceNumber.increment,
    context.scheduler.currentTime(),
  )
  const params: FiberRuntimeParams<R> = {
    fiberId,
    env,
    scheduler: context.scheduler,
    supervisor: None,
    fiberRefs: options.fiberRefs ?? (yield* toRuntimeIterable(context.fiberRefs.fork)),
    scope: options.scope ?? (yield* toRuntimeIterable(context.scope.fork)),
    platform: context.platform,
    parent: Just(context),
    ...options,
  }

  return new FiberRuntime(acquire(context.semaphore)(fx), params)
}

export function fromFiberRuntime<R, E, A>(runtime: FiberRuntime<R, E, A>): LiveFiber<E, A> {
  return new LiveFiber(
    runtime.params.fiberId,
    fromLazy(() => runtime.context),
    fromLazy(() => runtime.stackTrace),
    wait(runtime.exit),
    Fx(function* () {
      const { fiberRefs } = yield* getFiberContext

      yield* fiberRefs.join(runtime.context.fiberRefs)
    }),
    runtime.interrupt,
  )
}