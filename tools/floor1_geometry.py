"""1F 圖資驗證／整理共用的二維幾何；不將圖面單位當作公尺。"""
import math
import re

NUMBER = r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?'


def segments(d):
    """解析交付圖稿的絕對 M/L/H/V/C/Z；C 曲線採樣成 80 段。"""
    tokens = re.findall('[MLHVCZ]|' + NUMBER, d)
    residue = re.sub('[MLHVCZ]|' + NUMBER + r'|[\s,]', '', d)
    if residue:
        raise ValueError(f'不支援的 path 命令：{residue}')
    i = 0
    at = start = (0.0, 0.0)
    result = []
    while i < len(tokens):
        command = tokens[i]
        i += 1
        if command == 'Z':
            if math.dist(at, start) > 1e-10:
                result.append((at, start))
            at = start
            continue
        if command not in ('M', 'L', 'H', 'V', 'C'):
            raise ValueError(f'path 必須使用明確的絕對座標命令：{command}')
        count = 6 if command == 'C' else 1 if command in ('H', 'V') else 2
        values = list(map(float, tokens[i:i + count]))
        if len(values) != count or not all(math.isfinite(v) for v in values):
            raise ValueError('path 座標不完整或不是有限數字。')
        i += count
        target = (values[0], at[1]) if command == 'H' else (at[0], values[0]) if command == 'V' else tuple(values[-2:])
        if command == 'M':
            start = target
        elif command in ('L', 'H', 'V'):
            result.append((at, target))
        else:
            p0, p1, p2, p3 = at, values[:2], values[2:4], target
            prev = p0
            for step in range(1, 81):
                t = step / 80
                point = tuple((1 - t)**3 * p0[k] + 3 * (1 - t)**2 * t * p1[k]
                              + 3 * (1 - t) * t * t * p2[k] + t**3 * p3[k] for k in (0, 1))
                result.append((prev, point))
                prev = point
        at = target
    return result


def area(points):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(points, points[1:] + points[:1]))) / 2


def contains(point, polygon):
    inside = False
    x, y = point
    for a, b in zip(polygon, polygon[1:] + polygon[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside


def outline(points, width):
    """把開放折線展開為有面積的封閉輪廓；寬度僅來自原圖線寬。"""
    if width <= 0 or not math.isfinite(width):
        raise ValueError('圖面線寬必須是有限正數。')
    clean = [points[0]]
    for p in points[1:]:
        if math.dist(p, clean[-1]) > 1e-8:
            clean.append(p)
    if len(clean) < 2 or math.dist(clean[0], clean[-1]) < 1e-8:
        raise ValueError('只接受非零長度的開放牆中心線。')
    points = clean
    r = width / 2
    directions = []
    for p, q in zip(points, points[1:]):
        length = math.dist(p, q)
        directions.append(((q[0] - p[0]) / length, (q[1] - p[1]) / length))
    normals = [(-dy, dx) for dx, dy in directions]

    def side(sign):
        result = [(points[0][k] + sign * r * normals[0][k]) for k in (0, 1)]
        result = [tuple(result)]
        for i in range(1, len(points) - 1):
            p = points[i]
            u, v = directions[i - 1], directions[i]
            a = tuple(p[k] + sign * r * normals[i - 1][k] for k in (0, 1))
            b = tuple(p[k] + sign * r * normals[i][k] for k in (0, 1))
            den = u[0] * v[1] - u[1] * v[0]
            if abs(den) < 1e-10:
                result.append(a)
                continue
            t = ((b[0] - a[0]) * v[1] - (b[1] - a[1]) * v[0]) / den
            intersection = (a[0] + t * u[0], a[1] + t * u[1])
            # 內側轉角必須保留交點；對內側 bevel 會讓尖角輪廓自交。
            if sign * den > 0 or math.dist(intersection, p) <= 4 * r:
                result.append(intersection)
            else:
                result.extend([a, b])
        result.append(tuple(points[-1][k] + sign * r * normals[-1][k] for k in (0, 1)))
        return result

    left, right = side(1), side(-1)

    def cap(center, angle):
        return [(center[0] + r * math.cos(angle - math.pi * i / 12),
                 center[1] + r * math.sin(angle - math.pi * i / 12)) for i in range(1, 13)]

    end_angle = math.atan2(normals[-1][1], normals[-1][0])
    start_angle = math.atan2(-normals[0][1], -normals[0][0])
    polygon = left + cap(points[-1], end_angle) + list(reversed(right[:-1])) + cap(points[0], start_angle)
    polygon = [tuple(round(v, 5) for v in p) for p in polygon]
    if polygon[-1] == polygon[0]:
        polygon.pop()
    if area(polygon) <= 0:
        raise ValueError('無法產生有效牆輪廓。')
    return polygon


def closed_polygon(d):
    if d.count('M') != 1 or d.strip()[-1:] != 'Z':
        raise ValueError('必須是單一、明確 Z 閉合的輪廓。')
    parsed = segments(d)
    if not parsed:
        raise ValueError('封閉輪廓沒有線段或面積。')
    points = [parsed[0][0]] + [q for _, q in parsed]
    if points[-1] == points[0]:
        points.pop()
    if len(points) < 3 or area(points) <= 1e-8:
        raise ValueError('封閉輪廓沒有有效面積。')
    return points
