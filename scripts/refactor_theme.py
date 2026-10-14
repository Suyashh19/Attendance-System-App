import os
import re

APP_DIR = r"c:\Users\suyas\OneDrive\Desktop\Attendance-System\AttendanceApp"

REPLACEMENTS = {
    # Backgrounds
    r'\bbg-dark\b(?!\-)': 'bg-light',
    r'\bbg-dark-card\b': 'bg-light-card shadow-soft',
    
    # Text colors
    r'\btext-dark-muted\b': 'text-light-muted',
    
    # Borders
    r'\bborder-dark-border\b': 'border-light-border',
    r'\bbg-dark-border\b': 'bg-light-border',

    # Specific shadows -> just rely on shadow-soft added above
    # We can remove existing shadows that might clash
    r'\bshadow-sm\b': '',
    r'\bshadow-2xl\b': '',
    r'\bshadow-\[0_0_20px_rgba\([^)]+\)\]\b': '', # remove heavy glow
    
    # Status backgrounds (PRESENT, ABSENT, LATE, OFFLINE)
    # The prompt says: "Status indicators (e.g., PRESENT): Background: #ECFDF5, Text: #059669"
    # I'll let the script replace `text-white` generally and handle exact cases later if needed,
    # or handle text-white separately for buttons.
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # Apply direct replacements
    for pattern, replacement in REPLACEMENTS.items():
        content = re.sub(pattern, replacement, content)
        
    # Handle text-white -> text-light-text, but we need to be careful.
    # Actually, almost all `text-white` is text that was white because of the dark background.
    content = re.sub(r'\btext-white\b', 'text-light-text', content)
    
    # Clean up double spaces caused by removing shadows
    content = re.sub(r' {2,}', ' ', content)
    # clean trailing spaces in class quotes
    content = re.sub(r' "\b', '"', content)

    if original != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

def main():
    dirs_to_check = ['app', 'components']
    
    for d in dirs_to_check:
        full_dir = os.path.join(APP_DIR, d)
        for root, dirs, files in os.walk(full_dir):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.jsx') or file.endswith('.js'):
                    process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
