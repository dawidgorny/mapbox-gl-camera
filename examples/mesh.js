
const mat4 = require('gl-mat4');

export default class Mesh {
  constructor (regl, mapPosition, center, scale, {positions, cells, normals}) {
    this.regl = regl;
    this.mapPosition = mapPosition;
    this.center = center;
    this.scale = scale;
    this.positions = regl.buffer(positions);
    this.cells = cells;
    this.normals = regl.buffer(normals);
  }

  draw (camera) {
    const regl = this.regl;
    return regl({
      uniforms: {
        model: () => {
          var c = this.center;
          return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            -c[0], -c[1], -c[2], 1
          ];
        },
        comp: () => {
          const mercatorMat = new Float64Array(16);
          mat4.identity(mercatorMat);
          mat4.translate(mercatorMat, mercatorMat, this.mapPosition);
          mat4.scale(mercatorMat, mercatorMat, [this.scale, this.scale, this.scale]);

          const compMat = new Float64Array(16);
          mat4.identity(compMat);
          mat4.multiply(compMat, compMat, camera.viewProjection);
          mat4.multiply(compMat, compMat, camera.world);
          mat4.multiply(compMat, compMat, mercatorMat);

          return compMat;
        }
      },
      attributes: {
        position: this.positions,
        normal: this.normals
      },
      elements: this.cells,
      cull: {
        enable: true,
        face: 'back'
      }
    })();
  }
}
