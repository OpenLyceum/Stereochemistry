/** Format the spheres that resolve CIP priorities, preserving ties until their first difference. */
import { DerivedProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { StringManager } from "../../i18n/StringManager.js";
import type { RSModel } from "../model/RSModel.js";

function compareSets(a: readonly number[][], b: readonly number[][]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const left = a[i] ?? [];
    const right = b[i] ?? [];
    for (let j = 0; j < Math.max(left.length, right.length); j++) {
      const difference = (left[j] ?? 0) - (right[j] ?? 0);
      if (difference) {
        return difference;
      }
    }
  }
  return 0;
}

function groupTies(branches: readonly number[], sets: ReadonlyMap<number, number[][]>): number[][] {
  const groups: number[][] = [];
  let previous: number[][] | null = null;
  for (const branch of branches) {
    const current = sets.get(branch) ?? [];
    const last = groups.at(-1);
    if (last && previous && compareSets(previous, current) === 0) {
      last.push(branch);
    } else {
      groups.push([branch]);
    }
    previous = current;
  }
  return groups;
}

export function cipExplanationProperty(model: RSModel) {
  const strings = StringManager.getInstance().getRSStrings();
  return DerivedProperty.deriveAny(
    [
      model.cipProperty,
      model.builtProperty,
      model.moleculeProperty,
      strings.sphereStringProperty,
      strings.ligandComparisonStringProperty,
      strings.priorityStringProperty,
      strings.ethylStringProperty,
      strings.methylStringProperty,
    ],
    () => {
      const cip = model.cipProperty.value;
      if (!cip) {
        return [];
      }
      const symbols = new Map(
        model.builtProperty.value.structure.atoms.map(({ element }) => [element.number, element.symbol]),
      );
      const setText = (sets: readonly number[][]) =>
        sets.map((set) => `{${set.map((number) => symbols.get(number) ?? "∅").join(",")}}`).join(" ");
      const lines: string[] = [];
      let ties: (readonly number[])[] = [cip.order];
      const spheres = new Set(cip.trace.map(({ sphere }) => sphere));
      for (const sphere of spheres) {
        const sets = new Map(
          cip.trace.filter((step) => step.sphere === sphere).map((step) => [step.branch, step.sets]),
        );
        const remaining: number[][] = [];
        for (const branches of ties) {
          if (branches.length < 2) {
            continue;
          }
          const groups = groupTies(branches, sets);
          remaining.push(...groups);
          if (sphere !== 1 && groups.length === 1) {
            continue;
          }
          const comparison = groups
            .map((group) => group.map((branch) => setText(sets.get(branch) ?? [[]])).join(" = "))
            .join(" > ");
          const ligandName = (branch: number) => {
            const signature = setText(sets.get(branch) ?? []);
            if (
              sphere === 2 &&
              signature === "{C,H,H}" &&
              (model.moleculeProperty.value === "2-butanol" || model.moleculeProperty.value === "2-bromobutane")
            ) {
              return strings.ethylStringProperty.value;
            }
            if (sphere === 2 && signature === "{H,H,H}") {
              return strings.methylStringProperty.value;
            }
            return StringUtils.fillIn(strings.priorityStringProperty.value, {
              number: String(cip.order.indexOf(branch) + 1),
            });
          };
          const detail =
            sphere === 1
              ? comparison
              : StringUtils.fillIn(strings.ligandComparisonStringProperty.value, {
                  sets: comparison,
                  ligands: groups.map((group) => group.map(ligandName).join(" = ")).join(" > "),
                });
          lines.push(
            StringUtils.fillIn(strings.sphereStringProperty.value, { number: String(sphere), comparison: detail }),
          );
        }
        ties = remaining;
      }
      return lines;
    },
  );
}
