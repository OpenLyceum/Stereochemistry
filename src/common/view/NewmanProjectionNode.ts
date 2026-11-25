import { Multilink, type Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Color, KeyboardListener, Node, Path, PressListener, Rectangle, RichText } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import StereochemistryColors from "../../StereochemistryColors.js";
import {
  CONFORMATIONS_SCREEN_SETTINGS as ANGLE,
  STEREO_LAYOUT_SETTINGS as LAYOUT,
  NEWMAN_PROJECTION_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";
import { StereochemistryHotkeyData } from "../../StereochemistryHotkeyData.js";
import type { NewmanSubstituents } from "../model/ConformationEnergy.js";

function onCircle(degrees: number, radius: number): Vector2 {
  const angle = (degrees * Math.PI) / 180;
  return new Vector2(radius * Math.sin(angle), -radius * Math.cos(angle));
}

export class NewmanProjectionNode extends Node {
  private readonly disposeProjection: () => void;

  public constructor(substituentsProperty: TReadOnlyProperty<NewmanSubstituents>, phiProperty: Property<number>) {
    const manager = StringManager.getInstance();
    const strings = manager.getStereoStrings();
    const a11y = manager.getStereoA11yStrings();
    const backRadius = SETTINGS.RADIUS * SETTINGS.BACK_RADIUS_RATIO;
    const outline = new Circle(backRadius, {
      stroke: StereochemistryColors.textColorProperty,
      fill: StereochemistryColors.panelBackgroundColorProperty,
      lineWidth: SETTINGS.LINE_WIDTH,
    });
    const dot = new Circle(SETTINGS.FRONT_DOT_RADIUS, { fill: StereochemistryColors.textColorProperty });
    const zone = new Rectangle(
      -SETTINGS.HIT_RADIUS,
      -SETTINGS.HIT_RADIUS,
      2 * SETTINGS.HIT_RADIUS,
      2 * SETTINGS.HIT_RADIUS,
      { fill: Color.TRANSPARENT, cursor: "grab" },
    );
    const labelOptions = { font: new PhetFont(LAYOUT.FONT_SIZE) };
    const makeFace = (isBack: boolean) => {
      // Each tetrahedral carbon exposes three groups in the projection.
      const spokes = Array.from({ length: 3 }, () => ({
        path: new Path(null, { lineWidth: SETTINGS.LINE_WIDTH, lineCap: "round" }),
        labels: {
          CH3: new RichText(strings.methylFormulaStringProperty, {
            ...labelOptions,
            fill: StereochemistryColors.methylColorProperty,
          }),
          H: new RichText(strings.hydrogenFormulaStringProperty, {
            ...labelOptions,
            fill: StereochemistryColors.hydrogenColorProperty,
          }),
        },
      }));
      return {
        nodes: spokes.flatMap(({ path, labels }) => [path, labels.CH3, labels.H]),
        update: (groups: NewmanSubstituents["front"], phi: number, opposing: readonly number[]) => {
          spokes.forEach(({ path, labels }, index) => {
            const group = groups[index];
            if (!group) {
              return;
            }
            const degrees = group.angle + (isBack ? phi : 0);
            const inner = onCircle(degrees, isBack ? backRadius : 0);
            const outer = onCircle(degrees, SETTINGS.RADIUS);
            path.shape = Shape.lineSegment(inner.x, inner.y, outer.x, outer.y);
            path.stroke =
              group.class === "CH3"
                ? StereochemistryColors.methylColorProperty
                : StereochemistryColors.hydrogenColorProperty;
            const distance = Math.min(
              ...opposing.map((angle) =>
                Math.abs(
                  (Math.atan2(
                    Math.sin(((degrees - angle) * Math.PI) / 180),
                    Math.cos(((degrees - angle) * Math.PI) / 180),
                  ) *
                    180) /
                    Math.PI,
                ),
              ),
            );
            const offset = isBack
              ? 0
              : SETTINGS.ECLIPSED_FRONT_LABEL_OFFSET * Math.max(0, 1 - distance / SETTINGS.OVERLAP_ANGLE);
            labels.CH3.visible = group.class === "CH3";
            labels.H.visible = group.class === "H";
            labels[group.class].center = onCircle(degrees, SETTINGS.LABEL_RADIUS + offset);
          });
        },
      };
    };
    const back = makeFace(true);
    const front = makeFace(false);
    const children = [outline, ...back.nodes, ...front.nodes, dot, zone];
    super({
      children,
      tagName: "div",
      ariaRole: "application",
      focusable: true,
      accessibleName: strings.newmanStringProperty,
      accessibleHelpText: a11y.newmanHelpStringProperty,
    });

    const update = Multilink.multilink([substituentsProperty, phiProperty], (substituents, phi) => {
      back.update(substituents.back, phi, []);
      front.update(
        substituents.front,
        phi,
        substituents.back.map(({ angle }) => angle + phi),
      );
    });
    const change = (delta: number) => {
      const next = phiProperty.value + delta;
      const turn = ANGLE.MAX_PHI - ANGLE.MIN_PHI;
      phiProperty.value =
        next < ANGLE.MIN_PHI || next > ANGLE.MAX_PHI
          ? ANGLE.MIN_PHI + ((((next - ANGLE.MIN_PHI) % turn) + turn) % turn)
          : next;
    };
    const pointerAngle = (point: Vector2) => {
      const local = this.globalToLocalPoint(point);
      return local.magnitudeSquared === 0 ? null : Math.atan2(local.y, local.x);
    };
    let previous: number | null = null;
    const drag = new PressListener({
      attach: true,
      press: (event) => {
        previous = pointerAngle(event.pointer.point);
        zone.cursor = "grabbing";
        this.focus();
      },
      drag: (event) => {
        const angle = pointerAngle(event.pointer.point);
        if (angle !== null && previous !== null) {
          const delta = angle - previous;
          change((Math.atan2(Math.sin(delta), Math.cos(delta)) * 180) / Math.PI);
        }
        previous = angle;
      },
      release: () => {
        zone.cursor = "grab";
      },
    });
    const keyboard = new KeyboardListener({
      keyStringProperties: [
        ...StereochemistryHotkeyData.NEWMAN_SMALL.keyStringProperties,
        ...StereochemistryHotkeyData.NEWMAN_LARGE.keyStringProperties,
      ],
      fire: (_event, key) => {
        const direction = key.endsWith("arrowLeft") ? -1 : 1;
        change(direction * (key.startsWith("shift+") ? ANGLE.LARGE_ANGLE_STEP : ANGLE.SMALL_ANGLE_STEP));
      },
    });
    zone.addInputListener(drag);
    this.addInputListener(keyboard);
    this.disposeProjection = () => {
      update.dispose();
      zone.removeInputListener(drag);
      this.removeInputListener(keyboard);
      drag.dispose();
      keyboard.dispose();
      for (const child of children) {
        child.dispose();
      }
    };
  }

  public override dispose(): void {
    this.disposeProjection();
    super.dispose();
  }
}
