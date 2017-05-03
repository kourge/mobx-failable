import {computed, useStrict, when} from 'mobx';
import {Enum} from 'typescript-string-enums';

import {Loadable as L} from './loadable';

useStrict(true);

describe('Loadable (mutable)', () => {
  class Loadable<T> extends L<T> {
    @computed get internalData(): T | Error | undefined { return this.data; }
    @computed get internalState(): L.State { return this.state; }

    calledSuccess = false;
    didBecomeSuccess(_: T) { this.calledSuccess = true; }

    calledFailure = false;
    didBecomeFailure(_: Error) { this.calledFailure = true; }

    calledLoading = false;
    didBecomeLoading() { this.calledLoading = true; }
  }

  const successValue = 3;
  const failureValue = new Error();

  type LoadableFactory<T> = {[State in L.State]: () => Loadable<T>};

  const make: LoadableFactory<number> = {
    empty: () => new Loadable<number>(),
    pending: () => new Loadable<number>().pending(),
    success: () => new Loadable<number>().success(successValue),
    reloading: () => new Loadable<number>().success(successValue).pending(),
    failure: () => new Loadable<number>().failure(failureValue),
    retrying: () => new Loadable<number>().failure(failureValue).pending(),
  };

  describe('constructor', () => {
    it('initializes the state as empty', () => {
      const l = new Loadable<any>();

      expect(l.internalState).toEqual(L.State.empty);
    });
  });

  describe('success', () => {
    let l: Loadable<number>;
    beforeEach(() => l = make.success());

    it('sets the internal state to success', () => {
      expect(l.internalState).toEqual(L.State.success);
    });

    it('sets the internal data to the given value', () => {
      expect(l.internalData).toEqual(successValue);
    });

    it('invokes didBecomeSuccess', () => {
      expect(l.calledSuccess).toBe(true);
      expect(l.calledFailure).toBe(false);
      expect(l.calledLoading).toBe(false);
    });
  });

  describe('failure', () => {
    let l: Loadable<number>;
    beforeEach(() => l = make.failure());

    it('sets the internal state to failure', () => {
      expect(l.internalState).toEqual(L.State.failure);
    });

    it('sets the internal data to the given value', () => {
      expect(l.internalData).toEqual(failureValue);
    });

    it('invokes didBecomeFailure', () => {
      expect(l.calledSuccess).toBe(false);
      expect(l.calledFailure).toBe(true);
      expect(l.calledLoading).toBe(false);
    });
  });

  describe('loading', () => {
    it('sets the internal state to reloading when success', () => {
      const l = make.success().loading();

      expect(l.internalState).toEqual(L.State.reloading);
      expect(l.internalData).toEqual(successValue);
    });

    it('sets the internal state to retrying when failure', () => {
      const l = make.failure().loading();

      expect(l.internalState).toEqual(L.State.retrying);
      expect(l.internalData).toEqual(failureValue);
    });

    it('sets the internal state to pending when empty', () => {
      const l = make.empty().loading();

      expect(l.internalState).toEqual(L.State.pending);
      expect(l.internalData).toEqual(undefined);
    });

    it('invokes didBecomeLoading', () => {
      const l = make.empty().loading();

      expect(l.calledSuccess).toBe(false);
      expect(l.calledFailure).toBe(false);
      expect(l.calledLoading).toBe(true);
    });

    it('does nothing when already loading', () => {
      for (const l of [make.pending(), make.reloading(), make.retrying()]) {
        l.calledLoading = false;
        l.loading();

        expect(l.calledLoading).toBe(false);
      }
    });
  });

  describe('pending', () => {
    it('calls `loading`', () => {
      const l = make.empty();
      const loading = jest.fn(l.loading);
      l.loading = loading;
      l.pending();

      expect(loading).toBeCalled();
    });
  });

  function expectProperties<T, K extends keyof Loadable<T>>(
    factory: LoadableFactory<T>,
    propertyName: K,
    expectations: {[State in L.State]: Loadable<T>[K]},
  ): void {
    for (const state of Enum.keys(L.State)) {
      const l = factory[state]();
      const expected = expectations[state];
      const actual = l[propertyName];

      it(`is ${expected} when ${state}`, () => {
        expect(actual).toEqual(expected);
      });
    }
  }

  describe('isSuccess', () => {
    expectProperties(make, 'isSuccess', {
      success: true,
      reloading: true,
      failure: false,
      retrying: false,
      empty: false,
      pending: false,
    });
  });

  describe('isFailure', () => {
    expectProperties(make, 'isFailure', {
      success: false,
      reloading: false,
      failure: true,
      retrying: true,
      empty: false,
      pending: false,
    });
  });

  describe('isPending', () => {
    expectProperties(make, 'isPending', {
      success: false,
      reloading: false,
      failure: false,
      retrying: false,
      empty: true,
      pending: true,
    });
  });

  describe('isLoading', () => {
    expectProperties(make, 'isLoading', {
      success: false,
      reloading: true,
      failure: false,
      retrying: true,
      empty: false,
      pending: true,
    });
  });

  describe('match', () => {
    let success: jest.Mock<{}>;
    let failure: jest.Mock<{}>;
    let pending: jest.Mock<{}>;
    beforeEach(() => {
      [success, failure, pending] = [jest.fn(), jest.fn(), jest.fn()];
    });

    describe('when availability is none', () => {
      it('invokes the handler with false when empty', () => {
        make.empty().match({success, failure, pending});

        expect(success).not.toBeCalled();
        expect(failure).not.toBeCalled();
        expect(pending).toBeCalledWith(false);
      });

      it('invokes the handler with true when pending', () => {
        make.pending().match({success, failure, pending});

        expect(success).not.toBeCalled();
        expect(failure).not.toBeCalled();
        expect(pending).toBeCalledWith(true);
      });
    });

    describe('when availability is value', () => {
      it('invokes the handler with (value, false) when success', () => {
        make.success().match({success, failure, pending});

        expect(success).toBeCalledWith(successValue, false);
        expect(failure).not.toBeCalled();
        expect(pending).not.toBeCalled();
      });

      it('invokes the handler with (value, true) when reloading', () => {
        make.reloading().match({success, failure, pending});

        expect(success).toBeCalledWith(successValue, true);
        expect(failure).not.toBeCalled();
        expect(pending).not.toBeCalled();
      });
    });

    describe('when availability is error', () => {
      it('invokes the handler with (error, false) when failure', () => {
        make.failure().match({success, failure, pending});

        expect(success).not.toBeCalled();
        expect(failure).toBeCalledWith(failureValue, false);
        expect(pending).not.toBeCalled();
      });

      it('invokes the handler with (error, true) when retrying', () => {
        make.retrying().match({success, failure, pending});

        expect(success).not.toBeCalled();
        expect(failure).toBeCalledWith(failureValue, true);
        expect(pending).not.toBeCalled();
      });
    });
  });

  describe('accept', () => {
    const never = new Promise<never>((_resolve, _reject) => {/* */});
    const resolved = Promise.resolve(successValue);
    const rejected = Promise.reject(failureValue);
    // Suppress PromiseRejectionHandledWarning in node:
    rejected.catch(() => {/* */});

    it('first transitions to pending when empty', () => {
      const l = make.empty();
      const previousData = l.internalData;
      l.accept(never);

      expect(l.internalState).toEqual(L.State.pending);
      expect(l.internalData).toEqual(previousData);
    });

    it('first transitions to reloading when success', () => {
      const l = make.success();
      const previousData = l.internalData;
      l.accept(never);

      expect(l.internalState).toEqual(L.State.reloading);
      expect(l.internalData).toEqual(previousData);
    });

    it('first transitions to retrying when failure', () => {
      const l = make.failure();
      const previousData = l.internalData;
      l.accept(never);

      expect(l.internalState).toEqual(L.State.retrying);
      expect(l.internalData).toEqual(previousData);
    });

    it('transitions to success when the promise is fulfilled', done => {
      const l = make.empty();
      l.accept(resolved);

      when(
        () => !l.isPending,
        () => {
          expect(l.internalState).toEqual(L.State.success);
          expect(l.internalData).toEqual(successValue);
          done();
        },
      );
    });

    it('transitions to failure when the promise is rejected', done => {
      const l = make.empty();
      l.accept(rejected);

      when(
        () => !l.isPending,
        () => {
          expect(l.internalState).toEqual(L.State.failure);
          expect(l.internalData).toEqual(failureValue);
          done();
        },
      );
    });
  });

  describe('successOr', () => {
    const fallback = 'foo';

    it('returns the value when success', () => {
      const result = make.success().successOr(fallback);

      expect(result).toEqual(successValue);
      expect(result).not.toEqual(fallback);
    });

    it('returns the value when reloading', () => {
      const result = make.reloading().successOr(fallback);

      expect(result).toEqual(successValue);
      expect(result).not.toEqual(fallback);
    });

    it('returns the fallback when failure', () => {
      const result = make.failure().successOr(fallback);

      expect(result).not.toEqual(successValue);
      expect(result).toEqual(fallback);
    });

    it('returns the fallback when retrying', () => {
      const result = make.retrying().successOr(fallback);

      expect(result).not.toEqual(successValue);
      expect(result).toEqual(fallback);
    });

    it('returns the fallback when empty', () => {
      const result = make.empty().successOr(fallback);

      expect(result).not.toEqual(successValue);
      expect(result).toEqual(fallback);
    });

    it('returns the fallback when pending', () => {
      const result = make.pending().successOr(fallback);

      expect(result).not.toEqual(successValue);
      expect(result).toEqual(fallback);
    });
  });

  describe('failureOr', () => {
    const fallback = 'foo';

    it('returns the fallback when success', () => {
      const result = make.success().failureOr(fallback);

      expect(result).not.toEqual(failureValue);
      expect(result).toEqual(fallback);
    });

    it('returns the fallback when reloading', () => {
      const result = make.reloading().failureOr(fallback);

      expect(result).not.toEqual(failureValue);
      expect(result).toEqual(fallback);
    });

    it('returns the error when failure', () => {
      const result = make.failure().failureOr(fallback);

      expect(result).toEqual(failureValue);
      expect(result).not.toEqual(fallback);
    });

    it('returns the error when retrying', () => {
      const result = make.retrying().failureOr(fallback);

      expect(result).toEqual(failureValue);
      expect(result).not.toEqual(fallback);
    });

    it('returns the fallback when empty', () => {
      const result = make.empty().failureOr(fallback);

      expect(result).not.toEqual(failureValue);
      expect(result).toEqual(fallback);
    });

    it('returns the fallback when pending', () => {
      const result = make.pending().failureOr(fallback);

      expect(result).not.toEqual(failureValue);
      expect(result).toEqual(fallback);
    });
  });
});