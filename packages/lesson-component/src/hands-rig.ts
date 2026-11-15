import * as THREE from 'three';

export const HANDS_RIG_VERSION = 'access-hands-v1';
export const SIGNING_SPACE = { left: -1.55, right: 1.55, bottom: .15, top: 2.95 };

export function createHandsRig() {
  const root = new THREE.Group();
  root.name = 'AccessHands';
  root.userData.handsRigVersion = HANDS_RIG_VERSION;
  const bones = new Map<string, THREE.Bone>();
  const skin = new THREE.MeshStandardMaterial({ color: 0x965f43, roughness: .88, metalness: 0 });
  const nail = new THREE.MeshStandardMaterial({ color: 0xac806b, roughness: .8, metalness: 0 });
  const joint = (name: string, parent: THREE.Object3D, position: number[]) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.fromArray(position);
    parent.add(bone);
    bones.set(name, bone);
    return bone;
  };
  const surface = (name: string, parent: THREE.Object3D, geometry: THREE.BufferGeometry,
    position: number[], scale = [1, 1, 1], material = skin) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    parent.add(mesh);
    return mesh;
  };
  const hips = joint('Hips', root, [0, .8, 0]);
  const spine = joint('Spine', hips, [0, .2, 0]);
  const chest = joint('Spine2', spine, [0, .58, 0]);
  const neck = joint('Neck', chest, [0, .24, 0]);
  joint('Head', neck, [0, .3, 0]);
  for (const [side, direction] of [['Left', 1], ['Right', -1]] as const) {
    const shoulder = joint(`${side}Shoulder`, chest, [direction * .23, 0, 0]);
    const arm = joint(`${side}Arm`, shoulder, [direction * .19, 0, 0]);
    const forearm = joint(`${side}ForeArm`, arm, [0, -.42, 0]);
    const hand = joint(`${side}Hand`, forearm, [0, -.42, 0]);
    const vertices: number[] = [];
    const indices: number[] = [];
    const sections = [[0, .043, .024], [-.025, .049, .028], [-.065, .068, .032],
      [-.115, .075, .03], [-.15, .073, .023], [-.167, .06, .014]];
    const circumference = 40;
    for (const [height, width, depth] of sections) {
      for (let sample = 0; sample < circumference; sample++) {
        const angle = sample / circumference * Math.PI * 2;
        vertices.push(Math.cos(angle) * width, height, Math.sin(angle) * depth);
      }
    }
    for (let ring = 0; ring < sections.length - 1; ring++) {
      for (let sample = 0; sample < circumference; sample++) {
        const next = (sample + 1) % circumference;
        const upper = ring * circumference;
        const lower = upper + circumference;
        indices.push(upper + sample, upper + next, lower + sample, upper + next, lower + next, lower + sample);
      }
    }
    const wrist = vertices.length / 3;
    vertices.push(0, 0, 0, 0, sections.at(-1)![0], 0);
    for (let sample = 0; sample < circumference; sample++) {
      const next = (sample + 1) % circumference;
      const last = (sections.length - 1) * circumference;
      indices.push(wrist, next, sample, wrist + 1, last + sample, last + next);
    }
    const palm = new THREE.BufferGeometry();
    palm.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    palm.setIndex(indices);
    palm.computeVertexNormals();
    surface(`${side}Palm`, hand, palm, [0, 0, 0]);
    surface(`${side}Thenar`, hand, new THREE.SphereGeometry(1, 24, 16),
      [direction * .043, -.069, .013], [.038, .053, .025]);
    const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
    for (const [fingerIndex, finger] of fingers.entries()) {
      const thumb = finger === 'Thumb';
      const spacing = thumb ? .043 : .047 - Math.abs(fingerIndex - 2) * .005;
      const radius = thumb ? .020 : .017 - Math.max(0, fingerIndex - 2) * .0017;
      let parent = hand;
      for (let phalanx = 1; phalanx <= 3; phalanx++) {
        const position = phalanx === 1
          ? [direction * (thumb ? .079 : (2.5 - fingerIndex) * .037), thumb ? -.058 : -.15, thumb ? .009 : 0]
          : [0, -spacing, 0];
        parent = joint(`${side}Hand${finger}${phalanx}`, parent, position);
        if (thumb && phalanx === 1) parent.rotation.set(-.3, 0, direction * .6);
        const length = phalanx === 3 ? spacing * .65 : spacing;
        const width = radius * (1 - (phalanx - 1) * .12);
        surface(`${parent.name}Skin`, parent,
          new THREE.CapsuleGeometry(width, Math.max(.001, length - width), 8, 20),
          [0, -length / 2, 0], [1, 1, .86]);
        if (phalanx === 3) surface(`${side}${finger}Nail`, parent,
          new THREE.SphereGeometry(1, 20, 12), [0, -length * .64, -width * .81],
          [width * .66, length * .3, .002], nail);
      }
    }
  }
  root.updateMatrixWorld(true);
  return { root, bones };
}

export function neutralHandsPose(bones: Map<string, THREE.Bone>) {
  for (const [side, direction] of [['Left', 1], ['Right', -1]] as const) {
    bones.get(`${side}Arm`)!.rotation.z = direction * -.1;
    bones.get(`${side}ForeArm`)!.rotation.z = direction * 2.95;
    for (const finger of ['Index', 'Middle', 'Ring', 'Pinky']) {
      bones.get(`${side}Hand${finger}1`)!.rotation.x = -.08;
      bones.get(`${side}Hand${finger}2`)!.rotation.x = -.12;
      bones.get(`${side}Hand${finger}3`)!.rotation.x = -.08;
    }
  }
}
