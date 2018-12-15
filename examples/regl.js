const createCamera = require('perspective-camera');
const domready = require('domready');
const mapboxgl = require('mapbox-gl');
const mapboxglCamera = require('../index');

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

const REGL = require('regl');
const vec2 = require('gl-vec2')
const vec3 = require('gl-vec3')
const mat4 = require('gl-mat4')
const bunny = require('bunny')
const createRoundedCube = require('primitive-rounded-cube');
const calcNormals = require('angle-normals');

var cubePosition = [
  [-0.5, +0.5, +0.5], [+0.5, +0.5, +0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5], // positive z face.
  [+0.5, +0.5, +0.5], [+0.5, +0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5], // positive x face
  [+0.5, +0.5, -0.5], [-0.5, +0.5, -0.5], [-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5], // negative z face
  [-0.5, +0.5, -0.5], [-0.5, +0.5, +0.5], [-0.5, -0.5, +0.5], [-0.5, -0.5, -0.5], // negative x face.
  [-0.5, +0.5, -0.5], [+0.5, +0.5, -0.5], [+0.5, +0.5, +0.5], [-0.5, +0.5, +0.5], // top face
  [-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5]  // bottom face
]
const cubeElements = [
  [2, 1, 0], [2, 0, 3],       // positive z face.
  [6, 5, 4], [6, 4, 7],       // positive x face.
  [10, 9, 8], [10, 8, 11],    // negative z face.
  [14, 13, 12], [14, 12, 15], // negative x face.
  [18, 17, 16], [18, 16, 19], // top face.
  [20, 21, 22], [23, 20, 22]  // bottom face
]

let cube = {
  positions: cubePosition,
  cells: cubeElements
}
cube.normals = calcNormals(cube.cells, cube.positions);

let roundedCube = createRoundedCube(1, 1, 1, 10, 10, 10, 0.15);
roundedCube.positions = roundedCube.positions.map(v => vec3.scale(v, v, 0.1));

bunny.normals = calcNormals(bunny.cells, bunny.positions);

const mapCenter = [13.418314, 52.49871, 20];

const WORLD_SCALE = 1000.0;

let s = 1.0 / WORLD_SCALE;

let modelScale = 10.0;

let t = 0;


/*
 * The circumference of the world in meters at the given latitude.
 */
function circumferenceAtLatitude(latitude) {
  const circumference = 2 * Math.PI * 6378137;
  return circumference * Math.cos(latitude * Math.PI / 180);
}

function mercatorXfromLng(lng) {
  return (180 + lng) / 360;
}

function mercatorYfromLat(lat) {
  return (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)))) / 360;
}

function mercatorZfromAltitude(altitude, lat) {
  return altitude / circumferenceAtLatitude(lat);
}


/**
 * modelMat calc
 */
const tileSize = 512;

const worldMat = new Float64Array(16);
mat4.identity(worldMat);
let worldScaleMat = new Float64Array(16);
mat4.identity(worldScaleMat);

let worldScale = (-1 / tileSize);
mat4.scale(worldScaleMat, worldScaleMat, [worldScale, worldScale, worldScale]);
mat4.multiply(worldMat, worldMat, worldScaleMat);

const modelMat = new Float64Array(16);
mat4.identity(modelMat);

const modelScaleMat = new Float64Array(16);
mat4.identity(modelScaleMat);
mat4.scale(modelScaleMat, modelScaleMat, [modelScale, modelScale, modelScale]);
const modelRotateMat = new Float64Array(16);
mat4.identity(modelRotateMat);
const modelTranslateMat = new Float64Array(16);
mat4.identity(modelTranslateMat);

let mp = new Float64Array(3);
mp[0] = mercatorXfromLng(mapCenter[0]) * WORLD_SCALE;
mp[1] = mercatorYfromLat(mapCenter[1]) * WORLD_SCALE;
mp[2] = mercatorZfromAltitude(mapCenter[2], mapCenter[1]) * WORLD_SCALE;
mat4.translate(modelTranslateMat, modelTranslateMat, mp);

mat4.multiply(modelMat, modelMat, modelTranslateMat);
mat4.multiply(modelMat, modelMat, modelRotateMat);
mat4.multiply(modelMat, modelMat, modelScaleMat);

mat4.multiply(modelMat, modelMat, worldMat);

const createScene = function (map, gl) {
  this.map = map;
  let regl = REGL(gl);
  const drawBunny = regl({
    context: {
      tick: () => t
    },
    vert: ` 
    precision mediump float;
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 model, view, projection;
    varying vec3 vposition;
    varying vec3 vnormal;
    void main() {
      vposition = position;
      vnormal = normal;
      gl_Position = projection * view * model * vec4(position, 1);
    }`,
    frag: `
    precision mediump float;
    struct Light {
      vec3 color;
      vec3 position;
    };
    uniform Light lights[4];
    varying vec3 vposition;
    varying vec3 vnormal;
    void main() {
      vec3 normal = normalize(vnormal);
      vec3 light = vec3(0, 0, 0);
      for (int i = 0; i < 4; ++i) {
        vec3 lightDir = normalize(lights[i].position - vposition);
        float diffuse = max(0.0, dot(lightDir, normal));
        light += diffuse * lights[i].color;
      }
      gl_FragColor = vec4(light, 1);
    }`,

    attributes: {
      position: regl.buffer(roundedCube.positions),
      normal: regl.buffer(roundedCube.normals)
    },
    elements: roundedCube.cells,
    uniforms: {
      model: regl.prop('model'),
      view: regl.prop('view'),
      projection: regl.prop('projection'),
      'lights[0].color': [1, 0, 0],
      'lights[1].color': [0, 1, 0],
      'lights[2].color': [0, 0, 1],
      'lights[3].color': [1, 1, 0],
      'lights[0].position': ({tick}) => {
        const t = 0.1 * tick
        return [
          10 * Math.cos(0.09 * (t)),
          10 * Math.sin(0.09 * (2 * t)),
          10 * Math.cos(0.09 * (3 * t))
        ]
      },
      'lights[1].position': ({tick}) => {
        const t = 0.1 * tick
        return [
          10 * Math.cos(0.05 * (5 * t + 1)),
          10 * Math.sin(0.05 * (4 * t)),
          10 * Math.cos(0.05 * (0.1 * t))
        ]
      },
      'lights[2].position': ({tick}) => {
        const t = 0.1 * tick
        return [
          10 * Math.cos(0.05 * (9 * t)),
          10 * Math.sin(0.05 * (0.25 * t)),
          10 * Math.cos(0.05 * (4 * t))
        ]
      },
      'lights[3].position': ({tick}) => {
        const t = 0.1 * tick
        return [
          10 * Math.cos(0.1 * (0.3 * t)),
          10 * Math.sin(0.1 * (2.1 * t)),
          10 * Math.cos(0.1 * (1.3 * t))
        ]
      }
    },
    depth: {
      mask: false,
      enable: true
    },
    cull: {
      enable: true,
      face: 'back'
    }
  });

  this.update = function (gl, viewProjectionMatrix, triggeredByMap) {
    /**
     * from https://github.com/mapbox/mapbox-gl-js/issues/7395#issuecomment-428899262
     */
    const transform = this.map.transform;

    const projectionMatrix = new Float64Array(16);
    const projectionMatrixI = new Float64Array(16);
    const viewMatrix = new Float64Array(16);
    const viewMatrixI = new Float64Array(16);

    // from https://github.com/mapbox/mapbox-gl-js/blob/master/src/geo/transform.js#L556-L568
    const halfFov = transform._fov / 2.0;
    const groundAngle = Math.PI / 2.0 + transform._pitch;
    const topHalfSurfaceDistance = Math.sin(halfFov) * transform.cameraToCenterDistance / Math.sin(Math.PI - groundAngle - halfFov);
    const furthestDistance = Math.cos(Math.PI / 2.0 - transform._pitch) * topHalfSurfaceDistance + transform.cameraToCenterDistance;
    let farZ = furthestDistance * 1.01;
    
    mat4.perspective(projectionMatrix, transform._fov, transform.width / transform.height, 1, farZ);
    mat4.invert(projectionMatrixI, projectionMatrix);
    mat4.multiply(viewMatrix, projectionMatrixI, viewProjectionMatrix);
    mat4.invert(viewMatrixI, viewMatrix);

    const scaleMatrix = new Float64Array(16);
    mat4.identity(scaleMatrix);
    mat4.scale(scaleMatrix, scaleMatrix, [s, s, s]);

    mat4.multiply(viewMatrix, viewMatrix, scaleMatrix);

    const m = new Float64Array(16);
    mat4.identity(m);

    mat4.multiply(m, m, projectionMatrix);
    mat4.multiply(m, m, viewMatrix);
    mat4.multiply(m, m, modelMat);

    t++;

    drawBunny({
      model: m,
      view: mat4.identity([]),
      projection: mat4.identity([])
    });

/* 
    drawBunny({
      model: modelMat,
      view: viewMatrix,
      projection: projectionMatrix
    }); */

    if (!triggeredByMap) this.map.triggerRepaint()
  };

  return this;
};

const createMap = () => {
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v9',
    center: mapCenter,
    zoom: 17.5,
    pitch: 60,
    renderWorldCopies: false,
    hash: false
  });

  let scene;

  map.on('style.load', () => {
    map.addLayer({
      id: 'custom_layer',
      type: 'custom',
      onAdd: function (map, gl) {
        console.log('custom_layer', 'onAdd');
        scene = createScene(map, gl);
      },
      render: function (gl, matrix) {
        scene.update(gl, matrix);
      }
    });
  });

};

domready(() => {
  createMap();
});
