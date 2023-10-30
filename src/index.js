import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import Stats from 'three/examples/jsm/libs/stats.module';
import screenQuad_vert from "./screenQuad_vert.js";
import screenQuad_frag from "./screenQuad_frag.js";
import box1_vert from "./box1_vert.js";
import box1_frag from "./box1_frag.js";
import lut from "./lut.png"

///Dev tools
// const stats = new Stats();
// stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild( stats.dom );
// var controls;

const isMobile = {
    Android: function () {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function () {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function () {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function () {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function () {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function () {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

///Canvas sizing/layout

var width = roundEven(window.innerWidth);
var height = roundEven(window.innerHeight);
var canvasPlaneSize = new THREE.Vector2(
    width,
    height
);

///Meta scene
var pixelSz = 1;
if (isMobile.any()) pixelSz = 2;
///screenCamera looks at the quad that renders the scene
///screenScene is the scene that contains the screen quad
var screenCamera, screenScene;
var rtTexture, screenQuad;

///Main scene
///This cam and scene are inside the screen quad
///Use these to edit the main scene content
var camera, scene, renderer;

///Scene objects
var b, point;

var mouse = new THREE.Vector3(0, 0, 0);
var isMouseDown = false;

const lutTex = new THREE.TextureLoader().load(lut);

// instantiate a framebuffer texture
// const pixelRatio = window.devicePixelRatio;
const pixelRatio = pixelSz;
const textureSize = new THREE.Vector2(
    canvasPlaneSize.x * pixelRatio,
    canvasPlaneSize.y * pixelRatio
);
const frameTexture = new THREE.FramebufferTexture(
    textureSize.x,
    textureSize.y
);

function init() {

    // create scenes
    scene = new THREE.Scene();
    screenScene = new THREE.Scene();

    //create cameras
    camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 5000);
    camera.position.set(0, 0, canvasPlaneSize.x);
    camera.lookAt(scene.position);

    screenCamera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, -5000, 5000);
    screenCamera.position.z = 1;

    ///Meta scene setup (scene screen quad)
    rtTexture = new THREE.WebGLRenderTarget(
        width / pixelSz, //resolution x
        height / pixelSz, //resolution y
        {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat
        });

    var materialScreen = new THREE.ShaderMaterial({
        uniforms: { tDiffuse: { value: rtTexture.texture } },
        vertexShader: screenQuad_vert,
        fragmentShader: screenQuad_frag,
        depthWrite: false
    });

    var plane = new THREE.PlaneGeometry(width, height);
    // plane to display rendered texture
    screenQuad = new THREE.Mesh(plane, materialScreen);
    screenQuad.position.z = - 100;
    screenScene.add(screenQuad);

    //create a webGL renderer
    renderer = new THREE.WebGLRenderer({
        antialias: false
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x7e7e7e);
    renderer.autoClear = false;
    document.body.appendChild(renderer.domElement);

    // Controls
    // controls = new OrbitControls(camera, renderer.domElement);

    //////////////////////////
    // Custom scene code /////
    //////////////////////////

    //create plane
    let b_g = new THREE.BoxGeometry(canvasPlaneSize.x, canvasPlaneSize.y, 1);
    let b_m = new THREE.ShaderMaterial({
        uniforms: {
            "size": {
                value: canvasPlaneSize
            },
            "mouse": {
                value: mouse
            },
            "tLUT": {
                value: lutTex
            },
            "tFrameBuffer": {
                value: frameTexture
            }
        },
        vertexShader: box1_vert,
        fragmentShader: box1_frag,
        blending: THREE.NormalBlending,
        depthTest: true,
        transparent: true
    });
    b = new THREE.Mesh(b_g, b_m);
    scene.add(b);

    let point_g = new THREE.BoxGeometry(20, 20, 20);
    let point_m = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    point = new THREE.Mesh(point_g, point_m);
    // scene.add(point);

    let test_g = new THREE.BoxGeometry(100, 100, 100);
    let test_m = new THREE.MeshBasicMaterial({
        map: frameTexture,
        shading: THREE.FlatShading
    });
    let test = new THREE.Mesh(test_g, test_m);
    scene.add(test);

    //////////////////////////
    // Event listeners ///////
    //////////////////////////

    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mousemove', onMouseMove, false);
}

function onMouseUp(event) {
    isMouseDown = false;
}

function map(value, min1, max1, min2, max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

function onMouseMove(event) {
    if (!isMouseDown) return;

    event.preventDefault();

    switch (event.which) {
        case 1: // left mouse click
            mouse.x = map(event.clientX, 0, window.innerWidth, -canvasPlaneSize.x / 2, canvasPlaneSize.x / 2);
            mouse.y = map(event.clientY, 0, window.innerHeight, canvasPlaneSize.y / 2, - canvasPlaneSize.y / 2);
            break;
    }
}

function onMouseDown(event) {
    isMouseDown = true;
}

function animate() {
    // stats.begin();
    requestAnimationFrame(animate);
    var time = performance.now() * 0.001;
    point.position.set(mouse.x, mouse.y, 0);
    render();
    // stats.end();
}

function render() {
    // Render first scene into texture
    renderer.setRenderTarget(rtTexture);
    renderer.clear();
    renderer.render(scene, camera);

    // Render full screen screenQuad with generated texture
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(screenScene, screenCamera);

    let copyPos = new THREE.Vector2(
        (window.innerWidth * pixelRatio / 2) - (textureSize / 2),
        (window.innerHeight * pixelRatio / 2) - (textureSize / 2)
    );
    renderer.copyFramebufferToTexture(copyPos, frameTexture);
    b.material.uniforms.tFrameBuffer.value = frameTexture;
}

init();
animate();

window.addEventListener('resize', function (event) {
    width = roundEven(window.innerWidth);
    height = roundEven(window.innerHeight);
    canvasPlaneSize = new THREE.Vector2(
        width * 0.9,
        height * 0.9
    );

    ///Update main scene
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    ///Update meta scene
    rtTexture = new THREE.WebGLRenderTarget(
        width / pixelSz, //resolution x
        height / pixelSz, //resolution y
        {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat
        });

    screenQuad.material = new THREE.ShaderMaterial({
        uniforms: { tDiffuse: { value: rtTexture.texture } },
        vertexShader: screenQuad_vert,
        fragmentShader: screenQuad_frag,
        depthWrite: false
    });
    screenQuad.material.needsUpdate = true;
});

function roundEven(v) {
    return 2 * Math.round(v / 2);
}