import { deepStrictEqual } from 'assert'

import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'
import { millis } from '@tsplus/stdlib/data/Duration'

import * as Fx from './index.js'

describe(import.meta.url, () => {
  describe('debounce', () => {
    it('favors the latest overlapping event', async () => {
      const test = pipe(Fx.fromIterable([1, 2, 3]), Fx.debounce(millis(100)), Fx.runCollect)

      deepStrictEqual(await Effect.unsafeRunPromise(test), [3])
    })
  })
})
