import { BooleanProperty, DerivedProperty, Emitter, Multilink, NumberProperty, Property } from "scenerystack/axon";
import { Range, Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  buildCyclohexane,
  chairStrain,
  cisTrans,
  diaxialPartners,
  equilibrium,
  type RingSubstituent,
  ringEnergy,
  slotIndex,
} from "../../common/model/Cyclohexane.js";
import { CYCLOHEXANE_LIBRARY } from "../../common/model/MoleculeLibrary.js";
import { StereoViewModel } from "../../common/model/StereoViewModel.js";
import { Rotation3 } from "../../common/model/structure/Rotation3.js";
import { CYCLOHEXANE_SCREEN_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";

const DEFAULT_PRESET = "methylcyclohexane";
type PresetId = (typeof CYCLOHEXANE_LIBRARY)[number]["id"] | "custom";

function presetSubstituents(preset: PresetId): readonly RingSubstituent[] {
  return CYCLOHEXANE_LIBRARY.find(({ id }) => id === preset)?.subs ?? [];
}

export class CyclohexaneModel implements TModel {
  public readonly presetProperty = new Property<PresetId>(DEFAULT_PRESET, {
    validValues: [...CYCLOHEXANE_LIBRARY.map(({ id }) => id), "custom"],
  });
  public readonly substituentsProperty = new Property<readonly RingSubstituent[]>(presetSubstituents(DEFAULT_PRESET));
  public readonly flipProperty = new NumberProperty(0, { range: new Range(0, 1) });
  public readonly flippingProperty = new BooleanProperty(false);
  public readonly flipCompletedEmitter = new Emitter();
  public readonly showBondTypesProperty = new BooleanProperty(true);
  public readonly showDiaxialProperty = new BooleanProperty(false);
  public readonly ringProperty = new DerivedProperty([this.substituentsProperty, this.flipProperty], buildCyclohexane);
  public readonly strainProperty = new DerivedProperty([this.substituentsProperty], (subs) => ({
    A: chairStrain(subs, "A"),
    B: chairStrain(subs, "B"),
  }));
  public readonly equilibriumProperty = new DerivedProperty([this.substituentsProperty], (subs) => equilibrium(subs));
  public readonly cisTransProperty = new DerivedProperty([this.substituentsProperty], cisTrans);
  public readonly energyProperty = new DerivedProperty(
    [this.strainProperty, this.flipProperty],
    ({ A, B }, s) => ringEnergy(s) + (1 - s) * A + s * B,
  );
  public readonly curveProperty = new DerivedProperty([this.strainProperty], ({ A, B }) =>
    Array.from({ length: SETTINGS.CURVE_SAMPLES }, (_, index) => {
      const s = index / (SETTINGS.CURVE_SAMPLES - 1);
      return new Vector2(s, ringEnergy(s) + (1 - s) * A + s * B);
    }),
  );
  public readonly stereoViewModel = new StereoViewModel(this.ringProperty.value, () =>
    // The ring mean plane is xy, with C1–C4 along x in that plane.
    new Rotation3([1, 0, 0, 0, 0, 1, 0, -1, 0]).rotatedAboutScreenAxis([1, 0, 0], SETTINGS.VIEW_TILT),
  );
  private target = 0;

  private readonly displayLink = Multilink.multilink(
    [this.ringProperty, this.showDiaxialProperty],
    (ring, showDiaxial) => {
      this.stereoViewModel.builtProperty.value = ring;
      const slots = new Set<number>();
      if (showDiaxial) {
        for (const [slot, atom] of ring.slotAtoms.entries()) {
          if (ring.structure.atoms[atom]?.element.symbol !== "H" && ring.axial[slot]) {
            slots.add(slot);
            for (const partner of diaxialPartners(slot)) {
              slots.add(partner);
            }
          }
        }
      }
      this.stereoViewModel.haloAtomsProperty.value = [...slots].flatMap((slot) => ring.slotAtoms[slot] ?? []);
    },
  );

  private readonly presetListener = (preset: PresetId) => {
    if (preset !== "custom") {
      this.flippingProperty.value = false;
      this.flipProperty.reset();
      this.substituentsProperty.value = presetSubstituents(preset);
    }
  };

  public constructor() {
    this.presetProperty.lazyLink(this.presetListener);
  }

  public editSubstituent({ carbon, face, group }: RingSubstituent): void {
    slotIndex(carbon, face);
    const remaining = this.substituentsProperty.value.filter((sub) => sub.carbon !== carbon || sub.face !== face);
    this.substituentsProperty.value = group === "H" ? remaining : [...remaining, { carbon, face, group }];
    this.presetProperty.value = "custom";
  }

  public startFlip(): void {
    this.target = this.flippingProperty.value ? 1 - this.target : this.flipProperty.value < 0.5 ? 1 : 0;
    this.flippingProperty.value = true;
  }

  public step(dt: number): void {
    if (!this.flippingProperty.value) {
      return;
    }
    const s = this.flipProperty.value;
    const distance = this.target - s;
    const increment = dt / SETTINGS.FLIP_DURATION;
    if (Math.abs(distance) <= increment) {
      this.flipProperty.value = this.target;
      this.flippingProperty.value = false;
      this.flipCompletedEmitter.emit();
    } else {
      this.flipProperty.value = s + Math.sign(distance) * increment;
    }
  }

  public reset(): void {
    this.flippingProperty.reset();
    this.presetProperty.reset();
    this.flipProperty.reset();
    this.substituentsProperty.reset();
    this.showBondTypesProperty.reset();
    this.showDiaxialProperty.reset();
    this.stereoViewModel.reset();
  }

  public dispose(): void {
    this.presetProperty.unlink(this.presetListener);
    this.displayLink.dispose();
    this.stereoViewModel.dispose();
    this.curveProperty.dispose();
    this.energyProperty.dispose();
    this.cisTransProperty.dispose();
    this.equilibriumProperty.dispose();
    this.strainProperty.dispose();
    this.ringProperty.dispose();
    this.showDiaxialProperty.dispose();
    this.showBondTypesProperty.dispose();
    this.flipCompletedEmitter.dispose();
    this.flippingProperty.dispose();
    this.flipProperty.dispose();
    this.substituentsProperty.dispose();
    this.presetProperty.dispose();
  }
}
