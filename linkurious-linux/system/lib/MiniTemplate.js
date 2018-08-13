/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-23.
 */
'use strict';

class MiniTemplate {

  /**
   * @param {string} body
   * @param {object} placeHoldersByName
   */
  constructor(body, placeHoldersByName) {

    this.placeHolders = Object.keys(placeHoldersByName).map(name => {
      const content = placeHoldersByName[name];
      const start = body.indexOf(content);
      return {
        name: name,
        content: content,
        start: start,
        end: start + content.length
      };
    }).sort((p1, p2) => p1.start - p2.start);

    // generate template array
    this.templateArray = [];
    let lastEnd = 0;
    this.placeHolders.forEach((p, _i, _l) => {
      this.templateArray.push(body.substring(lastEnd, p.start));
      p.taIndex = this.templateArray.length;
      this.templateArray.push(null);
      lastEnd = p.end;
    });
    // push remaining content in template
    this.templateArray.push(body.substring(lastEnd));
  }

  /**
   * @param {object} content values indexed buy placeholder name
   * @returns {string} compiled template
   */
  compile(content) {
    this.placeHolders.forEach(placeHolder => {
      this.templateArray[placeHolder.taIndex] = content[placeHolder.name];
    });
    return this.templateArray.join('');
  }
}

module.exports = MiniTemplate;
