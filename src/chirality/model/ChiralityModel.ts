/** Couples a molecule to its reflection and compares their absolute configurations. */
import { BooleanProperty, DerivedProperty, Multilink, NumberProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { cipRanks } from "../../common/model/CipRules.js";
import { buildMolecule, mirror, withPositions } from "../../common/model/MoleculeBuilder.js";
import { adjacency, type BuiltMolecule, positionAt } from "../../common/model/MoleculeGraph.js";
import { CHIRALITY_MOLECULES } from "../../common/model/MoleculeLibrary.js";
import { descriptors, isChiral, kabschAlign, mirrorAtomPermutation } from "../../common/model/Stereocentres.js";
import { StereoViewModel } from "../../common/model/StereoViewModel.js";
import { separatedLigandRotation } from "../../common/model/separatedLigandRotation.js";
import { distance, normalize, subtract, type Vec3 } from "../../common/model/structure/Geometry.js";
import { Rotation3 } from "../../common/model/structure/Rotation3.js";
import { CHIRALITY_SCREEN_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";

const DEFAULT = "bromochlorofluoromethane";
type Preset = (typeof CHIRALITY_MOLECULES)[number];

function centered(built: BuiltMolecule): BuiltMolecule {
  const centre: Vec3 = [0, 0, 0];
  for (const [index] of built.structure.atoms.entries()) {
    const [x, y, z] = positionAt(built.positions, index);
    centre[0] += x / built.structure.atoms.length;
    centre[1] += y / built.structure.atoms.length;
    centre[2] += z / built.structure.atoms.length;
  }
  return withPositions(
    built,
    built.positions.map((value, i) => value - (centre[i % 3] ?? 0)),
  );
}

function comparison(built: BuiltMolecule, reflected: BuiltMolecule) {
  const centres = descriptors(built);
  const stereoHydrogens = new Set(
    [...centres.keys()].flatMap((centre) =>
      cipRanks(built.structure, centre).order.filter((index) => built.structure.atoms[index]?.element.symbol === "H"),
    ),
  );
  const indices = built.structure.atoms.flatMap(({ element }, index) =>
    element.symbol !== "H" || stereoHydrogens.has(index) ? [index] : [],
  );
  const fits = new Map<string, ReturnType<typeof kabschAlign>>();
  const fitPermutation = (permutation: readonly number[]) => {
    // Permutations of hydrogens outside the fit have identical scores.
    const key = indices.map((index) => permutation[index]).join(",");
    let cached = fits.get(key);
    if (!cached) {
      const moving = new Float64Array(reflected.positions.length);
      for (const index of indices) {
        moving.set(positionAt(reflected.positions, permutation[index] ?? index), 3 * index);
      }
      cached = kabschAlign(moving, built.positions, indices);
      fits.set(key, cached);
    }
    return cached;
  };
  const counterparts = mirrorAtomPermutation(built, reflected, (permutation) => fitPermutation(permutation).rmsd);
  const fit = counterparts ? fitPermutation(counterparts) : kabschAlign(reflected.positions, built.positions, indices);
  const rotation = new Rotation3(fit.rotation);
  const [tx, ty, tz] = fit.translation;
  const residualAtoms = built.structure.atoms.flatMap((_, index) => {
    const movingIndex = counterparts?.[index] ?? index;
    const point = rotation.apply(...positionAt(reflected.positions, movingIndex), [0, 0, 0]);
    const residual = distance([point[0] + tx, point[1] + ty, point[2] + tz], positionAt(built.positions, index));
    return residual > SETTINGS.RESIDUAL_THRESHOLD ? [movingIndex] : [];
  });
  return { rotation, translation: fit.translation, residualAtoms, rmsd: fit.rmsd };
}

export class ChiralityModel implements TModel {
  public readonly moleculeProperty = new Property<Preset["id"]>(DEFAULT, {
    validValues: CHIRALITY_MOLECULES.map(({ id }) => id),
  });
  public readonly builtProperty = new Property(centered(buildMolecule(this.getPreset())));
  public readonly reflectedProperty = new DerivedProperty([this.builtProperty], mirror);
  public readonly descriptorProperty = new DerivedProperty([this.builtProperty], descriptors);
  public readonly isChiralProperty = new DerivedProperty([this.builtProperty], isChiral);
  public readonly stereocentreCountProperty = new DerivedProperty([this.descriptorProperty], (labels) => labels.size);
  public readonly superimposeProgressProperty = new NumberProperty(0, { range: new Range(0, 1) });
  public readonly showStereocentresProperty = new BooleanProperty(false);
  public readonly showMirrorProperty = new BooleanProperty(true);
  public readonly completedProperty = new DerivedProperty(
    [this.superimposeProgressProperty],
    (progress) => progress === 1,
  );
  public readonly originalView = new StereoViewModel(this.builtProperty.value, separatedLigandRotation);
  public readonly mirrorView = new StereoViewModel(this.reflectedProperty.value);
  public readonly alignmentRmsdProperty = new Property<number | null>(null);
  private fit: ReturnType<typeof comparison> | null = null;

  private readonly presetListener = () => {
    this.separate();
    this.builtProperty.value = centered(buildMolecule(this.getPreset()));
    this.originalView.pickedAtomProperty.reset();
    this.originalView.hoveredAtomProperty.reset();
    this.originalView.resetView();
  };

  private readonly mirrorVisibilityListener = (visible: boolean) => {
    if (!visible) {
      this.separate();
    }
  };

  private readonly displayLink = Multilink.multilink(
    [this.builtProperty, this.descriptorProperty, this.showStereocentresProperty],
    (built, labels, show) => {
      this.originalView.builtProperty.value = built;
      const indices = show ? [...labels.keys()] : [];
      this.originalView.haloAtomsProperty.value = indices;
    },
  );

  private readonly mirrorLink = Multilink.multilink(
    [
      this.reflectedProperty,
      this.originalView.rotationProperty,
      this.originalView.zoomProperty,
      this.superimposeProgressProperty,
      this.showStereocentresProperty,
      this.descriptorProperty,
    ],
    (reflected, originalRotation, zoom, progress, show, labels) => {
      const conjugate = originalRotation.reflectedAcrossX();
      this.mirrorView.zoomProperty.value = zoom;
      const indices = show ? [...labels.keys()] : [];
      this.mirrorView.haloAtomsProperty.value = [
        ...new Set([
          ...indices,
          ...(progress === 1 && this.isChiralProperty.value ? (this.fit?.residualAtoms ?? []) : []),
        ]),
      ];
      if (this.fit && progress > 0) {
        // Compose the fit with the original camera at the destination. The screen
        // translation follows the same camera, so dragging still rotates the pair.
        const rotation = conjugate.slerp(originalRotation.times(this.fit.rotation), progress);
        const [tx, ty, tz] = this.fit.translation;
        const offset = originalRotation.apply(tx * progress, ty * progress, tz * progress, [0, 0, 0]);
        const positions = new Float64Array(reflected.positions.length);
        for (const [index] of reflected.structure.atoms.entries()) {
          const [x, y, z] = rotation.apply(...positionAt(reflected.positions, index), [0, 0, 0]);
          positions.set([x + offset[0], y + offset[1], z + offset[2]], 3 * index);
        }
        this.mirrorView.rotationProperty.value = Rotation3.IDENTITY;
        this.mirrorView.builtProperty.value = withPositions(reflected, positions);
      } else {
        this.mirrorView.rotationProperty.value = conjugate;
        this.mirrorView.builtProperty.value = reflected;
      }
    },
  );

  public constructor() {
    this.moleculeProperty.lazyLink(this.presetListener);
    this.showMirrorProperty.lazyLink(this.mirrorVisibilityListener);
  }

  private getPreset(): Preset {
    const preset = CHIRALITY_MOLECULES.find(({ id }) => id === this.moleculeProperty.value);
    if (!preset) {
      throw new Error("Missing chirality preset");
    }
    return preset;
  }

  /** Rotate each acyclic branch rigidly into the other's bond direction. */
  private exchangeBranches(centre: number, first: number, second: number): void {
    const built = this.builtProperty.value;
    const graph = adjacency(built.structure);
    const origin = positionAt(built.positions, centre);
    const positions = built.positions.slice();
    const direction = (atom: number) => normalize(subtract(positionAt(built.positions, atom), origin));
    for (const [from, to] of [
      [first, second],
      [second, first],
    ] as const) {
      const rotation = Rotation3.between(direction(from), direction(to));
      const branch = new Set([centre, from]);
      for (const atom of branch) {
        if (atom !== centre) {
          const [x, y, z] = rotation.apply(...subtract(positionAt(built.positions, atom), origin), [0, 0, 0]);
          positions.set([x + origin[0], y + origin[1], z + origin[2]], 3 * atom);
          for (const { index } of graph[atom] ?? []) {
            branch.add(index);
          }
        }
      }
    }
    this.builtProperty.value = centered(withPositions(built, positions));
  }

  /** Swap the first two non-H ligands in CIP order, with the lowest ligand as fallback. */
  public swapGroups(centre: number): void {
    if (!this.descriptorProperty.value.has(centre)) {
      return;
    }
    const { structure } = this.builtProperty.value;
    const { order } = cipRanks(structure, centre);
    const [first, second] = order.filter((index) => structure.atoms[index]?.element.symbol !== "H");
    const other = second ?? order.at(-1);
    if (first !== undefined && other !== undefined) {
      this.separate();
      this.exchangeBranches(centre, first, other);
    }
  }

  /** Fit the current reflection and start moving it toward the original. */
  public superimpose(): void {
    this.showMirrorProperty.value = true;
    this.superimposeProgressProperty.reset();
    this.fit = comparison(this.builtProperty.value, this.reflectedProperty.value);
    this.alignmentRmsdProperty.value = this.fit.rmsd;
  }

  public separate(): void {
    this.fit = null;
    this.superimposeProgressProperty.reset();
    this.alignmentRmsdProperty.reset();
  }

  public step(dt: number): void {
    if (this.fit && !this.completedProperty.value) {
      this.superimposeProgressProperty.value = Math.min(
        1,
        this.superimposeProgressProperty.value + dt / SETTINGS.SUPERIMPOSE_DURATION,
      );
    }
  }

  public reset(): void {
    this.moleculeProperty.reset();
    this.presetListener();
    this.showStereocentresProperty.reset();
    this.showMirrorProperty.reset();
  }

  public dispose(): void {
    this.mirrorLink.dispose();
    this.displayLink.dispose();
    this.moleculeProperty.unlink(this.presetListener);
    this.showMirrorProperty.unlink(this.mirrorVisibilityListener);
    this.originalView.dispose();
    this.mirrorView.dispose();
    this.alignmentRmsdProperty.dispose();
    this.completedProperty.dispose();
    this.superimposeProgressProperty.dispose();
    this.showStereocentresProperty.dispose();
    this.showMirrorProperty.dispose();
    this.stereocentreCountProperty.dispose();
    this.isChiralProperty.dispose();
    this.descriptorProperty.dispose();
    this.reflectedProperty.dispose();
    this.builtProperty.dispose();
    this.moleculeProperty.dispose();
  }
}
