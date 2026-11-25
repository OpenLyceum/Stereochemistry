// P1 modules are exercised by unit tests before the P2 screens consume them.
const p1Modules = [
  "model/(CipRules|ConformationEnergy|Cyclohexane|MoleculeBuilder|MoleculeGraph|MoleculeLibrary|MoleculeSpec|Stereocentres)",
  "model/math/symmetricEigen",
  "model/structure/(CartoonGeometry|ColorSchemes|DisplayState|Elements|Geometry|Measurement|Polyhedra|Rotation3|Structure|UnitCell)",
  "view/MoleculeRenderer",
].join("|");

module.exports = {
  omitRules: ["no-unreachable-from-entry"],
  forbidden: [
    {
      name: "no-unreachable-from-entry-except-p1",
      severity: "error",
      comment: "Require application reachability outside the test-covered P1 engine.",
      from: { path: "^src/main\\.ts$" },
      to: {
        path: "^src/",
        pathNot: `^src/main\\.ts$|\\.d\\.(c|m)?ts$|^src/common/(${p1Modules})\\.ts$`,
        reachable: false,
      },
    },
  ],
};
