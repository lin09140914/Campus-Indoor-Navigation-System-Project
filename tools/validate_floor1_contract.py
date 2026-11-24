"""新版資料契約的草稿結構驗證；正式交付還要具備世界座標與量測資料。"""
import math
import re


def require(condition, message):
    if not condition:
        raise ValueError(message)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def text(value):
    return isinstance(value, str) and bool(value.strip())


def snake_case(value):
    if isinstance(value, dict):
        for key, child in value.items():
            require(re.fullmatch(r'[a-z][a-z0-9_]*', key), f'跨組 JSON 欄位未使用 snake_case：{key}')
            snake_case(child)
    elif isinstance(value, list):
        for child in value:
            snake_case(child)


def validate_contract(graph, mapping, destinations, floors):
    for doc in (graph, mapping, destinations, floors):
        snake_case(doc)
        for key in ('building_id', 'map_version'):
            require(text(doc.get(key)) and doc[key] == graph.get(key), f'跨資料 {key} 缺失或不一致。')
    require(text(graph.get('coordinate_system_id')), 'Graph 缺少 coordinate_system_id。')
    require(floors.get('coordinate_system_id') == graph['coordinate_system_id'], 'Floor 與 Graph 座標系統不同。')
    nodes = {}
    for node in graph['nodes']:
        require(text(node.get('id')) and node['id'] not in nodes, 'Graph Node ID 缺失或重複。')
        require(finite(node.get('x')) and finite(node.get('z')), f'Node 座標不是有限數字：{node["id"]}')
        require(integer(node.get('floor')) and node['floor'] != 0, 'Node 樓層必須是非零整數。')
        require(node.get('type') in ('walk', 'door', 'stair', 'elev'), f'Node type 不符規格：{node["id"]}')
        nodes[node['id']] = node
    require(nodes, 'Graph 不可沒有 Node。')
    pairs = set()
    for edge in graph['edges']:
        a, b = edge.get('a'), edge.get('b')
        require(a in nodes and b in nodes and a != b, 'Edge 端點不存在或自己連自己。')
        pair = tuple(sorted((a, b)))
        require(pair not in pairs, f'重複無向 Edge：{pair}')
        pairs.add(pair)
        require(finite(edge.get('w')) and edge['w'] > 0, f'Edge 權重必須是有限正數：{pair}')
        require(edge.get('kind') in ('walk', 'stair', 'elev'), f'Edge kind 不符規格：{pair}')
        straight = math.hypot(nodes[a]['x'] - nodes[b]['x'], nodes[a]['z'] - nodes[b]['z'])
        require(edge['w'] + 1e-8 >= straight, f'Edge 權重小於 XZ 直線距離：{pair}')
        require(nodes[a]['floor'] == nodes[b]['floor'] or edge['kind'] in ('stair', 'elev'), '跨層 Edge 不能是 walk。')
    floor_ids = set()
    for floor in floors['floors']:
        number = floor.get('floor')
        require(integer(number) and number != 0 and number not in floor_ids, 'Floor ID 缺失或重複。')
        floor_ids.add(number)
        require(text(floor.get('label')) and text(floor.get('svg')), 'Floor 缺少 label 或 svg。')
        require(isinstance(floor.get('svg_transform'), dict), 'Floor 缺少 svg_transform。')
        require(floor['svg_transform'] == graph['svg_transform'], 'Floor 與 Graph 使用不同轉換參數。')
    require(all(node['floor'] in floor_ids for node in nodes.values()), 'Graph 引用了不存在的 Floor。')
    mapped_nodes, anchors = set(), set()
    for entry in mapping['entries']:
        id = entry.get('node_id')
        require(id in nodes and id not in mapped_nodes, 'Mapping Node ID 不存在或重複。')
        require(integer(entry.get('floor')) and entry['floor'] == nodes[id]['floor'], 'Mapping 樓層與 Node 不同。')
        anchor = entry.get('svg_anchor_id')
        require(text(anchor) and anchor not in anchors, 'Mapping Anchor ID 缺失或重複。')
        mapped_nodes.add(id)
        anchors.add(anchor)
    require(mapped_nodes == set(nodes), 'Mapping 必須逐一涵蓋全部 Node。')
    location_ids = set()
    for loc in destinations['locations']:
        id = loc.get('id')
        require(text(id) and id not in location_ids and text(loc.get('name')), 'Location ID／名稱缺失或 ID 重複。')
        location_ids.add(id)
        require(loc.get('node_id') in nodes, f'Location 引用不存在的 Node：{id}')
        require(integer(loc.get('floor')) and loc['floor'] == nodes[loc['node_id']]['floor'], 'Location 樓層與 Node 不同。')
        require(loc.get('category') in ('room', 'entrance', 'facility', 'stair', 'elev', 'other'), 'Location category 不符規格。')
    return nodes


def formal_pending(graph, floors, wall_width_pending=True):
    pending = []
    if graph.get('unit') != 'm':
        pending.append('Graph x/z 與 Edge w 仍為 SVG 圖面單位，未符合第 3 節的世界座標／等效公尺。')
    transform = graph['svg_transform']
    keys = ('origin_x_m', 'origin_z_m', 'scale_m_per_svg_unit', 'rotation_deg')
    if not all(finite(transform.get(k)) for k in keys) or not (finite(transform.get('scale_m_per_svg_unit')) and transform['scale_m_per_svg_unit'] > 0):
        pending.append('缺少確認後的比例、原點與旋轉，尚未具備第 2、7 節要求的正式 floors.json。')
    if any(not finite(f.get('elevation_m')) for f in floors['floors']):
        pending.append('樓層 elevation_m 尚未確認。')
    if graph.get('building_id_status') == 'provisional' or graph['coordinate_system_id'].endswith('PENDING'):
        pending.append('Building ID 與 coordinate_system_id 尚待整合組定案。')
    if wall_width_pending:
        pending.append('封閉牆體的寬度僅由原圖線寬展開，實際牆厚尚未確認。')
    if any(n.get('temporary_id') for n in graph['nodes']):
        pending.append('A119／A114 的重複房號仍使用 TEMP-* 暫名。')
    return pending
