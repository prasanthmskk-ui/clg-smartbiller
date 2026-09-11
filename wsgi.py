from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


APP_PATH = Path(__file__).resolve().parent / 'src' / '2_Backend' / 'app.py'
MODULE_SPEC = spec_from_file_location('billing_backend_app', APP_PATH)
if MODULE_SPEC is None or MODULE_SPEC.loader is None:
    raise ImportError(f'Unable to load Flask application from {APP_PATH}')

backend_module = module_from_spec(MODULE_SPEC)
MODULE_SPEC.loader.exec_module(backend_module)
app = backend_module.app
