import os

APP_DIR = r"c:\Users\suyas\OneDrive\Desktop\Attendance-System\AttendanceApp"

def process_file(filepath):
    if filepath.endswith("tailwind.config.js"): return # handle separately
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    content = content.replace('shadow-soft', 'shadow-sm')
        
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
                if file.endswith('.tsx') or file.endswith('.ts'):
                    process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
