"""
Utility to list, inspect, and get audio paths for the 40 pre-cleared CC0 sound effects.
"""
import os

SFX_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx'))

def get_sfx(name: str) -> str:
    """Return the absolute path to a named CC0 sound effect."""
    if not name.endswith('.wav'):
        name = name + '.wav'
    path = os.path.join(SFX_DIR, name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"SFX not found: {name}. Available: {list_sfx()}")
    return path

def list_sfx():
    """List all available sound effects."""
    if not os.path.exists(SFX_DIR):
        return []
    return sorted([f[:-4] for f in os.listdir(SFX_DIR) if f.endswith('.wav')])

if __name__ == '__main__':
    all_sfx = list_sfx()
    print(f"Total available CC0 sound effects: {len(all_sfx)}")
    print(", ".join(all_sfx))
