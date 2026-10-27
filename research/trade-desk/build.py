# Inject data.json into template.html -> trade-desk.html (the published Artifact).
# Refresh data first: python3 build_data.py <dir with rosters/users/fc/p8 json> data.json
import pathlib
d=pathlib.Path(__file__).parent
(d/'trade-desk.html').write_text((d/'template.html').read_text().replace('__DATA__',(d/'data.json').read_text()))
