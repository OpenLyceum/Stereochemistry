import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { STEREO_VIEWER_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";
import type { BuiltMolecule } from "./MoleculeGraph.js";
import type { Vec3 } from "./structure/Geometry.js";
import { Rotation3 } from "./structure/Rotation3.js";

export class StereoViewModel {
  public readonly rotationProperty: Property<Rotation3>;
  public readonly zoomProperty: NumberProperty;
  public readonly hoveredAtomProperty = new Property<number | null>(null);
  public readonly pickedAtomProperty = new Property<number | null>(null);
  public readonly builtProperty: Property<BuiltMolecule>;
  public readonly haloAtomsProperty = new Property<readonly number[]>([]);
  public readonly labelsProperty = new Property<ReadonlyMap<number, string>>(new Map());
  public readonly showTetrahedronProperty = new BooleanProperty(false);

  private readonly defaultRotation: (built: BuiltMolecule) => Rotation3;

  public constructor(
    built: BuiltMolecule,
    defaultRotation: (built: BuiltMolecule) => Rotation3 = () => Rotation3.IDENTITY,
    initialRotation = defaultRotation(built),
    initialZoom: number = SETTINGS.DEFAULT_ZOOM,
  ) {
    this.defaultRotation = defaultRotation;
    this.zoomProperty = new NumberProperty(initialZoom);
    this.builtProperty = new Property(built);
    this.rotationProperty = new Property(initialRotation);
  }

  public rotate(axis: Vec3, degrees: number): void {
    this.rotationProperty.value = this.rotationProperty.value.rotatedAboutScreenAxis(axis, degrees);
  }

  public zoomBy(factor: number): void {
    this.zoomProperty.value = Math.min(
      SETTINGS.MAX_ZOOM,
      Math.max(SETTINGS.MIN_ZOOM, this.zoomProperty.value * factor),
    );
  }

  public resetView(rotation = this.defaultRotation(this.builtProperty.value)): void {
    this.rotationProperty.value = rotation;
    this.zoomProperty.reset();
  }

  public reset(): void {
    this.resetView();
    this.hoveredAtomProperty.reset();
    this.pickedAtomProperty.reset();
    this.builtProperty.reset();
    this.haloAtomsProperty.reset();
    this.labelsProperty.reset();
    this.showTetrahedronProperty.reset();
  }

  public dispose(): void {
    this.rotationProperty.dispose();
    this.zoomProperty.dispose();
    this.hoveredAtomProperty.dispose();
    this.pickedAtomProperty.dispose();
    this.builtProperty.dispose();
    this.haloAtomsProperty.dispose();
    this.labelsProperty.dispose();
    this.showTetrahedronProperty.dispose();
  }
}
