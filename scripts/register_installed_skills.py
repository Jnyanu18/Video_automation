import os
import shutil
from pathlib import Path

SOURCE_ROOT = Path(r"J:\ai editor\reel-studio-stack\01-agent-skills")
TARGET_ROOT = Path(r"J:\ai editor\.agents\skills")

def register_skills():
    registered = []
    
    # 1. remotion-dev skills
    remotion_dir = SOURCE_ROOT / "remotion-dev__skills" / "skills"
    if remotion_dir.exists():
        for s in remotion_dir.iterdir():
            if s.is_dir() and (s / "SKILL.md").exists():
                dest = TARGET_ROOT / s.name
                if not dest.exists():
                    shutil.copytree(s, dest)
                    registered.append(s.name)
                    
    # 2. greensock gsap skills
    gsap_dir = SOURCE_ROOT / "greensock__gsap-skills" / "skills"
    if gsap_dir.exists():
        for s in gsap_dir.iterdir():
            if s.is_dir() and (s / "SKILL.md").exists():
                dest = TARGET_ROOT / s.name
                if not dest.exists():
                    shutil.copytree(s, dest)
                    registered.append(s.name)
                    
    # 3. video shotcraft
    shotcraft_dir = SOURCE_ROOT / "karekin__video-shotcraft"
    if shotcraft_dir.exists() and (shotcraft_dir / "SKILL.md").exists():
        dest = TARGET_ROOT / "shotcraft"
        if not dest.exists():
            shutil.copytree(shotcraft_dir, dest)
            registered.append("shotcraft")
            
    # 4. emilkowalski motion choreography skills
    emil_dir = SOURCE_ROOT / "emilkowalski__skills" / "skills"
    if emil_dir.exists():
        for s in emil_dir.iterdir():
            if s.is_dir() and (s / "SKILL.md").exists():
                dest = TARGET_ROOT / s.name
                if not dest.exists():
                    shutil.copytree(s, dest)
                    registered.append(s.name)
                    
    # 5. vLX42 remotion video skill
    vlx_dir = SOURCE_ROOT / "vLX42__remotion-video-skill"
    if vlx_dir.exists() and (vlx_dir / "SKILL.md").exists():
        dest = TARGET_ROOT / "remotion-video-sync"
        if not dest.exists():
            shutil.copytree(vlx_dir, dest)
            registered.append("remotion-video-sync")
            
    # 6. madhavsomani animation skills (visual-style recipes)
    anim_dir = SOURCE_ROOT / "madhavsomani__animation-skills" / "skills"
    if anim_dir.exists():
        for s in anim_dir.iterdir():
            if s.is_dir() and (s / "SKILL.md").exists():
                dest = TARGET_ROOT / s.name
                if not dest.exists():
                    shutil.copytree(s, dest)
                    registered.append(s.name)
                    
    print(f"Successfully registered {len(registered)} new skills into {TARGET_ROOT}:")
    for r in sorted(registered):
        print(f"  + {r}")

if __name__ == "__main__":
    register_skills()
