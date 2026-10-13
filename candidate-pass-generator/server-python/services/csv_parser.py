"""Tabular file parser service: reads CSV and Excel (.xlsx) files and returns list of row dicts."""
import csv
import os


def parse_csv(file_path: str) -> list[dict]:
    """Parse CSV or Excel file and return list of row dicts with all raw columns."""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext in (".xlsx", ".xls"):
        return _parse_excel(file_path)

    rows = []
    with open(file_path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            clean = {k.strip(): v.strip() for k, v in row.items() if k}
            rows.append(clean)
    return rows


def _parse_excel(file_path: str) -> list[dict]:
    import openpyxl
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet = wb.active
    rows = []
    header_row = [cell.value for cell in sheet[1]]
    headers = [str(h).strip() if h is not None else f"Column_{idx+1}" for idx, h in enumerate(header_row)]

    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not any(row):
            continue
        row_dict = {}
        for idx, val in enumerate(row):
            if idx < len(headers):
                h = headers[idx]
                if val is None:
                    row_dict[h] = ""
                elif isinstance(val, float) and val.is_integer():
                    row_dict[h] = str(int(val))
                else:
                    row_dict[h] = str(val).strip()
        rows.append(row_dict)
    return rows

