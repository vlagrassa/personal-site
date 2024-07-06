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



export class BinarySearchCache {

  /**
   * f: The function we want to cache. From input value to comparable output value.
   */
  constructor(depth, domain, f) {
    this.depth  = depth;
    this.domain = domain;

    this.length    = Math.pow(2, this.depth) + 1
    this.step_size = this.domain / (this.length - 1);

    this.values = [];
    for (let i = 0; i < this.length; i++) {
      this.values[i] = {
        "input":  this.step_size * i,
        "output": f(this.step_size * i),
      }
    }
  }

  computeRange(value) {
    let start = 0;
    let end   = this.length - 1;
    let v;
    let center;

    while (end - start > 1) {
      center = start + ((end - start) / 2);
      v = this.values[ center ];
      if (v.output < value) {
        start = center;
      }
      else if (v.output > value) {
        end = center;
      }
      else {
        break
      }
    }

    return [this.values[start].input, this.values[end].input]
  }

}
