/** Shared graph and coordinate access for generated molecular structures. */

import type { Vec3 } from "./structure/Geometry.js";
import type { Structure } from "./structure/Structure.js";

export type BuiltMolecule = {
  structure: Structure;
  positions: Float64Array;
  heavyCount: number;
  parentOf: Int32Array;
};

type Neighbour = { index: number; order: number };
export type Adjacency = readonly Neighbour[][];

/** Neighbours in atom-index order, with the heavy atoms preceding implicit hydrogens. */
export function adjacency(structure: Pick<Structure, "atoms" | "bonds">): Adjacency {
  const neighbours: Neighbour[][] = structure.atoms.map(() => []);
  for (const { a, b, order } of structure.bonds) {
    neighbours[a]?.push({ index: b, order });
    neighbours[b]?.push({ index: a, order });
  }
  for (const list of neighbours) {
    list.sort((a, b) => a.index - b.index);
  }
  return neighbours;
}

/** Reads Cartesian coordinates for a valid atom index. */
export function positionAt(positions: Float64Array, index: number): Vec3 {
  const offset = 3 * index;
  const x = positions[offset];
  const y = positions[offset + 1];
  const z = positions[offset + 2];
  if (x === undefined || y === undefined || z === undefined) {
    throw new RangeError(`Invalid coordinate index ${index}`);
  }
  return [x, y, z];
}
