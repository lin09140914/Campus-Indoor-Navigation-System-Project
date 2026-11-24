"""驗證分層 1F SVG 與 drafts/floor-1 的對應；只用 Python 3 標準函式庫。

這是草稿的結構／座標驗證，不是實測或正式跨組資料驗收。
"""
from pathlib import Path
import collections
import hashlib
import json
import math
import re
import sys
import xml.etree.ElementTree as ET
import argparse
from floor1_geometry import segments as path_segments, closed_polygon, area, contains
from validate_floor1_contract import validate_contract, formal_pending

ROOT = Path(__file__).resolve().parents[1]
SVG = '{http://www.w3.org/2000/svg}'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def point_distance(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) if l2 else 0
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)


def crosses(a, b, c, d):
    rx, ry = b[0] - a[0], b[1] - a[1]
    sx, sy = d[0] - c[0], d[1] - c[1]
    denominator = rx * sy - ry * sx
    if abs(denominator) < 1e-8:
        return False
    t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / denominator
    u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / denominator
    return 1e-4 < t < 1 - 1e-4 and 1e-4 < u < 1 - 1e-4


def region_polygon(el):
    name = el.tag.split('}')[-1]
    if name == 'path':
        return closed_polygon(el.get('d', ''))
    if name == 'polygon':
        values = list(map(float, re.split(r'[\s,]+', el.get('points', '').strip())))
        require(len(values) >= 6 and len(values) % 2 == 0 and all(math.isfinite(v) for v in values), '區域 polygon 格式錯誤。')
        points = list(zip(values[::2], values[1::2]))
        require(area(points) > 1e-8, '區域 polygon 沒有面積。')
        return points
    if name == 'rect':
        x, y, w, h = [float(el.get(k, 0)) for k in ('x', 'y', 'width', 'height')]
        require(all(math.isfinite(v) for v in (x, y, w, h)) and w > 0 and h > 0, '區域 rect 必須有有效面積。')
        return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    raise ValueError(f'不支援的區域幾何：{name}')


def validate(strict=False, report_path=None):
    draft = ROOT / 'data/drafts/floor-1'
    graph = json.loads((draft / 'graph.json').read_text(encoding='utf-8'))
    mapping = json.loads((draft / 'node_map.json').read_text(encoding='utf-8'))
    destinations = json.loads((draft / 'destinations.json').read_text(encoding='utf-8'))
    floors = json.loads((draft / 'floors.pending.json').read_text(encoding='utf-8'))
    validate_contract(graph, mapping, destinations, floors)
    for floor in floors['floors']:
        require((draft / floor['svg']).is_file(), f'Floor 引用的 SVG 檔案不存在：{floor["svg"]}')
    annotations = json.loads((draft / 'annotations.json').read_text(encoding='utf-8'))
    raw = (ROOT / 'data/svg/floor-1.svg').read_text(encoding='utf-8')
    root = ET.fromstring(raw)
    require(root.tag == SVG + 'svg', '根元素必須是 SVG。')
    layers = {el.get('id'): el for el in root.findall(SVG + 'g')}
    expected = ['corridors', 'rooms', 'walls', 'stairs', 'elevators', 'doors', 'fixtures', 'nav-anchors', 'labels']
    require(list(layers) == expected, '標準圖層缺失、重複或堆疊順序不符。')
    for attr, value in [('data-building-id', graph['building_id']), ('data-floor', '1'), ('data-map-version', graph['map_version'])]:
        require(root.get(attr) == value, f'{attr} 與 Graph 不同。')
    ids = [el.get('id') for el in root.iter() if el.get('id')]
    require(len(ids) == len(set(ids)), 'SVG ID 重複。')
    by_id = {el.get('id'): el for el in root.iter() if el.get('id')}
    for el in root.iter():
        name = el.tag.split('}')[-1]
        require(name not in ('script', 'image', 'foreignObject', 'use'), f'禁止外部資源／可執行內容：{name}')
        require(not el.get('transform'), '交付幾何須已套用 transform。')
        require(not any(key.lower().startswith('on') for key in el.attrib), '禁止 SVG 事件程式碼。')
        require(not any('url(' in value or 'javascript:' in value or 'href' in key for key, value in el.attrib.items()), '禁止外部或隱含資源引用。')
        if el.get('display') == 'none':
            require(el.get('id') == 'nav-anchors', '僅保留有用途的隱藏導航錨點圖層。')
        require('display:none' not in el.get('style', '').replace(' ', ''), '不可殘留隱藏原圖。')
    require(not any(name in raw for name in ['Original_Map', 'Original_Annotations', 'clipPath', 'sodipodi:']), '原始圖／編輯殘留尚未清除。')
    wall_paths = layers['walls'].findall('.//' + SVG + 'path')
    require(wall_paths, 'walls 不可空白。')
    require(not layers['walls'].findall('.//' + SVG + 'text'), '牆體混入文字。')
    wall_polygons = []
    wall_shapes = set()
    for el in wall_paths:
        require(el.get('fill', layers['walls'].get('fill')) not in (None, 'none'), 'V1.1 牆體必須有填色面積，不能只靠 stroke-width。')
        require(el.get('stroke', layers['walls'].get('stroke', 'none')) == 'none', '牆厚必須由封閉輪廓表達。')
        points = closed_polygon(el.get('d', ''))
        wall_polygons.append((el.get('id'), points))
        key = tuple(sorted(points))
        require(key not in wall_shapes, f'重複牆輪廓：{el.get("id")}')
        wall_shapes.add(key)
        edges = list(zip(points, points[1:] + points[:1]))
        for i, (aa, bb) in enumerate(edges):
            for j in range(i + 2, len(edges)):
                if i == 0 and j == len(edges) - 1:
                    continue
                require(not crosses(aa, bb, *edges[j]), f'牆輪廓自交：{el.get("id")}')
    for name in ('rooms', 'corridors'):
        for el in layers[name].iter():
            if el.tag.split('}')[-1] in ('rect', 'polygon', 'path'):
                region_polygon(el)
    for name in ('stairs', 'elevators'):
        for group in layers[name].findall(SVG + 'g'):
            boundaries = [el for el in group if el.tag.split('}')[-1] in ('rect', 'polygon') or (el.tag == SVG + 'path' and el.get('d', '').strip().endswith('Z'))]
            require(boundaries, f'{group.get("id")} 缺少設施範圍輪廓。')
            for el in boundaries:
                region_polygon(el)
    require(layers['labels'].findall(SVG + 'text'), 'labels 必須保留可編輯的 text。')
    require(not layers['labels'].findall('.//' + SVG + 'path'), 'labels 不應殘留文字描邊。')
    # 依封閉牆體的邊界與內部檢查開口，不能只檢查原中心線。
    walls = [(el.get('id'), seg) for el in wall_paths for seg in path_segments(el.get('d'))]
    openings = []
    for el in layers['doors'].findall(SVG + 'g'):
        if el.get('data-opening-axis') is None:
            continue
        axis = int(el.get('data-opening-axis'))
        fixed = float(el.get('data-opening-fixed'))
        lo, hi = float(el.get('data-opening-min')), float(el.get('data-opening-max'))
        p = ((lo + hi) / 2, fixed) if axis == 0 else (fixed, (lo + hi) / 2)
        covered = [id for id, (aa, bb) in walls if point_distance(p, aa, bb) < 0.015]
        filled = [id for id, polygon in wall_polygons if contains(p, polygon)]
        require(not covered and not filled, f'門口 {el.get("id")} 仍被牆體覆蓋：{covered + filled}')
        openings.append(el)
    require(len(openings) >= 41, '門口幾何資訊不足。')
    nodes = {n['id']: n for n in graph['nodes']}
    require(len(mapping['entries']) == len(nodes), 'Node Mapping 數量不一致。')
    require(mapping['map_version'] == graph['map_version'], 'Mapping 版本不同。')
    require(mapping['building_id'] == graph['building_id'], 'Mapping 建築 ID 不同。')
    anchors = layers['nav-anchors'].findall(SVG + 'circle')
    require(len(anchors) == len(nodes), '導航錨點數量不一致。')
    mapped_nodes, mapped_anchors = set(), set()
    transform = graph['svg_transform']
    vb = list(map(float, root.get('viewBox').split()))
    for entry in mapping['entries']:
        node = nodes[entry['node_id']]
        anchor = by_id.get(entry['svg_anchor_id'])
        require(anchor is not None and anchor in anchors, f'缺少錨點：{entry}')
        require(entry['node_id'] not in mapped_nodes and entry['svg_anchor_id'] not in mapped_anchors, 'Mapping 必須一對一。')
        mapped_nodes.add(entry['node_id'])
        mapped_anchors.add(entry['svg_anchor_id'])
        require(anchor.get('data-node-id') == node['id'] and entry['floor'] == node['floor'], '錨點／樓層對應錯誤。')
        u, v = float(anchor.get('cx')), float(anchor.get('cy'))
        if graph['unit'] == 'm':
            angle = math.radians(transform['rotation_deg'])
            scale = transform['scale_m_per_svg_unit']
            x = transform['origin_x_m'] + scale * ((u - vb[0]) * math.cos(angle) - (v - vb[1]) * math.sin(angle))
            z = transform['origin_z_m'] + scale * ((u - vb[0]) * math.sin(angle) + (v - vb[1]) * math.cos(angle))
        else:
            x, z = u, v
        require(math.hypot(x - node['x'], z - node['z']) < 0.0001, f'錨點位置與 Graph 不同：{node["id"]}')
    for room in annotations['rooms']:
        require('room-' + room['id'] in by_id, f'缺少房間地板：{room["id"]}')
        door = nodes[room['id'] + '#door']
        candidates = [o for o in openings if room['id'] in o.get('data-room-id', '').split()]
        require(candidates, f'缺少房間門口分類：{room["id"]}')
        # 此處檢查原圖座標；正式轉換誤差由上方錨點測試另行確認。
        require(any(abs(room['door'][1 - int(o.get('data-opening-axis'))] - float(o.get('data-opening-fixed'))) < 0.001 for o in candidates), f'門錨點未落在實際開口線：{door["id"]}')
        xs, ys = zip(*room['boundary'])
        require(min(xs) <= room['at'][0] <= max(xs) and min(ys) <= room['at'][1] <= max(ys), f'房間代表點超出地板：{room["id"]}')
    # 將全部 Graph 線段投回 SVG；目前路網不應穿越任何實際牆線。
    anchor_positions = {entry['node_id']: (float(by_id[entry['svg_anchor_id']].get('cx')),
                                         float(by_id[entry['svg_anchor_id']].get('cy'))) for entry in mapping['entries']}
    for edge in graph['edges']:
        p, q = anchor_positions[edge['a']], anchor_positions[edge['b']]
        crossed = [id for id, (aa, bb) in walls if crosses(p, q, aa, bb)]
        inside = [id for id, polygon in wall_polygons if contains(p, polygon) or contains(q, polygon) or contains(((p[0]+q[0])/2, (p[1]+q[1])/2), polygon)]
        require(not crossed and not inside, f'Graph 連線穿牆：{edge["a"]} → {edge["b"]}：{crossed + inside}')
    require(hashlib.sha256(raw.encode('utf-8')).hexdigest() == graph['source']['sha256'], 'SVG SHA256 不符。')
    result = collections.Counter(el.tag.split('}')[-1] for el in root.iter())
    pending = formal_pending(graph, floors, any(el.get('data-width-status') == 'drawing-line-width-not-measured' for el in wall_paths))
    report = {
        'map_version': graph['map_version'], 'building_id': graph['building_id'],
        'schema_version': 'V1.1', 'schema_git_commit': '89a6ae3fdbabdfc38f989d07330c1d40a63ad304',
        'draft_consistency': 'pass', 'formal_delivery': 'pending' if pending else 'pass',
        'current_review_scope': graph.get('measurement_policy', {}).get('current_scope', 'svg_graph_structure_and_correspondence'),
        'measurement_policy': graph.get('measurement_policy', {}),
        'counts': {'layers': len(layers), 'closed_wall_objects': len(wall_paths), 'door_openings': len(openings),
                   'nodes': len(nodes), 'edges': len(graph['edges']), 'anchors': len(anchors)},
        'checks': ['closed_nonzero_wall_geometry', 'closed_space_geometry', 'facility_boundaries',
                   'unique_ids', 'graph_fields_types_weights', 'no_duplicate_edges', 'no_wall_crossing',
                   'one_to_one_node_mapping', 'destination_references', 'same_map_version', 'source_hash'],
        'pending': pending,
    }
    if report_path:
        Path(report_path).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'草稿一致性通過：{len(layers)} 圖層、{len(wall_paths)} 封閉牆體、{len(openings)} 門口、{len(anchors)} 錨點。')
    if graph.get('measurement_policy', {}).get('status') == 'deferred_by_user':
        print('本輪範圍：SVG／Graph 結構與對應檢查；實際尺寸依使用者安排延後量測。')
    print('正式交付：' + ('尚未通過。' if pending else '檢查通過。'))
    for item in pending:
        print('  待完成：' + item)
    if strict and pending:
        raise ValueError('正式交付條件尚未完成；草稿通過不代表正式驗收通過。')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict', action='store_true', help='依正式交付條件驗證；缺少量測資料會失敗。')
    parser.add_argument('--report', type=Path, help='將檢查結果寫成 JSON。')
    args = parser.parse_args()
    try:
        validate(strict=args.strict, report_path=args.report)
    except (ValueError, KeyError, ET.ParseError) as error:
        print(f'驗證失敗：{error}', file=sys.stderr)
        sys.exit(1)
