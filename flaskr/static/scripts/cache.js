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
