from flask import url_for


class HeaderImage():
  def __init__(self, url, location='external', x_align='center', y_align='center'):

    if location == 'external':
      self.url = url
    elif location == 'static':
      self.url = url_for('static', filename=url)
    else:
      raise ValueError(f'Unknown location "{location}"')

    self.x_align = x_align
    self.y_align = y_align

    self.alt_text = 'Alt text'

  def serialize(self):
    return {
      'url':      self.url,
      'alt_text': self.alt_text,
      'x_align':  self.x_align,
      'y_align':  self.y_align,
    }


def get_post_image(post_id):
  return HeaderImage('images/home-bg.jpg', location='static', x_align='left', y_align='top')


def get_project_image(project_id):
  return HeaderImage('images/home-bg.jpg', location='static', x_align='left', y_align='top')
