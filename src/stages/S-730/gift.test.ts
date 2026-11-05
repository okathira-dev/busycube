import { Mesh, Quaternion } from "three";
import { createGift } from "./gift";
import { rayFromPose } from "./ray";

function pose(x = 0, y = 0, z = 0, orientation = new Quaternion()): XRPose {
  return {
    transform: { position: { x, y, z }, orientation },
  } as unknown as XRPose;
}
it("raycasts the actual gift model, opens its lid, highlights it, and disposes every shared resource once", () => {
  const gift = createGift();
  gift.root.visible = true;
  gift.root.position.set(0, 0, -1.5);
  gift.root.updateMatrixWorld(true);
  const hit = rayFromPose(pose());
  expect(hit?.intersectObject(gift.root, true).length).toBeGreaterThan(0);
  expect(rayFromPose(pose(2))?.intersectObject(gift.root, true)).toEqual([]);
  expect(rayFromPose(pose(0, 0, -3))?.intersectObject(gift.root, true)).toEqual(
    [],
  );
  const geometries = new Set<Mesh["geometry"]>();
  const materials = new Set<Exclude<Mesh["material"], unknown[]>>();
  gift.root.traverse((object) => {
    if (object instanceof Mesh) {
      geometries.add(object.geometry);
      if (!Array.isArray(object.material)) materials.add(object.material);
    }
  });
  expect(geometries.size).toBeGreaterThan(1);
  expect(materials.size).toBe(2);
  const disposal = [...geometries, ...materials].map((resource) =>
    vi.spyOn(resource, "dispose"),
  );
  gift.setHighlighted(true);
  expect(
    [...materials].some(
      (material) =>
        "emissiveIntensity" in material && material.emissiveIntensity === 0.4,
    ),
  ).toBe(true);
  gift.open();
  for (let i = 0; i < 60; i++) gift.animate();
  expect(gift.lid.rotation.x).toBeLessThan(-1.1);
  gift.dispose();
  gift.dispose();
  for (const dispose of disposal) expect(dispose).toHaveBeenCalledOnce();
});

it("rejects absent or invalid poses instead of substituting a forward ray", () => {
  expect(rayFromPose(null)).toBeNull();
  expect(rayFromPose(undefined)).toBeNull();
  expect(rayFromPose(pose(NaN))).toBeNull();
  expect(rayFromPose(pose(0, Infinity))).toBeNull();
  expect(rayFromPose(pose(0, 0, 0, new Quaternion(0, 0, 0, 0)))).toBeNull();
  expect(
    rayFromPose(pose(0, 0, 0, new Quaternion(Number.MAX_VALUE, 0, 0, 1))),
  ).toBeNull();
});
