import re, glob, os, difflib
import pandas as pd
from django.conf import settings

DISTRICT_ALIASES = {
    "Ahmadabad": "Ahmedabad", "Banas Kantha": "Banaskantha", "Banaskatha": "Banaskantha",
    "Dohad": "Dahod", "Kachchh": "Kutch", "Kachh": "Kutch", "Mahesana": "Mehsana",
    "Panch Mahals": "Panchmahal", "Panchmahals": "Panchmahal", "Sabar Kantha": "Sabarkantha",
    "The Dangs": "Dang", "Dangs": "Dang", "Chhota Udaipur": "Chhotaudepur",
    "Chhotaudepur": "Chhotaudepur",
}

_state = {}


def normalize_district(name: str) -> str:
    if pd.isna(name):
        return name
    s = str(name).strip()
    s = re.sub(r"\s*\(.*?\)\s*", "", s)
    s = re.sub(r"[\*\d]+$", "", s).strip()
    s = re.sub(r"\s+", " ", s).title()
    return DISTRICT_ALIASES.get(s, s)


def _load():
    if _state:
        return _state
    district_table = None
    for csv_path in glob.glob(f"{settings.STRUCTURED_DIR}/*.csv"):
        try:
            df = pd.read_csv(csv_path)
            district_col = next((c for c in df.columns if c.strip().lower() == "district"), None)
            if district_col is None:
                continue
            df = df.rename(columns={district_col: "district"})
            df["district"] = df["district"].apply(normalize_district)
            df = df.dropna(subset=["district"])

            counts = df["district"].value_counts()
            if counts.max() > 1:
                numeric_cols = df.select_dtypes(include="number").columns.tolist()
                other_cols = [c for c in df.columns if c not in numeric_cols and c != "district"]
                agg = {c: "mean" for c in numeric_cols}
                agg.update({c: "first" for c in other_cols})
                df = df.groupby("district", as_index=False).agg(agg)

            prefix = os.path.splitext(os.path.basename(csv_path))[0]
            df = df.rename(columns={c: f"{prefix}__{c}" for c in df.columns if c != "district"})
            district_table = df if district_table is None else district_table.merge(df, on="district", how="outer")
        except Exception as e:
            print(f"[WARN] failed to read {csv_path}: {e}")

    if district_table is None:
        district_table = pd.DataFrame(columns=["district"])
    all_districts = sorted(district_table["district"].dropna().unique().tolist())
    _state.update(dict(table=district_table, districts=all_districts))
    return _state


def get_district_stats(district: str) -> dict:
    s = _load()
    if not s["districts"]:
        return {"error": f"No structured district data loaded -- add CSVs to {settings.STRUCTURED_DIR}."}
    match = difflib.get_close_matches(normalize_district(district), s["districts"], n=1, cutoff=0.6)
    if not match:
        return {"error": f"No district matching {district!r}. Known districts: {s['districts']}"}
    row = s["table"][s["table"]["district"] == match[0]].iloc[0]
    return {"district": match[0], **{k: (None if pd.isna(v) else v) for k, v in row.items() if k != "district"}}