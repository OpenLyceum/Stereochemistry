/** CIP sequence rule 1a for the explicit molecular graph. */

import { type Adjacency, adjacency } from "./MoleculeGraph.js";
import type { Structure } from "./structure/Structure.js";

type CipTraceStep = {
  /** Sphere 1 contains the neighbours directly bonded to the centre. */
  sphere: number;
  /** Atom index of the direct ligand that owns these sets. */
  branch: number;
  /** One descending atomic-number multiset per parent, in priority order. */
  sets: number[][];
};
type CipResult = { order: number[]; ties: boolean; trace: CipTraceStep[] };

type DigraphNode = { atomicNumber: number; children: DigraphNode[] };

const PHANTOM: DigraphNode = { atomicNumber: 0, children: [] };

function compareNumbers(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

/** Compare substituent sets in parent-priority order before moving to the next sphere. */
function compareDigraphs(a: DigraphNode, b: DigraphNode): number {
  const atomicDifference = a.atomicNumber - b.atomicNumber;
  if (atomicDifference !== 0) {
    return atomicDifference;
  }

  let left = [a];
  let right = [b];
  while (left.length > 0 || right.length > 0) {
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
      const leftSet = left[i]?.children.map((node) => node.atomicNumber) ?? [];
      const rightSet = right[i]?.children.map((node) => node.atomicNumber) ?? [];
      const difference = compareNumbers(leftSet, rightSet);
      if (difference !== 0) {
        return difference;
      }
    }
    // Missing substituents compare as Z = 0. Once compared, neither missing
    // substituents nor their explicit phantom equivalents have descendants.
    left = left.flatMap((node) => node.children.filter((child) => child !== PHANTOM));
    right = right.flatMap((node) => node.children.filter((child) => child !== PHANTOM));
  }
  return 0;
}

function expand(structure: Structure, graph: Adjacency, atom: number, path: readonly number[]): DigraphNode {
  const atomicNumber = structure.atoms[atom]?.element.number ?? 0;
  const parent = path.at(-1);
  const children: DigraphNode[] = [];
  for (const { index, order } of graph[atom] ?? []) {
    const number = structure.atoms[index]?.element.number ?? 0;
    for (let duplicate = 1; duplicate < order; duplicate++) {
      children.push({ atomicNumber: number, children: [PHANTOM, PHANTOM, PHANTOM] });
    }
    if (!path.includes(index)) {
      children.push(expand(structure, graph, index, [...path, atom]));
    } else if (index !== parent) {
      // Close a ring with a terminal duplicate rather than revisiting the atom.
      children.push({ atomicNumber: number, children: [PHANTOM, PHANTOM, PHANTOM] });
    }
  }
  children.sort((a, b) => compareDigraphs(b, a));
  return { atomicNumber, children };
}

/** Rank direct ligands and record their ordered atomic-number sets sphere by sphere. */
export function cipRanks(structure: Structure, centre: number): CipResult {
  const graph = adjacency(structure);
  const branches = (graph[centre] ?? []).map(({ index }) => ({
    index,
    root: expand(structure, graph, index, [centre]),
  }));
  branches.sort((a, b) => compareDigraphs(b.root, a.root));
  const ties = branches.some((branch, i) => {
    const previous = branches[i - 1];
    return previous !== undefined && compareDigraphs(previous.root, branch.root) === 0;
  });

  const trace: CipTraceStep[] = branches.map(({ index, root }) => ({
    sphere: 1,
    branch: index,
    sets: [[root.atomicNumber]],
  }));
  let layer = branches.map(({ root }) => [root]);
  for (let sphere = 2; layer.some((nodes) => nodes.length > 0); sphere++) {
    layer.forEach((nodes, rank) => {
      const branch = branches[rank];
      const sets = nodes.map((node) => node.children.map((child) => child.atomicNumber));
      if (branch && sets.some((set) => set.length > 0)) {
        trace.push({ sphere, branch: branch.index, sets });
      }
    });
    layer = layer.map((nodes) => nodes.flatMap((node) => node.children));
  }
  return { order: branches.map(({ index }) => index), ties, trace };
}
