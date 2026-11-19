import argparse
import hashlib
import json
import math
import re
import struct
import subprocess
from pathlib import Path


def require(condition, message):
    if not condition:
        raise ValueError(message)


def integer(value, label, minimum=0):
    require(type(value) is int and value >= minimum, f'{label} must be an integer >= {minimum}')
    return value


def number(value, label, minimum=0):
    require(type(value) in (int, float) and math.isfinite(value) and value >= minimum, f'{label} must be finite and >= {minimum}')
    return value


def digest(path):
    checksum = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            checksum.update(block)
    return checksum.hexdigest()


def run(arguments):
    result = subprocess.run(arguments, capture_output=True, text=True, encoding='utf-8', errors='replace')
    require(result.returncode == 0, f'Command failed: {arguments[0]}: {result.stderr[-2500:]}')
    return result


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]).stdout)


def contract_check(data, root, assets=False):
    require(data.get('schemaVersion') == 1, 'Unsupported schemaVersion')
    width = integer(data['width'], 'width', 1)
    height = integer(data['height'], 'height', 1)
    fps = integer(data['fps'], 'fps', 1)
    total = integer(data['frames'], 'frames', 1)
    require(width * 16 == height * 9, 'This preset requires 9:16; record a separately reviewed layout for another aspect')
    scenes = data['scenes']
    require(bool(scenes), 'No picture scenes')
    require(scenes[0]['kind'] == 'result' and scenes[-1]['kind'] == 'closing', 'Result-first and closing scenes are required')
    position = 0
    checked = []
    metadata = {}
    for index, scene in enumerate(scenes):
        start = integer(scene['from'], f'scene {index} from')
        length = integer(scene['frames'], f'scene {index} frames', 1)
        require(start == position, f'Picture gap/overlap at scene {index}: expected {position}, got {start}')
        position += length
        source_start = number(scene['sourceStartSeconds'], 'source start')
        rate = number(scene['playbackRate'], 'playback rate', .000001)
        duration = number(scene['sourceDurationSeconds'], 'source duration', .000001)
        source_end = source_start + (length - 1) / fps * rate
        require(source_end < duration, f'Scene {index} exceeds declared source duration')
        if assets:
            path = (root / scene['source']).resolve()
            require(path.is_file(), f'Missing source: {path}')
            if path not in metadata:
                metadata[path] = probe(path)
            streams = metadata[path]['streams']
            video = next((stream for stream in streams if stream['codec_type'] == 'video'), None)
            require(video is not None, f'Not a video source: {path}')
            measured = float(video.get('duration', metadata[path]['format'].get('duration', 0)))
            require(source_end < measured, f'Scene {index} exceeds measured source duration')
            require(abs(duration - measured) <= max(.1, 1 / fps), f'Scene {index} has stale measured sourceDurationSeconds')
            checked.append(str(path))
    require(position == total, f'Picture ends at {position}, expected {total}')
    presenter = data.get('presenter', {'enabled': False})
    require(type(presenter.get('enabled')) is bool, 'presenter.enabled must be boolean')
    windows = data.get('presenterWindows', [])
    require(presenter['enabled'] or not windows, 'Presenter disabled but windows remain')
    if presenter['enabled']:
        require(bool(windows), 'Enabled presenter has no windows')
        require(presenter['left'] == 0 and presenter['bottom'] == 0, 'Presenter must be anchored at actual left/bottom edges')
        require(type(presenter['mirror']) is bool, 'Explicit mirror decision required')
        integer(presenter['width'], 'presenter width', 1)
        integer(presenter['height'], 'presenter height', 1)
        prepared = integer(presenter['preparedFrames'], 'preparedFrames', 1)
        end = 0
        for window in windows:
            start = integer(window['from'], 'presenter from')
            length = integer(window['frames'], 'presenter frames', 3)
            packed = integer(window['packedStart'], 'packedStart')
            require(start >= end and start + length <= total, 'Overlapping/out-of-range presenter window')
            require(packed + length <= prepared, 'Presenter exceeds prepared source frames')
            end = start + length
        if assets:
            folder = root / presenter['framesDir']
            expected = {f'{index:04d}.png' for index in range(prepared)}
            require(folder.is_dir() and {path.name for path in folder.glob('*.png')} == expected, 'Prepared frame sequence is missing, noncontiguous or wrong length')
    pages = data.get('captionPages', [])
    require(not data.get('captionsExpected', True) or bool(pages), 'Expected captions are empty')
    previous_end = 0
    for page in pages:
        start = number(page['startMs'], 'caption start')
        end = number(page['endMs'], 'caption end')
        require(previous_end <= start < end <= total / fps * 1000, 'Overlapping/out-of-range caption page')
        previous_end = end
        require(bool(page['tokens']), 'Empty caption page')
        token_end = start
        for token in page['tokens']:
            require(isinstance(token['text'], str) and bool(token['text'].strip()), 'Empty caption token')
            begin = number(token['startMs'], 'token start')
            finish = number(token['endMs'], 'token end')
            require(token_end <= begin < finish <= end, 'Caption token timing falls outside page or overlaps')
            token_end = finish
    protected = []
    if assets:
        audio = root / data['audio']
        require(audio.is_file(), f'Missing narration: {audio}')
        audio_info = probe(audio)
        require(any(stream['codec_type'] == 'audio' for stream in audio_info['streams']), 'Narration has no audio stream')
        require(float(audio_info['format']['duration']) + 1 / fps >= total / fps, 'Narration/mix shorter than declared composition; explicitly prepare the intended tail')
        for entry in data.get('protectedFiles', []):
            path = root / entry['path']
            require(path.is_file() and digest(path) == entry['sha256'].lower(), f'Protected source changed/missing: {path}')
            protected.append(str(path))
    asset_hashes = {path: digest(path) for path in set(checked)} if assets else {}
    if assets:
        asset_hashes[str(audio.resolve())] = digest(audio)
    return {'gate': 'contract', 'scope': 'structure and actual media' if assets else 'structure only; media not verified', 'frames': total, 'scene_count': len(scenes), 'caption_pages': len(pages), 'checked_sources': checked, 'asset_sha256': asset_hashes, 'protected_files_checked': protected, 'visual_audio_factual_review': 'not assessed'}


def alpha_check(folder, width, height, count, mirror=False, rectangles=()):
    from PIL import Image, ImageOps
    expected = [folder / f'{index:04d}.png' for index in range(count)]
    require(count > 0 and all(path.is_file() for path in expected), 'Missing expected alpha frames')
    require(len(list(folder.glob('*.png'))) == count, 'Unexpected frame count')
    bounds = []
    opaque_fractions = []
    hashes = []
    for path in expected:
        with Image.open(path) as image:
            require(image.size == (width, height) and image.mode == 'RGBA', f'Wrong size/mode: {path.name}')
            alpha = (ImageOps.mirror(image) if mirror else image).getchannel('A')
            require(alpha.getextrema()[0] < 255, f'No transparency: {path.name}')
            mask = alpha.point(lambda value: 255 if value > 32 else 0)
            bound = mask.getbbox()
            require(bound is not None and bound[0] == 0 and bound[3] == height, f'Visible cutout floats or misses left edge: {path.name}: {bound}')
            for rectangle in rectangles:
                left, top, right, bottom = rectangle
                require(left < right and top < bottom, 'Invalid text rectangle')
                left, top, right, bottom = max(0, left), max(0, top), min(width, right), min(height, bottom)
                if left < right and top < bottom:
                    require(mask.crop((left, top, right, bottom)).getbbox() is None, f'Alpha/text collision: {path.name}: {rectangle}')
            bounds.append(bound)
            opaque_fractions.append(mask.histogram()[255] / (width * height))
            hashes.append(hashlib.sha256(image.tobytes()).hexdigest())
    longest = current = 1
    for previous, following in zip(hashes, hashes[1:]):
        current = current + 1 if previous == following else 1
        longest = max(longest, current)
    return {'gate': 'alpha', 'frames_checked': count, 'sequence_rgba_sha256': hashlib.sha256(''.join(hashes).encode('ascii')).hexdigest(), 'size': [width, height], 'mirror': mirror, 'bounds_min': [min(bound[axis] for bound in bounds) for axis in range(4)], 'bounds_max': [max(bound[axis] for bound in bounds) for axis in range(4)], 'opaque_fraction_of_asset_min': min(opaque_fractions), 'opaque_fraction_of_asset_max': max(opaque_fractions), 'distinct_frames': len(set(hashes)), 'longest_duplicate_run': longest, 'text_rectangles_checked': list(rectangles), 'rendered_orientation_and_lip_sync': 'not assessed'}


def mp4_atoms(path):
    atoms = []
    size_on_disk = path.stat().st_size
    with path.open('rb') as handle:
        while handle.tell() < size_on_disk:
            start = handle.tell()
            header = handle.read(8)
            require(len(header) == 8, 'Truncated MP4 atom')
            size, tag = struct.unpack('>I4s', header)
            header_size = 8
            if size == 1:
                extended = handle.read(8)
                require(len(extended) == 8, 'Truncated extended MP4 atom')
                size = struct.unpack('>Q', extended)[0]
                header_size = 16
            if size == 0:
                size = size_on_disk - start
            require(size >= header_size and start + size <= size_on_disk, 'Invalid MP4 atom size')
            atoms.append(tag.decode('ascii', errors='replace'))
            handle.seek(start + size)
    return atoms


def master_check(path, frames, fps, width=1080, height=1920, approved_audio=None):
    require(frames > 0 and fps > 0, 'Positive frames/fps required')
    metadata = probe(path)
    videos = [stream for stream in metadata['streams'] if stream['codec_type'] == 'video']
    audios = [stream for stream in metadata['streams'] if stream['codec_type'] == 'audio']
    require(len(videos) == 1 and len(audios) == 1, 'Expected one video and one audio stream')
    video, audio = videos[0], audios[0]
    require((video['width'], video['height'], video['codec_name'], video['pix_fmt'], audio['codec_name']) == (width, height, 'h264', 'yuv420p', 'aac'), 'Wrong output dimensions/codecs/pixel format')
    require(video.get('color_range') == 'tv' and all(video.get(field) == 'bt709' for field in ['color_space', 'color_transfer', 'color_primaries']), 'Expected limited BT.709 metadata; inspect actual conversion')
    expected = frames / fps
    for stream in [video, audio]:
        require(abs(float(stream['duration']) - expected) <= 1 / fps, 'Audio/video duration does not match timeline')
    raw_times = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'csv=p=0', str(path)]).stdout
    times = [float(line.split(',')[0]) for line in raw_times.splitlines() if line.split(',')[0].strip()]
    deviation = max((abs(following - previous - 1 / fps) for previous, following in zip(times, times[1:])), default=0)
    require(len(times) == frames and abs(times[0]) < .00001 and deviation < .000002, 'Wrong frame count/start/CFR timestamps')
    decode = run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'])
    require(not decode.stderr.strip(), 'Decode emitted errors')
    black = run(['ffmpeg', '-hide_banner', '-i', str(path), '-vf', 'blackdetect=d=0.10:pix_th=0.08:pic_th=0.98', '-an', '-f', 'null', '-'])
    intervals = [line for line in black.stderr.splitlines() if 'black_start:' in line]
    require(not intervals, f'Black intervals need review: {intervals}')
    atoms = mp4_atoms(path)
    require('moov' in atoms and 'mdat' in atoms and atoms.index('moov') < atoms.index('mdat'), 'Not fast-start MP4')
    loudness = run(['ffmpeg', '-hide_banner', '-i', str(path), '-af', 'loudnorm=I=-15.5:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'])
    match = re.search(r'\{[^{}]*"input_i"[^{}]*\}', loudness.stderr)
    require(match is not None, 'No loudness measurement')
    measured = json.loads(match.group())
    require(math.isfinite(float(measured['input_i'])) and math.isfinite(float(measured['input_tp'])), 'Silent/unmeasurable audio')
    audio_hash = None
    if approved_audio:
        hashes = [run(['ffmpeg', '-v', 'error', '-i', str(source), '-map', '0:a:0', '-c:a', 'copy', '-f', 'hash', '-']).stdout.strip() for source in [approved_audio, path]]
        require(hashes[0] == hashes[1], 'Approved audio packets changed')
        audio_hash = hashes[0]
    return {'gate': 'master', 'file': str(path.resolve()), 'sha256': digest(path), 'frames': len(times), 'duration': expected, 'size': [width, height], 'fps': fps, 'cfr_max_deviation_seconds': deviation, 'full_decode': 'passed', 'black_intervals': intervals, 'faststart': True, 'integrated_lufs': measured['input_i'], 'true_peak_dbtp': measured['input_tp'], 'approved_audio_packet_hash': audio_hash, 'perceptual_color_visual_listening_and_lip_sync': 'not assessed; requires manual review'}


def main():
    parser = argparse.ArgumentParser(description='Local AI Demo Reel gates; never release approval')
    commands = parser.add_subparsers(dest='command', required=True)
    contract = commands.add_parser('contract')
    contract.add_argument('path', type=Path)
    contract.add_argument('--assets', action='store_true')
    alpha = commands.add_parser('alpha')
    alpha.add_argument('path', type=Path)
    alpha.add_argument('--width', type=int, required=True)
    alpha.add_argument('--height', type=int, required=True)
    alpha.add_argument('--count', type=int, required=True)
    alpha.add_argument('--mirror', action='store_true')
    alpha.add_argument('--rect', type=int, nargs=4, action='append', default=[])
    master = commands.add_parser('master')
    master.add_argument('path', type=Path)
    master.add_argument('--frames', type=int, required=True)
    master.add_argument('--fps', type=int, required=True)
    master.add_argument('--width', type=int, default=1080)
    master.add_argument('--height', type=int, default=1920)
    master.add_argument('--approved-audio', type=Path)
    for command in [contract, alpha, master]:
        command.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == 'contract':
            result = contract_check(json.loads(args.path.read_text(encoding='utf-8')), args.path.resolve().parent, args.assets)
            result['contract_sha256'] = digest(args.path)
        elif args.command == 'alpha':
            result = alpha_check(args.path, args.width, args.height, args.count, args.mirror, args.rect)
        else:
            result = master_check(args.path, args.frames, args.fps, args.width, args.height, args.approved_audio)
        result.update({'passed': True, 'release_approval': False})
        status = 0
    except (ValueError, KeyError, TypeError, IndexError, OSError, ImportError) as error:
        result = {'gate': args.command, 'passed': False, 'error': str(error), 'release_approval': False}
        status = 1
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))
    return status


if __name__ == '__main__':
    raise SystemExit(main())
