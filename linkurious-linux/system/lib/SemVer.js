/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-07-01.
 */
'use strict';

class SemVer {

  /**
   * @param {string | Array<string | number>} version A version (string: "a.b.c_d", array: ["a", "b", "c", "d"]) (b, c, and d are all optional)
   */
  constructor(version) {
    this.version = SemVer.parse(version);
  }

  /**
   * Compares two SemVer.
   *
   * @param {string | Array<string | number> | SemVer} a A version (string: "a.b.c_d", array: ["a", "b", "c", "d"]) (b, c, and d are all optional)
   * @param {string | Array<string | number> | SemVer} b A version (string: "a.b.c_d", array: ["a", "b", "c", "d"]) (b, c, and d are all optional)
   * @returns {number} similar to (x-y): <0 if x<y, >0 if x>y, 0 if x=y
   */
  static compare(a, b) {

    // parse both version strings into arrays
    const aArray = SemVer.parse(a);
    const bArray = SemVer.parse(b);

    // make both arrays the same size (missing values are replaced with zeros, i.e "v1.8" == "v1.8.0")
    const length = Math.max(aArray.length, bArray.length);
    const shortest = (bArray.length < aArray.length ? bArray : aArray);
    while (shortest.length < length) { shortest.push(0); }

    // compare the arrays from most significant value to least significant value
    for (let i = 0, l = length; i < l; ++i) {
      if (bArray[i] !== aArray[i]) {
        return aArray[i] - bArray[i];
      }
    }
    return 0;
  }

  /**
   * @param {string | Array<string | number> | SemVer} x
   * @returns {number[]}
   */
  static parse(x) {
    if (x instanceof SemVer) {
      return x.version;
    }

    // allow [1, "2", 3], just parse the content
    if (Array.isArray(x)) {
      return (/** @type {any[]} */ (x)).map(s => parseInt(s, 10));
    }

    // allow "1.2.3" and "v1.2.3"
    if (typeof x === 'string') {

      // ignore "v" prefix
      if (typeof x === 'string' && x[0] === 'v') {
        x = x.substr(1);
      }

      return x.split(/[._]/).map(s => parseInt(s, 10));
    }

    // ignore anything else
    return [];
  }

  /**
   * True if this is after v.
   *
   * @param {string | Array<string | number> | SemVer} v A version (string: "a.b.c_d", array: ["a", "b", "c", "d"]) (b, c, and d are all optional)
   * @returns {boolean}
   */
  after(v) {
    // "version" - "v" > 0 ==> "version" > "v" ==> "version" is after "v"
    return SemVer.compare(this.version, SemVer.parse(v)) > 0;
  }

  /**
   * True if this is after or equal to v.
   *
   * @param {string | Array<string | number> | SemVer} v A version (string: "a.b.c_d", array: ["a", "b", "c", "d"]) (b, c, and d are all optional)
   * @returns {boolean}
   */
  afterOrEqual(v) {
    // "version" - "v" >= 0 ==> "version" >= "v" ==> "version" is after or equal to "v"
    return SemVer.compare(this.version, SemVer.parse(v)) >= 0;
  }

  /**
   * True if this is before v.
   *
   * @param {string | Array<string | number> | SemVer} v A version (string: "a.b.c_d", array: ["a", "b", "c", "d"]) (b, c, and d are all optional)
   * @returns {boolean}
   */
  before(v) {
    // "version" - "v" < 0 ==> "version" < "v" ==> "version" is before "v"
    return SemVer.compare(this.version, SemVer.parse(v)) < 0;
  }

  /**
   * True if this is before or equal to v.
   *
   * @param {string | Array<string | number> | SemVer} v A version (string: "a.b.c_d", array: ["a", "b", "c", "d"]) (b, c, and d are all optional)
   * @returns {boolean}
   */
  beforeOrEqual(v) {
    // "version" - "v" <= 0 ==> "version" <= "v" ==> "version" is before or equal to "v"
    return SemVer.compare(this.version, SemVer.parse(v)) <= 0;
  }

  /**
   * True is this and v are equal.
   *
   * @param {string | Array<string | number> | SemVer} v A version (string: "a.b.c_d", array: ["a", "b", "c", "d"]) (b, c, and d are all optional)
   * @returns {boolean}
   */
  equals(v) {
    return SemVer.compare(this.version, SemVer.parse(v)) === 0;
  }

  toString() {
    return this.version.join('.');
  }
}

module.exports = SemVer;
