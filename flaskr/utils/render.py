from flask  import url_for
from jinja2 import Environment, BaseLoader


CustomRenderer = Environment(loader=BaseLoader)


def custom_render_urls(txt):
  '''
    Custom rendering function that makes `url_for` available.
  '''
  return CustomRenderer.from_string(txt).render(url_for=url_for)
