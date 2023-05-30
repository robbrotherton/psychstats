
// adapted from https://github.com/uuuulala/Threejs-rolling-dice-tutorial/


import * as CANNON from 'https://cdn.skypack.dev/cannon-es';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { createSumsHistogram, updateSumsHistogram, resetChart } from './chart.js';
import { scaleCanvas } from '/utils/utils.js'

const canvasWidth = 500;
const canvasHeight = 300;


const params = {
    numberOfDice: 2,
    diceScale: 2,
    segments: 40,
    edgeRadius: .07,
    notchRadius: .12,
    notchDepth: .1,
};

const colorPal = [
    "#D77",
    "#7799DD",
    "#77BA81",
    "#dfdf00",
    "#AA77DD",
    "#999"
];


const container = d3.select("#content");
const canvasEl = document.querySelector('#canvas');
const scoreResult = document.querySelector('#score-result');
const rollBtn = document.querySelector('#roll-btn');
const nDiceBtn = document.querySelector('#nDice');
const add100Btn = document.querySelector('#add-100');
const add1000Btn = document.querySelector('#add-1000');
const resetChartBtn = document.querySelector('#reset-chart');

// canvasEl.width = canvasWidth;
// canvasEl.height = canvasHeight;

canvasEl.addEventListener('mousedown', onMouseDown, false);
canvasEl.addEventListener('mousemove', onMouseMove, false);
canvasEl.addEventListener('mouseup', onMouseUp, false);
canvasEl.addEventListener('touchstart', onTouchStart, false);
canvasEl.addEventListener('touchmove', onTouchMove, false);
canvasEl.addEventListener('touchend', onTouchEnd, false);


let renderer, scene, camera, physicsWorld;

const diceArray = [];
let diceIdArray = [];
const res = [];
const rollCounts = [];
const sumCounts = [];
const activeConstraints = [];
let target;

const containerWidth = 18;
const containerHeight = 6;
const containerDepth = 11;



let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let draggedDice = null;


const overlay = d3.select("#overlay")

overlay
.style("border", "2px solid #D77")
.style("border-radius", "5px")
.style("position", "absolute")
.style("left", "5%")
.style("top", "5%")
.style("width", "90%")
.style("height", "90%")
// .style("margin", "auto")
    .style("z-index", -1)


initPhysics();
initScene(params.numberOfDice);

const svg = createSumsHistogram(canvasWidth, 200);
// svg.append("circle")
//     .attr("cx", 10)
//     .attr("cy", 10)
//     .attr("r", 10)
//     .attr("fill", "black")

window.addEventListener('resize', updateSceneSize);
window.addEventListener('dblclick', throwDice);
rollBtn.addEventListener('click', throwDice);
add100Btn.addEventListener('click', () => addNRolls(100));
add1000Btn.addEventListener('click', () => addNRolls(1000));
resetChartBtn.addEventListener("click", () => resetChart(svg, sumCounts));

nDiceBtn.addEventListener('change', () => {
    let n = parseInt(nDiceBtn.value);
    let scale = 2 - n/15;
    params.numberOfDice = n;
    params.diceScale = scale;
    resetChart(svg, sumCounts);
    resetWorld(parseInt(nDiceBtn.value));
    throwDice();
});

function initScene(numberOfDice) {

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: canvasEl
    });
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(40, 15, 0.6, 200);
    camera.position.set(0, 14, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    updateSceneSize();

    const ambientLight = new THREE.AmbientLight(0xffffff, .5);
    scene.add(ambientLight);
    const topLight = new THREE.PointLight(0xffffff, .5);
    topLight.position.set(5, 15, 0);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 2048;
    topLight.shadow.mapSize.height = 2048;
    topLight.shadow.camera.near = 5;
    topLight.shadow.camera.far = 400;
    scene.add(topLight);

    createFloor();

    createContainer(containerWidth, containerHeight, containerDepth);

    const diceMesh = createDiceMesh();

    for (let i = 0; i < numberOfDice; i++) {

        const color = colorPal[i % colorPal.length];
        let die = createDice(diceMesh, color);
        diceArray.push(die);
        let children = die.mesh.children;
        let childrenIds = [];
        children.forEach((c) => childrenIds.push(c.uuid));
        diceIdArray.push(childrenIds);
        addDiceEvents(die);
    }

    throwDice();

    render();
}

function initPhysics() {
    physicsWorld = new CANNON.World({
        allowSleep: true,
        gravity: new CANNON.Vec3(0, -55, 0),
    })
    physicsWorld.defaultContactMaterial.restitution = .3;
}

function resetWorld(numberOfDice) {
    // Remove existing dice from the scene and physics world
    diceArray.forEach(dice => {
        scene.remove(dice.mesh);
        physicsWorld.removeBody(dice.body);
    });

    // Clear the arrays
    diceArray.length = 0;
    diceIdArray.length = 0;

    // Initialize new dice
    const diceMesh = createDiceMesh();
    for (let i = 0; i < numberOfDice; i++) {
        const color = colorPal[i % colorPal.length];
        let die = createDice(diceMesh, color);
        diceArray.push(die);
        let children = die.mesh.children;
        let childrenIds = [];
        children.forEach((c) => childrenIds.push(c.uuid));
        diceIdArray.push(childrenIds);
        addDiceEvents(die);
    }
}

function createFloor() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        // new THREE.MeshStandardMaterial({
        //     color: "#ccc",
        //     opacity: 0.5
        // }),
        new THREE.ShadowMaterial({
            opacity: 0.05,
        })
    );
    floor.receiveShadow = true;
    floor.position.y = -containerHeight * 0.5;
    floor.rotation.x = -Math.PI / 2; // Replace the quaternion.setFromAxisAngle() line with this
    scene.add(floor);

    const floorBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
    });
    floorBody.position.copy(floor.position);
    floorBody.quaternion.setFromEuler(floor.rotation.x, floor.rotation.y, floor.rotation.z, "XYZ"); // Update this line
    physicsWorld.addBody(floorBody);
}

function createContainer(width, height, depth) {
    const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2);
    const wallMaterial = new THREE.MeshBasicMaterial({ color: "#000000", wireframe: false, opacity: 0, transparent: true });

    const orientations = [
        new CANNON.Vec3(1, 0, 0),
        new CANNON.Vec3(-1, 0, 0),
        new CANNON.Vec3(0, 1, 0),
        new CANNON.Vec3(0, -1, 0),
        new CANNON.Vec3(0, 0, 1),
        new CANNON.Vec3(0, 0, -1),
    ];

    const positions = [
        new CANNON.Vec3(halfExtents.x, 0, 0),
        new CANNON.Vec3(-halfExtents.x, 0, 0),
        new CANNON.Vec3(0, halfExtents.y, 0),
        new CANNON.Vec3(0, -halfExtents.y, 0),
        new CANNON.Vec3(0, 0, halfExtents.z),
        new CANNON.Vec3(0, 0, -halfExtents.z),
    ];

    const sizes = [
        { x: containerDepth, y: containerHeight },
        { x: containerDepth, y: containerHeight },
        { x: containerWidth, y: containerDepth },
        { x: containerWidth, y: containerDepth },
        { x: containerWidth, y: containerHeight },
        { x: containerWidth, y: containerHeight }
    ];

    for (let i = 0; i < orientations.length; i++) {
        const planeGeometry = new THREE.PlaneGeometry(sizes[i].x, sizes[i].y);
        const wall = new THREE.Mesh(planeGeometry, wallMaterial);
        wall.position.copy(positions[i]);
        wall.lookAt(scene.position);
        scene.add(wall);

        const plane = new CANNON.Plane();
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(plane);
        body.position.copy(wall.position);
        body.quaternion.copy(wall.quaternion);
        physicsWorld.addBody(body);
    }
}


function createDiceMesh() {
    const boxMaterialOuter = new THREE.MeshStandardMaterial({
        color: 0x0ffffff,
        // roughness: 0,
        // metalness: 0.5
    })
    const boxMaterialInner = new THREE.MeshStandardMaterial({
        color: 0xD77777,
        // roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide
    })

    const diceMesh = new THREE.Group();
    const innerMesh = new THREE.Mesh(createInnerGeometry(), boxMaterialInner);
    const outerMesh = new THREE.Mesh(createBoxGeometry(), boxMaterialOuter);
    outerMesh.castShadow = true;
    diceMesh.add(innerMesh, outerMesh);

    // return {diceMesh, innerMesh, outerMesh};
    return diceMesh;
}

function createDice(diceMesh, innerColor) {
    const mesh = diceMesh.clone();
    // const inner = innerMesh.clone();
    // const outer = outerMesh.clone();

    mesh.children[0].material = new THREE.MeshStandardMaterial({
        color: innerColor,
        // roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
    });

    mesh.scale.set(params.diceScale, params.diceScale, params.diceScale); // Scale the mesh
    scene.add(mesh);

    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(0.5 * params.diceScale, 0.5 * params.diceScale, 0.5 * params.diceScale)), // Scale the physics shape
        sleepTimeLimit: 0.1,
    });
    physicsWorld.addBody(body);

    return { mesh, body, isStatic: false };
}

function createBoxGeometry() {

    let boxGeometry = new THREE.BoxGeometry(1, 1, 1, params.segments, params.segments, params.segments);

    const positionAttr = boxGeometry.attributes.position;
    const subCubeHalfSize = .5 - params.edgeRadius;


    for (let i = 0; i < positionAttr.count; i++) {

        let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);

        const subCube = new THREE.Vector3(Math.sign(position.x), Math.sign(position.y), Math.sign(position.z)).multiplyScalar(subCubeHalfSize);
        const addition = new THREE.Vector3().subVectors(position, subCube);

        if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.normalize().multiplyScalar(params.edgeRadius);
            position = subCube.add(addition);
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize) {
            addition.z = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.y = subCube.y + addition.y;
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.y = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.z = subCube.z + addition.z;
        } else if (Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.x = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.y = subCube.y + addition.y;
            position.z = subCube.z + addition.z;
        }

        const notchWave = (v) => {
            v = (1 / params.notchRadius) * v;
            v = Math.PI * Math.max(-1, Math.min(1, v));
            return params.notchDepth * (Math.cos(v) + 1.);
        }
        const notch = (pos) => notchWave(pos[0]) * notchWave(pos[1]);

        const offset = .23;

        if (position.y === .5) {
            position.y -= notch([position.x, position.z]);
        } else if (position.x === .5) {
            position.x -= notch([position.y + offset, position.z + offset]);
            position.x -= notch([position.y - offset, position.z - offset]);
        } else if (position.z === .5) {
            position.z -= notch([position.x - offset, position.y + offset]);
            position.z -= notch([position.x, position.y]);
            position.z -= notch([position.x + offset, position.y - offset]);
        } else if (position.z === -.5) {
            position.z += notch([position.x + offset, position.y + offset]);
            position.z += notch([position.x + offset, position.y - offset]);
            position.z += notch([position.x - offset, position.y + offset]);
            position.z += notch([position.x - offset, position.y - offset]);
        } else if (position.x === -.5) {
            position.x += notch([position.y + offset, position.z + offset]);
            position.x += notch([position.y + offset, position.z - offset]);
            position.x += notch([position.y, position.z]);
            position.x += notch([position.y - offset, position.z + offset]);
            position.x += notch([position.y - offset, position.z - offset]);
        } else if (position.y === -.5) {
            position.y += notch([position.x + offset, position.z + offset]);
            position.y += notch([position.x + offset, position.z]);
            position.y += notch([position.x + offset, position.z - offset]);
            position.y += notch([position.x - offset, position.z + offset]);
            position.y += notch([position.x - offset, position.z]);
            position.y += notch([position.x - offset, position.z - offset]);
        }

        positionAttr.setXYZ(i, position.x, position.y, position.z);
    }


    boxGeometry.deleteAttribute('normal');
    boxGeometry.deleteAttribute('uv');
    boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);

    boxGeometry.computeVertexNormals();

    return boxGeometry;
}

function createInnerGeometry() {
    const baseGeometry = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius);
    const offset = .48;
    return BufferGeometryUtils.mergeBufferGeometries([
        baseGeometry.clone().translate(0, 0, offset),
        baseGeometry.clone().translate(0, 0, -offset),
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, -offset, 0),
        baseGeometry.clone().rotateX(.5 * Math.PI).translate(0, offset, 0),
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(-offset, 0, 0),
        baseGeometry.clone().rotateY(.5 * Math.PI).translate(offset, 0, 0),
    ], false);
}


function addDiceEvents(dice) {
    dice.body.addEventListener('sleep', (e) => {
        dice.body.allowSleep = false;
        const euler = new CANNON.Vec3();
        e.target.quaternion.toEuler(euler);

        let result = whichFaceIsUp(euler, dice);

        if (result) {
            showRollResults(result);
            res.push(result);
            addToCounts(rollCounts, result);
            dice.isStatic = true;

            if (res.length === params.numberOfDice) {
                let sum = res.reduce((sum, dice) => sum + dice, 0);
                scoreResult.innerHTML += ('=' + sum);
                addToCounts(sumCounts, sum);
                res.length = 0;
                updateSumsHistogram(svg, sumCounts, params);
            }

        } else {
            dice.body.allowSleep = true;
        }
    });
}

function addToCounts(array, value) {
    let arrayEntry = array.find(s => s.value == value);
    if (arrayEntry === undefined) {
        array.push({value: value, count: 1});
    } else {
        arrayEntry.count++;
    }
}

function addNRolls(n) {
    console.log("adding " + n)
    for (let i = 0; i < n; i++) {
        let theseRolls = [];
        for (let d = 0; d < params.numberOfDice; d++) {
            let thisDiceResult = 1 + Math.floor(Math.random() * 6)
            theseRolls.push(thisDiceResult);
        }
        let thisSum = theseRolls.reduce((sum, dice) => sum + dice, 0);
        addToCounts(sumCounts, thisSum);
    }
    updateSumsHistogram(svg, sumCounts, params);

}

function whichFaceIsUp(euler) {

    const eps = .3;
    let isZero = (angle) => Math.abs(angle) < eps;
    let isHalfPi = (angle) => Math.abs(angle - .5 * Math.PI) < eps;
    let isMinusHalfPi = (angle) => Math.abs(.5 * Math.PI + angle) < eps;
    let isPiOrMinusPi = (angle) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);


    if (isZero(euler.z)) {
        if (isZero(euler.x)) {
            return 1;
        } else if (isHalfPi(euler.x)) {
            return 4;
        } else if (isMinusHalfPi(euler.x)) {
            return 3;
        } else if (isPiOrMinusPi(euler.x)) {
            return 6;
        } else {
            // landed on edge => wait to fall on side and fire the event again
            // dice.body.allowSleep = true;
            return false;
        }
    } else if (isHalfPi(euler.z)) {
        return 2;
    } else if (isMinusHalfPi(euler.z)) {
        return 5;
    } else {
        // landed on edge => wait to fall on side and fire the event again
        // dice.body.allowSleep = true;
        return false;
    }
}

function showRollResults(score) {
    if (scoreResult.innerHTML === '') {
        scoreResult.innerHTML += score;
    } else {
        scoreResult.innerHTML += ('+' + score);
    }
}


function render() {

    if (draggedDice !== null) {
        draggedDice.body.position.set(target.x, target.y, target.z);
        draggedDice.body.velocity.set(0, 0, 0);
        draggedDice.body.angularVelocity.set(0, 0, 0);
    }

    // Attract neighboring dice towards the dragged dice
    attractNeighbors();

    physicsWorld.fixedStep();

    for (const dice of diceArray) {
        dice.mesh.position.copy(dice.body.position)
        dice.mesh.quaternion.copy(dice.body.quaternion)
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function updateSceneSize() {
    const availableWidth = document.getElementById("quarto-document-content").offsetWidth;;
    const scaleFactor = Math.min(1, availableWidth / canvasWidth);
    const newWidth = canvasWidth * scaleFactor;
    const newHeight = canvasHeight * scaleFactor;
    
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
    // document.getElementById("content").style.width = newWidth;
    // document.getElementById("content").style.height = newHeight;

    // container.attr("width", newWidth);
    container
        .style("width", newWidth + "px")
        .style("height", newHeight + "px");
}

function throwDice() {
    scoreResult.innerHTML = '';
    res.length = 0;

    diceArray.forEach((d, dIdx) => {

        d.isStatic = false;

        d.body.velocity.setZero();
        d.body.angularVelocity.setZero();

        // d.body.position = new CANNON.Vec3(containerWidth * 0.4, 0, -(params.numberOfDice * 0.5) + (dIdx * 1));
        d.body.position = new CANNON.Vec3(containerWidth / 4 * (0.5 - Math.random()), 2, containerDepth / 4 * (0.5 - Math.random()));
        d.mesh.position.copy(d.body.position);

        d.mesh.rotation.set(2 * Math.PI * Math.random(), 0, 2 * Math.PI * Math.random())
        d.body.quaternion.copy(d.mesh.quaternion);

        const force = 10 + 10 * Math.random();
        d.body.applyImpulse(
            new CANNON.Vec3(-force * 0.1, force * 4, force),
            new CANNON.Vec3(0, 0, 0.2)
        );

        d.body.allowSleep = true;
    });
}

function attractNeighbors() {
    if (draggedDice === null) {
        return;
    }

    const constraintDistance = params.diceScale * 1.5;
    const attractionForce = 200; // Adjust this value to control the attraction force
    const maxDistance = 1000; // Adjust this value to control the pick-up distance

    diceArray.forEach((otherDice, index) => {
        if (otherDice !== draggedDice) {
            const distance = draggedDice.mesh.position.distanceTo(otherDice.mesh.position);
            if (distance <= maxDistance) {
                const forceDirection = draggedDice.mesh.position.clone().sub(otherDice.mesh.position).normalize();
                const force = new CANNON.Vec3(forceDirection.x * attractionForce, forceDirection.y * attractionForce, forceDirection.z * attractionForce);
                otherDice.body.applyForce(force, draggedDice.body.position);

                // Create constraints between the dice when they are close enough
                if (distance <= constraintDistance) {
                    const existingConstraint = activeConstraints.find(constraint => (constraint.bodyA === draggedDice.body && constraint.bodyB === otherDice.body) || (constraint.bodyA === otherDice.body && constraint.bodyB === draggedDice.body));

                    if (!existingConstraint) {
                        const constraint = new CANNON.LockConstraint(draggedDice.body, otherDice.body, { collideConnected: false });
                        physicsWorld.addConstraint(constraint);
                        activeConstraints.push(constraint);
                    }
                }
            }
        }
    });
}

function nudgeDice(d) {
    const force0 = 2 + 2 * Math.random();
    d.body.applyImpulse(
        new CANNON.Vec3(-force0 * 4, force0 * 0.5, 0),
        new CANNON.Vec3(0, 0, .2)
    );
}


function onMouseDown(event) {
    event.preventDefault();

    const canvasRect = canvasEl.getBoundingClientRect();
    mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    target = new THREE.Vector3();
    target.x = mouse.x;
    target.y = mouse.y;
    target.z = 0.92;
    target.unproject(camera);

    const intersects = raycaster.intersectObjects(diceArray.map(dice => dice.mesh));

    if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
            // let obj = intersects[i].object;
            let id = intersects[i].object.uuid;

            for (let j = 0; j < diceIdArray.length; j++) {
                let childIds = diceIdArray[j];

                for (let k = 0; k < childIds.length; k++) {
                    if (id === childIds[k]) {
                        draggedDice = diceArray[j];
                        break;
                    }
                }
            }
        }
        draggedDice.body.allowSleep = false;
        draggedDice.body.collisionFilterMask = 1;
    } else {
        // if no dice was clicked, bump the table a bit
        const force = 10;

        diceArray.forEach((d) => {
            if (!d.isStatic) {
                d.body.applyImpulse(
                    new CANNON.Vec3(0, force, 0),
                    new CANNON.Vec3(0, 0, 0)
                );
            }

        })
    }
}

var dragDirection;
const prevPositions = [];
const bufferSize = 5;

function onMouseMove(event) {
    event.preventDefault();

    if (draggedDice !== null) {

        const canvasRect = canvasEl.getBoundingClientRect();
        mouse.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
        mouse.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

        target = new THREE.Vector3();
        target.x = mouse.x;
        target.y = mouse.y;
        target.z = 0.92;
        target.unproject(camera);


        // Calculate dragDirection by averaging the previous positions
        if (prevPositions.length >= bufferSize) {
            prevPositions.shift();
        }
        prevPositions.push(target.clone());

        dragDirection = new THREE.Vector3();
        for (let i = 0; i < prevPositions.length - 1; i++) {
            const diff = prevPositions[i + 1].clone().sub(prevPositions[i]);
            dragDirection.add(diff);
        }
        dragDirection.divideScalar(prevPositions.length - 1).normalize();
    }
}


function onMouseUp(event) {
    event.preventDefault();
    
    if (draggedDice !== null) {

        scoreResult.innerHTML = '';
        res.length = 0;

        // Remove the constraints
        activeConstraints.forEach(constraint => {
            physicsWorld.removeConstraint(constraint);
        });
        activeConstraints.length = 0;

        const forceMagnitude = 100;
        const force = new CANNON.Vec3(dragDirection.x * forceMagnitude, 10, dragDirection.z * forceMagnitude);

        diceArray.forEach((d) => {
            d.body.applyImpulse(force, new CANNON.Vec3(0, 0, 0));
            d.body.angularVelocity.set(Math.random() * 20, Math.random() * 20, Math.random() * 20);
            d.body.allowSleep = true;
            d.isStatic = false;
        });

        draggedDice.body.allowSleep = true;
        draggedDice = null;
        prevPositions.length = 0;
    }
}



function onTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const simulatedMouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => { },
    };
    onMouseDown(simulatedMouseEvent);
}

function onTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const simulatedMouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => { },
    };
    onMouseMove(simulatedMouseEvent);
}

function onTouchEnd(event) {
    event.preventDefault();
    onMouseUp(event);
}

// scaleCanvas("quarto-document-content", width, height)