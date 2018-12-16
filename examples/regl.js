import { Camera } from '../index';
import Mesh from './mesh';

const domready = require('domready');
const mapboxgl = require('mapbox-gl');

mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

const REGL = require('regl');
const vec3 = require('gl-vec3');
const mat4 = require('gl-mat4');
const createCube = require('primitive-cube');
const createRoundedCube = require('primitive-rounded-cube');

const groundGeom = createCube(1, 1, 0.001, 3, 3, 3);
const roundedCube = createRoundedCube(1, 1, 1, 10, 10, 10, 0.15);

const mapCenter = [13.418314, 52.49871, 1];

let t = 0;
const camera = new Camera();

function getModelMatrix (lngLatAlt, scale) {
  const modelMat = new Float64Array(16);
  mat4.identity(modelMat);
  mat4.translate(modelMat, modelMat, camera.positionFromLngLatAlt(lngLatAlt));
  mat4.scale(modelMat, modelMat, [scale, scale, scale]);
  return modelMat;
}

const createScene = function (gl) {
  let regl = REGL(gl);
  const drawScope = regl({
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
      gl_Position = comp * model * vec4(position, 1);
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
    uniforms: {
      view: regl.prop('view'),
      projection: regl.prop('projection'),
      viewProjection: regl.prop('viewProjection'),
      // comp: regl.prop('comp'),
      'lights[0].color': [1, 0, 0],
      'lights[1].color': [0, 1, 0],
      'lights[2].color': [0, 0, 1],
      'lights[3].color': [1, 1, 0],
      'lights[0].position': ({tick}) => {
        const t = 0.1 * tick;
        return [
          10 * Math.cos(0.09 * (t)),
          10 * Math.sin(0.09 * (2 * t)),
          10 * Math.cos(0.09 * (3 * t))
        ];
      },
      'lights[1].position': ({tick}) => {
        const t = 0.1 * tick;
        return [
          10 * Math.cos(0.05 * (5 * t + 1)),
          10 * Math.sin(0.05 * (4 * t)),
          10 * Math.cos(0.05 * (0.1 * t))
        ];
      },
      'lights[2].position': ({tick}) => {
        const t = 0.1 * tick;
        return [
          10 * Math.cos(0.05 * (9 * t)),
          10 * Math.sin(0.05 * (0.25 * t)),
          10 * Math.cos(0.05 * (4 * t))
        ];
      },
      'lights[3].position': ({tick}) => {
        const t = 0.1 * tick;
        return [
          10 * Math.cos(0.1 * (0.3 * t)),
          10 * Math.sin(0.1 * (2.1 * t)),
          10 * Math.cos(0.1 * (1.3 * t))
        ];
      }
    },
    depth: {
      enable: true,
      mask: true
    },
    cull: {
      enable: true,
      face: 'back'
    }
  });

  const mapMeshPos = camera.positionFromLngLatAlt(mapCenter);
  const groundMesh = new Mesh(regl, [mapMeshPos[0], mapMeshPos[1], 0], [0, 0, 0], 1.0, groundGeom);
  const roundedCubeMesh = new Mesh(regl, mapMeshPos, [0, 0, 0], 0.1, roundedCube);
  const roundedCubeMesh2 = new Mesh(regl, mapMeshPos, [1.1, 0.1, 0.1], 0.1, roundedCube);
  const roundedCubeMesh3 = new Mesh(regl, camera.positionFromLngLatAlt([mapMeshPos[0] + 0.0003, mapMeshPos[1], mapMeshPos[2]]), [0, 0, 0], 0.15, roundedCube);

  const render = function (camera) {
    drawScope({
      view: camera.view,
      projection: camera.projection,
      viewProjection: camera.viewProjection
    }, () => {
      // groundMesh.draw(camera);
      roundedCubeMesh.draw(camera);
      roundedCubeMesh2.draw(camera);
      roundedCubeMesh3.draw(camera);
    });

    t++;
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
