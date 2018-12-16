
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

    this._mercatorMat = new Float64Array(16);
    this._compMat = new Float64Array(16);
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
          mat4.identity(this._mercatorMat);
          mat4.translate(this._mercatorMat, this._mercatorMat, this.mapPosition);
          mat4.scale(this._mercatorMat, this._mercatorMat, [this.scale, this.scale, this.scale]);

          mat4.identity(this._compMat);
          mat4.multiply(this._compMat, this._compMat, camera.viewProjection);
          mat4.multiply(this._compMat, this._compMat, camera.world);
          mat4.multiply(this._compMat, this._compMat, this._mercatorMat);

          return this._compMat;
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
      },
      depth: {
        enable: true,
        mask: true
      }
    })();
  }
}
