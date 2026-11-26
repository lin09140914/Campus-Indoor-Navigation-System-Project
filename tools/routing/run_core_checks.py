"""Compile the pure Kotlin core, then compare it against independent Dijkstra.
Run from any directory with Python 3, JDK and kotlinc available on PATH.
This does not compile the Android JSON adapter or build an APK.
"""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / 'app/src/main/java/com/example/campusindoornavigation/routing/RoutePlanner.kt'


def export_fixture(graph_path, destinations_path, target):
    graph = json.loads(graph_path.read_text(encoding='utf-8'))
    destinations = json.loads(destinations_path.read_text(encoding='utf-8'))
    rows = [['G', graph['building_id'], graph['map_version'], graph['coordinate_system_id'], graph['unit'], graph['status']],
            ['C', destinations['building_id'], destinations['map_version']]]
    rows += [['N', *(n[k] for k in ('id', 'x', 'z', 'floor', 'type'))] for n in graph['nodes']]
    rows += [['E', *(e[k] for k in ('a', 'b', 'w', 'kind'))] for e in graph['edges']]
    rows += [['D', *(d[k] for k in ('id', 'name', 'floor', 'node_id', 'category'))] for d in destinations['locations']]
    if any('\t' in str(v) or '\n' in str(v) or '\r' in str(v) for row in rows for v in row):
        raise ValueError('Fixture contains unsupported tab or line break')
    target.write_text('\n'.join('\t'.join(map(str, row)) for row in rows) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--synthetic-only', action='store_true')
    args = parser.parse_args()
    compiler = shutil.which('kotlinc') or shutil.which('kotlinc.bat')
    java = shutil.which('java')
    if not compiler or not java:
        parser.error('kotlinc and java must be installed and on PATH')
    with tempfile.TemporaryDirectory() as tmp:
        jar = Path(tmp) / 'route-check.jar'
        subprocess.run([compiler, str(CORE), str(Path(__file__).with_name('RouteCoreCheck.kt')), '-include-runtime', '-d', str(jar)], check=True)
        command = [java, '-Xmx512m', '-jar', str(jar)]
        if not args.synthetic_only:
            fixture = Path(tmp) / 'floor1.tsv'
            data = ROOT / 'data/drafts/floor-1'
            export_fixture(data / 'graph.json', data / 'destinations.json', fixture)
            command.append(str(fixture))
        subprocess.run(command, check=True)


if __name__ == '__main__':
    main()
