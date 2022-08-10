import type { Fx } from '../Fx.js'

import type { Access, Provide } from './Access.js'
import type { AddTrace } from './AddTrace.js'
import type { Async } from './Async.js'
import { Ensuring } from './Ensuring.js'
import type { Failure } from './Failure.js'
import type { Fork } from './Fork.js'
import type { FromLazy } from './FromLazy.js'
import type { GetFiberContext } from './GetFiberContext.js'
import type { GetFiberScope } from './GetFiberScope.js'
import type { GetTrace } from './GetTrace.js'
import { Join } from './Join.js'
import { RaceAll } from './RaceAll.js'
import type { SetInterruptStatus } from './SetInterruptStatus.js'
import type { WithConcurrency } from './WithConcurrency.js'
import type { ZipAll } from './ZipAll.js'

export type Instruction<R, E, A> =
  | Access<R, R, E, A>
  | AddTrace<R, E, A>
  | Async<R, E, A>
  | Ensuring<R, E, A>
  | Failure<E>
  | Fork<R, any, A>
  | FromLazy<A>
  | GetFiberContext
  | GetFiberScope
  | GetTrace
  | Join<E, A>
  | Provide<any, E, A>
  | RaceAll<ReadonlyArray<Fx<R, E, any>>>
  | SetInterruptStatus<R, E, A>
  | WithConcurrency<R, E, A>
  | ZipAll<ReadonlyArray<Fx<R, E, any>>>

export type AnyInstruction =
  | Instruction<any, any, any>
  | Instruction<never, never, any>
  | Instruction<never, any, any>
  | Instruction<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */

export type ResourcesFromInstruction<T> = T extends AnyInstruction
  ? ReturnType<T['__R']> // Attempt to shortcut the inference process
  : never

export type ErrorsFromInstruction<T> = T extends AnyInstruction
  ? ReturnType<T['__E']> // Attempt to shortcut the inference process
  : never

export type OutputFromInstruction<T> = T extends AnyInstruction
  ? ReturnType<T['__A']> // Attempt to shortcut the inference process
  : never

/* eslint-enable @typescript-eslint/no-unused-vars */