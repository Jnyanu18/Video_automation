import os
import glob
import json

with open('raw footage/scene_analysis/scenes_enriched.json') as f:
    scenes = json.load(f)

html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Director's Scene Contact Sheet - Dubai Diamond Conference</title>
<style>
  body { background: #111; color: #eee; font-family: sans-serif; padding: 20px; }
  h1, h2 { color: #f5c518; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 40px; }
  .card { background: #222; border-radius: 8px; overflow: hidden; border: 1px solid #333; }
  .card img { width: 100%; height: 135px; object-fit: cover; display: block; }
  .card .info { padding: 8px 10px; font-size: 12px; }
  .card .title { font-weight: bold; color: #fff; margin-bottom: 4px; }
  .tag { background: #333; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; font-size: 11px; }
</style>
</head>
<body>
<h1>DIRECTOR'S FOOTAGE ANALYSIS & CONTACT SHEET</h1>
<p>Total Scenes Detected: """ + str(len(scenes)) + """ | Source: Dubai Diamond Conference 2022 (84.78s)</p>

<h2>All Detected Scenes (Landscape 16:9)</h2>
<div class="grid">
"""

for s in scenes:
    labels = ", ".join(s.get('labels', [])) if s.get('labels') else "visual"
    html += f"""
    <div class="card">
      <img src="{os.path.basename(s['thumb'])}" alt="Scene {s['scene_id']}">
      <div class="info">
        <div class="title">Scene {s['scene_id']:02d} ({s['start']:.2f}s - {s['end']:.2f}s)</div>
        <div>Dur: <b>{s['duration']:.2f}s</b> | Br: {s['brightness']} | Ct: {s['contrast']}</div>
        <div class="tag">{labels}</div>
      </div>
    </div>
    """

html += """
</div>
<h2>Pre-Cut Vertical Clips (cuts/clip_00 to clip_09)</h2>
<div class="grid">
"""

for i in range(10):
    thumb = f"../cuts/clip_{i:02d}_thumb.jpg"
    html += f"""
    <div class="card" style="height: auto;">
      <img src="{thumb}" style="height: 320px; object-fit: cover;" alt="Clip {i}">
      <div class="info">
        <div class="title">Clip {i:02d} (Vertical 9:16)</div>
      </div>
    </div>
    """

html += """
</div>
</body>
</html>
"""

with open('raw footage/scene_analysis/contact_sheet.html', 'w') as f:
    f.write(html)

print("Contact sheet generated at raw footage/scene_analysis/contact_sheet.html")
