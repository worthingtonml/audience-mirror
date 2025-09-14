import numpy as np

import csv
import os
def get_zip_income_data(zip_codes):
    """
    Fetch median household income for a list of ZIP codes from static CSV. Returns dict {zip: median_income}.
    Falls back to national average if ZIP not found.
    """
    income_path = os.path.join(os.path.dirname(__file__), '../data/zip_income.csv')
    income_map = {}
    try:
        with open(income_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                income_map[row['zip']] = float(row['median_income'])
    except Exception:
        pass
    national_avg = 67000
    return {str(z): income_map.get(str(z), national_avg) for z in zip_codes}
