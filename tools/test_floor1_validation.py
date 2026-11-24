"""針對 V1.1 缺漏與不合法圖資的回歸測試。"""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

from floor1_geometry import outline, closed_polygon, contains, area
from validate_floor1_contract import validate_contract, formal_pending

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('floor1_svg_validator', Path(__file__).with_name('validate-floor1-svg.py'))
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class GeometryTests(unittest.TestCase):
    def test_stroke_is_expanded_to_real_area(self):
        polygon = outline([(0, 0), (10, 0)], 2)
        self.assertTrue(contains((5, .75), polygon))
        self.assertFalse(contains((5, 1.1), polygon))
        self.assertGreater(area(polygon), 20)

    def test_sharp_structural_corner_does_not_self_intersect(self):
        polygon = outline([(821.68, 228.187), (821.68, 257.627), (810.48, 228.187)], .5)
        edges = list(zip(polygon, polygon[1:] + polygon[:1]))
        for i, (a, b) in enumerate(edges):
            for j in range(i + 2, len(edges)):
                if i == 0 and j == len(edges) - 1:
                    continue
                self.assertFalse(validator.crosses(a, b, *edges[j]))

    def test_open_or_empty_contours_are_rejected(self):
        for d in ['M 0,0 L 10,0', 'M 0,0 Z', 'M 0,0 L 10,0 L 0,0 Z']:
            with self.subTest(d=d), self.assertRaises(ValueError):
                closed_polygon(d)
        self.assertEqual(area(closed_polygon('M 0,0 H 10 V 5 H 0 Z')), 50)


class ContractTests(unittest.TestCase):
    def setUp(self):
        folder = ROOT / 'data/drafts/floor-1'
        self.docs = [json.loads((folder / name).read_text(encoding='utf-8')) for name in
                     ['graph.json', 'node_map.json', 'destinations.json', 'floors.pending.json']]

    def test_current_draft_structure_passes_but_formal_delivery_remains_pending(self):
        self.assertEqual(len(validate_contract(*self.docs)), 141)
        self.assertTrue(formal_pending(self.docs[0], self.docs[3]))

    def test_invalid_weights_and_duplicate_edges_are_rejected(self):
        for value in [-1, 0, float('inf'), float('nan'), True]:
            docs = copy.deepcopy(self.docs)
            docs[0]['edges'][0]['w'] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_contract(*docs)
        docs = copy.deepcopy(self.docs)
        docs[0]['edges'].append(copy.deepcopy(docs[0]['edges'][0]))
        with self.assertRaisesRegex(ValueError, '重複無向'):
            validate_contract(*docs)
        docs = copy.deepcopy(self.docs)
        docs[0]['edges'][0]['w'] = .001
        with self.assertRaisesRegex(ValueError, '小於 XZ'):
            validate_contract(*docs)

    def test_duplicate_nodes_and_invalid_node_types_are_rejected(self):
        docs = copy.deepcopy(self.docs)
        docs[0]['nodes'].append(copy.deepcopy(docs[0]['nodes'][0]))
        with self.assertRaisesRegex(ValueError, '重複'):
            validate_contract(*docs)
        docs = copy.deepcopy(self.docs)
        docs[0]['nodes'][0]['type'] = 'corridor'
        with self.assertRaisesRegex(ValueError, 'type'):
            validate_contract(*docs)
        docs = copy.deepcopy(self.docs)
        docs[0]['nodes'][0]['x'] = True
        with self.assertRaises(ValueError):
            validate_contract(*docs)

    def test_mapping_and_destination_reference_errors_are_rejected(self):
        docs = copy.deepcopy(self.docs)
        docs[1]['entries'][1]['svg_anchor_id'] = docs[1]['entries'][0]['svg_anchor_id']
        with self.assertRaisesRegex(ValueError, 'Anchor'):
            validate_contract(*docs)
        docs = copy.deepcopy(self.docs)
        docs[2]['locations'][0]['node_id'] = 'DOES-NOT-EXIST'
        with self.assertRaisesRegex(ValueError, '不存在'):
            validate_contract(*docs)
        docs = copy.deepcopy(self.docs)
        docs[2]['locations'][0]['floor'] = 2
        with self.assertRaisesRegex(ValueError, '樓層'):
            validate_contract(*docs)

    def test_versions_and_field_naming_are_checked(self):
        docs = copy.deepcopy(self.docs)
        docs[2]['map_version'] = 'old-version'
        with self.assertRaisesRegex(ValueError, 'map_version'):
            validate_contract(*docs)
        docs = copy.deepcopy(self.docs)
        docs[0]['coordinateSystemId'] = 'bad-key'
        with self.assertRaisesRegex(ValueError, 'snake_case'):
            validate_contract(*docs)


if __name__ == '__main__':
    unittest.main()
