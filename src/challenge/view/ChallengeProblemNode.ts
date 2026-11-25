/** Renders one problem and owns its temporary viewer models, controls, and localized labels. */
import { DerivedProperty, Multilink, PatternStringProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, toFixed, Vector2 } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Node, VBox } from "scenerystack/scenery";
import { cipRanks } from "../../common/model/CipRules.js";
import { energyAt, energyCurve } from "../../common/model/ConformationEnergy.js";
import { A_VALUES, chairViewRotation, slotIndex } from "../../common/model/Cyclohexane.js";
import { mirror } from "../../common/model/MoleculeBuilder.js";
import { type BuiltMolecule, positionAt } from "../../common/model/MoleculeGraph.js";
import { StereoViewModel } from "../../common/model/StereoViewModel.js";
import { separatedLigandRotation } from "../../common/model/separatedLigandRotation.js";
import { normalize, subtract } from "../../common/model/structure/Geometry.js";
import { Rotation3 } from "../../common/model/structure/Rotation3.js";
import { EnergyChartNode } from "../../common/view/EnergyChartNode.js";
import { NewmanProjectionNode } from "../../common/view/NewmanProjectionNode.js";
import { stereoButton, stereoText } from "../../common/view/StereoControls.js";
import { StereoViewerNode } from "../../common/view/StereoViewerNode.js";
import { WedgeDashNode } from "../../common/view/WedgeDashNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../StereochemistryColors.js";
import {
  CONFORMATIONS_SCREEN_SETTINGS as ANGLE,
  STEREO_LAYOUT_SETTINGS as LAYOUT,
  CHALLENGE_SETTINGS as SETTINGS,
} from "../../StereochemistryConstants.js";
import type { ChallengeModel } from "../model/ChallengeModel.js";
import { type ChallengeProblem, LEVELS } from "../model/challengeProblems.js";
import { answerLabels } from "./challengeReadouts.js";

const manager = StringManager.getInstance();
const strings = manager.getChallengeStrings();
const a11y = manager.getChallengeA11yStrings();
const stereo = manager.getStereoStrings();
const chiral = manager.getChiralityStrings();
const bounds = new Bounds2(0, 0, SETTINGS.VIEWER_WIDTH, SETTINGS.VIEWER_HEIGHT);

export class ChallengeProblemNode extends VBox {
  private readonly disposeProblem: () => void;
  public readonly firstControl: Node;
  public readonly firstPopulationChoice: Node | undefined;

  public constructor(
    problem: ChallengeProblem,
    model: ChallengeModel,
    submit: (answer: ChallengeProblem["answer"]) => void,
  ) {
    const resources: { dispose: () => void }[] = [];
    const own = <T extends { dispose: () => void }>(resource: T): T => {
      resources.push(resource);
      return resource;
    };
    const visual = new HBox({ spacing: LAYOUT.GAP, excludeInvisibleChildrenFromBounds: true });
    const choices = new HBox({ spacing: LAYOUT.GAP });
    const percentChoices = new HBox({ spacing: LAYOUT.GAP });
    const hints = new VBox({ spacing: LAYOUT.ROW_GAP, excludeInvisibleChildrenFromBounds: true });
    let firstControl: Node | undefined;
    const choice = (answer: ChallengeProblem["answer"], label: TReadOnlyProperty<string>) =>
      stereoButton(label, () => submit(answer));

    const addViewer = (
      molecule: BuiltMolecule,
      nameProperty: TReadOnlyProperty<string>,
      initialRotation = separatedLigandRotation(molecule),
      centreProperty?: TReadOnlyProperty<number | null>,
      interactive = true,
    ) => {
      const viewModel = own(new StereoViewModel(molecule, () => initialRotation));
      const viewer = new StereoViewerNode(viewModel, bounds, {
        accessibleName: nameProperty,
        interactive,
        ...(centreProperty ? { labelCentreProperty: centreProperty } : {}),
      });
      if (interactive) {
        firstControl ??= viewer;
      }
      const labelled = new VBox({ children: [stereoText(nameProperty), viewer] });
      visual.addChild(labelled);
      return { viewModel, viewer, labelled };
    };
    const describeHint = (label: TReadOnlyProperty<string>) => {
      const explanation = stereoText(label, LAYOUT.FONT_SIZE, Colors.textColorProperty, SETTINGS.HINT_WIDTH);
      explanation.accessibleParagraph = label;
      hints.addChild(explanation);
    };
    const mirrored = (built: BuiltMolecule, source: StereoViewModel, nameProperty: TReadOnlyProperty<string>) => {
      const target = addViewer(mirror(built), nameProperty, Rotation3.IDENTITY, undefined, false);
      own(
        Multilink.multilink([source.rotationProperty, source.zoomProperty], (rotation, zoom) => {
          target.viewModel.rotationProperty.value = rotation.reflectedAcrossX();
          target.viewModel.zoomProperty.value = zoom;
        }),
      );
      own(
        Multilink.multilink([model.hintProperty], (show) => {
          target.labelled.visible = show;
        }),
      );
      describeHint(strings.mirrorHintStringProperty);
    };

    switch (problem.level) {
      case LEVELS.CHIRALITY: {
        const original = addViewer(problem.molecule, stereo.molecule3DStringProperty);
        mirrored(problem.molecule, original.viewModel, chiral.mirrorStringProperty);
        choices.children = [choice("chiral", answerLabels.chiral), choice("achiral", answerLabels.achiral)];
        break;
      }
      case LEVELS.CONFIGURATION: {
        const centreProperty = own(new Property<number | null>(problem.centre));
        const { viewModel, viewer } = addViewer(
          problem.molecule,
          stereo.molecule3DStringProperty,
          problem.rotation,
          centreProperty,
        );
        viewModel.haloAtomsProperty.value = [problem.centre];
        viewer.accessibleHelpText = own(
          new PatternStringProperty(a11y.markedCentreStringProperty, {
            index: problem.centre + 1,
            controls: manager.getStereoA11yStrings().viewerHelpStringProperty,
          }),
        );
        const order = cipRanks(problem.molecule.structure, problem.centre).order;
        const wedge = new WedgeDashNode(
          viewModel,
          centreProperty,
          new Bounds2(0, 0, SETTINGS.WEDGE_WIDTH, bounds.height),
        );
        visual.addChild(wedge);
        describeHint(strings.cipHintStringProperty);
        const orient = stereoButton(manager.getRSStrings().orientLowestStringProperty, () => {
          const lowest = order.at(-1);
          if (lowest !== undefined) {
            const { positions } = problem.molecule;
            const rotation = viewModel.rotationProperty.value;
            const bond = normalize(subtract(positionAt(positions, lowest), positionAt(positions, problem.centre)));
            const direction = rotation.apply(...bond, [0, 0, 0]);
            viewModel.rotationProperty.value = Rotation3.between(direction, [0, 0, -1]).times(rotation);
          }
        });
        hints.addChild(orient);
        own(
          Multilink.multilink([model.hintProperty], (show) => {
            wedge.visible = show;
            viewModel.labelsProperty.value = new Map(show ? order.map((index, rank) => [index, String(rank + 1)]) : []);
          }),
        );
        choices.children = [choice("R", answerLabels.R), choice("S", answerLabels.S)];
        break;
      }
      case LEVELS.RELATIONSHIP: {
        const first = addViewer(problem.left, strings.firstModelStringProperty);
        addViewer(problem.right, strings.secondModelStringProperty, problem.rotation);
        mirrored(problem.left, first.viewModel, a11y.mirrorFirstStringProperty);
        choices.children = [
          choice("identical", answerLabels.identical),
          choice("enantiomers", answerLabels.enantiomers),
          choice("diastereomers", answerLabels.diastereomers),
        ];
        break;
      }
      case LEVELS.NEWMAN: {
        const nameProperty = manager.getMoleculeNames()[`${problem.id}StringProperty`];
        for (const [index, angle] of problem.angles.entries()) {
          const projectionNameProperty = own(
            new PatternStringProperty(strings.projectionStringProperty, { number: index + 1 }),
          );
          const degreesProperty = own(new PatternStringProperty(stereo.angleValueStringProperty, { value: angle }));
          const labelProperty = own(
            new PatternStringProperty(a11y.projectionStringProperty, { choice: projectionNameProperty, angle }),
          );
          const projection = new NewmanProjectionNode(
            own(new Property(problem.newman)),
            own(new Property(angle)),
            false,
          );
          // Give every projection the same footprint, including eclipsed label offsets.
          const frame = new Node({
            children: [projection],
            localBounds: new Bounds2(
              -SETTINGS.NEWMAN_HALF_SIZE,
              -SETTINGS.NEWMAN_HALF_SIZE,
              SETTINGS.NEWMAN_HALF_SIZE,
              SETTINGS.NEWMAN_HALF_SIZE,
            ),
            scale: SETTINGS.NEWMAN_SCALE,
          });
          const button = choice(angle, degreesProperty);
          firstControl ??= button;
          button.accessibleName = labelProperty;
          visual.addChild(new VBox({ children: [stereoText(projectionNameProperty), frame, button] }));
          own(
            Multilink.multilink([model.solvedProperty], (solved) => {
              button.enabled = !solved;
            }),
          );
        }
        const curve = energyCurve(problem.newman)
          .map(
            ({ phiDeg, energy }) =>
              new Vector2(phiDeg > ANGLE.MAX_PHI ? phiDeg - (ANGLE.MAX_PHI - ANGLE.MIN_PHI) : phiDeg, energy),
          )
          .slice(0, -1)
          .concat(new Vector2(ANGLE.MIN_PHI, energyAt(problem.newman, ANGLE.MIN_PHI)))
          .sort((a, b) => a.x - b.x);
        const chart = new EnergyChartNode({
          width: LAYOUT.CHART_WIDTH,
          xRange: new Range(ANGLE.MIN_PHI, ANGLE.MAX_PHI),
          yRange: new Range(0, ANGLE.CHART_MAX_ENERGY),
          xTick: ANGLE.CHART_ANGLE_TICK,
          yTick: ANGLE.CHART_ENERGY_TICK,
          xLabel: stereo.angleStringProperty,
          yLabel: stereo.energyStringProperty,
          curveProperty: own(new Property(curve)),
          markerXProperty: own(new Property(0)),
          showMarker: false,
          namedPoints: [],
        });
        const energyProperty = own(
          new DerivedProperty([a11y.energyAtAngleStringProperty], (pattern) =>
            problem.angles
              .map((angle) =>
                StringUtils.fillIn(pattern, {
                  angle: String(angle),
                  energy: toFixed(energyAt(problem.newman, angle), 1),
                }),
              )
              .join(" "),
          ),
        );
        const energyText = stereoText(energyProperty, LAYOUT.FONT_SIZE, Colors.textColorProperty, SETTINGS.HINT_WIDTH);
        energyText.accessibleParagraph = energyProperty;
        const energyHint = new VBox({
          children: [chart, energyText],
          spacing: LAYOUT.ROW_GAP,
        });
        energyHint.scale(SETTINGS.CHART_HINT_SCALE);
        hints.addChild(energyHint);
        describeHint(strings.energyHintStringProperty);
        visual.insertChild(0, stereoText(nameProperty));
        break;
      }
      case LEVELS.CHAIR: {
        const { preset } = problem;
        const nameProperty = manager.getMoleculeNames()[`${preset.id}StringProperty`];
        visual.addChild(stereoText(nameProperty));
        const rotation = chairViewRotation();
        for (const chair of ["A", "B"] as const) {
          const { viewer } = addViewer(problem.chairs[chair], answerLabels[chair], rotation);
          const detailsProperty = own(
            new DerivedProperty(
              [a11y.positionDescriptionStringProperty, stereo.axialStringProperty, stereo.equatorialStringProperty],
              (pattern, axial, equatorial) =>
                preset.subs
                  .map(({ carbon, group, face }) =>
                    StringUtils.fillIn(pattern, {
                      carbon: String(carbon + 1),
                      group,
                      position: problem.chairs[chair].axial[slotIndex(carbon, face)] ? axial : equatorial,
                    }),
                  )
                  .join(" "),
            ),
          );
          viewer.accessibleName = own(
            new PatternStringProperty(a11y.chairDetailsStringProperty, {
              choice: answerLabels[chair],
              positions: detailsProperty,
            }),
          );
          choices.addChild(choice(chair, answerLabels[chair]));
        }
        for (const percent of problem.choices) {
          const labelProperty = own(new PatternStringProperty(strings.percentStringProperty, { value: percent }));
          percentChoices.addChild(choice(percent, labelProperty));
        }
        describeHint(strings.chairHintStringProperty);
        for (const group of new Set(preset.subs.map((substituent) => substituent.group))) {
          describeHint(own(new PatternStringProperty(a11y.aValueStringProperty, { group, value: A_VALUES[group] })));
        }
        break;
      }
    }

    super({
      align: "center",
      spacing: LAYOUT.GAP,
      excludeInvisibleChildrenFromBounds: true,
      children: [visual, choices, percentChoices, hints],
    });
    if (!firstControl) {
      throw new Error("A challenge problem needs at least one focusable control");
    }
    this.firstControl = firstControl;
    this.firstPopulationChoice = percentChoices.children[0];
    own(
      Multilink.multilink(
        [model.hintProperty, model.solvedProperty, model.choosingPercentProperty],
        (hint, solved, percent) => {
          hints.visible = hint;
          choices.visible = !percent && choices.children.length > 0;
          percentChoices.visible = percent;
          for (const button of [...choices.children, ...percentChoices.children]) {
            button.inputEnabled = !solved;
            button.focusable = !solved;
          }
        },
      ),
    );
    this.disposeProblem = () => {
      for (const child of [...this.children]) {
        child.disposeSubtree();
      }
      for (const resource of resources.reverse()) {
        resource.dispose();
      }
    };
  }

  public override dispose(): void {
    this.disposeProblem();
    super.dispose();
  }
}
