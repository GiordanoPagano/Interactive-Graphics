import * as THREE from 'three';
import { getFresnelMat } from "./getFresnelMat.js";
const textureLoader = new THREE.TextureLoader();

export function createSimplePedestal(baseRadius = 1, baseHeight = 0.5, topWidth = 0.8, topHeight = 0.2, color = 0x8B4513) {
    const group = new THREE.Group();

    const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: color });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    group.add(base);

    const topGeometry = new THREE.BoxGeometry(topWidth, topHeight, topWidth);
    const topMaterial = new THREE.MeshStandardMaterial({ color: color });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    
    finPos = (baseHeight / 2) + (topHeight / 2);
    group.add(top);

    group.desiredPos = finPos;
    group.isEmerging = false;      // Vero se sta emergendo
    group.isHiding = false;        // Vero se sta rientrando
    group.animationTime = 0;       // Timer per l'animazione di emersione/rientro
    group.animationDuration = 1.5; // Durata dell'animazione in secondi
    group.startPosY = -5;          // Posizione Y di partenza
    group.endPosY = finPos;        // Posizione Y di arrivo
    group.startRotX = 0;           // Rotazione X iniziale per emersione
    group.startRotZ = 0;           // Rotazione Z iniziale per emersione

    group.animation = {
        // Rotazione casuale per un po' di varietà durante l'emersione
        rotateSpeed: Math.random() * 0.05 + 0.02, 
        pulseSpeed: Math.random() * 2 + 1,       
        pulseAmplitude: 0.02,                   
        initialScale: group.scale.clone()       
    };

    group.childrenObjects = {
        baseMesh: base,
        topMesh: top
    };

    group.hasEmerged = false

    return group;
}

export function createSteppedPedestal(baseRadius = 1.2, totalHeight = 1.0, numSteps = 4, color = 0xA0522D) {
    const group = new THREE.Group();
    const green_material = new THREE.MeshStandardMaterial({
      map: textureLoader.load("./textures/roccia_con_rune_verdi.png"),
    });
    const red_material = new THREE.MeshBasicMaterial({
        map: textureLoader.load("./textures/roccia_nera_rune_verdi.png"),
        blending: THREE.AdditiveBlending,
    });

    const stepHeight = totalHeight / numSteps;
    let currentY = 0;

    for (let i = 0; i < numSteps; i++) {
        const radius = baseRadius - (i * (baseRadius * 0.2 / numSteps)); 
        const geometry = new THREE.CylinderGeometry(radius, radius, stepHeight, 32);
        const step = new THREE.Mesh(geometry, green_material);
        step.position.y = currentY + (stepHeight / 2);
        step.castShadow = true;
        step.receiveShadow = true;
        group.add(step);
        const step_2 = new THREE.Mesh(geometry, red_material);
        step_2.position.y = currentY + (stepHeight / 2);
        step_2.castShadow = true;
        step_2.receiveShadow = true;
        group.add(step_2);
        currentY += stepHeight;
    }

    const topPlateRadius = baseRadius * 0.7;
    const topPlateHeight = 0.05;
    const topPlateGeometry = new THREE.CylinderGeometry(topPlateRadius, topPlateRadius, topPlateHeight, 32);
    const topPlate = new THREE.Mesh(topPlateGeometry, green_material);
    topPlate.position.y = currentY + (topPlateHeight / 2);
    topPlate.castShadow = true;
    topPlate.receiveShadow = true;
    group.add(topPlate);
    const topPlate_2 = new THREE.Mesh(topPlateGeometry, red_material);
    topPlate_2.position.y = currentY + (topPlateHeight / 2);
    topPlate_2.castShadow = true;
    topPlate_2.receiveShadow = true;
    group.add(topPlate_2);
    
    group.desiredPos = totalHeight / 2 + topPlateHeight / 2;
    group.hidePos = -3;
    group.isEmerging = false;      // Vero se sta emergendo
    group.isHiding = false;        // Vero se sta rientrando
    group.animationTime = 0;       // Timer per l'animazione di emersione/rientro
    group.animationDuration = 1.5; // Durata dell'animazione in secondi
    group.startPosY = 0;          // Posizione Y di partenza
    group.endPosY = 0;            // Posizione Y di arrivo
    group.startRotX = 0;           // Rotazione X iniziale per emersione
    group.startRotZ = 0;           // Rotazione Z iniziale per emersione

    group.animation = {
        // Rotazione casuale per un po' di varietà
        rotateSpeed: Math.random() * 0.05 + 0.02,
        pulseSpeed: Math.random() * 2 + 1,
        pulseAmplitude: 0.02,
        initialScale: group.scale.clone()
    };

    group.childrenObjects = {
        steps: group.children.slice(0, numSteps),
        topPlateMesh: topPlate
    };

    return group;
}

export function createSphere(radius = 0.2, color = 0x00BFFF, emissive = 0x00BFFF, texturePath = null) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    
    let material;
    if (texturePath) {
        const texture = textureLoader.load(texturePath);
        material = new THREE.MeshStandardMaterial({
            map: texture,
            emissive: emissive,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0, // Inizialmente invisibile
        });
    } else {
        material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissive,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0,
        });
    }

    const sphere = new THREE.Mesh(geometry, material);
    sphere.visible = false;
    sphere.position.y = radius;
    
    sphere.isAppearing = false;
    sphere.isDisappearing = false;
    sphere.animationTime = 0;
    sphere.animationDuration = 0.5;
    sphere.initialScale = sphere.scale.clone();
    
    return sphere;
}

// Funzione per creare una casa spettrale con oggetti basilari
export function createHauntedHouse() {
    const houseGroup = new THREE.Group();
    const collidableMeshes = [];

    const wallTexture1 = textureLoader.load('./textures/parete_spettrale1.png');
    const wallTexture2 = textureLoader.load('./textures/parete_spettrale2.png');
    const wallTexture3 = textureLoader.load('./textures/parete_spettrale3.png');
    const roofTexture = textureLoader.load('./textures/tetto_spettrale2.png');
    const chimneyTexture = textureLoader.load('./textures/camino_spettrale.png');
    const floorTexture = textureLoader.load('./textures/pavimento_spettrale.png');
    const chimneyTexture2 = textureLoader.load('./textures/camino_sopra_spettrale.png');

    // --- Materiali Base della Casa ---
    // MURI
    const wallMaterial1 = new THREE.MeshStandardMaterial({map: wallTexture1, roughness: 0.8, metalness: 0.1});
    const wallMaterial2 = new THREE.MeshStandardMaterial({map: wallTexture2, roughness: 0.8,  metalness: 0.1});
    const wallMaterial3 = new THREE.MeshStandardMaterial({map: wallTexture3, roughness: 0.8, metalness: 0.1});
    // TETTO
    const roofMaterial = new THREE.MeshStandardMaterial({map: roofTexture, roughness: 0.9,  metalness: 0.05});
    // CAMINO
    const chimneyMaterial = new THREE.MeshStandardMaterial({map: chimneyTexture, roughness: 0.9, metalness: 0.05});
    const chimneyMaterial2 = new THREE.MeshStandardMaterial({map: chimneyTexture2, roughness: 0.9, metalness: 0.05});
    // PAVIMENTO
    const floorMaterial = new THREE.MeshStandardMaterial({map: floorTexture, roughness: 0.9, metalness: 0.05,});
    // LAMPADARIO
    //const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
    const metalMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 }); // materiale meno costoso computazionalmente

    // --- Dimensioni Generali della Casa ---
    const wallThickness = 0.5; // Spessore delle pareti
    const baseWidth = 8;     // Larghezza esterna del corpo principale
    const baseHeight = 4;    // Altezza esterna del corpo principale
    const baseDepth = 8;     // Profondità esterna del corpo principale

    const roofHeight = 4;    // Altezza della parte triangolare del tetto
    const roofOverhang = 2; // Sporgenza del tetto oltre i muri

    const doorWidth = 1.5;   // Larghezza dell'apertura della porta
    const doorHeight = 3;    // Altezza dell'apertura della porta

    // Funzione helper per creare mesh e impostare ombre
    function createHouseElementMesh(geometry, material, position, rotation = null, isCollidable = true) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        if (rotation) {
            mesh.rotation.copy(rotation);
        }
        mesh.castShadow = true;    // Questa mesh proietta ombre
        mesh.receiveShadow = true; // Questa mesh riceve ombre
        houseGroup.add(mesh);
        if (isCollidable) {
            collidableMeshes.push(mesh); 
        }
        return mesh;
    }

    // --- 1. Pareti della Casa ---
    const backWallMesh = createHouseElementMesh(
        new THREE.BoxGeometry(baseWidth, baseHeight, wallThickness), 
        wallMaterial1, 
        new THREE.Vector3(0, baseHeight / 2, -baseDepth / 2 + wallThickness / 2));

    const leftWallMesh = createHouseElementMesh(
        new THREE.BoxGeometry(wallThickness, baseHeight, baseDepth - wallThickness), 
        wallMaterial2, 
        new THREE.Vector3(-baseWidth / 2 + wallThickness / 2, baseHeight / 2, 0));
    leftWallMesh.scale.set(0.999, 0.999, 0.999);

    const rightWallMesh = createHouseElementMesh(
        new THREE.BoxGeometry(wallThickness, baseHeight, baseDepth - wallThickness), 
        wallMaterial3, 
        new THREE.Vector3(baseWidth / 2 - wallThickness / 2, baseHeight / 2, 0));
    rightWallMesh.scale.set(0.999, 0.999, 0.999);

    const frontLeftWallMesh = createHouseElementMesh(
        new THREE.BoxGeometry((baseWidth - doorWidth) / 2 - wallThickness / 2, baseHeight, wallThickness), 
        wallMaterial1, 
        new THREE.Vector3(-(baseWidth / 2 - (baseWidth - doorWidth) / 4 - wallThickness / 4), baseHeight / 2, baseDepth / 2 - wallThickness));

    const frontRightWallMesh = createHouseElementMesh(
        new THREE.BoxGeometry((baseWidth - doorWidth) / 2 - wallThickness / 2, baseHeight, wallThickness), 
        wallMaterial1, 
        new THREE.Vector3((baseWidth / 2 - (baseWidth - doorWidth) / 4 - wallThickness / 4), baseHeight / 2, baseDepth / 2 - wallThickness));

    const lintelHeight = baseHeight - doorHeight;
    const lintelMesh = createHouseElementMesh(
        new THREE.BoxGeometry(doorWidth + wallThickness, lintelHeight, wallThickness), 
        wallMaterial1, 
        new THREE.Vector3(0, baseHeight - lintelHeight / 2, baseDepth / 2 - wallThickness));
    lintelMesh.scale.set(0.99, 0.99, 0.99);

    // --- 2. Tetto a Due Falde ---
    const roofGeometry = new THREE.ConeGeometry( (baseWidth + roofOverhang * 2) / 2, roofHeight, 4 ); 
    const roofMesh = createHouseElementMesh(roofGeometry, roofMaterial, new THREE.Vector3(0, (roofHeight / 2) + baseHeight, 0), new THREE.Euler(0, Math.PI / 4, 0));

    // --- 4. Camini ---
    const chimneyWidth = 1;
    const chimneyHeight = 3;
    const chimneyDepth = 1;
    const chimneyGeometry = new THREE.BoxGeometry(chimneyWidth, chimneyHeight, chimneyDepth);

    const chimney1 = createHouseElementMesh(
        chimneyGeometry, 
        chimneyMaterial, 
        new THREE.Vector3(baseWidth / 3, 1 + baseHeight + chimneyHeight / 2, baseDepth / 3));
    const chimney1_top = createHouseElementMesh(
        chimneyGeometry, 
        chimneyMaterial2, 
        new THREE.Vector3(baseWidth / 3, 1.01 + baseHeight + chimneyHeight / 2, baseDepth / 3));
    chimney1_top.scale.set(0.99, 0.99, 0.99);
    
    // --- Pavimento Interno ---
    const floorGeometry = new THREE.PlaneGeometry(baseWidth - wallThickness * 2, baseDepth - wallThickness * 2);
    const floorMesh = createHouseElementMesh(
        floorGeometry, 
        floorMaterial, 
        new THREE.Vector3(0, 0.005, 0), 
        new THREE.Euler(-Math.PI / 2, 0, 0), 
        false);
    floorMesh.castShadow = false; 

    // Lampione 
    const lamp = createHouseElementMesh(
        new THREE.ConeGeometry(1, 0.6, 12),
        metalMaterial, 
        new THREE.Vector3(0, baseHeight - 0.1, 0),
        new THREE.Euler(0, Math.PI / 4, 0));

    // 💡 LUCE INTERNA
    const light = new THREE.PointLight(0xfff0cc, 50, 20, 2);
    light.position.set(0, baseHeight - 0.6, 0);
    light.castShadow = true;
    houseGroup.add(light);

    const scaleFactor = 2; 
    houseGroup.scale.set(scaleFactor, scaleFactor, scaleFactor); 
    houseGroup.position.y = (baseHeight * scaleFactor) / 2; 
    //houseGroup.rotation.y = Math.PI / 8; 
    houseGroup.collidableMeshes = collidableMeshes; 

    return houseGroup
}

export function createAltar() {
    // ALTARE CON I PIEDISTALLI
    const altarGroup = new THREE.Group();
    const pedestals = [];
    const collidableObjects = [];
    const ped_2 = createSteppedPedestal(0.2, 1.5, 3, 0xA0522D);
    ped_2.position.x = -2;
    ped_2.position.y = -3;
    altarGroup.add(ped_2);
    pedestals.push(ped_2);
    collidableObjects.push(ped_2);
    
    const ped_1 = createSteppedPedestal(0.2, 1.5, 3, 0xA0522D);
    ped_1.position.x = 2;
    ped_1.position.y = -3;
    altarGroup.add(ped_1);
    pedestals.push(ped_1);
    collidableObjects.push(ped_1);
    
    const ped_3 = createSteppedPedestal(0.2, 1.5, 3, 0xA0522D);
    ped_3.position.z = 2;
    ped_3.position.y = -3;
    altarGroup.add(ped_3);
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
    
        sphere = createSphere(0.2, lightColor, lightColor, texturePath); // Posiziona la sfera sopra il piedistallo
        sphere.position.y = pedestal.desiredPos * 2 + sphere.geometry.parameters.radius + 0.1;
        pedestal.add(sphere);
        pedestal.sphere = sphere;
    
        const pointLight = new THREE.PointLight(lightColor, 1.0, 10);
        sphere.add(pointLight);
        pointLight.visible = false;
        pedestal.sphere.pointLight = pointLight;
    
        index += 1;
    });
    
    const ped_4 = createSteppedPedestal(5, 0.2, 1, 0xA0522D);
    ped_4.position.z = 0;
    ped_4.position.y = -3;
    ped_4.hidePos = -5;
    ped_4.desiredPos = -0.0999;
    altarGroup.add(ped_4);
    pedestals.push(ped_4);

    altarGroup.collidableMeshes = collidableObjects;
    altarGroup.pedestals = pedestals;

    return altarGroup;
}

export function createEarth() {
    // PIANETA TERRA
    let collidableObjects = [];
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = -23.4 * Math.PI / 180;
    earthGroup.position.set(0, 3, 0)
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

    earthGroup.collidableMeshes = collidableObjects;
    earthGroup.clouds = cloudsMesh;

    return earthGroup;
}

export function createLampPost(bilamp = false, position = new THREE.Vector3(0, 0, 0)) {
    const lampGroup = new THREE.Group();
    let collidableObjects = [];

    // Funzione helper per creare mesh e impostare ombre
    function createLampElementMesh(geometry, material, position, rotation = null, isCollidable = true) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        if (rotation) {
            mesh.rotation.copy(rotation);
        }
        mesh.castShadow = true;    // Questa mesh proietta ombre
        mesh.receiveShadow = true; // Questa mesh riceve ombre
        lampGroup.add(mesh);
        if (isCollidable) {
            collidableObjects.push(mesh); 
        }
        return mesh;
    }

    // MATERIALE METALLO
    //const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
    const metalMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 }); // materiale meno costoso computazionalmente


    // 🟦 BASE
    const baseMesh = createLampElementMesh(
        new THREE.CylinderGeometry(0.3, 0.5, 0.4, 16),
        metalMaterial, 
        new THREE.Vector3(0, 0.2, 0));

    // 🟩 ASTA
    const poleMesh = createLampElementMesh(
        new THREE.CylinderGeometry(0.1, 0.1, 3, 12),
        metalMaterial, 
        new THREE.Vector3(0, 0.4 + 1.5, 0));

    // 🟨 BRACCIO CURVO 
    const armMesh = createLampElementMesh(
        new THREE.TorusGeometry(1, 0.1, 8, 100, Math.PI),
        metalMaterial, 
        new THREE.Vector3(0, 3.4, 1),
        new THREE.Euler(0, Math.PI/2, 0));
    const armMesh2 = createLampElementMesh(
        new THREE.TorusGeometry(1, 0.1, 8, 100, Math.PI),
        metalMaterial, 
        new THREE.Vector3(0, 3.4, -1),
        new THREE.Euler(0, Math.PI/2, 0));

    // 🟧 TESTA DEL LAMPIONE (box o piramide rovesciata)
    const headMesh = createLampElementMesh(
        new THREE.ConeGeometry(0.5, 0.8, 6),
        metalMaterial, 
        new THREE.Vector3(0, 3.4 - 0.4 + 0.2, 2),
        new THREE.Euler(0, Math.PI / 4, 0));

    const light = new THREE.PointLight(0xfff0cc, 50, 20, 2);
    light.position.set(0, 2.4 + 0.2, 2);
    light.castShadow = true;
    lampGroup.add(light);

    if (bilamp){
        const headMesh2 = createLampElementMesh(
            new THREE.ConeGeometry(0.5, 0.8, 6),
            metalMaterial, 
            new THREE.Vector3(0, 3.4 - 0.4 + 0.2, -2),
            new THREE.Euler(0, Math.PI / 4, 0));

        const light2 = new THREE.PointLight(0xfff0cc, 50, 20, 2);
        light2.position.set(0, 2.4 + 0.2, -2);
        light2.castShadow = true;
        lampGroup.add(light2);
    }
    
    lampGroup.position.copy(position);

    lampGroup.collidableMeshes = collidableObjects;

    return lampGroup;
}
