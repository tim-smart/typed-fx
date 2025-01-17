import * as EffectStream from '@effect/core/Stream/Stream'
import { pipe } from '@fp-ts/data/Function'
import * as M from '@most/core'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'
import * as rxjs from 'rxjs'

import {
  array,
  effectTsStreamTest,
  fxTest,
  iterations,
  mostStreamTest,
  rxjsObservableTest,
} from '../_internal.js'

import * as Stream from '@/index.js'

const nestedArray = array.map((x) => Array.from({ length: x }, (_, i) => x * 1000 + i))

const add = (x: number, y: number): number => x + y

export const name = 'flatMap ' + iterations + ' x ' + iterations + ' integers'
export const cases = [
  fxTest(() =>
    pipe(
      Stream.fromIterable(nestedArray),
      Stream.flatMap(Stream.fromIterable),
      Stream.scan(0, add),
    ),
  ),
  mostStreamTest(() =>
    pipe(
      M.periodic(0),
      M.withItems(nestedArray),
      M.chain((ns) => pipe(M.periodic(0), M.withItems(ns))),
      M.scan(add, 0),
    ),
  ),
  rxjsObservableTest(() =>
    pipe(rxjs.from(nestedArray), rxjs.flatMap(rxjs.from), rxjs.scan(add, 0)),
  ),
  effectTsStreamTest(() =>
    pipe(
      EffectStream.fromChunk(Chunk.from(nestedArray)),
      EffectStream.flatMap((ns) => EffectStream.fromChunk(Chunk.from(ns))),
      EffectStream.scan(0, add),
    ),
  ),
]
