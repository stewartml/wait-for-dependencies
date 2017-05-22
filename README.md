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

Since the above pattern of waiting on functions is the main use case, there is
a utility class `WaitForFunction`.  Using this, we can rewrite the above as:

```js
import { WaitForFunction, Waiter<Function> } from 'wait-for-dependencies';

const w = new WaitForFunction();

async function task1(wait: Waiter<Function>) {
  await wait(task2);
  // ...do some things
}

async function task2(wait: Waiter<Function>) {
  // ...do some things
}

w.run([task1, task2]);
```

Some of the boilerplate is handled for you.

## API

#### `WaitFor<T>#constructor(stallDetection: StallDetection = StallDetection.throw)`

The `stallDetection` parameter guides what to do if a task waits on an unknown task.
See `map` for details.

#### `map<V>(items: T[], mapFn: (t: T, wait?: Waiter<T>, i?: number) => Promise<V>): Promise<V[]>`

Maps over an array of items.  The `stallDetection` parameter passed to the constructor
guides what to do if a task waits on an unknown task.  That is, for each call to `map`,
if any task waits on an item not given in the `items` parameter, whether to throw
an `Error`, remove the promise from the result value, or not bother trying to detect
such an occurence.

#### `WaitFor<T>#waitFor(id: T, dependencies: T[])`

Waits for the specified list of dependencies.  The waiting task's own ID has to be passed
as the first argument, so that cycle checking can work.

#### `WaitFor<T>#ready(id: T, value?: any)`

Signals that the specified dependency is ready; that is, that anything waiting on it can
now proceed.  The optional `value` parameter allows a value to be passed back as the resolved
value from any `waitFor` calls.

#### `WaitForFunction#run(funcs: Function[], ...args: any[])`

Runs the array of functions, passing each one any `args` and a Waiter as the final argument.
