import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import Stats from 'three/examples/jsm/libs/stats.module';
import screenQuad_vert from "./screenQuad_vert.js";
import screenQuad_frag from "./screenQuad_frag.js";
import box1_vert from "./box1_vert.js";
import box1_frag from "./box1_frag.js";

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

let rendererSz = new THREE.Vector2(0, 0);

var width = 0;
var height = 0;
var canvasPlaneSize = new THREE.Vector2(0, 0);

// instantiate a framebuffer texture
// const pixelRatio = window.devicePixelRatio;
let textureSize = new THREE.Vector2(0, 0);
let frameTexture = null;

///Meta scene
var pixelSz = 4;
if (isMobile.any()) pixelSz = 4;
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

var mouse = new THREE.Vector3(-1000, 0, 0);
var isMouseDown = false;


var touchSize = new THREE.Vector2(50, 50);
touchSize.x /= pixelSz;
touchSize.y /= pixelSz;

let canvas = document.getElementById("canvas");

function init() {

    //create a webGL renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false
    });
    let container = document.getElementById("canvasContainer");
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setClearColor(0x7e7e7e);
    renderer.autoClear = false;
    document.body.appendChild(renderer.domElement);
    renderer.getSize(rendererSz);
    console.log("rendererSz = ", rendererSz);

    // Set sizes of things based on renderer size

    width = roundEven(rendererSz.x);
    height = roundEven(rendererSz.y);
    canvasPlaneSize = new THREE.Vector2(
        width,
        height
    );

    // instantiate a framebuffer texture
    // const pixelRatio = window.devicePixelRatio;
    textureSize = new THREE.Vector2(
        canvasPlaneSize.x * pixelSz,
        canvasPlaneSize.y * pixelSz
    );
    frameTexture = new THREE.FramebufferTexture(
        textureSize.x,
        textureSize.y
    );

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
            "touchSize": {
                value: touchSize
            },
            "mouse": {
                value: mouse
            },
            "tLUT": {
                value: null
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

    // let test_g = new THREE.BoxGeometry(100, 100, 100);
    // let test_m = new THREE.MeshBasicMaterial({
    //     map: frameTexture,
    //     shading: THREE.FlatShading
    // });
    // let test = new THREE.Mesh(test_g, test_m);
    // scene.add(test);

    //////////////////////////
    // Event listeners ///////
    //////////////////////////

    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mousemove', onMouseMove, false);

    document.addEventListener("touchmove", onTouchMove);
}

////////////////////////////////////////////////// INTERACTION //////////////////////////////////////////////////////
// var offX = evt.layerX - mycanvas.offsetLeft;
// var offY = evt.layerY - mycanvas.offsetTop;
//var x_2 = touch.pageX - canvas.offsetLeft;
//var y_2 = touch.pageY - canvas.offsetTop;
function onTouchMove(e) {
    e.preventDefault();
    let touch = e.touches[0];

    let touchPos = new THREE.Vector2(
        touch.clientX,
        touch.clientY
    );

    touchSize = new THREE.Vector2(
        touch.radiusX,
        touch.radiusY
    );

    touchSize.x /= pixelSz;
    touchSize.y /= pixelSz;

    mouse.x = map(touchPos.x, 0, textureSize.x, -canvasPlaneSize.x / 2, canvasPlaneSize.x / 2);
    mouse.y = map(touchPos.y, 0, textureSize.y, -canvasPlaneSize.y / 4, -canvasPlaneSize.y * 1.25);
}

function onMouseUp(event) {
    isMouseDown = false;
}

function map(value, min1, max1, min2, max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

function onMouseMove(event) {
    // if (!isMouseDown) return;

    event.preventDefault();

    switch (event.which) {
        case 1: // left mouse click
            mouse.x = map(event.clientX, 0, textureSize.x, -canvasPlaneSize.x / 2, canvasPlaneSize.x / 2);
            mouse.y = map(event.clientY, 0, textureSize.y, -canvasPlaneSize.y / 4, -canvasPlaneSize.y * 1.25);
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
        (rendererSz.x * pixelSz / 2) - (textureSize / 2),
        (rendererSz.y * pixelSz / 2) - (textureSize / 2)
    );
    renderer.copyFramebufferToTexture(copyPos, frameTexture);
    b.material.uniforms.tFrameBuffer.value = frameTexture;
}

init();
animate();

window.addEventListener('resize', function (event) {
    width = roundEven(rendererSz.x);
    height = roundEven(rendererSz.y);
    canvasPlaneSize = new THREE.Vector2(
        width,
        height
    );

    ///Update main scene
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.getSize(rendererSz);

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