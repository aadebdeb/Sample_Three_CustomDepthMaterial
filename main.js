import {
  Color,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  PlaneBufferGeometry,
  SphereBufferGeometry,
  MeshLambertMaterial,
  ShaderMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
  ShaderLib,
  Clock,
  RGBADepthPacking
} from "https://cdnjs.cloudflare.com/ajax/libs/three.js/109/three.module.js";

const scene = new Scene();
const camera = new PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 100);

const renderer = new WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const vertexShader = `
#define LAMBERT
varying vec3 vLightFront;
varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
	varying vec3 vLightBack;
	varying vec3 vIndirectBack;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <bsdfs>
#include <lights_pars_begin>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

float random(vec3 x){
  return fract(sin(dot(x,vec3(12.9898, 78.233, 39.425))) * 43758.5453);
}
uniform float time;

void main() {
  #include <uv_vertex>
  #include <uv2_vertex>
  #include <color_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>

  transformed += objectNormal * 0.5 * sin(0.5 * time + 10.0 * random(transformed));

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  #include <worldpos_vertex>
  #include <envmap_vertex>
  #include <lights_lambert_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
}
`;

const lambert = ShaderLib['lambert'];
const shaderMaterial = new ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: lambert.fragmentShader,
  uniforms: Object.assign(
    lambert.uniforms,
    {
      'diffuse': { value: new Color(0x6699ff) },
      'time': { value: 0 },
    },
  ),
});
shaderMaterial.lights = true;

const depthVertexShader = `
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

float random(vec3 x){
  return fract(sin(dot(x,vec3(12.9898, 78.233, 39.425))) * 43758.5453);
}
uniform float time;

void main() {
  #include <uv_vertex>
  #include <skinbase_vertex>
  #ifdef USE_DISPLACEMENTMAP
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinnormal_vertex>
  #endif
  #include <begin_vertex>

  transformed += normal * 0.5 * sin(0.5 * time + 10.0 * random(transformed));

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
}
`;

const depth = ShaderLib['depth'];
const depthMaterial = new ShaderMaterial({
  vertexShader: depthVertexShader,
  fragmentShader: depth.fragmentShader,
  uniforms: Object.assign(
    depth.uniforms,
    {
      'time': { value: 0 },
    },
  ),
  defines: {
    'DEPTH_PACKING': RGBADepthPacking,
  },
});


const sphere = new Mesh(
  new SphereBufferGeometry(),
  shaderMaterial
);
sphere.castShadow = true;
sphere.customDepthMaterial = depthMaterial;
scene.add(sphere);

const plane = new Mesh(
  new PlaneBufferGeometry(5, 5),
  new MeshLambertMaterial(),
);
plane.position.y = -1.5;
plane.rotation.x = -0.5 * Math.PI;
plane.receiveShadow = true;
scene.add(plane);

camera.position.z = 4;

const light = new DirectionalLight();
light.castShadow = true;
scene.add(light);

const ambient = new AmbientLight(0x404040);
scene.add(ambient);

const clock = new Clock();
function animate() {
  requestAnimationFrame(animate);

  sphere.rotation.x += 0.01;
  sphere.rotation.y += 0.01;

  const time = clock.getElapsedTime();
  shaderMaterial.uniforms.time.value = time;
  depthMaterial.uniforms.time.value = time;

  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const parameters = {
  useCustomDepthMaterial: !!sphere.customDepthMaterial,
};

const gui = new dat.GUI();
gui.add(parameters, 'useCustomDepthMaterial').onChange((v) => {
  sphere.customDepthMaterial = v ? depthMaterial : undefined;
});

animate();