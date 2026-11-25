import { BooleanProperty, DerivedProperty, Multilink, NumberProperty, Property } from "scenerystack/axon";
import { Range, Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  boltzmannPopulations,
  energyAt,
  energyCurve,
  namedConformation,
  newmanFromBuilt,
} from "../../common/model/ConformationEnergy.js";
import { buildMolecule } from "../../common/model/MoleculeBuilder.js";
import { adjacency, type BuiltMolecule, positionAt } from "../../common/model/MoleculeGraph.js";
import { MOLECULE_LIBRARY } from "../../common/model/MoleculeLibrary.js";
import { StereoViewModel } from "../../common/model/StereoViewModel.js";
import { cross, normalize, subtract, type Vec3 } from "../../common/model/structure/Geometry.js";
import { Rotation3 } from "../../common/model/structure/Rotation3.js";
import {
  CONFORMATION_ENERGY_SETTINGS,
  CONFORMATIONS_SCREEN_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";

const MOLECULES = MOLECULE_LIBRARY.filter((entry) => entry.family === "conformations");
type Molecule = (typeof MOLECULES)[number];

function conformationData(spec: Molecule) {
  const base = buildMolecule(spec);
  const { frontAtom, backAtom } = spec;
  const graph = adjacency(base.structure);
  const frontRef = graph[frontAtom]?.find(({ index }) => index !== backAtom);
  const backRef = graph[backAtom]?.find(({ index }) => index !== frontAtom);
  if (!(frontRef && backRef)) {
    throw new Error("The bond needs a reference substituent on both carbons");
  }

  const atoms = [frontRef.index, frontAtom, backAtom, backRef.index] as const;
  const at = (index: number) => positionAt(base.positions, index);
  const front = at(frontAtom);
  const back = at(backAtom);
  const z = normalize(subtract(front, back));
  const x = normalize(cross(subtract(at(frontRef.index), front), z));
  const y = cross(z, x);
  const rotation = new Rotation3([...x, ...y, ...z]);
  const newman = newmanFromBuilt(base, frontAtom, backAtom);
  // Shorter alkanes have an implicit hydrogen in the reference torsion. Rotate
  // the entire back branch rigidly about the bond to preserve its local geometry.
  const backBranch = new Set([backAtom]);
  for (const atom of backBranch) {
    for (const { index } of graph[atom] ?? []) {
      if (index !== frontAtom) {
        backBranch.add(index);
      }
    }
  }
  return { spec, base, atoms, back, backBranch, rotation, newman };
}

function buildAtPhi(data: ReturnType<typeof conformationData>, phi: number): BuiltMolecule {
  if (data.spec.id === "butane") {
    return buildMolecule({ ...data.spec, torsions: [{ atoms: data.atoms, degrees: phi }] });
  }
  const { base, back, backBranch, atoms, newman } = data;
  const axis = normalize(subtract(back, positionAt(base.positions, atoms[1])));
  const rotation = Rotation3.aboutAxis(axis, phi - newman.phiDeg);
  const positions = base.positions.slice();
  const out: Vec3 = [0, 0, 0];
  for (const index of backBranch) {
    const [x, y, z] = subtract(positionAt(base.positions, index), back);
    rotation.apply(x, y, z, out);
    positions.set([out[0] + back[0], out[1] + back[1], out[2] + back[2]], 3 * index);
  }
  return { ...base, positions };
}

export class ConformationsModel implements TModel {
  public readonly moleculeProperty = new Property<Molecule["id"]>("butane", {
    validValues: MOLECULES.map(({ id }) => id),
  });
  public readonly phiProperty = new NumberProperty(CONFORMATION_ENERGY_SETTINGS.DEFAULT_PHI, {
    range: new Range(SETTINGS.MIN_PHI, SETTINGS.MAX_PHI),
  });
  public readonly animatingProperty = new BooleanProperty(false);
  public readonly temperatureProperty = new NumberProperty(SETTINGS.DEFAULT_TEMPERATURE, {
    range: new Range(SETTINGS.MIN_TEMPERATURE, SETTINGS.MAX_TEMPERATURE),
  });
  private readonly specProperty = new DerivedProperty([this.moleculeProperty], (id) => {
    const spec = MOLECULES.find((entry) => entry.id === id);
    if (!spec) {
      throw new Error("Unknown conformation molecule");
    }
    return spec;
  });
  private readonly dataProperty = new DerivedProperty([this.specProperty], conformationData);
  public readonly newmanProperty = new DerivedProperty([this.dataProperty], ({ newman }) => newman);
  public readonly measurementProperty = new DerivedProperty([this.dataProperty], ({ atoms }) => [{ atoms }]);
  public readonly energyProperty = new DerivedProperty([this.newmanProperty, this.phiProperty], energyAt);
  public readonly conformationNameProperty = new DerivedProperty(
    [this.phiProperty, this.newmanProperty],
    namedConformation,
  );
  public readonly curveProperty = new DerivedProperty([this.newmanProperty], (newman) =>
    energyCurve(newman)
      .map(
        ({ phiDeg, energy }) =>
          new Vector2(phiDeg > SETTINGS.MAX_PHI ? phiDeg - (SETTINGS.MAX_PHI - SETTINGS.MIN_PHI) : phiDeg, energy),
      )
      .slice(0, -1)
      .concat(new Vector2(SETTINGS.MIN_PHI, energyAt(newman, SETTINGS.MIN_PHI)))
      .sort((a, b) => a.x - b.x),
  );
  public readonly populationsProperty = new DerivedProperty(
    [this.newmanProperty, this.temperatureProperty],
    (newman, temperature) =>
      boltzmannPopulations(
        {
          anti: energyAt(newman, SETTINGS.MAX_PHI),
          gaucheLeft: energyAt(newman, -SETTINGS.LARGE_ANGLE_STEP),
          gaucheRight: energyAt(newman, SETTINGS.LARGE_ANGLE_STEP),
        },
        temperature,
      ),
  );
  public readonly stereoViewModel = new StereoViewModel(
    buildAtPhi(this.dataProperty.value, this.phiProperty.value),
    () => this.dataProperty.value.rotation.rotatedAboutScreenAxis([1, 0, 0], SETTINGS.DEFAULT_VIEW_TILT),
    this.dataProperty.value.rotation,
    SETTINGS.VIEWER_ZOOM,
  );
  private readonly geometryLink = Multilink.lazyMultilink([this.dataProperty, this.phiProperty], (data, phi) => {
    this.stereoViewModel.builtProperty.value = buildAtPhi(data, phi);
  });
  private readonly moleculeListener = () => {
    this.phiProperty.value = this.specProperty.value.defaultPhi;
    this.stereoViewModel.pickedAtomProperty.reset();
    this.stereoViewModel.hoveredAtomProperty.reset();
    // Seed the camera from the same end-on frame that defines the Newman projection.
    this.stereoViewModel.resetView(this.dataProperty.value.rotation);
  };

  public constructor() {
    this.moleculeProperty.lazyLink(this.moleculeListener);
  }

  public step(dt: number): void {
    if (this.animatingProperty.value) {
      const phi = this.phiProperty.value + dt * SETTINGS.DEGREES_PER_SECOND;
      const turn = SETTINGS.MAX_PHI - SETTINGS.MIN_PHI;
      this.phiProperty.value = phi <= SETTINGS.MAX_PHI ? phi : SETTINGS.MIN_PHI + ((phi - SETTINGS.MIN_PHI) % turn);
    }
  }

  public reset(): void {
    this.animatingProperty.reset();
    this.moleculeProperty.reset();
    this.phiProperty.reset();
    this.temperatureProperty.reset();
    this.stereoViewModel.reset();
  }

  public dispose(): void {
    this.moleculeProperty.unlink(this.moleculeListener);
    this.geometryLink.dispose();
    this.stereoViewModel.dispose();
    this.populationsProperty.dispose();
    this.curveProperty.dispose();
    this.conformationNameProperty.dispose();
    this.energyProperty.dispose();
    this.measurementProperty.dispose();
    this.newmanProperty.dispose();
    this.dataProperty.dispose();
    this.specProperty.dispose();
    this.temperatureProperty.dispose();
    this.animatingProperty.dispose();
    this.phiProperty.dispose();
    this.moleculeProperty.dispose();
  }
}
