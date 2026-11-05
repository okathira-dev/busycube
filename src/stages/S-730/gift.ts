import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from "three";

export function createGift() {
  const root = new Group();
  root.name = "s730-gift";
  root.visible = false;
  const bodyMaterial = new MeshStandardMaterial({
    color: 0xa78bfa,
    roughness: 0.35,
  });
  const ribbonMaterial = new MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.45,
  });
  const geometry: (BoxGeometry | TorusGeometry)[] = [];
  const addBox = (
    parent: Group,
    size: [number, number, number],
    position: [number, number, number],
    ribbon = false,
  ) => {
    const shape = new BoxGeometry(...size);
    geometry.push(shape);
    const mesh = new Mesh(shape, ribbon ? ribbonMaterial : bodyMaterial);
    mesh.position.set(...position);
    parent.add(mesh);
  };
  addBox(root, [0.364, 0.018, 0.364], [0, -0.191, 0]);
  for (const side of [-1, 1]) {
    addBox(root, [0.4, 0.32, 0.018], [0, -0.04, side * 0.191]);
    addBox(root, [0.018, 0.32, 0.364], [side * 0.191, -0.04, 0]);
    addBox(root, [0.06, 0.325, 0.006], [0, -0.04, side * 0.202], true);
    addBox(root, [0.006, 0.325, 0.06], [side * 0.202, -0.04, 0], true);
  }
  addBox(root, [0.06, 0.006, 0.41], [0, -0.202, 0], true);
  addBox(root, [0.41, 0.006, 0.06], [0, -0.202, 0], true);
  const lid = new Group();
  lid.name = "s730-lid";
  lid.position.set(0, 0.12, -0.2);
  root.add(lid);
  addBox(lid, [0.44, 0.055, 0.44], [0, 0.0275, 0.2]);
  addBox(lid, [0.065, 0.062, 0.445], [0, 0.0275, 0.2], true);
  addBox(lid, [0.445, 0.062, 0.065], [0, 0.0275, 0.2], true);
  for (const side of [-1, 1]) {
    const shape = new TorusGeometry(0.05, 0.009, 6, 24);
    geometry.push(shape);
    const bow = new Mesh(shape, ribbonMaterial);
    bow.position.set(side * 0.048, 0.09, 0.2);
    bow.rotation.z = side * 0.4;
    bow.scale.x = 1.25;
    lid.add(bow);
  }
  let opened = false;
  let disposed = false;
  return {
    root,
    lid,
    setHighlighted(hit: boolean) {
      bodyMaterial.emissive.setHex(
        opened ? 0x34d399 : hit ? 0xa78bfa : 0x000000,
      );
      bodyMaterial.emissiveIntensity = opened ? 0.35 : hit ? 0.4 : 0;
    },
    open() {
      opened = true;
      bodyMaterial.color.setHex(0x34d399);
    },
    animate() {
      lid.rotation.x += ((opened ? -1.15 : 0) - lid.rotation.x) * 0.12;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const shape of geometry) shape.dispose();
      bodyMaterial.dispose();
      ribbonMaterial.dispose();
      root.clear();
    },
  };
}
