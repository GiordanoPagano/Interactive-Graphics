import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';

import getStarfield from "./src/getStarfield.js";
import * as OBJ from "./src/getObjects.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

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
// Camera e Luce che seguono il personaggio
const followGroup = new THREE.Group();
scene.add( followGroup );

const dirLight = new THREE.DirectionalLight( 0xffffff, 5 );
dirLight.position.set( - 2, 5, - 3 );
dirLight.castShadow = true;

const cam = dirLight.shadow.camera;
cam.top = cam.right = 2;
cam.bottom = cam.left = - 2;
cam.near = 3;
cam.far = 8;
dirLight.shadow.bias = - 0.005;
dirLight.shadow.radius = 4;
followGroup.add( dirLight );
followGroup.add( dirLight.target );

// Generazione della mappa di gioco
const world = new THREE.Group();
scene.add( world );
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
    world.add(groundMesh);

    console.log('Terreno creato con successo!');
}

modifyGround();

// Dichiarazione Variabili per Animazioni e Oggetti
const clock = new THREE.Clock();
const collidableObjects = []; // per collision detection
collidableObjects.push(groundMesh);

// Only for the HERO, which has to interact with keyboard and mouse
const HEROcontrols = {
    key: [ 0, 0, 0 ],
    dir: new THREE.Vector3(),
    current: 'Armature|Alert|baselayer',
};

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
    if (loadedGltfs.length === 0) {
        console.error("Nessun modello GLB caricato con successo. Impossibile continuare.");
        return;
    }

    // Identifica il Modello Principale e Aggiungilo alla Scena
    const mainGltf = loadedGltfs[0].gltf;
    modelMesh = mainGltf.scene;
    scene.add(modelMesh);
    modelMesh.castShadow = true;
    modelMesh.receiveShadow = true;
    
    // setting dei personaggi
    if (glbs === Bone_Golem_glb) {
        modelMesh.position.set(Math.random()*10+5, 0.01, Math.random()*10+5);
        modelMesh.scale.set(1.7, 1.7, 1.7);
        Name = 'bone_golem';
        side = 'evil';
        run = 3;
        walk = 1.2;
        rotate = 0.05;
        HP = 250,
        maxHP = 250,
        DMG = [ 25, 40],
        attackRange = 3,
        collisionRadius = 1,
        visionRadius = 10,
        rotateSpeed = 0.2,
        attackTYPE = ['Armature|Attack|baselayer', 'Armature|Skill_01|baselayer'],
        attackTIME = [ 2.6, 1.2 ]
    } else if (glbs === Hero_glb) {
        modelMesh.position.set(0, 0.01, 0);
        modelMesh.scale.set(0.7, 0.7, 0.7);
        Name = 'hero';
        side = 'good';
        run = 5;
        walk = 2.3;
        rotate = 0.1;
        HP = 100,
        maxHP = 100,
        DMG = [ 25, 40],
        attackRange = 1.5,
        collisionRadius = 1,
        visionRadius = 0, // not used for HERO,
        rotateSpeed = 0.3,
        attackTYPE = ['Armature|Attack|baselayer', 'Armature|Triple_Combo_Attack|baselayer'],
        attackTIME = [ 2.6, 3 ]
    }  else if (glbs === Enchanted_Arbor_glb) {
        modelMesh.position.set(15, 3, 0);
        modelMesh.scale.set(3, 3, 3);
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
        modelMesh.position.set(Math.random()*10+5, 0.01, Math.random()*10+5);
        modelMesh.scale.set(0.7, 0.7, 0.7);
        Name = 'skeleton';
        side = 'evil';
        run = 5;
        walk = 1.5;
        rotate = 0.1;
        HP = 100,
        maxHP = 100,
        DMG = [ 15, 0],
        attackRange = 1.5,
        collisionRadius = 1,
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
let HERO, GOLEM, SKELE1, SKELE2, SKELE3, ENCH_ARBOR, loaded = 0;
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
(async () => {
    try {
        SKELE1 = await loadModelAndAnimations(Skeleton_Warrior_glb);
        if (SKELE1) {
            const obj = SKELE1.body;
            const box = new THREE.Box3().setFromObject(obj);
            const helper = new THREE.Box3Helper(box, 0xff0000);
            scene.add(helper);
            collidableHelpers.push({ box, helper, obj });
            loaded += 1;
            Troops.push(SKELE1);
            console.log("Il caricamento di SKELE1 è andato bene.");
        } else {
            console.error("Il caricamento di SKELE1 è fallito.");
        }
    } catch (error) {
        console.error("Errore durante il caricamento di SKELE1:", error);
    }
})();
(async () => {
    try {
        SKELE2 = await loadModelAndAnimations(Skeleton_Warrior_glb);
        if (SKELE2) {
            const obj = SKELE2.body;
            const box = new THREE.Box3().setFromObject(obj);
            const helper = new THREE.Box3Helper(box, 0xff0000);
            scene.add(helper);
            collidableHelpers.push({ box, helper, obj });
            loaded += 1;
            Troops.push(SKELE2);
            console.log("Il caricamento di SKELE2 è andato bene.");
        } else {
            console.error("Il caricamento di SKELE2 è fallito.");
        }
    } catch (error) {
        console.error("Errore durante il caricamento di SKELE2:", error);
    }
})();(async () => {
    try {
        SKELE3 = await loadModelAndAnimations(Skeleton_Warrior_glb);
        if (SKELE3) {
            const obj = SKELE3.body;
            const box = new THREE.Box3().setFromObject(obj);
            const helper = new THREE.Box3Helper(box, 0xff0000);
            scene.add(helper);
            collidableHelpers.push({ box, helper, obj });
            loaded += 1;
            Troops.push(SKELE3);
            console.log("Il caricamento di SKELE3 è andato bene.");
        } else {
            console.error("Il caricamento di SKELE3 è fallito.");
        }
    } catch (error) {
        console.error("Errore durante il caricamento di SKELE3:", error);
    }
})();
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
    const offset = troop.body.atkRange;
    const dirOffset = new THREE.Vector3(0, 0, 1); // Punta in avanti (sull'asse Z)
    dirOffset.applyQuaternion(dir); // Applica la rotazione al vettore di offset
    const pointAttack = pos.add(dirOffset.multiplyScalar(offset));

    Troops.forEach(other => {
        if (other.side !== troop.side){
            const dx = other.body.position.x - pointAttack.x;
            const dz = other.body.position.z - pointAttack.z;
            const distanza = Math.sqrt(dx * dx + dz * dz);
            if (other.collRad < distanza) {
                dmg = troop.attack[0] === 1 ? damages[0] : damages[1];
                other.HP -= dmg;
                console.log(`vita di "${other.id} è a "${other.HP}"`);
                if (other.HP < 0) t.HP = 0;
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

    if (attacking) { // se sta attaccando prima concludi l'attacco
        // controllo per verificare se ha concluso un attacco
        if (HERO.attack[ 0 ] === 1){
            if (HERO.animTime > HERO.attackTime[0]){
                console.log(`reset actions and computing damage for "${HERO.id}; attacco tipo 0"`);
                console.log(`HERO.animTime "${HERO.animTime}" , HERO.attackTime[0] "${HERO.attackTime[0]}"`);
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
                console.log(`reset actions and computing damage for "${HERO.id}; attacco tipo 1"`);
                console.log(`HERO.animTime "${HERO.animTime}" , HERO.attackTime[1] "${HERO.attackTime[1]}"`);
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
        orbitControls.target.copy(position );
        followGroup.position.copy( position );
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

        const attacking = troop.attack[ 0 ] === 0 && troop.attack[ 1 ] === 0 ? false : true;
        if (attacking) { // se sta attaccando prima concludi l'attacco
            // controllo per verificare se ha concluso un attacco
            if (troop.currAct === troop.attackType[0]){
                if (troop.animTime > troop.attackTime[0]){
                    console.log(`reset actions and computing damage for "${troop.id}; attacco tipo 0"`);
                    console.log(`troop.animTime "${troop.animTime}" , troop.attackTime[0] "${troop.attackTime[0]}"`);
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
                    console.log(`reset actions and computing damage for "${troop.id}; attacco tipo 1"`);
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

            let rotate = troop.body.quaternion.clone();
            const rotSpeed = troop.rotSpeed;
            const angle = unwrapRad( Math.atan2( dirX, dirZ ));
            const rot_axis = new THREE.Vector3( 0, 1, 0 );  // y axis
            rotate.setFromAxisAngle( rot_axis, angle );
            troop.body.quaternion.rotateTowards( rotate, rotSpeed );

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

    console.log(`Cambiata animazione a: ${newAnimationName} per ${troop.id}`);
}

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
earthGroup.position.set(0, 4, 0)
scene.add(earthGroup);
const detail = 12;
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
  map: textureLoader.load("./textures/00_earthmap1k.jpg"),
  specularMap: textureLoader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: textureLoader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.4,//40,
  shininess: 30,
});
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: textureLoader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: textureLoader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: textureLoader.load('./textures/05_earthcloudmaptrans.jpg'),
  //alphaTest: 0.3,
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const stars = getStarfield({numStars: 2000});
scene.add(stars);

// ALTARE CON I PIEDISTALLI
const altar = new THREE.Group();
const pedestals = [];
const ped_2 = OBJ.createSteppedPedestal(0.2, 1.5, 3, 0xA0522D);
ped_2.position.x = -2;
ped_2.position.y = -3;
altar.add(ped_2);
pedestals.push(ped_2);
collidableObjects.push(ped_2);

const ped_1 = OBJ.createSteppedPedestal(0.2, 1.5, 3, 0xA0522D);
ped_1.position.x = 2;
ped_1.position.y = -3;
altar.add(ped_1);
pedestals.push(ped_1);
collidableObjects.push(ped_1);

const ped_3 = OBJ.createSteppedPedestal(0.2, 1.5, 3, 0xA0522D);
ped_3.position.z = 2;
ped_3.position.y = -3;
altar.add(ped_3);
pedestals.push(ped_3);
collidableObjects.push(ped_3);

const sphereTextures = [
    {text:'./textures/red_energy.png', color:  0xFF0000},
    {text:'./textures/green_energy.png', color:  0x00FF00},
    {text:'./textures/blue_energy.png', color:  0x0000FF}];
let index = 0;
pedestals.forEach(pedestal => {
    let sphere;
    let lightColor;
    let texturePath = null;
    lightColor = sphereTextures[index % 3].color;
    texturePath = sphereTextures[index % 3].text;

    sphere = OBJ.createSphere(0.2, lightColor, lightColor, texturePath); // Posiziona la sfera sopra il piedistallo
    sphere.position.y = pedestal.desiredPos * 2 + sphere.geometry.parameters.radius + 0.1;
    pedestal.add(sphere);
    pedestal.sphere = sphere;

    const pointLight = new THREE.PointLight(lightColor, 1.0, 10);
    sphere.add(pointLight);
    pointLight.visible = false;
    pedestal.sphere.pointLight = pointLight;

    index += 1;
});

const ped_4 = OBJ.createSteppedPedestal(5, 0.2, 1, 0xA0522D);
ped_4.position.z = 0;
ped_4.position.y = -3;
ped_4.hidePos = -5;
ped_4.desiredPos = -0.0999;
altar.add(ped_4);
pedestals.push(ped_4);

scene.add(altar);

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
    pedestals.forEach(pedestal => {
        const distanceToHero = pedestal.position.distanceTo(HERO.body.position);

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
                console.log(`Avvio emersione per piedistallo a X: ${pedestal.position.x}`);
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
                console.log(`Avvio rientro per piedistallo a X: ${pedestal.position.x}`);
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
                         sphere.material.opacity = 1;
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
/*
const house = OBJ.createHauntedHouse();
const hauntedHouse = house.group;
hauntedHouse.position.set(-15, 0, -15); // Posiziona la casa più indietro nella scena
hauntedHouse.collidableMeshes = house.collidableMeshes;
scene.add(hauntedHouse);
hauntedHouse.collidableMeshes.forEach(mesh => {
    collidableObjects.push(mesh);
});
console.log(`numero oggetti in collidableObjects:  ${collidableObjects.length}.`);
*/
// POPOLAMENTO MAPPA
const NUM_HOUSES = 5;
const houses = [];
const housePositions = []; // per evitare sovrapposizioni
function randomPositionInMap() {
    return new THREE.Vector3(Math.random() * 50 - 50, 0, Math.random() * 100 - 50);
}
for (let i = 0; i < NUM_HOUSES; i++) {
    let pos;
    let tries = 0;
    do {
        pos = randomPositionInMap();
        tries++;
    } while ( housePositions.some(p => p.distanceTo(pos) < 10) && tries < 20 );

    housePositions.push(pos);
    const scale = Math.random() * 2 + 1;
    const house = OBJ.createHauntedHouse();
    const hauntedHouse = house.group;
    hauntedHouse.position.set(pos);
    hauntedHouse.scale.set(scale, scale, scale); 
    hauntedHouse.rotation.y = tries%3 === 0 ? 0 : (tries%3 === 1 ? -Math.PI / 2 : Math.PI / 2); 
    hauntedHouse.collidableMeshes = house.collidableMeshes;
    scene.add(hauntedHouse);
    hauntedHouse.collidableMeshes.forEach(mesh => {
        collidableObjects.push(mesh);
    });

    hauntedHouse.userData = {
        position: pos,
        scale: scale,
        hasAltar: false,
        hasSkeletonGiant: false,
        skeletons: []
    };

    houses.push(hauntedHouse);
}
// 2. Trova la casa più grande per l'altare
houses.sort((a, b) => b.userData.scale - a.userData.scale);
const houseWithAltar = houses[0];
houseWithAltar.userData.hasAltar = true;
// Posizionamento semplice: altare al centro
altar(houseWithAltar.userData.position);
// 3. Trova un'altra casa grande per lo scheletro gigante
const houseWithGiant = houses.find(h => 
    !h.userData.hasAltar && h.userData.scale >= 2.5
);
if (houseWithGiant) {
    houseWithGiant.userData.hasSkeletonGiant = true;
    generateSkeletonGiant(houseWithGiant.userData.position.clone().add(new THREE.Vector3(1, 0, 0)));
}
// 4. Genera scheletri normali nelle altre case
houses.forEach(h => {
    if (!h.userData.hasAltar && !h.userData.hasSkeletonGiant) {
        const numSkeletons = Math.floor(Math.random() * 3) + 1; // 1-3
        for (let i = 0; i < numSkeletons; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                0,
                (Math.random() - 0.5) * 2
            );
            const skelPos = h.userData.position.clone().add(offset);
            generateSkeleton(skelPos);
            h.userData.skeletons.push(skelPos);
        }
    }
});


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

const collidableHelpers = []; // per tener traccia dei box helper
collidableObjects.forEach(obj => {
    const box = new THREE.Box3().setFromObject(obj);
    const helper = new THREE.Box3Helper(box, 0xff0000);
    scene.add(helper);
    collidableHelpers.push({ box, helper, obj });
});

let delta;
function animate() {

  delta = clock.getDelta();
  earthGroup.rotation.y += 0.002;
  cloudsMesh.rotation.y += 0.001;
  stars.rotation.y -= 0.0002;
  
  if (loaded === 5) {
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