import copy
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from qa import alpha_check, contract_check


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((Path(__file__).resolve().parents[1] / 'assets/contract.example.json').read_text())
        self.data['captionPages'] = [{'startMs': 12000, 'endMs': 13000, 'tokens': [{'text': ' Real', 'startMs': 12000, 'endMs': 12400}, {'text': ' UI', 'startMs': 12500, 'endMs': 12900}]}]

    def test_valid_structure_does_not_claim_media_review(self):
        result = contract_check(self.data, Path('.'))
        self.assertEqual(result['frames'], 1500)
        self.assertEqual(result['visual_audio_factual_review'], 'not assessed')
        self.assertIn('structure only', result['scope'])

    def test_empty_expected_captions_fail(self):
        self.data['captionPages'] = []
        with self.assertRaisesRegex(ValueError, 'captions are empty'):
            contract_check(self.data, Path('.'))

    def test_picture_gap_and_overlap_fail(self):
        for offset in [-1, 1]:
            data = copy.deepcopy(self.data)
            data['scenes'][1]['from'] += offset
            with self.assertRaisesRegex(ValueError, 'gap/overlap'):
                contract_check(data, Path('.'))

    def test_source_overrun_fails(self):
        self.data['scenes'][0]['sourceDurationSeconds'] = 2
        with self.assertRaisesRegex(ValueError, 'source duration'):
            contract_check(self.data, Path('.'))

    def test_packed_frame_overrun_fails(self):
        self.data['presenterWindows'][-1]['packedStart'] += 1
        with self.assertRaisesRegex(ValueError, 'prepared source'):
            contract_check(self.data, Path('.'))

    def test_caption_word_outside_page_fails(self):
        self.data['captionPages'][0]['tokens'][-1]['endMs'] = 14000
        with self.assertRaisesRegex(ValueError, 'token timing'):
            contract_check(self.data, Path('.'))

    def test_floating_box_fails(self):
        self.data['presenter']['bottom'] = 350
        with self.assertRaisesRegex(ValueError, 'anchored'):
            contract_check(self.data, Path('.'))

    def test_no_avatar_request_is_supported(self):
        self.data['presenter'] = {'enabled': False}
        self.data['presenterWindows'] = []
        self.assertEqual(contract_check(self.data, Path('.'))['frames'], 1500)

    def test_missing_media_fails(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(ValueError, 'Missing source'):
                contract_check(self.data, Path(folder), True)


class AlphaTests(unittest.TestCase):
    def prepare(self, folder, rectangle=(0, 2, 4, 9)):
        for index in range(3):
            image = Image.new('RGBA', (10, 10))
            ImageDraw.Draw(image).rectangle(rectangle, fill=(130 + index, 100, 80, 255))
            image.save(Path(folder) / f'{index:04d}.png')

    def test_actual_edge_contact_and_clear_text(self):
        with tempfile.TemporaryDirectory() as folder:
            self.prepare(folder)
            result = alpha_check(Path(folder), 10, 10, 3, rectangles=[(6, 2, 12, 10)])
            self.assertEqual(result['distinct_frames'], 3)
            self.assertEqual(result['bounds_min'], [0, 2, 5, 10])

    def test_transparent_box_does_not_hide_floating_body(self):
        with tempfile.TemporaryDirectory() as folder:
            self.prepare(folder, (0, 2, 4, 8))
            with self.assertRaisesRegex(ValueError, 'floats'):
                alpha_check(Path(folder), 10, 10, 3)

    def test_wrong_mirror_is_detected_for_source_cut_edge(self):
        with tempfile.TemporaryDirectory() as folder:
            self.prepare(folder, (5, 2, 9, 9))
            with self.assertRaises(ValueError):
                alpha_check(Path(folder), 10, 10, 3)
            self.assertTrue(alpha_check(Path(folder), 10, 10, 3, mirror=True)['mirror'])

    def test_text_collision_is_detected(self):
        with tempfile.TemporaryDirectory() as folder:
            self.prepare(folder)
            with self.assertRaisesRegex(ValueError, 'collision'):
                alpha_check(Path(folder), 10, 10, 3, rectangles=[(3, 4, 9, 8)])

    def test_missing_frame_is_detected(self):
        with tempfile.TemporaryDirectory() as folder:
            self.prepare(folder)
            (Path(folder) / '0001.png').unlink()
            with self.assertRaisesRegex(ValueError, 'Missing expected'):
                alpha_check(Path(folder), 10, 10, 3)


if __name__ == '__main__':
    unittest.main()
