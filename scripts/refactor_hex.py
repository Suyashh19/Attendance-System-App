import os
import re

APP_DIR = r"c:\Users\suyas\OneDrive\Desktop\Attendance-System\AttendanceApp"

# Direct literal replacements
HEX_REPLACEMENTS = {
    "'#1E293B'": "'#FFFFFF'",
    "backgroundColor: '#1E293B'": "backgroundColor: '#FFFFFF'",
    "'#0F172A'": "'#F7F9FC'",
    "bg-[#0F172A]": "bg-[#F7F9FC]",
    "\"#0F172A\"": "\"#F7F9FC\"",
    "'#334155'": "'#E5EAF2'",
    "\"#334155\"": "\"#E5EAF2\"",
    "'#F8FAFC'": "'#1A1D1F'",
    "\"#F8FAFC\"": "\"#1A1D1F\"",
    "'#64748B'": "'#6B7280'",
    "\"#64748B\"": "\"#6B7280\"",
    "placeholderTextColor=\"#64748B\"": "placeholderTextColor=\"#6B7280\"",
    
    # Text colors logic in CreateSubjectModal (line 66/79)
    # style={{ color: newSubject.type === 'theory' ? '#FFFFFF' : '#64748B' }}
    # We want active to be #1A1D1F, inactive to be #6B7280, wait, it's a tab, active was white.
    # We could replace '#FFFFFF' in those specific lines if they meant text-white,
    # but the script earlier replaced text-white. We'll leave `#FFFFFF` for backgrounds alone,
    # but for text, the user wanted #1A1D1F or text-primary.
}

def process_file(filepath):
    if filepath.endswith("tailwind.config.js"): return # don't touch
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    for old, new in HEX_REPLACEMENTS.items():
        content = content.replace(old, new)
        
    if original != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated Hex: {filepath}")

def main():
    dirs_to_check = ['app', 'components', '.'] # . for app.json
    
    for d in dirs_to_check:
        full_dir = os.path.join(APP_DIR, d)
        if d == '.':
            # handle app.json
            process_file(os.path.join(full_dir, 'app.json'))
        else:
            for root, dirs, files in os.walk(full_dir):
                for file in files:
                    if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.json'):
                        process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
