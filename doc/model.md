# Stereochemistry model

The simulation uses explicit atoms and bonds for a curated set of small organic molecules. The builder expands implicit hydrogen atoms, places local bond angles and torsions, and applies prescribed configurations to the resulting coordinates. Distances in the molecular engine use ångströms. Dihedral angles use degrees, energies use kJ/mol, and temperatures use kelvin.

## CIP priorities and R/S

The CIP implementation covers sequence rule 1a, comparing atomic numbers. Start with the atoms directly bonded to the stereocentre. If two have the same atomic number, compare the outward branches sphere by sphere, keeping each parent's descendants together and comparing higher-priority parent groups first. Atom-number lists are sorted in descending order and compared lexicographically. Missing entries compare as zero. Multiple bonds introduce duplicate atoms, and closing a ring introduces a terminal duplicate to avoid unbounded traversal. If the available rules leave two ligands tied, the centre has no assigned configuration in the simulation.

Let **v₁** through **v₄** be the vectors from the centre to the four ligands in descending CIP priority. For the nondegenerate tetrahedra in the library, the model evaluates the scalar triple product **v₁ · (v₂ × v₃)**. A negative sign gives R and a positive sign gives S. In the viewer with priority 4 pointing away, clockwise 1 → 2 → 3 gives R and counterclockwise gives S. Graph symmetry is checked when comparing labelled structures so a meso molecule can match its mirror.

The library exercises constitutional sequence rule 1a. Isotope priority and rules for comparing stereogenic units in the ligands are outside its scope.

## Newman projections and populations

For a projected front and back group, fold their relative angle into 0° to 180°. The energy sums interactions over the nine front–back group pairs. An eclipsing pair contributes **E × (1 + cos(3θ)) / 2** through 60°. The methyl–methyl gauche term contributes **3.8 × (1 − cos(3θ)) / 2** through 120°. The model uses these idealized terms to interpolate between conformations.

| Interaction | Eclipsing term, kJ/mol | Gauche term, kJ/mol |
|---|---:|---:|
| H–H | 4 | 0 |
| H–CH₃ | 6 | 0 |
| CH₃–CH₃ | 11 | 3.8 |

Three eclipsing H–H contacts give ethane a 12 kJ/mol barrier. Propane gives 14 kJ/mol at eclipsing and 0 at staggering. In butane, the fully eclipsed conformation (0°) is 19 kJ/mol, the other eclipsed conformations (±120°) are 16 kJ/mol, gauche (±60°) is 3.8 kJ/mol, and anti (180°) is the zero reference. These rounded teaching values follow the rotational profiles in Wade and Simek, *Organic Chemistry*, and Clayden, Greeves and Warren, *Organic Chemistry*.

The staggered butane chart normalizes the three Boltzmann weights **exp(−E/RT)**, one each for anti, gauche +60°, and gauche −60°. It treats the ideal conformers as discrete states with equal statistical weight before applying the energetic factor.

## Cyclohexane

The ring follows a fixed-amplitude Cremer–Pople path between the two chair poles. The polar angle is **πs** at flip progress **s**, the azimuth is fixed at 30°, and the puckering amplitude is 0.63 Å. The model solves for the in-plane radius to maintain a mean ring bond length of 1.54 Å. Up and down follow the substituent faces through the flip. Axial and equatorial positions exchange between the two endpoints.

The animation interpolates keyframe energies with zero slope at each keyframe.

| Progress | Landmark | Ring energy, kJ/mol |
|---:|---|---:|
| 0 | Chair A | 0 |
| 0.28 | Half-chair region | 45 |
| 0.5 | Twist-boat | 23 |
| 0.72 | Half-chair region | 45 |
| 1 | Chair B | 0 |

The boat at 29 kJ/mol is a chart reference. The fixed-azimuth path and interpolated energy are teaching approximations. The model adds substituent strain using axial A-values at the endpoints. It interpolates the endpoint strain through the flip for the chart. It omits explicit solvent effects, coupled substituent interactions, and relaxation along the full potential energy surface.

| Group | H | Methyl | Ethyl | Isopropyl | tert-Butyl | Hydroxyl | Chloro |
|---|---:|---:|---:|---:|---:|---:|---:|
| A-value, kJ/mol | 0 | 7.3 | 7.5 | 9.2 | 20.5 | 3.9 | 2.2 |

The approximate A-values are based on Eliel and Wilen, *Stereochemistry of Organic Compounds* (Wiley, 1994). The puckering coordinates follow Cremer and Pople, “General Definition of Ring Puckering Coordinates,” *J. Am. Chem. Soc.* **97** (1975), 1354–1358. With **ΔG = G_B − G_A**, the chair population ratio is **K = A/B = exp(ΔG/RT)**, so the fraction in chair A is **K/(1 + K)**. Challenge population choices use the favoured chair’s percentage at 298.15 K, rounded to the nearest whole percent.
