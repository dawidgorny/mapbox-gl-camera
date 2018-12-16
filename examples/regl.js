import { Camera } from '../index';

const domready = require('domready');
const mapboxgl = require('mapbox-gl');

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

const REGL = require('regl');
const vec3 = require('gl-vec3');
const mat4 = require('gl-mat4');
const createRoundedCube = require('primitive-rounded-cube');

let roundedCube = createRoundedCube(1, 1, 1, 10, 10, 10, 0.15);
roundedCube.positions = roundedCube.positions.map(v => vec3.scale(v, v, 0.1));

const mapCenter = [13.418314, 52.49871, 10];
// const mapCenter = [0, 0, 20];

let t = 0;
let camera = new Camera();

const createScene = function (gl) {
  // this.map = map;
  let regl = REGL(gl);
  const drawExampleMesh = regl({
    context: {
      tick: () => t
    },
    vert: ` 
    precision mediump float;
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 model, view, projection, viewProjection, comp;
    varying vec3 vposition;
    varying vec3 vnormal;
    void main() {
      vposition = position;
      vnormal = normal;
      gl_Position = comp * vec4(position, 1);
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
      viewProjection: regl.prop('viewProjection'),
      comp: regl.prop('comp'),
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

  const render = function (camera) {
    const modelScale = 1.0;
    const modelPosition = mapCenter;

    const modelMat = new Float64Array(16);
    mat4.identity(modelMat);
    mat4.translate(modelMat, modelMat, camera.positionFromLngLatAlt(modelPosition));
    camera.positionFromLngLatAlt(modelPosition);
    mat4.scale(modelMat, modelMat, [modelScale, modelScale, modelScale]);

    const compMat = new Float64Array(16);
    mat4.identity(compMat);
    mat4.multiply(compMat, compMat, camera.viewProjection);
    mat4.multiply(compMat, compMat, camera.world);
    mat4.multiply(compMat, compMat, modelMat);

    t++;

    drawExampleMesh({
      model: modelMat,
      view: camera.view,
      projection: camera.projection,
      viewProjection: camera.viewProjection,
      comp: compMat
    });
  };

  return { render };
};

const createMap = () => {
  const mapInstance = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v9',
    center: mapCenter,
    zoom: 17.5,
    pitch: 60,
    renderWorldCopies: false,
    hash: false
  });

  let scene;

  mapInstance.on('style.load', () => {
    mapInstance.addLayer({
      id: 'custom_layer',
      type: 'custom',
      onAdd: function (map, gl) {
        scene = createScene(gl);
      },
      render: function (gl, matrix) {
        camera.update(mapInstance, matrix);
        scene.render(camera);
        mapInstance.triggerRepaint();
      }
    });
  });

};

domready(() => {
  createMap();
});
