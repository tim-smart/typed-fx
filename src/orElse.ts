import * as Cause from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import { flow, pipe } from '@fp-ts/data/Function'
import * as Either from '@tsplus/stdlib/data/Either'

import { Fx } from './Fx.js'
import { failCause } from './fromEffect.js'
import { runObserve } from './runObserve.js'

export function orElseCause<E, R2, E2, B>(f: (cause: Cause.Cause<E>) => Fx<R2, E2, B>) {
  return <R, A>(fx: Fx<R, E, A>): Fx<R | R2, E2, A | B> => orElseCause_(fx, f)
}

export function orElse<E, R2, E2, B>(f: (error: E) => Fx<R2, E2, B>) {
  return <R, A>(fx: Fx<R, E, A>): Fx<R | R2, E2, A | B> =>
    orElseCause_(fx, flow(Cause.failureOrCause, Either.fold(f, failCause)))
}

function orElseCause_<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (cause: Cause.Cause<E>) => Fx<R2, E2, B>,
): Fx<R | R2, E2, A | B> {
  return Fx((emitter) => {
    return pipe(
      fx,
      runObserve(emitter.emit),
      Effect.foldCauseEffect(
        (c) => f(c).run(emitter),
        () => emitter.end,
      ),
    )
  })
}
