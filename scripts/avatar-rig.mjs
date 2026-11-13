import * as THREE from 'three';

/** Original project-authored articulated calibration character, under the repository MIT license. */
export function createAvatarRig() {
  const root = new THREE.Group();
  root.name = 'AccessWoman';
  const bones = new Map();
  const morphs = [];
  const skin = new THREE.MeshStandardMaterial({ color: 0x70432e, roughness: .8 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x13756f, roughness: .9 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x171313, roughness: 1 });
  const lips = new THREE.MeshStandardMaterial({ color: 0x7e3c39, roughness: .8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xdcb65b, metalness: .5 });
  const bone = (name, parent, position) => {
    const joint = new THREE.Bone();
    joint.name = name;
    joint.position.fromArray(position);
    parent.add(joint);
    bones.set(name, joint);
    return joint;
  };
  const mesh = (name, parent, geometry, material, position, scale = [1, 1, 1]) => {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.fromArray(position);
    object.scale.fromArray(scale);
    parent.add(object);
    return object;
  };
  const sphere = (name, parent, radius, material, position, scale) =>
    mesh(name, parent, new THREE.SphereGeometry(radius, 20, 16), material, position, scale);
  const expressionMesh = (object, expressions) => {
    const position = object.geometry.attributes.position;
    object.geometry.morphAttributes.position = Object.entries(expressions).map(([name, deform]) => {
      const values = position.clone();
      values.name = name;
      for (let i = 0; i < values.count; i++) {
        const point = new THREE.Vector3().fromBufferAttribute(position, i);
        deform(point);
        values.setXYZ(i, point.x, point.y, point.z);
      }
      return values;
    });
    object.updateMorphTargets();
    morphs.push(object);
  };

  const hips = bone('Hips', root, [0, .8, 0]);
  const spine = bone('Spine', hips, [0, .2, 0]);
  const chest = bone('Spine2', spine, [0, .58, 0]);
  const neck = bone('Neck', chest, [0, .24, 0]);
  const head = bone('Head', neck, [0, .3, 0]);
  mesh('Top', spine, new THREE.CapsuleGeometry(.43, .6, 8, 24), shirt, [0, .02, 0], [.94, 1, .65]);
  mesh('NeckSkin', neck, new THREE.CylinderGeometry(.12, .14, .22, 16), skin, [0, 0, 0]);
  sphere('Face', head, .3, skin, [0, 0, 0], [.88, 1.15, .9]);
  sphere('HairCap', head, .3, hair, [0, .15, -.085], [.96, .8, .82]);
  for (let ring = 0; ring < 4; ring++) {
    for (let curl = 0; curl < 16; curl++) {
      const angle = curl / 16 * Math.PI * 2;
      const radius = .26 - ring * .045;
      sphere(`Curl_${ring}_${curl}`, head, .05, hair,
        [Math.cos(angle) * radius, .21 + ring * .04, -.07 + Math.sin(angle) * radius * .8]);
    }
  }
  sphere('Bun', head, .15, hair, [0, .45, -.11]);
  sphere('Nose', head, .04, skin, [0, -.05, .28], [.6, .8, 1]);
  for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
    mesh(`${side}Earring`, head, new THREE.TorusGeometry(.045, .009, 8, 20), gold, [sign * .25, -.11, .025]);
    const eye = sphere(`${side}Eye`, head, .025, hair, [sign * .105, .05, .25]);
    expressionMesh(eye, { [`eyeBlink${side}`]: point => { point.y *= .05; } });
    const brow = mesh(`${side}Brow`, head, new THREE.BoxGeometry(.09, .018, .018), hair, [sign * .105, .11, .245]);
    expressionMesh(brow, {
      browInnerUp: point => { point.y += .045 * (1 - sign * point.x / .05) / 2; },
      [`browDown${side}`]: point => { point.y -= .035; },
      [`browOuterUp${side}`]: point => { point.y += .04 * (1 + sign * point.x / .05) / 2; },
    });
    const shoulder = bone(`${side}Shoulder`, chest, [sign * .23, 0, 0]);
    const arm = bone(`${side}Arm`, shoulder, [sign * .19, 0, 0]);
    const forearm = bone(`${side}ForeArm`, arm, [0, -.42, 0]);
    const hand = bone(`${side}Hand`, forearm, [0, -.42, 0]);
    mesh(`${side}Sleeve`, arm, new THREE.CapsuleGeometry(.12, .23, 6, 16), shirt, [0, -.2, 0]);
    mesh(`${side}ForearmSkin`, forearm, new THREE.CapsuleGeometry(.075, .27, 6, 16), skin, [0, -.2, 0]);
    sphere(`${side}Palm`, hand, .085, skin, [0, -.075, 0], [1, 1.25, .4]);
    const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
    for (let finger = 0; finger < fingers.length; finger++) {
      const thumb = finger === 0;
      const length = thumb ? .043 : .047 - Math.abs(finger - 2) * .005;
      let parent = hand;
      for (let joint = 1; joint <= 3; joint++) {
        const position = joint === 1
          ? [sign * (thumb ? -.09 : (finger - 2.5) * .037), thumb ? -.055 : -.15, thumb ? .025 : 0]
          : [0, -length, 0];
        parent = bone(`${side}Hand${fingers[finger]}${joint}`, parent, position);
        if (thumb && joint === 1) parent.rotation.z = -sign * .65;
        mesh(`${parent.name}Skin`, parent, new THREE.CapsuleGeometry(thumb ? .019 : .015, length * .6, 4, 8), skin, [0, -length / 2, 0]);
      }
    }
  }
  const mouth = mesh('Mouth', head, new THREE.TorusGeometry(.055, .012, 8, 20), lips, [0, -.13, .25], [1, .35, .4]);
  expressionMesh(mouth, {
    jawOpen: point => { point.y *= 3; },
    mouthSmileLeft: point => { point.y += Math.max(0, point.x) * .7; },
    mouthSmileRight: point => { point.y += Math.max(0, -point.x) * .7; },
    mouthFunnel: point => { point.x *= .6; point.y *= 2; },
    mouthPucker: point => { point.x *= .7; point.z += .03; },
  });
  root.updateMatrixWorld(true);
  return { root, bones, morphs };
}
