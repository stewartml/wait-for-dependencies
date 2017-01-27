# wait-for-dependencies

This library provides a class which can be used to wait on dependencies, with
automatic cycle detection.

## Usage

Install:

    $ npm install --save wait-for-dependencies

Import and instantiate:

```js
import WaitFor from 'wait-for-dependencies';

const w = new WaitFor<Function>();

async function task1() {
  await w.waitFor(task1, [task2]);
  // ...do some things
  w.ready(task1);
}

async function task2() {
  // ...do some things
  w.ready(task2);
}

Promise.all([task1(), task2()])
```

In the example above, we define two asynchronous tasks, `task1` and `task2`.
The former has a dependency on the latter, and will not continue until after
`task2` is done.

Note that if `task2` attempted to wait on `task1`, a dependency cycle would be
detected and an exception thrown.

## API

#### `WaitFor<T>#waitFor(id: T, dependencies: T[])`

Waits for the specified list of dependencies.  The waiting task's own ID has to be passed
as the first argument, so that cycle checking can work.

#### `WaitFor<T>#ready(id: T, value?: any)`

Signals that the specified dependency is ready; that is, that anything waiting on it can
now proceed.  The optional `value` parameter allows a value to be passed back as the resolved
value from any `waitFor` calls.
