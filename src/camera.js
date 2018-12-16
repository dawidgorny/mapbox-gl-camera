import {mercatorXfromLng, mercatorYfromLat, mercatorZfromAltitude} from './mercator.js';

const mat4 = require('gl-mat4');

export default class Camera {
  constructor () {
    this.tileSize = 512.0;
    this.worldScale = 1000.0;
    this._view = new Float64Array(16);
    this._viewI = new Float64Array(16);
    this._projection = new Float64Array(16);
    this._projectionI = new Float64Array(16);
    this._viewProjection = new Float64Array(16);
    this._world = new Float64Array(16);
  }

  get view () {
    return this._view;
  }

  get projection () {
    return this._projection;
  }

  get viewProjection () {
    return this._viewProjection;
  }

  get world () {
    return this._world;
  }

  update (map, viewProjectionMatrix) {
    /**
     * from https://github.com/mapbox/mapbox-gl-js/issues/7395#issuecomment-428899262
     */
    const transform = map.transform;

    // from https://github.com/mapbox/mapbox-gl-js/blob/master/src/geo/transform.js#L556-L568
    const halfFov = transform._fov / 2.0;
    const groundAngle = Math.PI / 2.0 + transform._pitch;
    const topHalfSurfaceDistance = Math.sin(halfFov) * transform.cameraToCenterDistance / Math.sin(Math.PI - groundAngle - halfFov);
    const furthestDistance = Math.cos(Math.PI / 2.0 - transform._pitch) * topHalfSurfaceDistance + transform.cameraToCenterDistance;
    let farZ = furthestDistance * 1.01;
    
    mat4.perspective(this._projection, transform._fov, transform.width / transform.height, 1, farZ);
    mat4.invert(this._projectionI, this._projection);
    mat4.multiply(this._view, this._projectionI, viewProjectionMatrix);
    
    mat4.identity(this._world);

    const worldTranslateMat = new Float64Array(16);
    mat4.identity(worldTranslateMat);

    const worldScaleMat = new Float64Array(16);
    mat4.identity(worldScaleMat);

    mat4.translate(worldTranslateMat, worldTranslateMat, [0.5, 0.5, 0]);
    let s = 1.0 / (this.tileSize / 2) * (1.0 / this.worldScale);
    mat4.scale(worldScaleMat, worldScaleMat, [s, s, -s]);

    mat4.multiply(this._world, this.world, worldTranslateMat);
    mat4.multiply(this._world, this.world, worldScaleMat);

    mat4.invert(this._viewI, this._view);

    mat4.identity(this._viewProjection);
    mat4.multiply(this._viewProjection, this._viewProjection, this.projection);
    mat4.multiply(this._viewProjection, this._viewProjection, this.view);
  }

  positionFromLngLatAlt (lngLatAlt) {
    let position = new Float64Array(3);
    position[0] = (-0.5 + mercatorXfromLng(lngLatAlt[0])) * (this.tileSize / 2) * (this.worldScale);
    position[1] = (-0.5 + mercatorYfromLat(lngLatAlt[1])) * (this.tileSize / 2) * (this.worldScale);
    position[2] = -mercatorZfromAltitude(lngLatAlt[2], lngLatAlt[1]) * (this.tileSize / 2) * (this.worldScale);
    return position;
  }
}
