import os
import re

APP_DIR = r"c:\Users\suyas\OneDrive\Desktop\Attendance-System\AttendanceApp"

ALLOWED_COLORS = {
    '#F7F9FC', '#FFFFFF', '#1A1D1F', '#6B7280', '#6366F1', 
    '#EEF2FF', '#E5EAF2', '#ECFDF5', '#059669', '#9CA3AF'
}

# Carefully mapped to best semantic fit within the restricted palette
MAPPING = {
    '#EF4444': '#1A1D1F',  # Red -> Strong text
    '#DC2626': '#1A1D1F',  # Red -> Strong text
    '#F43F5E': '#1A1D1F',  # Rose -> Strong text
    '#10B981': '#059669',  # Green -> Strict green
    '#F59E0B': '#6B7280',  # Amber -> Muted text
    '#D97706': '#6B7280',  # Amber -> Muted text
    '#FEF2F2': '#F7F9FC',  # Light red bg -> Base bg
    '#FFFBEB': '#F7F9FC',  # Light yellow bg -> Base bg
    '#94A3B8': '#9CA3AF',  # Slate icon -> Allowed icon color
    '#475569': '#6B7280',  # Dark slate -> Muted string
    '#1E293B': '#FFFFFF',  # Dark card -> White card
    '#0EA5E9': '#6366F1',  # Light blue -> Accent
}

def process_file(filepath):
    # Only process TSX/TS files and tailwind config
    if not (filepath.endswith('.tsx') or filepath.endswith('.ts') or filepath.endswith('.js')): 
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # 1. Replace Hex Codes
    def hex_replacer(match):
        hex_code = match.group(0).upper()
        if hex_code in ALLOWED_COLORS:
            return match.group(0) # Keep original case or just return exact match
        if hex_code in MAPPING:
            return MAPPING[hex_code]
        # If not explicitly mapped, fallback to a sensible default or don't change
        return match.group(0)

    # regex to find hex codes
    content = re.sub(r'#[0-9A-Fa-f]{6}', hex_replacer, content)

    # 2. Check for danger classes in tailwind and rename them or let them just use the new mapped color from config
    # Actually, we don't need to rename classes if the config has `#1A1D1F` for danger.
    
    if original != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated colors in: {filepath}")

def main():
    dirs_to_check = ['app', 'components', '.'] 
    
    for d in dirs_to_check:
        full_dir = os.path.join(APP_DIR, d)
        if d == '.':
            process_file(os.path.join(full_dir, 'tailwind.config.js'))
        else:
            for root, dirs, files in os.walk(full_dir):
                for file in files:
                    process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
