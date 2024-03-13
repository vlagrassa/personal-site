import os
from flask import current_app


def open_app_file(resource, encoding='utf-8', **kwds):
  '''
    Open a file in the app code, accepting all arguments to the standard Python `open` function.
  '''
  return open(os.path.join(current_app.root_path, resource), encoding=encoding, **kwds)
