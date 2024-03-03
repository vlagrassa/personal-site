from functools import wraps
from flask import jsonify


def jsonify_response(f):

  @wraps(f)
  def decorator(*args, **kwargs):
    return jsonify(f(*args, **kwargs))
  
  return decorator
