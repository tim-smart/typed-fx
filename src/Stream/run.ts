import { flow, pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { drain } from './drain.js'

import * as Fx from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'

export function run(scheduler: Scheduler) {
  return <E, A>(stream: Stream<never, E, A>): Fx.Fx<never, E, unknown> =>
    pipe(drain(stream), Fx.flatMap(Fx.join), Fx.provideService(Scheduler, scheduler))
}

export const runMain = (scheduler: Scheduler) => flow(run(scheduler), Fx.runMain)