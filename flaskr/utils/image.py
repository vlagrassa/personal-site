class HeaderImage():
  def __init__(self, url, x_align='center', y_align='center'):
    self.url     = url
    self.x_align = x_align
    self.y_align = y_align


  # Factory Methods

  @classmethod
  def from_project(cls, project):
    return cls(
      f'/static/data_standin/projects/{project.id}/thumbnail.jpg',
      x_align = 'right',
    )

  @classmethod
  def from_blog_post(cls, post):
    return cls(
      f'/static/data_standin/blog-posts/{post.id}.png',
      x_align = post.image_x_align,
      y_align = post.image_y_align,
    )


  # Serialization

  def serialize(self):
    return {
      'url':      self.url,
      'alt_text': self.alt_text,
      'x_align':  self.x_align,
      'y_align':  self.y_align,
    }



def get_post_image(post):
  return HeaderImage.from_blog_post(post)


def get_project_image(project):
  return HeaderImage.from_project(project)
