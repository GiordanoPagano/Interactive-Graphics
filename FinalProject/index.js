import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';

import getStarfield from "./src/getStarfield.js";
import * as OBJ from "./src/getObjects.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc); // Colore di sfondo
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set( 0, 2, -5 );
camera.lookAt( 0, 2, 0 );

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setAnimationLoop( animate );

// Orbit Controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.target.set( 0, 1, 0 );
orbitControls.enableDamping = true;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle =  Math.PI - 0.05;
orbitControls.mouseButtons = {
    LEFT: null,   // Il tasto sinistro ora fa lo zoom (o PAN, o null per disabilitarlo)
    MIDDLE: THREE.MOUSE.ROTATE, // Il tasto centrale (rotella) ora fa la rotazione
    RIGHT: THREE.MOUSE.PAN     // Il tasto destro ora fa il pan (trascinamento)
};
orbitControls.update();

// EVENTS
window.addEventListener( 'resize', onWindowResize );
document.addEventListener( 'keydown', onKeyDown );
document.addEventListener( 'keyup', onKeyUp );
document.addEventListener('mousedown', onMouseDown, false);

// CAMERA e LUCE che seguono il personaggio
const followGroup = new THREE.Group();
scene.add( followGroup );

const dirLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
dirLight.position.set( - 2, 5, - 3 );
dirLight.castShadow = true;

const cam = dirLight.shadow.camera;
cam.top = 50;
cam.bottom = -50;
cam.left = -50;
cam.right = 50;
cam.near = 0.5;
cam.far = 150;
dirLight.shadow.bias = - 0.005;
dirLight.shadow.radius = 4;
//followGroup.add( dirLight );
//followGroup.add( dirLight.target );
scene.add( dirLight );
scene.add( dirLight.target );

// GENERAL SETTINGS: Collision Avoidance - Animations
const collidableHelpers = [];
const clock = new THREE.Clock();
const collidableObjects = [];

// Only for the HERO, which has to interact with keyboard and mouse
const HEROcontrols = {
    key: [ 0, 0, 0 ],
    dir: new THREE.Vector3(),
    current: 'Armature|Alert|baselayer',
};

// Generazione della mappa di gioco
const textureLoader = new THREE.TextureLoader();
let groundMesh;

function modifyGround() {
    const groundTexture = textureLoader.load('./textures/terreno_spettrale2.png');
    groundTexture.wrapS = THREE.RepeatWrapping; // Ripeti sull'asse S (orizzontale)
    groundTexture.wrapT = THREE.RepeatWrapping; // Ripeti sull'asse T (verticale)
    const repeatFactor = 50; // Ripeti 50 volte orizzontalmente e 50 volte verticalmente
    groundTexture.repeat.set(repeatFactor, repeatFactor);

    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: groundTexture,
        side: THREE.DoubleSide,
        roughness: 0.8, // Regola per un aspetto meno lucido
        metalness: 0.1, // Regola per un aspetto meno metallico
    });

    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.receiveShadow = true;
    groundMesh.rotation.x = -Math.PI / 2; // Ruota il piano per farlo orizzontale
    groundMesh.position.y = 0;
    scene.add(groundMesh);

    console.log('Terreno creato con successo!');
}
modifyGround();
collidableObjects.push(groundMesh);

// POPOLAMENTO MAPPA
const NUM_HOUSES = 5;
const houses = [];
const housePositions = []; // per evitare sovrapposizioni
function randomPositionInMap() {
    return new THREE.Vector3(Math.random() * 100 - 50, 0, Math.random() * 100 - 50);
}
for (let i = 0; i < NUM_HOUSES; i++) {
    let pos;
    let tries = 0;
    const scale = Math.random() * 2 + 1;
    do {
        pos = randomPositionInMap();
        tries++;
    } while ( housePositions.some(p => p.distanceTo(pos) < 30) && tries < 70 && p.distanceTo(new THREE.Vector3(0, 0, 0)) < 30);
    let rot = i % 3 === 0 ? 0 : (i % 3 === 1 ? -Math.PI / 2 : Math.PI / 2); 
    
    const hauntedHouse = OBJ.createHauntedHouse(); // Creazione Casa Spettrale
    hauntedHouse.position.copy(pos);
    hauntedHouse.scale.set(scale, scale, scale); 
    hauntedHouse.rotation.y = rot; 
    scene.add(hauntedHouse);
    hauntedHouse.collidableMeshes.forEach(mesh => {
        collidableObjects.push(mesh);
    });
    const lamp = OBJ.createLampPost(false); // Creazione Casa Spettrale
    lamp.position.copy(pos);
    lamp.position.z += 10;
    lamp.scale.set(scale, scale, scale); 
    lamp.rotation.y = rot; 
    scene.add(lamp);
    lamp.collidableMeshes.forEach(mesh => {
        collidableObjects.push(mesh);
    });

    hauntedHouse.userData = {
        position: pos,
        rotation: rot,
        scale: scale,
        containerOf: ''
    };
    
    //console.log(`creata casa in posizione: ${pos.x}, ${pos.y}, ${pos.z}.`);

    houses.push(hauntedHouse);
}
houses.sort((a, b) => b.userData.scale - a.userData.scale);
const houseWithAltar = houses[0];
houseWithAltar.userData.containerOf = 'altar';
// ALTARE CON I PIEDISTALLI
const altar = OBJ.createAltar();
altar.position.x = houseWithAltar.userData.position.x;
altar.position.z = houseWithAltar.userData.position.z;
altar.rotation.y = houseWithAltar.userData.rotation;
scene.add(altar);
console.log(`altare in posizione: ${altar.position.x}, ${altar.position.y}, ${altar.position.z}.`);
// Creazione Lampione 
let bilamp = true;
const lamp = OBJ.createLampPost(bilamp);
lamp.position.add(new THREE.Vector3(0, 0, 10));
lamp.scale.set(2, 2, 2); 
scene.add(lamp);
lamp.collidableMeshes.forEach(mesh => {
    collidableObjects.push(mesh);
});
// una casa per lo scheletro gigante
const houseWithGiant = houses.find(h => h.userData.containerOf === '');
if (houseWithGiant) {
    houseWithGiant.userData.containerOf = 'skeletonGiant';
    console.log(`skeletonGiant in posizione: ${houseWithGiant.userData.position.x}, ${houseWithGiant.userData.position.y}, ${houseWithGiant.userData.position.z}.`);
}
// una casa anche per il pianeta terra
const earth = OBJ.createEarth();
scene.add(earth);
const houseWithHearth = houses.find(h => h.userData.containerOf === '');
if (houseWithHearth) {
    houseWithHearth.userData.containerOf = 'earth';
    earth.position.x = houseWithHearth.userData.position.x;
    earth.position.z = houseWithHearth.userData.position.z;
    console.log(`earth in posizione: ${houseWithHearth.userData.position.x}, ${houseWithHearth.userData.position.y}, ${houseWithHearth.userData.position.z}.`);
}
let i = 0;
houses.forEach(h => {
    if (h.userData.containerOf === '') {
        h.userData.containerOf = `skeleton${i}`;
        console.log(`skeleton${i} in posizione: ${h.userData.position.x}, ${h.userData.position.y}, ${h.userData.position.z}.`);
        i += 1;
    }
});

// Lista dei tuoi File GLB con Animazioni
const Bone_Golem_glb = [
    { name: 'Idle', path: './objects/Bone_Golem/Animation_Idle_withSkin.glb' },
    { name: 'Walk', path: './objects/Bone_Golem/Animation_Walking_withSkin.glb' },
    { name: 'Dead', path: './objects/Bone_Golem/Animation_Dead_withSkin.glb' },
    { name: 'Attack1', path: './objects/Bone_Golem/Animation_Attack_withSkin.glb' },
    { name: 'Attack2', path: './objects/Bone_Golem/Animation_Skill_01_withSkin.glb' }
];
const Skeleton_Warrior_glb = [
    { name: 'Idle', path: './objects/Skeleton_Warrior/Animation_Alert_withSkin.glb' },
    { name: 'Walk', path: './objects/Skeleton_Warrior/Animation_Walking_withSkin.glb' },
    { name: 'Dead', path: './objects/Skeleton_Warrior/Animation_Dead_withSkin.glb' },
    { name: 'Attack', path: './objects/Skeleton_Warrior/Animation_Attack_withSkin.glb' },
    { name: 'Run', path: './objects/Skeleton_Warrior/Animation_Running_withSkin.glb' }
];
const Hero_glb = [
    { name: 'Idle', path: './objects/Hero/Animation_Alert_withSkin.glb' },
    { name: 'Walk', path: './objects/Hero/Animation_Walking_withSkin.glb' },
    { name: 'Dead', path: './objects/Hero/Animation_Dead_withSkin.glb' },
    { name: 'Attack1', path: './objects/Hero/Animation_Triple_Combo_Attack_withSkin.glb' },
    { name: 'BasicAttack', path: './objects/Hero/Animation_Attack_withSkin.glb' },
    { name: 'Run', path: './objects/Hero/Animation_Run_03_withSkin.glb' },
];
const Enchanted_Arbor_glb = [
    { name: 'Idle', path: './objects/Enchanted_Arbor/Enchanted_Arbor_0624112129_texture.glb' },
];

// Funzione per caricare i modelli e le loro animazioni
async function loadModelAndAnimations(glbs) {
    const loader = new GLTFLoader();
    const loadedGltfs = [];
    let modelMesh, mixer, currentAction, attackTIME = [];
    const animationsMap = new Map();
    let Name, side, run, walk, rotate, HP, maxHP, DMG, attackRange, collisionRadius, visionRadius, attackTYPE, rotateSpeed;

    // Carica tutti i file GLB in parallelo
    const loadPromises = glbs.map(async (fileInfo) => {
        try {
            const gltf = await loader.loadAsync(fileInfo.path);
            return { gltf: gltf, name: fileInfo.name };
        } catch (error) {
            console.error(`Errore nel caricamento del file GLB ${fileInfo.path}:`, error);
            return null;
        }
    });

    // Attendi che tutti i caricamenti siano completati
    const results = await Promise.all(loadPromises);
    // Filtra eventuali errori di caricamento
    results.forEach(result => {
        if (result) {
            loadedGltfs.push(result);
        }
    });

    // Identifica il Modello Principale e Aggiungilo alla Scena
    const mainGltf = loadedGltfs[0].gltf;
    modelMesh = mainGltf.scene;
    scene.add(modelMesh);
    modelMesh.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            //node.material.shadowSide = THREE.FrontSide; // opzionale: evita ombre strane sui double-sided
        }
    });
    const barra = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.2, 0.2), 
        new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
    );
    barra.position.x = modelMesh.position.x;
    barra.position.y = modelMesh.position.y + 2;
    barra.position.z = modelMesh.position.z;
    scene.add(barra);
    
    // setting dei personaggi
    if (glbs === Bone_Golem_glb) {
        //modelMesh.position.set(Math.random()*10+5, 0.01, Math.random()*10+5);
        modelMesh.scale.set(1.7, 1.7, 1.7);
        barra.scale.set(1.7, 1.7, 1.7);
        barra.position.add(0, 1.7, 0);
        Name = 'bone_golem';
        side = 'evil';
        run = 3;
        walk = 1.2;
        rotate = 0.05;
        HP = 250,
        maxHP = 250,
        DMG = [ 25, 40],
        attackRange = 3,
        collisionRadius = 2,
        visionRadius = 10,
        rotateSpeed = 0.2,
        attackTYPE = ['Armature|Attack|baselayer', 'Armature|Skill_01|baselayer'],
        attackTIME = [ 2.6, 1.2 ]
    } else if (glbs === Hero_glb) {
        modelMesh.position.set(0, 0.01, 0);
        modelMesh.scale.set(0.7, 0.7, 0.7);
        barra.scale.set(0.7, 0.7, 0.7);
        Name = 'hero';
        side = 'good';
        run = 5;
        walk = 2.3;
        rotate = 0.1;
        HP = 100,
        maxHP = 100,
        DMG = [ 25, 40],
        attackRange = 1.5,
        collisionRadius = 1.2,
        visionRadius = 0, // not used for HERO,
        rotateSpeed = 0.3,
        attackTYPE = ['Armature|Attack|baselayer', 'Armature|Triple_Combo_Attack|baselayer'],
        attackTIME = [ 2.6, 3 ]
    }  else if (glbs === Enchanted_Arbor_glb) {
        modelMesh.position.set(15, 3, 0);
        modelMesh.scale.set(3, 3, 3);
        barra.scale.set(3, 3, 3);
        barra.position.set(15, -99, 0); // sotto terra perchè non mi serve vederla
        Name = 'arbor';
        side = 'neutral';
        run = 0;
        walk = 0;
        rotate = 0;
        HP = 500,
        maxHP = 500,
        DMG = [ 0, 0],
        attackRange = 0,
        collisionRadius = 1.5,
        visionRadius = 0,
        rotateSpeed = 0,
        attackTYPE = ['', ''],
        attackTIME = [ 0, 0 ]
    } else if (glbs === Skeleton_Warrior_glb){
        //modelMesh.position.set(Math.random()*10+5, 0.01, Math.random()*10+5);
        modelMesh.scale.set(0.7, 0.7, 0.7);
        barra.scale.set(0.7, 0.7, 0.7);
        Name = 'skeleton';
        side = 'evil';
        run = 5;
        walk = 1.5;
        rotate = 0.1;
        HP = 25,
        maxHP = 25,
        DMG = [ 15, 0],
        attackRange = 1.5,
        collisionRadius = 1.2,
        visionRadius = 7,
        rotateSpeed = 0.3,
        attackTYPE = ['Armature|Attack|baselayer', ''],
        attackTIME = [ 2.6, 0 ]
    }

    // Inizializza l'AnimationMixer con l'oggetto da animare
    mixer = new THREE.AnimationMixer(modelMesh);
    // Raccogli TUTTE le AnimationClip da TUTTI i GLB caricati
    const allAnimationClips = [];
    loadedGltfs.forEach(result => {
        if (result.gltf.animations && result.gltf.animations.length > 0) {
            allAnimationClips.push(...result.gltf.animations);
        }
    });
    if (allAnimationClips.length === 0) {
        console.warn('Nessuna animazione trovata in nessuno dei file GLB caricati.');
    }
    // Crea e Memorizza le AnimationAction
    allAnimationClips.forEach((clip) => {
        const action = mixer.clipAction(clip);
        animationsMap.set(clip.name, action); // Memorizza l'azione con il nome della clip
        console.log(`Caricata animazione: ${clip.name}`);
    });
    // Imposta l'animazione iniziale (es. "Idle")
    let idle = animationsMap.has('Armature|Idle|baselayer') ? 'Armature|Idle|baselayer' : 'Armature|Alert|baselayer';
    if (animationsMap.has(idle) ) {
        currentAction = animationsMap.get(idle);
        currentAction.play();
        currentAction = idle;
        console.log('Avviata animazione: Idle');
    } else if (allAnimationClips.length > 0) {
        // Se 'Idle' non esiste, riproduci la prima animazione trovata
        currentAction = animationsMap.values().next().value;
        if (currentAction) {
            currentAction.play();
            currentAction = currentAction.getClip().name;
            console.log(`Avviata la prima animazione disponibile: ${currentAction.getClip().name}`);
        }
    }
    /*
    if (animationsMap.has(attackTYPE[0])) {
        let attack = animationsMap.get(attackTYPE[0])
        attackTIME[0] = attack.duration();
    }
    if (animationsMap.has(attackTYPE[1])) {
        let attack = animationsMap.get(attackTYPE[1])
        attackTIME[1] = attack.duration();
    } */

    const troop = {
        id: Name,
        body: modelMesh,
        bar: barra,
        HP: HP,
        maxHP: maxHP,
        mixer: mixer,
        currAct: currentAction,
        animap: animationsMap,
        side: side, // evil, neutral, good
        attack: [ 0, 0 ],
        attackType: attackTYPE,
        damages: DMG,
        attackCounter: 0, // used for enemies
        runVelocity: run,
        walkVelocity: walk,
        rotateSpeed: rotate,
        atkRange: attackRange,
        collRad: collisionRadius,
        visionRad: visionRadius,
        rotSpeed: rotateSpeed,
        attackTime: attackTIME, // tempo in secondi della durata 
        isDying: false,
        animTime: 0
    };

    // --- Crea la Bounding Box per l'eroe ---
    // La bounding box deve essere calcolata dopo che la scala del modello è stata impostata.
    // useremo un Box3 che avvolge l'oggetto.
    troop.boundingBox = new THREE.Box3();
    troop.updateBoundingBox = function() {
        // Aggiorna la bounding box in base alla posizione corrente della mesh
        // Questa funzione deve essere chiamata prima del controllo collisioni in updateCharacter
        troop.body.updateMatrixWorld(true); // Assicurati che la matrice mondo sia aggiornata
        troop.boundingBox.setFromObject(troop.body);
    };
    // Esegui il primo calcolo
    troop.updateBoundingBox();

    return troop;
}

// Generazione di HERO
let HERO, GOLEM, SKELE, SKELE2, ENCH_ARBOR, loaded = 0;
let Troops = [];
(async () => {
    try {
        HERO = await loadModelAndAnimations(Hero_glb);
        if (HERO) {
            const obj = HERO.body;
            const box = new THREE.Box3().setFromObject(obj);
            const helper = new THREE.Box3Helper(box, 0xff0000);
            scene.add(helper);
            collidableHelpers.push({ box, helper, obj });
            loaded += 1;
            Troops.push(HERO);
            console.log("Il caricamento di HERO è andato bene.");
        } else {
            console.error("Il caricamento di HERO è fallito.");
        }
    } catch (error) {
        console.error("Errore durante il caricamento di HERO:", error);
    }
})();
(async () => {
    try {
        GOLEM = await loadModelAndAnimations(Bone_Golem_glb);
        if (GOLEM) {
            houses.forEach(h => {
                if (h.userData.containerOf === 'skeletonGiant') {
                    GOLEM.body.position.x = h.userData.position.x;
                    GOLEM.body.position.z = h.userData.position.z;
                    GOLEM.body.rotation.y = h.userData.rotation;
                    GOLEM.bar.position.x = h.userData.position.x;
                    GOLEM.bar.position.z = h.userData.position.z;
                    GOLEM.bar.rotation.y = h.userData.rotation;
                    console.log(`skeletonGiant in posizione: ${GOLEM.body.position.x}, ${GOLEM.body.position.y}, ${GOLEM.body.position.z}.`);
                }
            });
            const obj = GOLEM.body;
            const box = new THREE.Box3().setFromObject(obj);
            const helper = new THREE.Box3Helper(box, 0xff0000);
            scene.add(helper);
            collidableHelpers.push({ box, helper, obj });
            loaded += 1;
            Troops.push(GOLEM);
            console.log("Il caricamento di GOLEM è andato bene.");
        } else {
            console.error("Il caricamento di GOLEM è fallito.");
        }
    } catch (error) {
        console.error("Errore durante il caricamento di GOLEM:", error);
    }
})();
const NUM_SKELETONS = NUM_HOUSES - 3;
for (let i = 0; i < NUM_SKELETONS; ++i) {
    const skeleName = `skeleton${i}`;
    (async () => {
        try {
            const SKELE = await loadModelAndAnimations(Skeleton_Warrior_glb);
            const skeleName = `skeleton${i}`;
            if (SKELE) {
                houses.forEach(h => {
                    if (h.userData.containerOf === skeleName) {
                        SKELE.body.position.x = h.userData.position.x;
                        SKELE.body.position.z = h.userData.position.z;
                        SKELE.body.rotation.y = h.userData.rotation;
                        SKELE.bar.position.x = h.userData.position.x;
                        SKELE.bar.position.z = h.userData.position.z;
                        SKELE.bar.rotation.y = h.userData.rotation;
                        console.log(` ${skeleName} in posizione: ${SKELE.body.position.x}, ${SKELE.body.position.y}, ${SKELE.body.position.z}.`);
                    }
                });
                const obj = SKELE.body;
                const box = new THREE.Box3().setFromObject(obj);
                const helper = new THREE.Box3Helper(box, 0xff0000);
                scene.add(helper);
                collidableHelpers.push({ box, helper, obj });
                loaded += 1;
                Troops.push(SKELE);
                console.log(`Il caricamento di ${skeleName} è andato bene.`);
            } else {
                console.error(`Il caricamento di ${skeleName} è fallito.`);
            }
        } catch (error) {
            console.error(`Errore durante il caricamento di ${skeleName}:`, error);
        }
    })();
}
(async () => {
    try {
        ENCH_ARBOR = await loadModelAndAnimations(Enchanted_Arbor_glb);
        if (ENCH_ARBOR) {
            const obj = ENCH_ARBOR.body;
            const box = new THREE.Box3().setFromObject(obj);
            const helper = new THREE.Box3Helper(box, 0xff0000);
            scene.add(helper);
            collidableHelpers.push({ box, helper, obj });
            loaded += 1;
            Troops.push(ENCH_ARBOR);
            console.log("Il caricamento di ENCH_ARBOR è andato bene.");
        } else {
            console.error("Il caricamento di ENCH_ARBOR è fallito.");
        }
    } catch (error) {
        console.error("Errore durante il caricamento di ENCH_ARBOR:", error);
    }
})();

function computeDamage(troop, finishedClipName){ 
    // [TODO] il nome dell'azione servirà per calcolare danni speciali in funzione dell'attacco
    let pos = troop.body.position.clone();
    let dir = troop.body.quaternion.clone();
    const offset = troop.atkRange;
    if (typeof troop.atkRange !== "number" || isNaN(troop.atkRange)) {
        console.warn(`Errore: atkRange non valido per ${troop.id}:`, troop.atkRange);
        return;
    }
    const dirOffset = new THREE.Vector3(0, 0, offset); // Punta in avanti (sull'asse Z)
    dirOffset.applyQuaternion(dir); // Applica la rotazione al vettore di offset
    const pointAttack = pos.add(dirOffset);
    console.log(`pointAttack[0]="${pointAttack[0]}`);
    console.log(`punto di attacco in: x=${pointAttack.x}, z=${pointAttack.z}`);

    Troops.forEach(other => {
        if (other.side !== troop.side){
            const dx = other.body.position.x - pointAttack.x;
            const dz = other.body.position.z - pointAttack.z;
            console.log(`nemico in: x="${other.body.position.x}, z="${other.body.position.z}"`);
            const distanza = Math.sqrt(dx * dx + dz * dz);
            const attackRange = 1;
            console.log(`(other.collRad + attackRange < distanza) ? ==> "${other.collRad + attackRange < distanza}`);
            if (distanza < other.collRad + attackRange) {
                const dmg = troop.attack[0] === 1 ? troop.damages[0] : troop.damages[1];
                other.HP -= dmg;
                console.log(`vita di "${other.id} è a "${other.HP}"`);
                // update barra vita
                if (other.HP < 0) other.HP = 0;
                const ratio = Math.max(0, other.HP / other.maxHP);
                other.bar.scale.x = ratio;
                other.bar.material.color.setHSL(ratio * 0.3, 1, 0.5);
            }
        }
    });
}

function updateCharacter( delta ) {
    const key = HEROcontrols.key;
    const dir = HEROcontrols.dir;
    let rotate = HERO.body.quaternion.clone();
    let position = HERO.body.position.clone();
    const azimuth = orbitControls.getAzimuthalAngle();
    const rotSpeed = HERO.rotSpeed;
    HERO.animTime += delta;

    let play;
    let idleAct =  HERO.animap.has('Armature|Alert|baselayer') ? 'Armature|Alert|baselayer' : 'Armature|Idle|baselayer'
    const moving = key[ 0 ] === 0 && key[ 1 ] === 0 ? false : true;
    const attacking = HERO.attack[ 0 ] === 0 && HERO.attack[ 1 ] === 0 ? false : true;

    // se inizia il turno con 0 HP allora sei morto
    if (HERO.HP <= 0) {
        if(!HERO.isDying){
            HERO.animTime = 0;
            HERO.isDying = true;
        }
        deleteTroop(HERO);
        return;
    }

    if (attacking) { // se sta attaccando prima concludi l'attacco
        // controllo per verificare se ha concluso un attacco
        if (HERO.attack[ 0 ] === 1){
            if (HERO.animTime > HERO.attackTime[0]){
                //console.log(`reset actions and computing damage for "${HERO.id}; attacco tipo 0"`);
                //console.log(`HERO.animTime "${HERO.animTime}" , HERO.attackTime[0] "${HERO.attackTime[0]}"`);
                computeDamage(HERO, HERO.attackType[0]);
                HERO.attack = [ 0, 0 ];
                HERO.animTime = 0;
                play = idleAct;
                HERO.attackCounter += 1;
            } else {
                play = HERO.attackType[0];
            }
        } else { //  if (HERO.currAct === HERO.attackType[1])
            if (HERO.animTime > HERO.attackTime[1]){
                //console.log(`reset actions and computing damage for "${HERO.id}; attacco tipo 1"`);
                //console.log(`HERO.animTime "${HERO.animTime}" , HERO.attackTime[1] "${HERO.attackTime[1]}"`);
                computeDamage(HERO, HERO.currAct);
                HERO.attack = [ 0, 0 ];
                HERO.animTime = 0;
                play = idleAct;
                HERO.attackCounter += 1;
            } else {
                play = HERO.attackType[1];
            }
        }
        changeAnimation(HERO, HERO.currAct);
        HERO.currAct = play;
        HERO.mixer.update(delta);
        return;
    }

    // if not attacking control if moving
    play = moving ? ( key[2] === 1 ? 'Armature|Run_03|baselayer' : 'Armature|walking_man|baselayer') : idleAct;
    changeAnimation(HERO, HERO.currAct);
    HERO.currAct = play;
    
    // update position if moving
    if ( moving ) {
        HERO.updateBoundingBox();
        const velocity = HERO.currAct === 'Armature|Run_03|baselayer' ? HERO.runVelocity : HERO.walkVelocity;
        dir.set( key[ 1 ], 0, key[ 0 ] ).multiplyScalar( velocity * delta );
        const angle = unwrapRad( Math.atan2( dir.x, dir.z ) + azimuth ); // calculate camera direction
        const rot_axis = new THREE.Vector3( 0, 1, 0 );  // y axis
        rotate.setFromAxisAngle( rot_axis, angle );
        HEROcontrols.dir.applyAxisAngle( rot_axis, azimuth );

        // COLLISION AVOIDANCE
        // Prova a muoverti sull'asse X
        let tempBoxX = HERO.boundingBox.clone(); // Clona la bounding box corrente dell'eroe
        tempBoxX.translate(new THREE.Vector3(dir.x, 0, 0)); // Trasla solo sull'asse X
        let collidedX = false;
        collidableObjects.forEach(obj=> {
            obj.updateMatrixWorld(true); // Assicurati che la matrice mondo sia aggiornata
            const objBox = new THREE.Box3().setFromObject(obj); // Ottieni la bounding box del muro in coordinate mondo
            if (tempBoxX.intersectsBox(objBox)) {
                collidedX = true;
                dir.x = 0;
            }
        });
        // Prova a muoverti sull'asse Z
        let tempBoxZ = HERO.boundingBox.clone(); // Clona la bounding box corrente dell'eroe
        tempBoxZ.translate(new THREE.Vector3(0, 0, dir.z)); // Trasla solo sull'asse Z
        let collidedZ = false;
        collidableObjects.forEach(obj => {
            obj.updateMatrixWorld(true);
            const objBox = new THREE.Box3().setFromObject(obj);
            if (tempBoxZ.intersectsBox(objBox)) {
                collidedZ = true;
                dir.z = 0;
            }
        });

        position.add( dir );
        camera.position.add( dir );
        HERO.body.position.copy( position );
        HERO.body.quaternion.rotateTowards( rotate, rotSpeed );
        position.y += 2;
        HERO.bar.position.copy( position );
        HERO.bar.quaternion.rotateTowards( rotate, rotSpeed );
        orbitControls.target.copy(position );
        followGroup.position.copy( position );
        orbitControls.update();
    }

    HERO.mixer.update(delta);
    orbitControls.update();
}

function updateTroops( delta ) {
    const posHero_x = HERO.body.position.x;
    const posHero_z = HERO.body.position.z;

    Troops.forEach(troop => {
        if (troop.id === 'hero') {
            return;
        } else if (troop.id === 'arbor'){
            troop.mixer.update(delta);
            return;
        }
        const dx = posHero_x - troop.body.position.x;
        const dz = posHero_z - troop.body.position.z;
        const distanza = Math.sqrt(dx * dx + dz * dz);
        let idleAct =  troop.animap.has('Armature|Alert|baselayer') ? 'Armature|Alert|baselayer' : 'Armature|Idle|baselayer'
        let play;
        troop.animTime += delta;

        
        // se inizia il turno con 0 HP allora sei morto
        if (troop.HP <= 0) {
            if(!troop.isDying){
                troop.animTime = 0;
                troop.isDying = true;
            }
            deleteTroop(troop);
            return;
        }

        const attacking = troop.attack[ 0 ] === 0 && troop.attack[ 1 ] === 0 ? false : true;
        if (attacking) { // se sta attaccando prima concludi l'attacco
            // controllo per verificare se ha concluso un attacco
            if (troop.currAct === troop.attackType[0]){
                if (troop.animTime > troop.attackTime[0]){
                    //console.log(`reset actions and computing damage for "${troop.id}; attacco tipo 0"`);
                    //console.log(`troop.animTime "${troop.animTime}" , troop.attackTime[0] "${troop.attackTime[0]}"`);
                    computeDamage(troop, troop.currAct);
                    troop.attack = [ 0, 0 ];
                    troop.animTime = 0;
                    play = idleAct;
                    troop.attackCounter += 1;
                } else {
                    play = troop.currAct
                }
            } else { //  if (troop.currAct === troop.attackType[1])
                if (troop.animTime > troop.attackTime[1]){
                    //console.log(`reset actions and computing damage for "${troop.id}; attacco tipo 1"`);
                    computeDamage(troop, troop.currAct);
                    troop.attack = [ 0, 0 ];
                    troop.animTime = 0;
                    play = idleAct;
                    troop.attackCounter += 1;
                } else {
                    play = troop.currAct
                }
            }
            changeAnimation(troop, troop.currAct);
            troop.currAct = play;
            troop.mixer.update(delta);
            return;
        }

        // se non sta attaccando allora controlla la situazione attuale
        if (distanza > troop.visionRad) {
            // se non riesce a vedere l'eroe
            play = idleAct;
            changeAnimation(troop, troop.currAct);
            troop.currAct = play;
            troop.mixer.update(delta);
            return;
        } else if (distanza > troop.collRad) { 
            // se vede l'eroe ma non arriva ad attaccarlo
            play = 'Armature|walking_man|baselayer';
            const distanza = Math.sqrt(dx * dx + dz * dz);
            const vel = troop.walkVelocity;
            const dirX = dx / distanza;
            const dirZ = dz / distanza;
            troop.body.position.x += dirX * vel * delta;
            troop.body.position.z += dirZ * vel * delta;
            troop.bar.position.x += dirX * vel * delta;
            troop.bar.position.x += dirZ * vel * delta;

            let rotate = troop.body.quaternion.clone();
            const rotSpeed = troop.rotSpeed;
            const angle = unwrapRad( Math.atan2( dirX, dirZ ));
            const rot_axis = new THREE.Vector3( 0, 1, 0 );  // y axis
            rotate.setFromAxisAngle( rot_axis, angle );
            troop.body.quaternion.rotateTowards( rotate, rotSpeed );
            troop.bar.quaternion.rotateTowards( rotate, rotSpeed );

            changeAnimation(troop, troop.currAct);
            troop.currAct = play;
            troop.mixer.update(delta);
            return;
        } else { 
            // se è a contatto con l'eroe può iniziare ad attaccare
            if ((troop.attackCounter % 3) === 0  && troop.id === 'bone_golem') {
                troop.attack[1] = 1; // attacco speciale
                play = troop.attackType[1];
            } else {
                troop.attack[0] = 1; // attacco base
                play = troop.attackType[0];
            }
            changeAnimation(troop, troop.currAct);
            troop.currAct = play;
            troop.mixer.update(delta);
            return;
        }
    });
}

function unwrapRad( r ) {
    return Math.atan2( Math.sin( r ), Math.cos( r ) );
}


// Funzione per cambiare animazione con crossfade
function changeAnimation(troop, newAnimationName) {
    if (newAnimationName === '') return;

    if (!troop.mixer || !troop.animap.has(newAnimationName)) {
        console.warn(`Animazione "${newAnimationName}" non trovata per "${troop.id}" o mixer non inizializzato.`);
        return;
    }

    const newAction = troop.animap.get(newAnimationName);
    const current = troop.animap.get(troop.currAct);

    // Se stiamo già riproducendo questa animazione, non fare nulla
    if (newAction === current && current.isRunning()) {
        return;
    }

    // aggiornamento dell'azione attuale
    troop.currAct = newAnimationName;
    const fadeDuration = 0.2;

    if (current && current !== newAction) {
        newAction.enabled = true;
        newAction.setEffectiveTimeScale(1);
        newAction.setEffectiveWeight(0);
        newAction.play();
        current.crossFadeTo(newAction, fadeDuration, true);
    } else {
        troop.mixer.stopAllAction();
        newAction.enabled = true;
        newAction.setEffectiveTimeScale(1);
        newAction.setEffectiveWeight(1); // piena influenza
        newAction.play();
    }

    //console.log(`Cambiata animazione a: ${newAnimationName} per ${troop.id}`);
}

// Riproduci animazione di morte : Armature|Dead|baselayer
function deleteTroop(troop) {
    let play;
    if (troop.animTime > 2){
        console.log(`troop "${troop.id} is deleted from the game"`);
        troop.animTime = 0;
        play = "";
        scene.remove(troop.bar);
        const index = Troops.indexOf(troop);
        if (index !== -1) {
            Troops.splice(index, 1);
            console.log(`troop "${troop.id} removed from the list Troops"`);
        }
    } else {
        play = "Armature|Dead|baselayer";
    }
    changeAnimation(troop, troop.currAct);
    troop.currAct = "Armature|Dead|baselayer";
    troop.mixer.update(delta);
}    

// --- Funzione di Easing
function easeOutQuad(t) {
    return t * (2 - t);
}
function easeInQuad(t) {
    return t * t;
}
function easeOutBack(t) { // Per la sfera che appare con un leggero "rimbalzo"
    const s = 4.0; //1.80158;
    return (t = t - 1) * t * ((s + 1) * t + s) + 1;
}
function easeInBack(t) { // Per la sfera che scompare con un leggero "rimbalzo"
    const s = 1.80158;
    return t * t * ((s + 1) * t - s);
}

function animationPedestal(delta){
    
    const detectionRadius = 6;
    altar.pedestals.forEach(pedestal => {
        const pedPos = altar.position.clone();
        pedPos.x += pedestal.position.x;
        pedPos.z += pedestal.position.z;
        const distanceToHero = pedPos.distanceTo(HERO.body.position);
        //console.log(`distanceToHero: "${distanceToHero} per piedistallo`);

        // --- Logica di attivazione/disattivazione animazioni ---
        if (distanceToHero < detectionRadius) {
            if (!pedestal.isEmerging && !pedestal.isHiding && pedestal.position.y !== pedestal.desiredPos) {
                // Avvia emersione solo se non sta già animando e non è già emerso
                pedestal.isEmerging = true;
                pedestal.isHiding = false;
                pedestal.animationTime = 0; // Resetta il timer per la nuova animazione
                pedestal.startPosY = pedestal.position.y; // Posizione attuale di partenza
                pedestal.endPosY = pedestal.desiredPos;    // Posizione finale
                pedestal.startRotX = pedestal.rotation.x; // Rotazione attuale di partenza
                pedestal.startRotZ = pedestal.rotation.z; // Rotazione attuale di partenza
                console.log(`Avvio emersione per piedistallo in: ${pedPos.x}, ${pedPos.y}, ${pedPos.z}`);
            }
        } else {
            if (!pedestal.isHiding && !pedestal.isEmerging && pedestal.position.y !== pedestal.hidePos) {
                // Avvia rientro solo se non sta già animando e non è già nascosto
                pedestal.isHiding = true;
                pedestal.isEmerging = false;
                pedestal.animationTime = 0; // Resetta il timer
                pedestal.startPosY = pedestal.position.y;
                pedestal.endPosY = pedestal.hidePos;
                pedestal.startRotX = pedestal.rotation.x;
                pedestal.startRotZ = pedestal.rotation.z;
                console.log(`Avvio rientro per piedistallo in: ${pedPos.x}, ${pedPos.y}, ${pedPos.z}`);
                // scomparsa sfera
                if (pedestal.sphere && !pedestal.sphere.isDisappearing && pedestal.sphere.visible) {
                    pedestal.sphere.isAppearing = false;
                    pedestal.sphere.isDisappearing = true;
                    pedestal.sphere.animationTime = 0;
                }
            }
        }

        // --- Animazione di Emersione/Rientro del Piedistallo ---
        if (pedestal.isEmerging || pedestal.isHiding) {
            pedestal.animationTime += delta;
            let t = pedestal.animationTime / pedestal.animationDuration;
            t = Math.min(1, Math.max(0, t)); // Clampa il valore tra 0 e 1

            let easedT;
            if (pedestal.isEmerging) {
                easedT = easeOutQuad(t);
            } else { // isHiding
                easedT = easeInQuad(t);
            }

            // Interpolazione della posizione Y
            pedestal.position.y = pedestal.startPosY + (pedestal.endPosY - pedestal.startPosY) * easedT;

            // Interpolazione della rotazione X e Z (tornano a 0 durante l'emersione, o casuale nel rientro)
            if (pedestal.isEmerging) {
                pedestal.rotation.x = pedestal.startRotX * (1 - easedT); // Ritorna a 0
                pedestal.rotation.z = pedestal.startRotZ * (1 - easedT); // Ritorna a 0
            } else { // isHiding
                // Rotazione extra durante il rientro
                pedestal.rotation.x = pedestal.startRotX + (Math.PI / 4 - pedestal.startRotX) * easedT;
                pedestal.rotation.z = pedestal.startRotZ + (Math.PI / 4 - pedestal.startRotZ) * easedT;
                pedestal.rotation.y += pedestal.animation.rotateSpeed * delta * 5; // Continua a ruotare sull'asse Y
            }

            if (t >= 1) {
                // Animazione completata
                pedestal.isEmerging = false;
                pedestal.isHiding = false;
                pedestal.position.y = pedestal.endPosY; // Assicura la posizione finale esatta
                if (pedestal.endPosY === pedestal.desiredPos) {
                    pedestal.rotation.set(0, pedestal.rotation.y, 0); // Resetta rotazione X e Z
                    pedestal.hasEmerged = true;
                    // Avvia animazione comparsa sfera
                    if (pedestal.sphere && !pedestal.sphere.isAppearing && !pedestal.sphere.visible) {
                        pedestal.sphere.isAppearing = true;
                        pedestal.sphere.isDisappearing = false;
                        pedestal.sphere.animationTime = 0;
                        pedestal.sphere.visible = true; // Rendi visibile per l'animazione di scala/opacità
                    }
                } else { // Piedistallo rientrato
                    pedestal.hasEmerged = false;
                    if (pedestal.sphere && !pedestal.sphere.isDisappearing && pedestal.sphere.visible) {
                        pedestal.sphere.isAppearing = false;
                        pedestal.sphere.isDisappearing = true;
                        pedestal.sphere.animationTime = 0;
                    }
                    pedestal.rotation.set(pedestal.rotation.x, pedestal.rotation.y, pedestal.rotation.z); // Mantieni rotazione casuale
                }
            }
        }

        // Animazione Sfera (comparsa/scomparsa)
        if (pedestal.sphere) {
            const sphere = pedestal.sphere;
            const pointLight = sphere.pointLight;
            if (sphere.isAppearing || sphere.isDisappearing) {
                sphere.animationTime += delta;
                let t_sphere = sphere.animationTime / sphere.animationDuration;
                t_sphere = Math.min(1, Math.max(0, t_sphere));

                let easedT_sphere_scale, easedT_sphere_opacity;
                if (sphere.isAppearing) {
                    easedT_sphere_scale = easeOutBack(t_sphere); // Rimbalzo in uscita
                    easedT_sphere_opacity = easeOutQuad(t_sphere);
                    pointLight.visible = true;
                    pointLight.intensity = easedT_sphere_opacity * 1.0;
                } else { // isDisappearing
                    easedT_sphere_scale = easeInBack(1 - t_sphere); // Rimbalzo in entrata inverso
                    easedT_sphere_opacity = easeInQuad(1 - t_sphere);
                    pointLight.intensity = easedT_sphere_opacity * 1.0; // Anima l'intensità della luce
                }
                
                // Interpolazione della scala
                sphere.scale.x = sphere.initialScale.x * easedT_sphere_scale;
                sphere.scale.y = sphere.initialScale.y * easedT_sphere_scale;
                sphere.scale.z = sphere.initialScale.z * easedT_sphere_scale;

                // Interpolazione dell'opacità
                sphere.material.opacity = easedT_sphere_opacity;

                if (t_sphere >= 1) {
                    sphere.isAppearing = false;
                    sphere.isDisappearing = false;
                    if (pedestal.isHiding || (!pedestal.isEmerging && !pedestal.isHiding && !pedestal.hasEmerged)) { // Se il piedistallo è nascosto
                        sphere.visible = false;
                        sphere.scale.set(0.1,0.1,0.1); // Assicura che sia piccolo per il prossimo ciclo
                        sphere.material.opacity = 0;
                    } else if (pedestal.hasEmerged) { // Se il piedistallo è emerso
                         sphere.scale.copy(sphere.initialScale); // Assicura scala 1,1,1
                         sphere.material.opacity = 0.8;
                    }
                }
            }
        }


        // --- Rotazione e Pulsazione Continue (solo se completamente emerso) ---
        if (!pedestal.isEmerging && !pedestal.isHiding && pedestal.position.y === pedestal.desiredPos) {
            pedestal.rotation.y += pedestal.animation.rotateSpeed * delta * 10;
            const scaleFactor = 1 + Math.sin(clock.getElapsedTime() * pedestal.animation.pulseSpeed) * pedestal.animation.pulseAmplitude;
            pedestal.scale.set(
                pedestal.animation.initialScale.x * scaleFactor,
                pedestal.animation.initialScale.y * scaleFactor,
                pedestal.animation.initialScale.z * scaleFactor
            );
        } else if (!pedestal.isEmerging && !pedestal.isHiding && pedestal.position.y === -5) {
             // Piedistallo nascosto, resetta scala e opacità sfera
             pedestal.scale.copy(pedestal.animation.initialScale);
             if (pedestal.sphere) {
                 pedestal.sphere.material.opacity = 0;
                 pedestal.sphere.visible = false;
             }
        }
    });
}

// Funzione per mettere in pausa/riprendere l'animazione corrente
function togglePauseAnimation(body) {
    if (body.currAct) {
        body.currAct.paused = !body.currAct.paused;
        console.log(`Animazione ${body.currAct.paused ? 'in pausa' : 'ripresa'}.`);
    } else {
        console.warn('Nessuna animazione attiva da mettere in pausa/riprendere.');
    }
}

// Funzione per fermare l'animazione corrente e riportarla all'inizio
function stopAnimation() {
    if (body.currAct) {
        body.currAct.stop(); // Ferma e resetta l'animazione
        body.currAct = null; // Nessuna animazione attiva
        console.log('Animazione fermata.');
    } else {
        console.warn('Nessuna animazione attiva da fermare.');
    }
}

// movement of the HERO
function onKeyDown( event ) {
    const key = HEROcontrols.key;
    switch ( event.code ) {
        case 'ArrowUp': case 'KeyW': case 'KeyZ': key[ 0 ] = - 1; break;
        case 'ArrowDown': case 'KeyS': key[ 0 ] = 1; break;
        case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = - 1; break;
        case 'ArrowRight': case 'KeyD': key[ 1 ] = 1; break;
        case 'ShiftLeft' : case 'ShiftRight' : key[ 2 ] = 1; break;
    }
}
function onKeyUp( event ) {
    const key = HEROcontrols.key;
    switch ( event.code ) {
        case 'ArrowUp': case 'KeyW': case 'KeyZ': key[ 0 ] = key[ 0 ] < 0 ? 0 : key[ 0 ]; break;
        case 'ArrowDown': case 'KeyS': key[ 0 ] = key[ 0 ] > 0 ? 0 : key[ 0 ]; break;
        case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = key[ 1 ] < 0 ? 0 : key[ 1 ]; break;
        case 'ArrowRight': case 'KeyD': key[ 1 ] = key[ 1 ] > 0 ? 0 : key[ 1 ]; break;
        case 'ShiftLeft' : case 'ShiftRight' : key[ 2 ] = 0; break;
    }
}
function onMouseDown( event ) {
    // attacchi mutualmente esclusivi
    if (HERO){
        if (event.button === 0) { // Tasto sinistro del mouse
            if (HERO.attack[1] !== 1 && HERO.attack[0] !== 1){
                HERO.attack[0] = 1;
                HERO.animTime = 0;
            }
        } else if (event.button === 2) { // Tasto destro del mouse
            if (HERO.attack[0] !== 1 && HERO.attack[1] !== 1){
                HERO.attack[1] = 1;
                HERO.animTime = 0;
            }
        }
    }
}

const stars = getStarfield({numStars: 2000});  // STELLE --------------------------------------
scene.add(stars);

collidableObjects.forEach(obj => {
    const box = new THREE.Box3().setFromObject(obj);
    const helper = new THREE.Box3Helper(box, 0xff0000);
    scene.add(helper);
    collidableHelpers.push({ box, helper, obj });
});

let delta;
function animate() {

  delta = clock.getDelta();
  earth.rotation.y += 0.002;
  earth.clouds.rotation.y += 0.002;
  stars.rotation.y -= 0.0002;
  
  if (loaded === NUM_SKELETONS + 3 ) {
    updateCharacter(delta);
    updateTroops(delta);
    animationPedestal(delta);
    collidableHelpers.forEach(entry => {
        entry.obj.updateMatrixWorld(true);                // importante!
        entry.box.setFromObject(entry.obj);               // aggiorna box
        entry.helper.box.copy(entry.box);                 // aggiorna helper visivo
    });
  }

  
  renderer.render(scene, camera);
}


function onWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}