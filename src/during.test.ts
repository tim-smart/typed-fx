import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import * as TestClock from '@effect/core/testing/TestClock'
import { TestEnvironment } from '@effect/core/testing/TestEnvironment'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe(Fx.during.name, () => {
    it('runs a stream during a signal is emitted to stop', async () => {
      const sut = Effect.gen(function* ($) {
        const fiber = yield* $(
          pipe(
            Fx.periodic(millis(10)),
            Fx.scan(0, (x) => x + 1),
            Fx.during(Fx.at(millis(50))(Fx.at(millis(50))(null))),
            Fx.runCollect,
            Effect.fork,
          ),
        )

        for (let i = 0; i < 10; i++) {
          yield* $(TestClock.adjust(millis(10)))
        }

        return yield* $(Fiber.join(fiber))
      })

      const test = pipe(sut, Effect.provideLayer(TestEnvironment))
      const events = await Effect.unsafeRunPromise(test)

      deepStrictEqual(events, [6, 7, 8, 9, 10])
    })
  })
})
