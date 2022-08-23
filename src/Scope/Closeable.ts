import { Left, Right } from 'hkt-ts/Either'
import { pipe } from 'hkt-ts/function'

import { Scope } from './Scope.js'

import { AnyExit, Exit } from '@/Exit/Exit.js'
import { Of, async, flatMap, fromLazy, lazy, success } from '@/Fx/Fx.js'
import { Service } from '@/Service/index.js'

export interface Closeable extends Scope {
  readonly close: (exit: Exit<any, any>) => Of<boolean> // Whether or not the scope has closed
}

export const Closeable = Service<Closeable>('Closeable')

export function wait(scope: Closeable) {
  return async<never, never, Exit<any, any>>((cb) => {
    if (scope.state.tag === 'Open') {
      const finalizer = scope.ensuring((exit) => fromLazy(() => cb(success(exit))))

      return Left(lazy(() => finalizer(Right(undefined))))
    }

    return Right(success(scope.state.exit))
  })
}

export function closeOrWait(scope: Closeable, exit: AnyExit) {
  return pipe(
    scope.close(exit),
    flatMap((closed) => (closed ? success(exit) : wait(scope))),
  )
}
