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
