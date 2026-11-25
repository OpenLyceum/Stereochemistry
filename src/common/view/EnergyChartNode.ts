import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { ChartRectangle, ChartTransform, GridLineSet, LinePlot, TickLabelSet } from "scenerystack/bamboo";
import { clamp, Range, toFixed, type Vector2 } from "scenerystack/dot";
import { Orientation } from "scenerystack/phet-core";
import { Circle, Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import StereochemistryColors from "../../StereochemistryColors.js";
import { STEREO_LAYOUT_SETTINGS as SETTINGS } from "../../StereochemistryConstants.js";

type NamedPoint = { x: number; label: TReadOnlyProperty<string> };
type EnergyChartOptions = {
  width: number;
  xRange: Range;
  yRange: Range;
  xTick: number;
  yTick: number;
  xLabel: TReadOnlyProperty<string>;
  yLabel: TReadOnlyProperty<string>;
  curveProperty: TReadOnlyProperty<Vector2[]>;
  markerXProperty: TReadOnlyProperty<number>;
  markerEnergyProperty?: TReadOnlyProperty<number>;
  namedPoints: readonly NamedPoint[];
  expandYRange?: boolean;
  showMarker?: boolean;
};

function sample(curve: Vector2[], x: number): number {
  const i = curve.findIndex((point) => point.x >= x);
  const upper = curve[i];
  const lower = curve[i - 1];
  if (upper && lower) {
    return lower.y + ((upper.y - lower.y) * (x - lower.x)) / (upper.x - lower.x);
  }
  return upper?.y ?? curve.at(-1)?.y ?? 0;
}

export class EnergyChartNode extends Node {
  private readonly disposeChart: () => void;

  public constructor(options: EnergyChartOptions) {
    const height = SETTINGS.CHART_HEIGHT;
    const { width } = options;
    const transform = new ChartTransform({
      viewWidth: width,
      viewHeight: height,
      modelXRange: options.xRange,
      modelYRange: options.yRange,
    });
    const colors = StereochemistryColors;
    const tickOptions = { font: new PhetFont(SETTINGS.SMALL_FONT_SIZE), fill: colors.textColorProperty };
    const labelOptions = { font: new PhetFont(SETTINGS.FONT_SIZE), fill: colors.textColorProperty };
    const background = new ChartRectangle(transform, {
      fill: colors.panelBackgroundColorProperty,
      stroke: colors.gridColorProperty,
    });
    const gridOptions = { stroke: colors.gridColorProperty };
    const vertical = new GridLineSet(transform, Orientation.HORIZONTAL, options.xTick, gridOptions);
    const horizontal = new GridLineSet(transform, Orientation.VERTICAL, options.yTick, gridOptions);
    const tickLabelOptions = {
      edge: "min" as const,
      createLabel: (value: number) => new Text(String(value), tickOptions),
    };
    const xTicks = new TickLabelSet(transform, Orientation.HORIZONTAL, options.xTick, tickLabelOptions);
    const yTicks = new TickLabelSet(transform, Orientation.VERTICAL, options.yTick, tickLabelOptions);
    const xLabel = new Text(options.xLabel, { ...labelOptions, maxWidth: width });
    const yLabel = new Text(options.yLabel, { ...labelOptions, rotation: -Math.PI / 2, maxWidth: height });
    const plot = new LinePlot(transform, [], {
      stroke: colors.curveColorProperty,
      lineWidth: SETTINGS.CHART_LINE_WIDTH,
    });
    const showMarker = options.showMarker ?? true;
    const marker = new Circle(SETTINGS.MARKER_RADIUS, { fill: colors.chairMarkerColorProperty, visible: showMarker });
    const patternProperty = StringManager.getInstance().getStereoStrings().energyValueStringProperty;
    const readout = new Text(patternProperty.value, {
      ...labelOptions,
      fill: colors.chairMarkerColorProperty,
      visible: showMarker,
    });
    const landmarks = options.namedPoints.map(({ x, label }) => ({
      x,
      text: new Text(label, {
        ...tickOptions,
        maxWidth: Math.min(SETTINGS.CHART_LANDMARK_MAX_WIDTH, width - 2 * SETTINGS.CHART_EDGE_INSET),
      }),
    }));
    const children = [
      background,
      vertical,
      horizontal,
      plot,
      xTicks,
      yTicks,
      xLabel,
      yLabel,
      ...landmarks.map(({ text }) => text),
      marker,
      readout,
    ];
    super({ children, pickable: false, excludeInvisibleChildrenFromBounds: true });

    const layoutAxes = () => {
      xLabel.centerX = width / 2;
      xLabel.top = Math.max(height, xTicks.bottom) + SETTINGS.CHART_LABEL_GAP;
      yLabel.centerY = height / 2;
      yLabel.right = Math.min(0, yTicks.left) - SETTINGS.CHART_LABEL_GAP;
      readout.centerX = width / 2;
      readout.top = xLabel.bottom + SETTINGS.CHART_LABEL_GAP;
    };
    xTicks.boundsProperty.link(layoutAxes);
    yTicks.boundsProperty.lazyLink(layoutAxes);
    xLabel.localBoundsProperty.lazyLink(layoutAxes);
    yLabel.localBoundsProperty.lazyLink(layoutAxes);

    const curveListener = (curve: Vector2[]) => {
      if (options.expandYRange) {
        const peak = Math.max(...curve.map(({ y }) => y));
        const max = Math.max(options.yRange.max, Math.ceil(peak / options.yTick) * options.yTick);
        transform.setModelYRange(new Range(options.yRange.min, max));
      }
      plot.setDataSet(curve);
    };
    options.curveProperty.link(curveListener);
    const updateMarker = () => {
      const curve = options.curveProperty.value;
      const x = options.markerXProperty.value;
      const pattern = patternProperty.value;
      const energy = options.markerEnergyProperty?.value ?? sample(curve, x);
      marker.center = transform.modelToViewXY(x, energy);
      readout.string = pattern.replace("{{value}}", toFixed(energy, 1));
      readout.centerX = width / 2;
    };
    const layoutLandmarks = () => {
      const curve = options.curveProperty.value;
      for (const { x: landmarkX, text } of landmarks) {
        const point = transform.modelToViewXY(landmarkX, sample(curve, landmarkX));
        const inset = SETTINGS.CHART_EDGE_INSET;
        const halfWidth = text.width / 2;
        text.centerX = clamp(point.x, inset + halfWidth, width - inset - halfWidth);
        text.bottom = clamp(point.y - SETTINGS.CHART_LABEL_GAP, inset + text.height, height - inset);
      }
    };
    const markerLink = Multilink.multilink(
      [options.curveProperty, options.markerXProperty, patternProperty],
      updateMarker,
    );
    options.markerEnergyProperty?.lazyLink(updateMarker);
    options.curveProperty.link(layoutLandmarks);
    for (const { text } of landmarks) {
      text.localBoundsProperty.lazyLink(layoutLandmarks);
    }

    this.disposeChart = () => {
      markerLink.dispose();
      options.markerEnergyProperty?.unlink(updateMarker);
      options.curveProperty.unlink(layoutLandmarks);
      for (const { text } of landmarks) {
        text.localBoundsProperty.unlink(layoutLandmarks);
      }
      options.curveProperty.unlink(curveListener);
      xTicks.boundsProperty.unlink(layoutAxes);
      yTicks.boundsProperty.unlink(layoutAxes);
      xLabel.localBoundsProperty.unlink(layoutAxes);
      yLabel.localBoundsProperty.unlink(layoutAxes);
      for (const child of children) {
        child.dispose();
      }
      transform.dispose();
    };
  }

  public override dispose(): void {
    this.disposeChart();
    super.dispose();
  }
}
