/** R/S practice state, including a shortest-arc animation for the lowest-priority bond. */
import { BooleanProperty, DerivedProperty, Property } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { cipRanks } from "../../common/model/CipRules.js";
import { buildMolecule } from "../../common/model/MoleculeBuilder.js";
import { positionAt } from "../../common/model/MoleculeGraph.js";
import { CHIRALITY_MOLECULES } from "../../common/model/MoleculeLibrary.js";
import { assignRS, findStereocentres } from "../../common/model/Stereocentres.js";
import { StereoViewModel } from "../../common/model/StereoViewModel.js";
import { normalize, subtract, type Vec3 } from "../../common/model/structure/Geometry.js";
import { Rotation3 } from "../../common/model/structure/Rotation3.js";
import { RS_SCREEN_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";

const DEFAULT = "2-butanol";
const AWAY: Vec3 = [0, 0, -1];
type MoleculeId = (typeof CHIRALITY_MOLECULES)[number]["id"];
type Answer = "R" | "S";

function buildPreset(id: MoleculeId) {
  const preset = CHIRALITY_MOLECULES.find((candidate) => candidate.id === id);
  if (!preset) {
    throw new Error("Missing R/S preset");
  }
  return buildMolecule(preset);
}

export class RSModel implements TModel {
  public readonly moleculeProperty = new Property<MoleculeId>(DEFAULT, {
    validValues: CHIRALITY_MOLECULES.map(({ id }) => id),
  });
  public readonly builtProperty = new DerivedProperty([this.moleculeProperty], buildPreset);
  public readonly stereocentresProperty = new DerivedProperty([this.builtProperty], ({ structure, positions }) =>
    findStereocentres(structure, positions),
  );
  public readonly centreProperty = new Property<number | null>(this.stereocentresProperty.value[0] ?? null);
  public readonly showPrioritiesProperty = new BooleanProperty(true);
  public readonly answerProperty = new Property<Answer | null>(null);
  public readonly stereoViewModel = new StereoViewModel(this.builtProperty.value, () =>
    Rotation3.aboutAxis([0, 1, 0], SETTINGS.INITIAL_TURN),
  );
  private readonly selectionProperty = new DerivedProperty(
    [this.builtProperty, this.centreProperty],
    ({ structure, positions }, centre) => {
      if (centre === null || centre >= structure.atoms.length) {
        return null;
      }
      const cip = cipRanks(structure, centre);
      const lowest = cip.order[3];
      if (cip.ties || lowest === undefined) {
        return null;
      }
      return {
        cip,
        configuration: assignRS(positions, centre, cip.order),
        direction: normalize(subtract(positionAt(positions, lowest), positionAt(positions, centre))),
      };
    },
  );
  public readonly cipProperty = new DerivedProperty([this.selectionProperty], (selection) => selection?.cip ?? null);
  public readonly configurationProperty = new DerivedProperty(
    [this.selectionProperty],
    (selection) => selection?.configuration ?? null,
  );
  public readonly feedbackProperty = new DerivedProperty(
    [this.answerProperty, this.configurationProperty],
    (answer, configuration) =>
      answer === null || configuration === null ? null : answer === configuration ? "correct" : "incorrect",
  );
  public readonly lowestDirectionProperty = new DerivedProperty(
    [this.selectionProperty, this.stereoViewModel.rotationProperty],
    (selection, rotation) => (selection ? rotation.apply(...selection.direction, [0, 0, 0]) : null),
  );
  public readonly lowestAwayProperty = new DerivedProperty(
    [this.lowestDirectionProperty],
    (direction) => direction !== null && direction[2] <= -Math.cos((SETTINGS.AWAY_ANGLE * Math.PI) / 180),
  );

  private animation: { start: Rotation3; end: Rotation3; elapsed: number } | null = null;
  private settingRotation = false;

  private readonly builtListener = () => {
    this.centreProperty.value = this.stereocentresProperty.value[0] ?? null;
    this.stereoViewModel.builtProperty.value = this.builtProperty.value;
    this.stereoViewModel.pickedAtomProperty.reset();
    this.stereoViewModel.hoveredAtomProperty.reset();
    this.stereoViewModel.resetView();
    this.answerProperty.reset();
    this.animation = null;
  };

  private readonly centreListener = () => {
    this.answerProperty.reset();
    this.animation = null;
  };

  private readonly pickListener = (index: number | null) => {
    if (index !== null && this.stereocentresProperty.value.includes(index)) {
      this.centreProperty.value = index;
    }
  };

  private readonly rotationListener = () => {
    if (!this.settingRotation) {
      this.animation = null;
    }
  };

  public constructor() {
    this.builtProperty.lazyLink(this.builtListener);
    this.centreProperty.lazyLink(this.centreListener);
    this.stereoViewModel.pickedAtomProperty.lazyLink(this.pickListener);
    this.stereoViewModel.rotationProperty.lazyLink(this.rotationListener);
  }

  /** Turn priority 4 directly away without adding a roll about the bond. */
  public orientLowestAway(): void {
    const direction = this.lowestDirectionProperty.value;
    if (direction) {
      const start = this.stereoViewModel.rotationProperty.value;
      this.animation = { start, end: Rotation3.between(direction, AWAY).times(start), elapsed: 0 };
    }
  }

  public step(dt: number): void {
    const animation = this.animation;
    if (animation) {
      animation.elapsed += dt;
      const progress = Math.min(1, animation.elapsed / SETTINGS.ORIENT_DURATION);
      this.settingRotation = true;
      this.stereoViewModel.rotationProperty.value = animation.start.slerp(animation.end, progress);
      this.settingRotation = false;
      if (progress === 1) {
        this.animation = null;
      }
    }
  }

  public reset(): void {
    this.moleculeProperty.reset();
    this.builtListener();
    this.showPrioritiesProperty.reset();
  }

  public dispose(): void {
    this.builtProperty.unlink(this.builtListener);
    this.centreProperty.unlink(this.centreListener);
    this.stereoViewModel.pickedAtomProperty.unlink(this.pickListener);
    this.stereoViewModel.rotationProperty.unlink(this.rotationListener);
    this.lowestAwayProperty.dispose();
    this.lowestDirectionProperty.dispose();
    this.feedbackProperty.dispose();
    this.configurationProperty.dispose();
    this.cipProperty.dispose();
    this.selectionProperty.dispose();
    this.stereoViewModel.dispose();
    this.answerProperty.dispose();
    this.showPrioritiesProperty.dispose();
    this.centreProperty.dispose();
    this.stereocentresProperty.dispose();
    this.builtProperty.dispose();
    this.moleculeProperty.dispose();
  }
}
