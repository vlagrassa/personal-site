export class CoordinateConverter {

  constructor(args, toCartesian, fromCartesian = null) {
    this._convert   = toCartesian;
    this._invert    = fromCartesian;
    this._arg_names = args;
  }


  /* Convert Argument Lists */

  convert(...args) {
    return this.convertPoint(args)
  }

  convertX(...args) {
    return this.convert(...args).x
  }

  convertY(...args) {
    return this.convert(...args).y
  }

  convertToArr(...args) {
    const {x, y} = this.convert(...args);
    return [x, y];
  }

  convertAssign(obj) {
    return Object.assign(obj, this.convertPoint(obj));
  }


  /* Convert Point Objects */

  convertPoint(pt) {
    if (Array.isArray(pt)) {
      return this._convert(...pt);
    }
    if (typeof pt === 'object') {
      return this._convert( ...this._arg_names.map(arg => pt[arg]) )
    }
  }

  convertPointX(pt) {
    return this.convertPoint(pt).x
  }

  convertPointY(pt) {
    return this.convertPoint(pt).y
  }

  convertPointToArr(pt) {
    const {x, y} = this.convertPoint(pt)
    return [x, y]
  }


  /* Invert Transformation (Argument List) */


  invert(x, y) {
    if (this._invert === null) {
      throw new Error('No invert method is defined.')
    }
    return this._invert(x, y);
  }


  /* Map to paths */

  toPath(pts, closed=false) {
    return "M" + pts.map(pt => this.convertPoint(pt)).map(({x, y}) => `${x},${y}`).join(",L") + (closed ? "Z" : "")
  }
}
