import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as FiberId from '@effect/core/io/FiberId'
import { Scope } from '@effect/core/io/Scope'
import { pipe } from '@fp-ts/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Push } from './Push.js'
import { asap } from './_internal.js'
import { Multicast, MulticastObserver } from './multicast.js'

export function hold<R, E, A>(push: Push<R, E, A>): Push<R, E, A> {
  return new Hold(push)
}

export class Hold<R, E, A> extends Multicast<R, E, A> {
  protected _value: Maybe.Maybe<A> = Maybe.none
  protected _pendingEmitters: Array<readonly [Emitter<unknown, E, A>, A[]]> = []
  protected _scheduledFiber: Fiber.RealFiber<any, any> | undefined

  constructor(readonly push: Push<R, E, A>) {
    super(push)
  }

  run<R2>(emitter: Emitter<R2, E, A>): Effect.Effect<R | R2 | Scope, never, unknown> {
    if (this.shouldScheduleFlush()) {
      return pipe(
        this.scheduleFlush(emitter),
        Effect.flatMap(() => super.run(emitter)),
      )
    }

    return super.run(emitter)
  }

  emit(value: A) {
    return Effect.suspendSucceed(() => {
      this.addValue(value)

      return pipe(
        this.flushPending(),
        Effect.flatMap(() => super.emit(value)),
      )
    })
  }

  failCause(cause: Cause<E>) {
    return Effect.suspendSucceed(() =>
      pipe(
        this.flushPending(),
        Effect.flatMap(() => super.failCause(cause)),
      ),
    )
  }

  get end() {
    return Effect.suspendSucceed(() =>
      pipe(
        this.flushPending(),
        Effect.flatMap(() => super.end),
      ),
    )
  }

  protected shouldScheduleFlush() {
    return Maybe.isSome(this._value) && this.observers.length > 0
  }

  protected scheduleFlush<R>(observer: Emitter<R, E, A>) {
    this._pendingEmitters.push([
      observer,
      pipe(
        this._value,
        Maybe.fold(
          () => [],
          (a) => [a],
        ),
      ),
    ])

    const interrupt = this._scheduledFiber
      ? this._scheduledFiber.interruptAsFork(new FiberId.None())
      : Effect.unit

    this._scheduledFiber = undefined

    return pipe(
      interrupt,
      Effect.flatMap(() => this.flushPending()),
      Effect.schedule(asap),
      Effect.forkScoped,
      Effect.tap((fiber: Fiber.RealFiber<any, any>) =>
        Effect.sync(() => (this._scheduledFiber = fiber)),
      ),
    )
  }

  protected flushPending() {
    if (this._pendingEmitters.length === 0) {
      return Effect.unit
    }

    const pendingEmitters = this._pendingEmitters
    this._pendingEmitters = []

    return Effect.forEachDiscard(pendingEmitters, (pending) =>
      Effect.suspendSucceed(() => {
        const [emitter, values] = pending
        const observer = this.findObserver(emitter)

        if (!observer) {
          return Effect.unit
        }

        return Effect.forEachDiscard(values, (value) => this.runEvent(value, observer))
      }),
    )
  }

  protected addValue(value: A) {
    this._value = Maybe.some(value)

    this._pendingEmitters.forEach(([, values]) => {
      values.push(value)
    })
  }

  protected findObserver(emitter: Emitter<unknown, E, A>): MulticastObserver<E, A> | undefined {
    return this.observers.find((o) => o.emitter === emitter)
  }
}