export class JSONResponseCache {
  constructor(keys={}) {
    this.keyset = keys
    this.cache  = {}
  }

  register(key, url) {
    this.keyset[key] = url
  }

  async get(key) {
    if (!this.cache[key]) {
      this.cache[key] = await fetch(this.keyset[key]).then((resp) => resp.json());
    }
    return this.cache[key];
  }
}



/**
 * Cache points along the domain of a continuous function,
 * for use in binary searching along the domain for a specific output.
 */
export class ContinuousFunctionCache {

  /**
   * f:      The function we want to cache. From input value to comparable output value.
   *         Should be bijective(?), otherwise binary search doesn't really work.
   * start:  The min value to cache from. Start of the input domain.
   * end:    The max value to cache up to. End of the input domain.
   * depth:  How many steps of the binary search to cache.
   *         The domain will be split into buckets of length `domain / (2^depth)`.
   */
  constructor(f, start, end, depth=8) {

    // Store the configuration
    this.depth = depth;
    this.start = start;
    this.end   = end;

    // Compute the number of values to cache
    this.length = Math.pow(2, this.depth) + 1

    // Compute the distance in the domain between cached values
    this.step_size = (this.end - this.start) / (this.length - 1);

    // Use the given function to cache the desired values
    this.values = [];
    for (let i = 0; i < this.length; i++) {
      let input = this.start + this.step_size * i;
      this.values[i] = { "input":  input, "output": f(input) }
    }
  }

  /**
   * Compute the range of input values that a given output value falls in.
   */
  computeRange(value) {

    // Initialize loop variables to the entire domain
    let start = 0;
    let end   = this.length - 1;

    // Loop until we find the step that contains the output value
    // NOTE: This will break earlier if the center happens to be exactly the output value,
    //       since a single binary search iteration will find the value when it halves the range.
    while (end - start > 1) {

      // Compute the value in the center of the current domain
      let center = start + ((end - start) / 2);
      let v = this.values[ center ];

      // Halve the domain
      if (v.output < value) {
        start = center;
      }
      else if (v.output > value) {
        end = center;
      }

      // Special case: center is the exact output value
      else {
        break
      }
    }

    // Return the range of input values
    return [this.values[start].input, this.values[end].input]
  }


  /**
   * Find the input value to f that produces the given targetValue, within a certain precision.
   */
  static iterate(f, targetValue, domain = null, cache = null, config = {}) {

    if (domain === null && cache == null) {
      throw new Error('One of `domain` and `cache` must be provided.')
    }

    let step, currInput;
    if (cache == null) {
      step      = domain / 2;
      currInput = step;
    }
    else {
      step      = cache.step_size / 2;
      currInput = cache.computeRange(targetValue)[0] + step;
    }

    // Config values
    let iter = config['maxIterations'] ?? 100;
    const targetPrecision = config['targetPrecision'] ?? 0.01;

    let value, precision;
    while (iter > 0) {
      ({value, precision} = f( currInput, targetValue ));

      // If within precision, return the value
      if (Math.abs(precision) < targetPrecision) {
        return value
      }
      else if (precision > 0) {
        step      /= 2;
        currInput += step;
      }
      else {
        step      /= 2
        currInput -= step;
      }
      iter--;
    }

    return value;
  }

  /**
   * Find the input value to f that produces the given targetValue, within a certain precision.
   * Equivalent to calling the static method `iterate` with the current object as the cache.
   */
  iterate(f, targetValue, config = {}) {
    return ContinuousFunctionCache.iterate(f, targetValue, null, this, config);
  }

}
