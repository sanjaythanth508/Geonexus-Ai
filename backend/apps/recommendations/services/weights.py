"""
Single source of truth for scoring criteria and per-industry weight profiles.
Both the rule-based MCDA engine (mcda.py) and the ML predictor (analysis/ml/)
import from here — never duplicate these constants elsewhere.
"""

CRITERIA = [
    "road", "highway_connectivity", "railway", "transport", "water",
    "hospital", "population", "building_density", "landuse",
    "protected_area", "natural_risk",
]

INDUSTRY_PROFILES = {
    "warehousing_logistics": dict(zip(CRITERIA, [0.15, 0.20, 0.10, 0.05, 0.03, 0.04, 0.08, 0.05, 0.10, 0.12, 0.08])),
    "general_manufacturing": dict(zip(CRITERIA, [0.12, 0.15, 0.10, 0.04, 0.08, 0.06, 0.10, 0.05, 0.10, 0.12, 0.08])),
    "chemical_hazardous":    dict(zip(CRITERIA, [0.08, 0.10, 0.06, 0.03, 0.10, 0.10, 0.04, 0.03, 0.11, 0.25, 0.10])),
    "it_electronics":        dict(zip(CRITERIA, [0.10, 0.10, 0.05, 0.12, 0.03, 0.10, 0.18, 0.12, 0.10, 0.05, 0.05])),
    "food_processing":       dict(zip(CRITERIA, [0.14, 0.14, 0.06, 0.04, 0.14, 0.08, 0.10, 0.05, 0.11, 0.09, 0.05])),
}

for _name, _w in INDUSTRY_PROFILES.items():
    _total = round(sum(_w.values()), 4)
    if _total != 1.0:
        raise ValueError(f"Industry profile '{_name}' weights sum to {_total}, not 1.0")

# IMPORTANT: this fixed, alphabetically-sorted order must match whatever
# category order your Colab training notebook used for the 'industry'
# column. If your notebook used pandas' default `.astype("category")`
# without specifying an explicit category list, pandas sorts alphabetically
# too, so this should already match — but verify with the check in
# analysis/ml/predictor.py before trusting production scores.
CATEGORY_ORDER = sorted(INDUSTRY_PROFILES.keys())

FAVOURABLE_LANDUSE = {"industrial", "commercial", "quarry", "brownfield"}
UNFAVOURABLE_LANDUSE = {"residential", "cemetery", "recreation_ground", "farmland", "orchard"}
SENSITIVE_NATURAL = {"wetland", "forest", "wood", "water", "scrub", "heath", "grassland"}

MAJOR_HIGHWAY_FCLASSES = (
    "motorway", "trunk", "primary",
    "motorway_link", "trunk_link", "primary_link",
)