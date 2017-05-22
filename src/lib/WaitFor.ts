
interface DependencyNode<T> {
  dependencies: T[];
};


class Deferred<T> {
  promise: Promise<T>;
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}


/**
 * Basically a curried WaitFor.waitFor
 */
export interface Waiter<T> {
  (...dependencies: T[]): Promise<any[]>
};


/**
 * Determines how map should treat waiting on unknown items.
 */
export enum StallDetection {
  /**
   * An exception should be thrown if there are items waiting on unknown items.
   */
  throw,
  /**
   * The items with unknown dependencies should be filtered out of the await.
   */
  filter,
  /**
   * No stall detection should be done.
   */
  none
}


/**
 * Waits for dependencies.
 */
export default class WaitFor<T> {
  private dependencies: Map<T, DependencyNode<T>>;
  private deferreds: Map<T, Deferred<any>>;

  constructor(private stallDetection: StallDetection = StallDetection.throw) {
    this.dependencies = new Map<T, DependencyNode<T>>();
    this.deferreds = new Map<T, Deferred<any>>();
  }


  /**
   * Wait for the specified dependencies.
   * @param id the ID of the waiting task
   * @param dependencies an array of IDs to wait on
   */
  waitFor(id: T, dependencies: T[]) {
    let node: DependencyNode<T> = {dependencies};
    this.dependencies.set(id, node);

    if (this._checkForCycle(id))
      throw new Error(`dependency cycle detected in ${getName(id)}`);

    let promises = [];

    for (let dependency of dependencies) {
      promises.push(this._getDeferredFor(dependency).promise);
    }

    return Promise.all(promises);
  }


  /**
   * Gets a Waiter for the specified task.
   * @param id the ID of the waiting task
   */
  getWaiter(id: T): Waiter<T> {
    return (...dependencies: T[]) => this.waitFor(id, dependencies);
  }


  /**
   * Maps over a list of items
   * @param items the items to map
   * @param mapFn the map function to use - it is passed the item, a Waiter for the item, and the index
   */
  map<V>(items: T[], mapFn: (t: T, wait?: Waiter<T>, i?: number) => Promise<V>): Promise<V[]> {
    const promises = items.map(
      (item, i) => mapFn(item, this.getWaiter(item), i)
        .then((r) => (this.ready(item), r))
    );

    if (this.stallDetection !== StallDetection.none) {
      const stalled = [], done = [];
      const set = new Set(items);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const promise = promises[i];
        const deps = this.dependencies.get(item);

        if (deps && deps.dependencies.filter((x) => !set.has(x)).length) {
          stalled.push(item);

        } else {
          done.push(promise);
        }
      }

      if (this.stallDetection === StallDetection.throw && stalled.length) {
        return Promise.reject(new Error('Tasks with unknown dependencies: ' +
          stalled.map(getName)));
      
      } else {
        return Promise.all(done);
      }

    } else {
      return Promise.all(promises);
    }
  }

  
  /**
   * Signals the specified ID as ready, i.e., releases
   * anything waiting on it.
   */
  ready(id: T, value?) {
    this
      ._getDeferredFor(id)
      .resolve(value);
  }


  private _getDeferredFor(id: T) {
    let deferred = this.deferreds.get(id);
    
    if (!deferred) {
      deferred = new Deferred<any>();
      this.deferreds.set(id, deferred);
    }

    return deferred;
  }


  private _checkForCycle(root: T) {
    let stack = [root];
    let visited = new Set<T>();

    while (stack.length > 0) {
      let id = stack.pop();
      let node = this.dependencies.get(id);

      if (visited.has(id)) {
        return true;

      } else {
        visited.add(id);

        if (node) {
          stack.push(...node.dependencies)
        }
      }
    }

    return false;
  }
};


/**
 * Specialised case of WaitFor<Function>
 */
export class WaitForFunction extends WaitFor<Function> {
  /**
   * Runs the array of functions, passing each one any `args` and a Waiter as the final argument.
   * @param funcs 
   * @param args 
   */
  run(funcs: Function[], ...args: any[]) {
    return this.map(funcs, (fn, wait) => Promise.resolve(fn(...args, wait)));
  }
};


function getName(id) {
  return id.displayName || id.name || id.toString();
}
