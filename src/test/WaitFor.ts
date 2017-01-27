import test from 'ava';
import WaitFor from '../lib/WaitFor';

test('it waits', async (t) => {
  let w = new WaitFor<number>();
  let nums = [];
  let p = w.waitFor(1, [2]).then(() => nums.push(1));

  Promise.resolve(null).then(() => {
    nums.push(2)
    w.ready(2);
  });

  await p;
  t.deepEqual(nums, [2, 1]);
});


test('it resolves immediately if already completed', async (t) => {
  let w = new WaitFor<number>();
  w.ready(1);
  await w.waitFor(2, [1]);
});


test('it throws on a cycle', async (t) => {
  let w = new WaitFor<number>();
  w.waitFor(1, [2])
  t.throws(() => w.waitFor(2, [1]));
});


test('it can pass a value', async (t) => {
  let w = new WaitFor<number>();
  w.ready(1, 'hello');
  t.is((await w.waitFor(2, [1]))[0], 'hello');
});
