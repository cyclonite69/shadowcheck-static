import csv
import re
import sys

def professional_clean(text, is_address=False):
    if not text or text.strip() == "":
        return ""
    
    text = text.strip()
    
    # Fix concatenated words like "NewTaipei" -> "New Taipei"
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    
    # Initial Title Case
    text = text.title()
    
    # Acronym & Suffix Map
    corrections = {
        r'\bLlc\b': 'LLC',
        r'\bInc\b': 'Inc.',
        r'\bCorp\b': 'Corp.',
        r'\bLtd\b': 'Ltd.',
        r'\bCo\b': 'Co.',
        r'\bUsa\b': 'USA',
        r'\bIbm\b': 'IBM',
        r'\bNec\b': 'NEC',
        r'\bTrw\b': 'TRW',
        r'\bUk\b': 'UK',
        r'\bGmbh\b': 'GmbH',
        r'\bAg\b': 'AG',
        r'\bAb\b': 'AB',
        r'\bSa\b': 'SA',
        r'\bSas\b': 'SAS',
        r'\bSrl\b': 'SRL',
        r'\bBv\b': 'BV',
        r'\bCv\b': 'CV',
        r'\bPlc\b': 'PLC',
        r'\bJp\b': 'JP',
        r'\bFr\b': 'FR',
        r'\bDe\b': 'DE',
        r'\bSe\b': 'SE',
        r'\bKr\b': 'KR',
        r'\bTw\b': 'TW',
        r'\bCn\b': 'CN',
        r'\bAu\b': 'AU',
        r'\bCa\b': 'CA', # Canada or California context
        r'\bNy\b': 'NY',
        r'\bTx\b': 'TX',
        r'\bMa\b': 'MA',
        r'\bMi\b': 'MI',
        r'\bUt\b': 'UT',
        r'\bNh\b': 'NH',
        r'\bOh\b': 'OH',
        r'\bNj\b': 'NJ',
        r'\bGa\b': 'GA',
        r'\bFl\b': 'FL',
        r'\bGb\b': 'GB',
        r'\bR\.O\.C\.\b': 'R.O.C.',
        r'\bP\.O\.\b': 'P.O.',
    }
    
    for pattern, replacement in corrections.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Clean up punctuation & whitespace
    text = re.sub(r'\s*\.\s*$', '', text) # Remove trailing dots
    text = re.sub(r' {2,}', ' ', text)    # Collapse multiple spaces
    text = re.sub(r'\.\.', '.', text)     # Fix double dots
    text = text.replace('Inc..', 'Inc.')
    text = text.replace('Corp..', 'Corp.')
    
    return text.strip()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 clean_manufacturers.py <input_csv> <output_csv>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        with open(input_file, 'r', encoding='utf-8') as f_in, \
             open(output_file, 'w', encoding='utf-8', newline='') as f_out:
            
            reader = csv.DictReader(f_in)
            fieldnames = reader.fieldnames
            writer = csv.DictWriter(f_out, fieldnames=fieldnames)
            writer.writeheader()
            
            for row in reader:
                row['manufacturer'] = professional_clean(row['manufacturer'])
                row['address'] = professional_clean(row['address'], is_address=True)
                writer.writerow(row)
        print(f"Successfully processed {input_file} -> {output_file}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
