
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
 * Waits for dependencies.
 */
export default class WaitFor<T> {
  private dependencies: Map<T, DependencyNode<T>>;
  private deferreds: Map<T, Deferred<any>>;

  constructor() {
    this.dependencies = new Map<T, DependencyNode<T>>();
    this.deferreds = new Map<T, Deferred<any>>();
  }


  /**
   * Wait for the specified dependencies.
   * @param id the ID of the waiting task
   * @param dependencies a list of IDs to wait on
   */
  waitFor(id: T, dependencies: T[]) {
    let node: DependencyNode<T> = {dependencies};
    this.dependencies.set(id, node);

    if (this._checkForCycle(id))
      throw new Error('dependency cycle detected');

    let promises = [];

    for (let dependency of dependencies) {
      promises.push(this._getDeferredFor(dependency).promise);
    }

    return Promise.all(promises);
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
