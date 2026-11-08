from setuptools import setup, find_packages

setup(
    name="reelforge",
    version="1.0.0",
    description="Local AI Video Editor with Claude Desktop-style workflow",
    packages=find_packages(),
    python_requires=">=3.11",
    install_requires=[
        "fastapi>=0.100.0",
        "uvicorn>=0.23.0",
        "pydantic>=2.0.0",
        "anthropic>=0.34.0",
        "faster-whisper>=1.0.0",
        "yt-dlp>=2024.0.0",
        "Pillow>=9.0.0",
        "opencv-python-headless>=4.8.0",
        "python-multipart>=0.0.6",
    ],
    entry_points={
        "console_scripts": [
            "reelforge=reelforge.cli:main",
        ],
    },
)
