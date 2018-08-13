/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-03-03.
 */
'use strict';

/**
 * Force link layout. Parameters:
 * @property {boolean} linLogMode                      (default: false)
 * @property {boolean} outboundAttractionDistribution  (default: false)
 * @property {boolean} adjustSizes                     (default: false)
 * @property {number}  edgeWeightInfluence             (default: 0)
 * @property {number}  scalingRatio                    (default: 1)
 * @property {boolean} strongGravityMode               (default: false)
 * @property {number}  gravity                         (default: 1)
 * @property {number}  slowDown                        (default: 1)
 * @property {boolean} barnesHutOptimize               (default: false)
 * @property {number}  barnesHutTheta                  (default: 0.5)
 * @property {number}  startingIterations              (default: 1)
 * @property {number}  iterationsPerRender             (default: 1)
 * @property {number}  maxIterations                   (default: 1000)
 * @property {number}  avgDistanceThreshold            (default: 0.01)
 * @property {boolean} autoStop                        (default: false)
 * @property {boolean} alignNodeSiblings               (default: false)
 * @property {number}  nodeSiblingsScale               (default: 1)
 * @property {number}  nodeSiblingsAngleMin            (default: 0)
 * @var forceLink
 */

/**
 * @param {object[]} nodes
 * @param {object[]} edges
 * @param {object} config
 */
function forceLinkLayout(nodes, edges, config) {

  var firstIteration = true;

  /**
   * Worker settings and properties
   */
  var W = {
    // Properties
    ppn: 10,
    ppe: 3,
    ppr: 9,
    maxForce: 10,
    iterations: 0,
    converged: false,

    // Possible to change through config
    settings: {
      // force atlas 2:
      linLogMode: false,
      outboundAttractionDistribution: false,
      adjustSizes: false,
      edgeWeightInfluence: 0,
      scalingRatio: 1,
      strongGravityMode: false,
      gravity: 1,
      slowDown: 1,
      barnesHutOptimize: false,
      barnesHutTheta: 0.5,
      startingIterations: 1,
      iterationsPerRender: 1,
      // stopping condition:
      maxIterations: 1000,
      avgDistanceThreshold: 0.01,
      autoStop: true,
      // node siblings:
      alignNodeSiblings: false,
      nodeSiblingsScale: 1,
      nodeSiblingsAngleMin: 0
    }
  };

  var NodeMatrix, EdgeMatrix, RegionMtx;

  /**
   * Return the euclidian distance between two points of a plane
   * with an orthonormal basis.
   *
   * @param  {number} x0  The X coordinate of the first point.
   * @param  {number} y0  The Y coordinate of the first point.
   * @param  {number} x1  The X coordinate of the second point.
   * @param  {number} y1  The Y coordinate of the second point.
   * @returns {number}     The euclidian distance.
   */
  function getDistance(x0, y0, x1, y1) {
    return Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
  }

  /**
   * Scale a value from the range [baseMin, baseMax] to the range
   * [limitMin, limitMax].
   *
   * @param  {number} value    The value to rescale.
   * @param  {number} baseMin  The min value of the range of origin.
   * @param  {number} baseMax  The max value of the range of origin.
   * @param  {number} limitMin The min value of the range of destination.
   * @param  {number} limitMax The max value of the range of destination.
   * @returns {number}          The scaled value.
   */
  function scaleRange(value, baseMin, baseMax, limitMin, limitMax) {
    return ((limitMax - limitMin) * (value - baseMin) / (baseMax - baseMin)) + limitMin;
  }

  /**
   * Get the angle of the vector (in radian).
   *
   * @param  {object} v  The 2d vector with x,y coordinates.
   * @returns {number}    The angle of the vector  (in radian).
   */
  function getVectorAngle(v) {
    return Math.acos(v.x / Math.sqrt(v.x * v.x + v.y * v.y));
  }

  /**
   * Get the normal vector of the line segment, i.e. the vector
   * orthogonal to the line.
   * http://stackoverflow.com/a/1243614/
   *
   * @param  {number} aX The x coorinates of the start point.
   * @param  {number} aY The y coorinates of the start point.
   * @param  {number} bX The x coorinates of the end point.
   * @param  {number} bY The y coorinates of the end point.
   * @returns {object}    The 2d vector with (xi,yi), (xi_prime,yi_prime) coordinates.
   */
  function getNormalVector(aX, aY, bX, bY) {
    return {
      xi: -(bY - aY),
      yi: bX - aX,
      'xi_prime': bY - aY,
      'yi_prime': -(bX - aX)
    };
  }

  /**
   * Get the normalized vector.
   *
   * @param  {object} v      The 2d vector with (xi,yi), (xi_prime,yi_prime) coordinates.
   * @param  {number} length The vector length.
   * @returns {object}        The normalized vector
   */
  function getNormalizedVector(v, length) {
    return {
      x: (v['xi_prime'] - v.xi) / length,
      y: (v['yi_prime'] - v.yi) / length
    };
  }

  /**
   * Get the a point the line segment [A,B] at a specified distance percentage
   * from the start point.
   *
   * @param  {number} aX The x coorinates of the start point.
   * @param  {number} aY The y coorinates of the start point.
   * @param  {number} bX The x coorinates of the end point.
   * @param  {number} bY The y coorinates of the end point.
   * @param  {number} t  The distance percentage from the start point.
   * @returns {object}    The (x,y) coordinates of the point.
   */
  function getPointOnLineSegment(aX, aY, bX, bY, t) {
    return {
      x: aX + (bX - aX) * t,
      y: aY + (bY - aY) * t
    };
  }

  /**
   * Matrices properties accessors
   */
  var nodeProperties = {
    x: 0,
    y: 1,
    dx: 2,
    dy: 3,
    'old_dx': 4,
    'old_dy': 5,
    mass: 6,
    convergence: 7,
    size: 8,
    pinned: 9
  };

  var edgeProperties = {
    source: 0,
    target: 1,
    weight: 2
  };

  var regionProperties = {
    node: 0,
    centerX: 1,
    centerY: 2,
    size: 3,
    nextSibling: 4,
    firstChild: 5,
    mass: 6,
    massCenterX: 7,
    massCenterY: 8
  };

  function np(i, p) {

    // DEBUG: safeguards
    if ((i % W.ppn) !== 0) {
      throw new Error('Invalid argument in np: "i" is not correct (' + i + ').');
    }
    if (i !== parseInt(i)) {
      throw new TypeError('Invalid argument in np: "i" is not an integer.');
    }
    if (p in nodeProperties) {
      return i + nodeProperties[p];
    } else {
      throw new Error('ForceLink.Worker - Inexistant node property given (' + p + ').');
    }
  }

  function ep(i, p) {
    // DEBUG: safeguards
    if ((i % W.ppe) !== 0) {
      throw new Error('Invalid argument in ep: "i" is not correct (' + i + ').');
    }
    if (i !== parseInt(i)) {
      throw new TypeError('Invalid argument in ep: "i" is not an integer.');
    }
    if (p in edgeProperties) {
      return i + edgeProperties[p];
    } else {
      throw new Error('ForceLink.Worker - Inexistant edge property given (' + p + ').');
    }
  }

  function rp(i, p) {
    // DEBUG: safeguards
    if ((i % W.ppr) !== 0) {
      throw new Error('Invalid argument in rp: "i" is not correct (' + i + ').');
    }
    if (i !== parseInt(i)) {
      throw new TypeError('Invalid argument in rp: "i" is not an integer.');
    }
    if (p in regionProperties) {
      return i + regionProperties[p];
    } else {
      throw new Error('ForceLink.Worker - Inexistant region property given (' + p + ').');
    }
  }

  function randomize(n, config) {
    switch (config.randomize) {
      case 'globally':
        return Math.random() * (config.randomizeFactor || 1);
      case 'locally':
        return n + (Math.random() * (config.randomizeFactor || 1));
      default:
        return n;
    }
  }

  /**
   * Algorithm pass
   */
  // MATH: get distances stuff and power 2 issues
  function pass() {
    var l, r, n, n1, n2, e, w, g;

    var outboundAttCompensation,
      coefficient,
      xDist,
      yDist,
      oldxDist,
      oldyDist,
      ewc,
      mass,
      distance,
      size,
      factor;

    // 1) Initializing layout data
    //-----------------------------

    // Resetting positions & computing max values
    for (n = 0; n < W.nodesLength; n += W.ppn) {
      NodeMatrix[np(n, 'old_dx')] = NodeMatrix[np(n, 'dx')];
      NodeMatrix[np(n, 'old_dy')] = NodeMatrix[np(n, 'dy')];
      NodeMatrix[np(n, 'dx')] = 0;
      NodeMatrix[np(n, 'dy')] = 0;
    }

    // If outbound attraction distribution, compensate
    if (W.settings.outboundAttractionDistribution) {
      outboundAttCompensation = 0;
      for (n = 0; n < W.nodesLength; n += W.ppn) {
        outboundAttCompensation += NodeMatrix[np(n, 'mass')];
      }

      outboundAttCompensation /= W.nodesLength;
    }

    // 1.bis) Barnes-Hut computation
    //------------------------------

    if (W.settings.barnesHutOptimize) {

      var minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity,
        q, q2;

      // Setting up
      // RegionMtx = new Float32Array(W.nodesLength / W.ppn * 4 * W.ppr);
      RegionMtx = [];

      // Computing min and max values
      for (n = 0; n < W.nodesLength; n += W.ppn) {
        minX = Math.min(minX, NodeMatrix[np(n, 'x')]);
        maxX = Math.max(maxX, NodeMatrix[np(n, 'x')]);
        minY = Math.min(minY, NodeMatrix[np(n, 'y')]);
        maxY = Math.max(maxY, NodeMatrix[np(n, 'y')]);
      }

      // Build the Barnes Hut root region
      RegionMtx[rp(0, 'node')] = -1;
      RegionMtx[rp(0, 'centerX')] = (minX + maxX) / 2;
      RegionMtx[rp(0, 'centerY')] = (minY + maxY) / 2;
      RegionMtx[rp(0, 'size')] = Math.max(maxX - minX, maxY - minY);
      RegionMtx[rp(0, 'nextSibling')] = -1;
      RegionMtx[rp(0, 'firstChild')] = -1;
      RegionMtx[rp(0, 'mass')] = 0;
      RegionMtx[rp(0, 'massCenterX')] = 0;
      RegionMtx[rp(0, 'massCenterY')] = 0;

      // Add each node in the tree
      l = 1;
      for (n = 0; n < W.nodesLength; n += W.ppn) {

        // Current region, starting with root
        r = 0;

        while (true) {
          // Are there sub-regions?

          // We look at first child index
          if (RegionMtx[rp(r, 'firstChild')] >= 0) {

            // There are sub-regions

            // We just iterate to find a "leave" of the tree
            // that is an empty region or a region with a single node
            // (see next case)

            // Find the quadrant of n
            if (NodeMatrix[np(n, 'x')] < RegionMtx[rp(r, 'centerX')]) {

              if (NodeMatrix[np(n, 'y')] < RegionMtx[rp(r, 'centerY')]) {

                // Top Left quarter
                q = RegionMtx[rp(r, 'firstChild')];
              } else {

                // Bottom Left quarter
                q = RegionMtx[rp(r, 'firstChild')] + W.ppr;
              }
            } else {
              if (NodeMatrix[np(n, 'y')] < RegionMtx[rp(r, 'centerY')]) {

                // Top Right quarter
                q = RegionMtx[rp(r, 'firstChild')] + W.ppr * 2;
              } else {

                // Bottom Right quarter
                q = RegionMtx[rp(r, 'firstChild')] + W.ppr * 3;
              }
            }

            // Update center of mass and mass (we only do it for non-leave regions)
            RegionMtx[rp(r, 'massCenterX')] =
              (RegionMtx[rp(r, 'massCenterX')] * RegionMtx[rp(r, 'mass')] +
                NodeMatrix[np(n, 'x')] * NodeMatrix[np(n, 'mass')]) /
              (RegionMtx[rp(r, 'mass')] + NodeMatrix[np(n, 'mass')]);

            RegionMtx[rp(r, 'massCenterY')] =
              (RegionMtx[rp(r, 'massCenterY')] * RegionMtx[rp(r, 'mass')] +
                NodeMatrix[np(n, 'y')] * NodeMatrix[np(n, 'mass')]) /
              (RegionMtx[rp(r, 'mass')] + NodeMatrix[np(n, 'mass')]);

            RegionMtx[rp(r, 'mass')] += NodeMatrix[np(n, 'mass')];

            // Iterate on the right quadrant
            r = q;
            continue;
          } else {

            // There are no sub-regions: we are in a "leave"

            // Is there a node in this leave?
            if (RegionMtx[rp(r, 'node')] < 0) {

              // There is no node in region:
              // we record node n and go on
              RegionMtx[rp(r, 'node')] = n;
              break;
            } else {

              // There is a node in this region

              // We will need to create sub-regions, stick the two
              // nodes (the old one r[0] and the new one n) in two
              // subregions. If they fall in the same quadrant,
              // we will iterate.

              // Create sub-regions
              RegionMtx[rp(r, 'firstChild')] = l * W.ppr;
              w = RegionMtx[rp(r, 'size')] / 2;  // new size (half)

              // NOTE: we use screen coordinates
              // from Top Left to Bottom Right

              // Top Left sub-region
              g = RegionMtx[rp(r, 'firstChild')];

              RegionMtx[rp(g, 'node')] = -1;
              RegionMtx[rp(g, 'centerX')] = RegionMtx[rp(r, 'centerX')] - w;
              RegionMtx[rp(g, 'centerY')] = RegionMtx[rp(r, 'centerY')] - w;
              RegionMtx[rp(g, 'size')] = w;
              RegionMtx[rp(g, 'nextSibling')] = g + W.ppr;
              RegionMtx[rp(g, 'firstChild')] = -1;
              RegionMtx[rp(g, 'mass')] = 0;
              RegionMtx[rp(g, 'massCenterX')] = 0;
              RegionMtx[rp(g, 'massCenterY')] = 0;

              // Bottom Left sub-region
              g += W.ppr;
              RegionMtx[rp(g, 'node')] = -1;
              RegionMtx[rp(g, 'centerX')] = RegionMtx[rp(r, 'centerX')] - w;
              RegionMtx[rp(g, 'centerY')] = RegionMtx[rp(r, 'centerY')] + w;
              RegionMtx[rp(g, 'size')] = w;
              RegionMtx[rp(g, 'nextSibling')] = g + W.ppr;
              RegionMtx[rp(g, 'firstChild')] = -1;
              RegionMtx[rp(g, 'mass')] = 0;
              RegionMtx[rp(g, 'massCenterX')] = 0;
              RegionMtx[rp(g, 'massCenterY')] = 0;

              // Top Right sub-region
              g += W.ppr;
              RegionMtx[rp(g, 'node')] = -1;
              RegionMtx[rp(g, 'centerX')] = RegionMtx[rp(r, 'centerX')] + w;
              RegionMtx[rp(g, 'centerY')] = RegionMtx[rp(r, 'centerY')] - w;
              RegionMtx[rp(g, 'size')] = w;
              RegionMtx[rp(g, 'nextSibling')] = g + W.ppr;
              RegionMtx[rp(g, 'firstChild')] = -1;
              RegionMtx[rp(g, 'mass')] = 0;
              RegionMtx[rp(g, 'massCenterX')] = 0;
              RegionMtx[rp(g, 'massCenterY')] = 0;

              // Bottom Right sub-region
              g += W.ppr;
              RegionMtx[rp(g, 'node')] = -1;
              RegionMtx[rp(g, 'centerX')] = RegionMtx[rp(r, 'centerX')] + w;
              RegionMtx[rp(g, 'centerY')] = RegionMtx[rp(r, 'centerY')] + w;
              RegionMtx[rp(g, 'size')] = w;
              RegionMtx[rp(g, 'nextSibling')] = RegionMtx[rp(r, 'nextSibling')];
              RegionMtx[rp(g, 'firstChild')] = -1;
              RegionMtx[rp(g, 'mass')] = 0;
              RegionMtx[rp(g, 'massCenterX')] = 0;
              RegionMtx[rp(g, 'massCenterY')] = 0;

              l += 4;

              // Now the goal is to find two different sub-regions
              // for the two nodes: the one previously recorded (r[0])
              // and the one we want to add (n)

              // Find the quadrant of the old node
              if (NodeMatrix[np(RegionMtx[rp(r, 'node')], 'x')] < RegionMtx[rp(r, 'centerX')]) {
                if (NodeMatrix[np(RegionMtx[rp(r, 'node')], 'y')] < RegionMtx[rp(r, 'centerY')]) {

                  // Top Left quarter
                  q = RegionMtx[rp(r, 'firstChild')];
                } else {

                  // Bottom Left quarter
                  q = RegionMtx[rp(r, 'firstChild')] + W.ppr;
                }
              } else {
                if (NodeMatrix[np(RegionMtx[rp(r, 'node')], 'y')] < RegionMtx[rp(r, 'centerY')]) {

                  // Top Right quarter
                  q = RegionMtx[rp(r, 'firstChild')] + W.ppr * 2;
                } else {

                  // Bottom Right quarter
                  q = RegionMtx[rp(r, 'firstChild')] + W.ppr * 3;
                }
              }

              // We remove r[0] from the region r, add its mass to r and record it in q
              RegionMtx[rp(r, 'mass')] = NodeMatrix[np(RegionMtx[rp(r, 'node')], 'mass')];
              RegionMtx[rp(r, 'massCenterX')] = NodeMatrix[np(RegionMtx[rp(r, 'node')], 'x')];
              RegionMtx[rp(r, 'massCenterY')] = NodeMatrix[np(RegionMtx[rp(r, 'node')], 'y')];

              RegionMtx[rp(q, 'node')] = RegionMtx[rp(r, 'node')];
              RegionMtx[rp(r, 'node')] = -1;

              // Find the quadrant of n
              if (NodeMatrix[np(n, 'x')] < RegionMtx[rp(r, 'centerX')]) {
                if (NodeMatrix[np(n, 'y')] < RegionMtx[rp(r, 'centerY')]) {

                  // Top Left quarter
                  q2 = RegionMtx[rp(r, 'firstChild')];
                } else {
                  // Bottom Left quarter
                  q2 = RegionMtx[rp(r, 'firstChild')] + W.ppr;
                }
              } else {
                if (NodeMatrix[np(n, 'y')] < RegionMtx[rp(r, 'centerY')]) {

                  // Top Right quarter
                  q2 = RegionMtx[rp(r, 'firstChild')] + W.ppr * 2;
                } else {

                  // Bottom Right quarter
                  q2 = RegionMtx[rp(r, 'firstChild')] + W.ppr * 3;
                }
              }

              if (q === q2) {

                // If both nodes are in the same quadrant,
                // we have to try it again on this quadrant
                r = q;
                continue;
              }

              // If both quadrants are different, we record n
              // in its quadrant
              RegionMtx[rp(q2, 'node')] = n;
              break;
            }
          }
        }
      }
    }

    // 2) Repulsion
    //--------------
    // NOTES: adjustSizes = antiCollision & scalingRatio = coefficient

    if (W.settings.barnesHutOptimize) {
      coefficient = W.settings.scalingRatio;

      // Applying repulsion through regions
      for (n = 0; n < W.nodesLength; n += W.ppn) {

        // Computing leaf quad nodes iteration

        r = 0; // Starting with root region
        while (true) {

          if (RegionMtx[rp(r, 'firstChild')] >= 0) {

            // The region has sub-regions

            // We run the Barnes Hut test to see if we are at the right distance
            distance = Math.sqrt(
              (NodeMatrix[np(n, 'x')] - RegionMtx[rp(r, 'massCenterX')]) *
              (NodeMatrix[np(n, 'x')] - RegionMtx[rp(r, 'massCenterX')]) +
              (NodeMatrix[np(n, 'y')] - RegionMtx[rp(r, 'massCenterY')]) *
              (NodeMatrix[np(n, 'y')] - RegionMtx[rp(r, 'massCenterY')])
            );

            if (2 * RegionMtx[rp(r, 'size')] / distance < W.settings.barnesHutTheta) {

              // We treat the region as a single body, and we repulse

              xDist = NodeMatrix[np(n, 'x')] - RegionMtx[rp(r, 'massCenterX')];
              yDist = NodeMatrix[np(n, 'y')] - RegionMtx[rp(r, 'massCenterY')];

              if (W.settings.adjustSizes) {

                //-- Linear Anti-collision Repulsion
                if (distance > 0) {
                  factor = coefficient * NodeMatrix[np(n, 'mass')] *
                    RegionMtx[rp(r, 'mass')] / distance / distance;

                  NodeMatrix[np(n, 'dx')] += xDist * factor;
                  NodeMatrix[np(n, 'dy')] += yDist * factor;
                } else if (distance < 0) {
                  factor = -coefficient * NodeMatrix[np(n, 'mass')] *
                    RegionMtx[rp(r, 'mass')] / distance;

                  NodeMatrix[np(n, 'dx')] += xDist * factor;
                  NodeMatrix[np(n, 'dy')] += yDist * factor;
                }
              } else {

                //-- Linear Repulsion
                if (distance > 0) {
                  factor = coefficient * NodeMatrix[np(n, 'mass')] *
                    RegionMtx[rp(r, 'mass')] / distance / distance;

                  NodeMatrix[np(n, 'dx')] += xDist * factor;
                  NodeMatrix[np(n, 'dy')] += yDist * factor;
                }
              }

              // When this is done, we iterate. We have to look at the next sibling.
              if (RegionMtx[rp(r, 'nextSibling')] < 0) {
                break;  // No next sibling: we have finished the tree
              }
              r = RegionMtx[rp(r, 'nextSibling')];
              continue;

            } else {

              // The region is too close and we have to look at sub-regions
              r = RegionMtx[rp(r, 'firstChild')];
              continue;
            }

          } else {

            // The region has no sub-region
            // If there is a node r[0] and it is not n, then repulse

            if (RegionMtx[rp(r, 'node')] >= 0 && RegionMtx[rp(r, 'node')] !== n) {
              xDist = NodeMatrix[np(n, 'x')] - NodeMatrix[np(RegionMtx[rp(r, 'node')], 'x')];
              yDist = NodeMatrix[np(n, 'y')] - NodeMatrix[np(RegionMtx[rp(r, 'node')], 'y')];

              distance = Math.sqrt(xDist * xDist + yDist * yDist);

              if (W.settings.adjustSizes) {

                //-- Linear Anti-collision Repulsion
                if (distance > 0) {
                  factor = coefficient * NodeMatrix[np(n, 'mass')] *
                    NodeMatrix[np(RegionMtx[rp(r, 'node')], 'mass')] / distance / distance;

                  NodeMatrix[np(n, 'dx')] += xDist * factor;
                  NodeMatrix[np(n, 'dy')] += yDist * factor;
                } else if (distance < 0) {
                  factor = -coefficient * NodeMatrix[np(n, 'mass')] *
                    NodeMatrix[np(RegionMtx[rp(r, 'node')], 'mass')] / distance;

                  NodeMatrix[np(n, 'dx')] += xDist * factor;
                  NodeMatrix[np(n, 'dy')] += yDist * factor;
                }
              } else {

                //-- Linear Repulsion
                if (distance > 0) {
                  factor = coefficient * NodeMatrix[np(n, 'mass')] *
                    NodeMatrix[np(RegionMtx[rp(r, 'node')], 'mass')] / distance / distance;

                  NodeMatrix[np(n, 'dx')] += xDist * factor;
                  NodeMatrix[np(n, 'dy')] += yDist * factor;
                }
              }

            }

            // When this is done, we iterate. We have to look at the next sibling.
            if (RegionMtx[rp(r, 'nextSibling')] < 0) {
              break;  // No next sibling: we have finished the tree
            }
            r = RegionMtx[rp(r, 'nextSibling')];
            continue;
          }
        }
      }
    } else {
      coefficient = W.settings.scalingRatio;

      // Square iteration
      for (n1 = 0; n1 < W.nodesLength; n1 += W.ppn) {
        for (n2 = 0; n2 < n1; n2 += W.ppn) {

          // Common to both methods
          xDist = NodeMatrix[np(n1, 'x')] - NodeMatrix[np(n2, 'x')];
          yDist = NodeMatrix[np(n1, 'y')] - NodeMatrix[np(n2, 'y')];

          if (W.settings.adjustSizes) {

            //-- Anticollision Linear Repulsion
            distance = Math.sqrt(xDist * xDist + yDist * yDist) -
              NodeMatrix[np(n1, 'size')] -
              NodeMatrix[np(n2, 'size')];

            if (distance > 0) {
              factor = coefficient *
                NodeMatrix[np(n1, 'mass')] *
                NodeMatrix[np(n2, 'mass')] /
                distance / distance;

              // Updating nodes' dx and dy
              NodeMatrix[np(n1, 'dx')] += xDist * factor;
              NodeMatrix[np(n1, 'dy')] += yDist * factor;

              NodeMatrix[np(n2, 'dx')] += xDist * factor;
              NodeMatrix[np(n2, 'dy')] += yDist * factor;
            } else if (distance < 0) {
              factor = 100 * coefficient *
                NodeMatrix[np(n1, 'mass')] *
                NodeMatrix[np(n2, 'mass')];

              // Updating nodes' dx and dy
              NodeMatrix[np(n1, 'dx')] += xDist * factor;
              NodeMatrix[np(n1, 'dy')] += yDist * factor;

              NodeMatrix[np(n2, 'dx')] -= xDist * factor;
              NodeMatrix[np(n2, 'dy')] -= yDist * factor;
            }
          } else {

            //-- Linear Repulsion
            distance = Math.sqrt(xDist * xDist + yDist * yDist);

            if (distance > 0) {
              factor = coefficient *
                NodeMatrix[np(n1, 'mass')] *
                NodeMatrix[np(n2, 'mass')] /
                distance / distance;

              // Updating nodes' dx and dy
              NodeMatrix[np(n1, 'dx')] += xDist * factor;
              NodeMatrix[np(n1, 'dy')] += yDist * factor;

              NodeMatrix[np(n2, 'dx')] -= xDist * factor;
              NodeMatrix[np(n2, 'dy')] -= yDist * factor;
            }
          }
        }
      }
    }

    // 3) Gravity
    //------------
    g = W.settings.gravity / W.settings.scalingRatio;
    coefficient = W.settings.scalingRatio;
    for (n = 0; n < W.nodesLength; n += W.ppn) {
      factor = 0;

      // Common to both methods
      xDist = NodeMatrix[np(n, 'x')];
      yDist = NodeMatrix[np(n, 'y')];
      distance = Math.sqrt(xDist * xDist + yDist * yDist);

      if (W.settings.strongGravityMode) {

        //-- Strong gravity
        if (distance > 0) {
          factor = coefficient * NodeMatrix[np(n, 'mass')] * g;
        }
      } else {

        //-- Linear Anti-collision Repulsion n
        if (distance > 0) {
          factor = coefficient * NodeMatrix[np(n, 'mass')] * g / distance;
        }
      }

      // Updating node's dx and dy
      NodeMatrix[np(n, 'dx')] -= xDist * factor;
      NodeMatrix[np(n, 'dy')] -= yDist * factor;
    }

    // 4) Attraction
    //---------------
    coefficient = 1 * (W.settings.outboundAttractionDistribution ? outboundAttCompensation : 1);

    // TODO: simplify distance
    // TODO: coefficient is always used as -c --> optimize?
    for (e = 0; e < W.edgesLength; e += W.ppe) {
      n1 = EdgeMatrix[ep(e, 'source')];
      n2 = EdgeMatrix[ep(e, 'target')];
      w = EdgeMatrix[ep(e, 'weight')];

      // Edge weight influence
      ewc = Math.pow(w, W.settings.edgeWeightInfluence);

      // Common measures
      xDist = NodeMatrix[np(n1, 'x')] - NodeMatrix[np(n2, 'x')];
      yDist = NodeMatrix[np(n1, 'y')] - NodeMatrix[np(n2, 'y')];

      // Applying attraction to nodes
      if (W.settings.adjustSizes) {

        distance = Math.sqrt(
          (xDist * xDist + yDist * yDist) -
          NodeMatrix[np(n1, 'size')] -
          NodeMatrix[np(n2, 'size')]
        );

        if (W.settings.linLogMode) {
          if (W.settings.outboundAttractionDistribution) {

            //-- LinLog Degree Distributed Anti-collision Attraction
            if (distance > 0) {
              factor = -coefficient * ewc * Math.log(1 + distance) /
                distance /
                NodeMatrix[np(n1, 'mass')];
            }
          } else {

            //-- LinLog Anti-collision Attraction
            if (distance > 0) {
              factor = -coefficient * ewc * Math.log(1 + distance) / distance;
            }
          }
        } else {
          if (W.settings.outboundAttractionDistribution) {

            //-- Linear Degree Distributed Anti-collision Attraction
            if (distance > 0) {
              factor = -coefficient * ewc / NodeMatrix[np(n1, 'mass')];
            }
          } else {

            //-- Linear Anti-collision Attraction
            if (distance > 0) {
              factor = -coefficient * ewc;
            }
          }
        }
      } else {

        distance = Math.sqrt(xDist * xDist + yDist * yDist);

        if (W.settings.linLogMode) {
          if (W.settings.outboundAttractionDistribution) {

            //-- LinLog Degree Distributed Attraction
            if (distance > 0) {
              factor = -coefficient * ewc * Math.log(1 + distance) /
                distance /
                NodeMatrix[np(n1, 'mass')];
            }
          } else {

            //-- LinLog Attraction
            if (distance > 0) {
              factor = -coefficient * ewc * Math.log(1 + distance) / distance;
            }
          }
        } else {
          if (W.settings.outboundAttractionDistribution) {

            //-- Linear Attraction Mass Distributed
            // NOTE: Distance is set to 1 to override next condition
            distance = 1;
            factor = -coefficient * ewc / NodeMatrix[np(n1, 'mass')];
          } else {

            //-- Linear Attraction
            // NOTE: Distance is set to 1 to override next condition
            distance = 1;
            factor = -coefficient * ewc;
          }
        }
      }

      // Updating nodes' dx and dy
      // TODO: if condition or factor = 1?
      if (distance > 0) {
        // Updating nodes' dx and dy
        NodeMatrix[np(n1, 'dx')] += xDist * factor;
        NodeMatrix[np(n1, 'dy')] += yDist * factor;

        NodeMatrix[np(n2, 'dx')] -= xDist * factor;
        NodeMatrix[np(n2, 'dy')] -= yDist * factor;
      }
    }

    // 5) Apply Forces
    //-----------------
    var force,
      swinging,
      traction,
      nodespeed,
      alldistance = 0;

    // MATH: sqrt and square distances
    if (W.settings.adjustSizes) {

      for (n = 0; n < W.nodesLength; n += W.ppn) {
        if (!NodeMatrix[np(n, 'pinned')]) {
          force = Math.sqrt(
            NodeMatrix[np(n, 'dx')] * NodeMatrix[np(n, 'dx')] +
            NodeMatrix[np(n, 'dy')] * NodeMatrix[np(n, 'dy')]
          );

          if (force > W.maxForce) {
            NodeMatrix[np(n, 'dx')] =
              NodeMatrix[np(n, 'dx')] * W.maxForce / force;
            NodeMatrix[np(n, 'dy')] =
              NodeMatrix[np(n, 'dy')] * W.maxForce / force;
          }

          swinging = NodeMatrix[np(n, 'mass')] *
            Math.sqrt(
              (NodeMatrix[np(n, 'old_dx')] - NodeMatrix[np(n, 'dx')]) *
              (NodeMatrix[np(n, 'old_dx')] - NodeMatrix[np(n, 'dx')]) +
              (NodeMatrix[np(n, 'old_dy')] - NodeMatrix[np(n, 'dy')]) *
              (NodeMatrix[np(n, 'old_dy')] - NodeMatrix[np(n, 'dy')])
            );

          traction = Math.sqrt(
            (NodeMatrix[np(n, 'old_dx')] + NodeMatrix[np(n, 'dx')]) *
            (NodeMatrix[np(n, 'old_dx')] + NodeMatrix[np(n, 'dx')]) +
            (NodeMatrix[np(n, 'old_dy')] + NodeMatrix[np(n, 'dy')]) *
            (NodeMatrix[np(n, 'old_dy')] + NodeMatrix[np(n, 'dy')])
          ) / 2;

          nodespeed =
            0.1 * Math.log(1 + traction) / (1 + Math.sqrt(swinging));

          oldxDist = NodeMatrix[np(n, 'x')];
          oldyDist = NodeMatrix[np(n, 'y')];

          // Updating node's positon
          NodeMatrix[np(n, 'x')] =
            NodeMatrix[np(n, 'x')] + NodeMatrix[np(n, 'dx')] *
            (nodespeed / W.settings.slowDown);
          NodeMatrix[np(n, 'y')] =
            NodeMatrix[np(n, 'y')] + NodeMatrix[np(n, 'dy')] *
            (nodespeed / W.settings.slowDown);

          xDist = NodeMatrix[np(n, 'x')];
          yDist = NodeMatrix[np(n, 'y')];
          distance = Math.sqrt(
            (xDist - oldxDist) * (xDist - oldxDist) +
            (yDist - oldyDist) * (yDist - oldyDist)
          );
          alldistance += distance;
        }
      }
    } else {

      for (n = 0; n < W.nodesLength; n += W.ppn) {
        if (!NodeMatrix[np(n, 'pinned')]) {

          swinging = NodeMatrix[np(n, 'mass')] *
            Math.sqrt(
              (NodeMatrix[np(n, 'old_dx')] - NodeMatrix[np(n, 'dx')]) *
              (NodeMatrix[np(n, 'old_dx')] - NodeMatrix[np(n, 'dx')]) +
              (NodeMatrix[np(n, 'old_dy')] - NodeMatrix[np(n, 'dy')]) *
              (NodeMatrix[np(n, 'old_dy')] - NodeMatrix[np(n, 'dy')])
            );

          traction = Math.sqrt(
            (NodeMatrix[np(n, 'old_dx')] + NodeMatrix[np(n, 'dx')]) *
            (NodeMatrix[np(n, 'old_dx')] + NodeMatrix[np(n, 'dx')]) +
            (NodeMatrix[np(n, 'old_dy')] + NodeMatrix[np(n, 'dy')]) *
            (NodeMatrix[np(n, 'old_dy')] + NodeMatrix[np(n, 'dy')])
          ) / 2;

          nodespeed = NodeMatrix[np(n, 'convergence')] *
            Math.log(1 + traction) / (1 + Math.sqrt(swinging));

          // Updating node convergence
          NodeMatrix[np(n, 'convergence')] =
            Math.min(1, Math.sqrt(
              nodespeed *
              (NodeMatrix[np(n, 'dx')] * NodeMatrix[np(n, 'dx')] +
                NodeMatrix[np(n, 'dy')] * NodeMatrix[np(n, 'dy')]) /
              (1 + Math.sqrt(swinging))
            ));

          oldxDist = NodeMatrix[np(n, 'x')];
          oldyDist = NodeMatrix[np(n, 'y')];

          // Updating node's positon
          NodeMatrix[np(n, 'x')] =
            NodeMatrix[np(n, 'x')] + NodeMatrix[np(n, 'dx')] *
            (nodespeed / W.settings.slowDown);
          NodeMatrix[np(n, 'y')] =
            NodeMatrix[np(n, 'y')] + NodeMatrix[np(n, 'dy')] *
            (nodespeed / W.settings.slowDown);

          xDist = NodeMatrix[np(n, 'x')];
          yDist = NodeMatrix[np(n, 'y')];
          distance = Math.sqrt(
            (xDist - oldxDist) * (xDist - oldxDist) +
            (yDist - oldyDist) * (yDist - oldyDist)
          );
          alldistance += distance;
        }
      }
    }

    // Counting one more iteration
    W.iterations++;

    // Auto stop.
    // The greater the ratio nb nodes / nb edges,
    // the greater the number of iterations needed to converge.
    if (W.settings.autoStop) {
      W.converged = (
        W.iterations > W.settings.maxIterations ||
        alldistance / W.nodesLength < W.settings.avgDistanceThreshold
      );

      // align nodes that are linked to the same two nodes only:
      if (W.converged && W.settings.alignNodeSiblings) {
        // console.time("alignment");

        var
          neighbors = {}, // index of neighbors
          parallelNodes = {}, // set of parallel nodes indexed by same <source;target>
          setKey, // tmp
          keysN;  // tmp

        // build index of neighbors:
        for (e = 0; e < W.edgesLength; e += W.ppe) {
          n1 = EdgeMatrix[ep(e, 'source')];
          n2 = EdgeMatrix[ep(e, 'target')];

          if (n1 === n2) { continue; }

          neighbors[n1] = neighbors[n1] || {};
          neighbors[n2] = neighbors[n2] || {};
          neighbors[n1][n2] = true;
          neighbors[n2][n1] = true;
        }

        // group triplets by same <source, target> (resp. target, source):
        Object.keys(neighbors).forEach(function(n) {
          n = ~~n;  // string to int
          keysN = Object.keys(neighbors[n]);
          if (keysN.length == 2) {
            setKey = keysN[0] + ';' + keysN[1];
            if (setKey in parallelNodes) {
              parallelNodes[setKey].push(n);
            } else {
              setKey = keysN[1] + ';' + keysN[0];
              if (!parallelNodes[setKey]) {
                parallelNodes[setKey] = [~~keysN[1], ~~keysN[0]];
              }
              parallelNodes[setKey].push(n);
            }
          }
        });

        var
          setNodes,
          setSource,
          setTarget,
          degSource,
          degTarget,
          sX,
          sY,
          tX,
          tY,
          t,
          distSourceTarget,
          intersectionPoint,
          normalVector,
          nNormaleVector,
          angle,
          angleMin = W.settings.nodeSiblingsAngleMin;

        Object.keys(parallelNodes).forEach(function(key) {
          setSource = parallelNodes[key].shift();
          setTarget = parallelNodes[key].shift();
          setNodes = parallelNodes[key].filter(function(setNode) {
            return !NodeMatrix[np(setNode, 'pinned')];
          });

          if (setNodes.length == 1) { return; }

          sX = NodeMatrix[np(setSource, 'x')];
          sY = NodeMatrix[np(setSource, 'y')];
          tX = NodeMatrix[np(setTarget, 'x')];
          tY = NodeMatrix[np(setTarget, 'y')];

          // the extremity of lowest degree attracts the nodes
          // up to 1/4 of the distance:
          degSource = Object.keys(neighbors[setSource]).length;
          degTarget = Object.keys(neighbors[setTarget]).length;
          t = scaleRange(degSource / (degSource + degTarget), 0, 1, 1 / 4, 3 / 4);
          intersectionPoint = getPointOnLineSegment(sX, sY, tX, tY, t);

          // vector normal to the segment [source, target]:
          normalVector = getNormalVector(sX, sY, tX, tY);

          distSourceTarget = getDistance(sX, sY, tX, tY);

          // normalized normal vector:
          nNormaleVector = getNormalizedVector(normalVector, distSourceTarget);

          angle = getVectorAngle(nNormaleVector);

          // avoid horizontal vector because node labels overlap:
          if (2 * angleMin > Math.PI) {
            throw new Error(
              'ForceLink.Worker - Invalid parameter: angleMin must be smaller than 2 PI.'
            );
          }

          if (angleMin > 0) {
            // TODO layout parameter
            if (angle < angleMin || (angle > Math.PI - angleMin) && angle <= Math.PI) {

              // New vector of angle PI - angleMin
              nNormaleVector = {
                x: Math.cos(Math.PI - angleMin) * 2,
                y: Math.sin(Math.PI - angleMin) * 2
              };
            } else if ((angle > 2 * Math.PI - angleMin) ||
              angle >= Math.PI && (angle < Math.PI + angleMin)) {

              // New vector of angle angleMin
              nNormaleVector = {
                x: Math.cos(angleMin) * 2,
                y: Math.sin(angleMin) * 2
              };
            }
          }

          // evenly distribute nodes along the perpendicular line to
          // [source, target] at the computed intersection point:
          var start = 0, sign = 1, steps = 1;

          if (setNodes.length % 2 == 1) {
            steps = 0;
            start = 1;
          }

          for (var i = 0; i < setNodes.length; i++) {
            NodeMatrix[np(setNodes[i], 'x')] =
              intersectionPoint.x + (sign * nNormaleVector.x * steps) *
              ((start || i >= 2)
                  ? W.settings.nodeSiblingsScale
                  : W.settings.nodeSiblingsScale * 2 / 3
              );

            NodeMatrix[np(setNodes[i], 'y')] =
              intersectionPoint.y + (sign * nNormaleVector.y * steps) *
              ((start || i >= 2)
                  ? W.settings.nodeSiblingsScale
                  : W.settings.nodeSiblingsScale * 2 / 3
              );

            sign = -sign;
            steps += (i + start) % 2;
          }
        });
      }
    }
  }

  // Algorithm run
  function compute(nodes, edges, config) {
    var graph = {nodes: nodes, edges: edges};
    init(graph, config);

    firstIteration = false;
    while (!W.converged) {
      pass();
    }
    updateGraphNodes(graph);
    return true;
  }

  /**
   * Algorithm initialization
   */

  function init(graph, config) {
    config = config || {};
    var byteArrays = graphToByteArrays(graph, config);

    // Matrices
    NodeMatrix = byteArrays.nodes;
    EdgeMatrix = byteArrays.edges;

    // Length
    W.nodesLength = NodeMatrix.length;
    W.edgesLength = EdgeMatrix.length;

    // Merging configuration
    configure(config);
  }

  function configure(o) {
    W.settings = extend(o, W.settings);
  }

  function extend() {
    var i, k, res = {}, l = arguments.length;
    for (i = l - 1; i >= 0; i--) {
      for (k in arguments[i]) {
        res[k] = arguments[i][k];
      }
    }
    return res;
  }

  /**
   *
   * @param {object} graph
   * @param {object[]} graph.nodes
   * @param {string|number} graph.nodes.id
   * @param {number} [graph.nodes.size]
   * @param {object[]} graph.edges
   * @param {string|number} [graph.edges.id]
   * @param {string|number} graph.edges.source
   * @param {string|number} graph.edges.target
   * @param {object} config
   * @returns {{nodes: Float32Array, edges: Float32Array}}
   */
  function graphToByteArrays(graph, config) {
    var nodes = graph.nodes,
      edges = graph.edges,
      nodeIndex = {},
      i, j, l, node, edge;

    // Allocating Byte arrays with correct nb of bytes
    var nodesByteArray = new Float32Array(nodes.length * W.ppn);
    var edgesByteArray = new Float32Array(edges.length * W.ppe);

    // Iterate through nodes
    for (i = j = 0, l = nodes.length; i < l; i++, j += W.ppn) {
      node = nodes[i];

      // Populating index
      nodeIndex[node.id] = j;

      // Populating byte array
      nodesByteArray[j] = randomize(node.x, config);
      nodesByteArray[j + 1] = randomize(node.y, config);
      nodesByteArray[j + 2] = 0;
      nodesByteArray[j + 3] = 0;
      nodesByteArray[j + 4] = 0;
      nodesByteArray[j + 5] = 0;
      nodesByteArray[j + 6] = 1 + (node.degree || 0);
      nodesByteArray[j + 7] = 1;
      nodesByteArray[j + 8] = node.size || config.defaultSize || 1;
      nodesByteArray[j + 9] = node.pinned || 0;
    }

    // Iterate through edges
    for (i = j = 0, l = edges.length; i < l; i++, j += W.ppe) {
      edge = edges[i];
      edgesByteArray[j] = nodeIndex[edge.source];
      edgesByteArray[j + 1] = nodeIndex[edge.target];
      edgesByteArray[j + 2] = edge.weight || 0;
    }

    return {nodes: nodesByteArray, edges: edgesByteArray};
  }

  function updateGraphNodes(graph) {
    for (var i = 0, j = 0, l = NodeMatrix.length; i < l; i += W.ppn, ++j) {
      var node = graph.nodes[j];
      if (!node.pinned) {
        node.x = NodeMatrix[i];
        node.y = NodeMatrix[i + 1];
      }
    }
  }

  compute(nodes, edges, config);
}

module.exports = forceLinkLayout;
