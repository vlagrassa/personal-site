from functools import wraps
from flask import abort, jsonify, request


def jsonify_response(f):

  @wraps(f)
  def decorator(*args, **kwargs):
    return jsonify(f(*args, **kwargs))
  
  return decorator


def raise_on_error(code=500):
  def decorator(f):

    @wraps(f)
    def wrapper(*args, **kwds):
      try:
        return f(*args, *kwds)
      except Exception as e:
        print(f"Error in {request.url}: {e}")
        abort(code)

    return wrapper
  return decorator
