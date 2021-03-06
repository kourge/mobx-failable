import {Enum} from 'typescript-string-enums';

import {Lazy} from './lazy';

/**
 * Future is a reactive counterpart to a Promise with MobX semantics. It has
 * three states: pending, success, and failure. It is an interface-only common
 * denominator between a `Failable` and a `Loadable`.
 *
 * The methods `success`, `failure`, and `pending` are actions used to change
 * between these states. The read-only properties are computed and indicate the
 * current state, but for day-to-day usage, prefer the `match` method.
 */
export interface Future<T> {
  /**
   * Indicates if this Future is a success.
   */
  readonly isSuccess: boolean;

  /**
   * Indicates if this Future is a failure.
   */
  readonly isFailure: boolean;

  /**
   * Indicates if this Future is pending.
   */
  readonly isPending: boolean;

  /**
   * Sets this Future to a success.
   * @param data The value associated with the success.
   * @returns This, enabling chaining.
   */
  success(data: T): this;

  /**
   * Sets this Future to a failure.
   * @param error The error associated with the failure.
   * @returns This, enabling chaining.
   */
  failure(error: Error): this;

  /**
   * Sets this Future to pending.
   * @returns This, enabling chaining.
   */
  pending(): this;

  /**
   * Invokes one of the provided callbacks that corresponds this Future's
   * current state.
   * @param options An object of callbacks to be invoked according to the state.
   * @returns The return value of whichever callback was selected.
   */
  match<A, B, C>(options: Future.MatchOptions<T, A, B, C>): A | B | C;

  /**
   * Accepts a promise by immediately setting this Future to pending, and then
   * either setting this Future to a success if the promise was fulfilled, or
   * setting this Future to a failure if the promise was rejected.
   * @param promise A promise to be accepted
   * @returns This, enabling chaining.
   */
  accept(promise: PromiseLike<T>): this;

  /**
   * Returns this Future's success value if it is a success, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-success
   * @returns This Future's success value or the provided default value
   */
  successOr<U>(defaultValue: Lazy<U>): T | U;

  /**
   * Returns this Future's error value if it is a failure, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-failure
   * @returns this Future's failure error or the provided default value
   */
  failureOr<U>(defaultValue: Lazy<U>): Error | U;

  /**
   * Derives a ReadonlyFuture that syncs with this Future using the given
   * options. For each transform function in the options, returning a value will
   * turn the derivation into a success with that value, whereas throwing an
   * error will turn it into a failure with that error value.
   *
   * The resulting derivation updates as the Future it is derived from updates
   * and changes state.
   * @param options An object of transform functions to be invoked according
   * to the state
   * @returns A derived ReadonlyFuture
   */
  derive<U>(options: Future.DeriveOptions<T, U>): ReadonlyFuture<U>;

  /**
   * Creates a derived ReadonlyFuture that syncs with this Future, except
   * success values are first transformed using the provided function `f`. When
   * the provided function throws, the derived ReadonlyFuture becomes a failure.
   *
   * This is a shorthand of calling `derive` with only a `success` function.
   * @param f The success transformation function
   * @returns A derived ReadonlyFuture
   */
  map<U>(f: (value: T) => U): ReadonlyFuture<U>;

  /**
   * Creates a derived ReadonlyFuture that syncs with this Future, except
   * error values are first transformed using the provided function `f`. When
   * the provided function returns, the derived ReadonlyFuture becomes a
   * success. When it throws, the derivation becomes a failure.
   *
   * This is a shorthand of calling `derive` with only a `failure` function.
   * @param f The failure transformation function
   * @returns A derived ReadonlyFuture
   */
  rescue<U = T>(f: (error: Error) => U): ReadonlyFuture<U>;
}

export namespace Future {
  // tslint:disable-next-line:variable-name
  export const State = Enum('pending', 'success', 'failure');
  /**
   * State represents the three possible states that a Future can fall under.
   */
  export type State = Enum<typeof State>;

  /**
   * MatchOptions is an object filled with callbacks. The `success` callback
   * receives whatever success value was just set. The `failure` callback
   * receives whatever error was just set. The `pending` callback does not
   * receive any values.
   */
  export interface MatchOptions<T, A, B, C> {
    success: (data: T) => A;
    failure: (error: Error) => B;
    pending: () => C;
  }

  /**
   * DeriveOptions is similar to MatchOptions, except only one callback is
   * required. The return value of any callback is accordingly re-wrapped in
   * another Future.
   */
  export type DeriveOptions<From, To> =
    | DeriveOptions.AtLeastSuccess<From, To>
    | DeriveOptions.AtLeastFailure<From, To>
    | DeriveOptions.AtLeastPending<From, To>;

  export namespace DeriveOptions {
    export interface AtLeastSuccess<From, To> {
      success: (data: From) => To;
      failure?: (error: Error) => To;
      pending?: () => To;
    }

    export interface AtLeastFailure<From, To> {
      success?: (data: From) => To;
      failure: (error: Error) => To;
      pending?: () => To;
    }

    export interface AtLeastPending<From, To> {
      success?: (data: From) => To;
      failure?: (error: Error) => To;
      pending: () => To;
    }
  }
}

/**
 * ReadonlyFuture is a read-only subset of Future.
 */
export interface ReadonlyFuture<T> {
  /**
   * Indicates if this Future is a success.
   */
  readonly isSuccess: boolean;

  /**
   * Indicates if this Future is a failure.
   */
  readonly isFailure: boolean;

  /**
   * Indicates if this Future is pending.
   */
  readonly isPending: boolean;

  /**
   * Invokes one of the provided callbacks that corresponds this Future's
   * current state.
   * @param options An object of callbacks to be invoked according to the state.
   * @returns The return value of whichever callback was selected.
   */
  match<A, B, C>(options: Future.MatchOptions<T, A, B, C>): A | B | C;

  /**
   * Returns this Future's success value if it is a success, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-success
   * @returns This Future's success value or the provided default value
   */
  successOr<U>(defaultValue: Lazy<U>): T | U;

  /**
   * Returns this Future's error value if it is a failure, or the provided
   * default value if it is not.
   * @param defaultValue A possibly lazy value to use in case of non-failure
   * @returns this Future's failure error or the provided default value
   */
  failureOr<U>(defaultValue: Lazy<U>): Error | U;

  /**
   * Derives a ReadonlyFuture that syncs with this Future using the given
   * options. For each transform function in the options, returning a value will
   * turn the derivation into a success with that value, whereas throwing an
   * error will turn it into a failure with that error value.
   *
   * The resulting derivation updates as the Future it is derived from updates
   * and changes state.
   * @param options An object of transform functions to be invoked according
   * to the state
   * @returns A derived ReadonlyFuture
   */
  derive<U>(options: Future.DeriveOptions<T, U>): ReadonlyFuture<U>;

  /**
   * Creates a derived ReadonlyFuture that syncs with this Future, except
   * success values are first transformed using the provided function `f`. When
   * the provided function throws, the derived ReadonlyFuture becomes a failure.
   *
   * This is a shorthand of calling `derive` with only a `success` function.
   * @param f The success transformation function
   * @returns A derived ReadonlyFuture
   */
  map<U>(f: (value: T) => U): ReadonlyFuture<U>;

  /**
   * Creates a derived ReadonlyFuture that syncs with this Future, except
   * error values are first transformed using the provided function `f`. When
   * the provided function returns, the derived ReadonlyFuture becomes a
   * success. When it throws, the derivation becomes a failure.
   *
   * This is a shorthand of calling `derive` with only a `failure` function.
   * @param f The failure transformation function
   * @returns A derived ReadonlyFuture
   */
  rescue<U = T>(f: (error: Error) => U): ReadonlyFuture<U>;
}

/**
 * This is a type-level check that will never execute at runtime. It ensures
 * that `ReadonlyFuture` is always a strict subset of `Future` by asserting
 * that a `Future` is assignable to a `ReadonlyFuture`.
 *
 * If the following block stops compiling, then there is likely something wrong
 * and incompatible with the definition of `ReadonlyFuture`.
 */
// tslint:disable prefer-const no-var-keyword no-unused-expression
false &&
  (() => {
    var future: Future<void>;
    var readonly: ReadonlyFuture<void> = future;
    readonly = readonly;
  })();
// tslint:enable
