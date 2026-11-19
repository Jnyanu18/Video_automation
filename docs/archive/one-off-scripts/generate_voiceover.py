import asyncio
import edge_tts
import os
import subprocess

os.makedirs('raw footage/education/audio', exist_ok=True)

sections = [
    {
        "id": "sec1_hook",
        "text": "If a shirt costs 1,000 rupees and you get a 20 percent discount, how much do you actually save?",
        "rate": "+18%"
    },
    {
        "id": "sec2_definition",
        "text": "Percentage simply means per hundred. It tells us how much something represents out of 100.",
        "rate": "+18%"
    },
    {
        "id": "sec3_formula",
        "text": "Here is the key formula: Percentage equals Part divided by Total, times 100. For example, 20 students out of 50 passed, which is 40 percent.",
        "rate": "+20%"
    },
    {
        "id": "sec4_shortcuts",
        "text": "To calculate faster, remember these shortcuts: 10 percent, divide by 10. 5 percent, half of 10. 1 percent, divide by 100. For 15 percent of 200: 10 percent is 20, 5 percent is 10, giving 30!",
        "rate": "+20%"
    },
    {
        "id": "sec5_golden",
        "text": "Here is the golden aptitude trick: X percent of Y is equal to Y percent of X! 25 percent of 80 is the same as 80 percent of 25. Both equal 20!",
        "rate": "+20%"
    },
    {
        "id": "sec6_recap",
        "text": "Remember: per hundred, part over total times 100, and use mental shortcuts. Practice these and master percentages! Learn smart, solve faster.",
        "rate": "+18%"
    }
]

async def synthesize_all():
    voice = "en-US-ChristopherNeural"
    for sec in sections:
        out_path = f"raw footage/education/audio/{sec['id']}.mp3"
        communicate = edge_tts.Communicate(sec['text'], voice, rate=sec['rate'])
        await communicate.save(out_path)
        print(f"Synthesized {sec['id']}")

asyncio.run(synthesize_all())
print("Re-synthesized with tuned rates.")
