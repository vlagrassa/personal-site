import enum

from flask import current_app

import sqlalchemy as sa
from flask_sqlalchemy import SQLAlchemy

from ..utils.image import get_post_image, get_project_image

db = SQLAlchemy()



#
# External Profile Links
#

class ExternalProfile(db.Model):
  id            = sa.Column(sa.String(16),  primary_key=True)
  title         = sa.Column(sa.String(64),  nullable=False)
  order         = sa.Column(sa.Integer(),   nullable=False, unique=True)
  link_external = sa.Column(sa.String(256), nullable=False)
  bg_color_hex  = sa.Column(sa.String(8))



#
# Projects
#

class ProjectRole(enum.Enum):
  PERSONAL = 'Personal'       # Self-driven project
  LEAD     = 'Project Lead'
  MEMBER   = 'Team Member'
  SOLO     = 'Solo Project'   # e.g. an assignment

class ProjectLocation(enum.Enum):
  INT = 'Internal'            # Web app hosted on this site
  EXT = 'External'            # Link to an external site
  IRL = 'IRL'                 # Description of a project without a web presence

class Project(db.Model):
  id       = sa.Column(sa.String(25), primary_key=True)
  title    = sa.Column(sa.String(50))
  role     = sa.Column(sa.Enum(ProjectRole))
  location = sa.Column(sa.Enum(ProjectLocation))
  created_date  = sa.Column(sa.Date)
  modified_date = sa.Column(sa.Date)

  @property
  def image(self):
    return get_project_image(self.id)

  def serialize(self):
    return {
      'id':            self.id,
      'name':          self.title,
      'created_date':  self.created_date  or None,
      'modified_date': self.modified_date or None,
      'role':          self.role.value,
      'location':      self.location.value,
    }

class TagType(enum.Enum):
  LANGUAGE = 'Language'
  SKILL    = 'Skill'
  TOOL     = 'Tool'

class ProjectTag(db.Model):
  id = sa.Column(sa.Integer, primary_key=True)
  title = sa.Column(sa.String)
  tagtype = sa.Column(sa.Enum(TagType))

class ProjectTagMap(db.Model):
  id = sa.Column(sa.Integer, primary_key=True)
  project_id = sa.Column(sa.Integer, sa.ForeignKey('project.id'),     nullable=False)
  tag_id     = sa.Column(sa.Integer, sa.ForeignKey('project_tag.id'), nullable=False)



#
# Blog Posts
#


class Post(db.Model):
  id = sa.Column(sa.String(50), primary_key=True)
  title = sa.Column(sa.String(120), nullable=False)
  date = sa.Column(sa.Date)
  description = sa.Column(sa.String(300))
  visible = sa.Column(sa.Boolean, default=False, nullable=False)
  category_id = sa.Column(sa.Integer, sa.ForeignKey('post_group.id'), nullable=False)
  category = db.relationship('PostGroup', backref='posts')

  @property
  def name(self):
    with current_app.app_context():
      return { l['code']: self.title for l in current_app.config['LANGUAGES'] }

  # Connect to PostTag table through PostTagMap backref
  @property
  def tags(self):
    return [ t.tag for t in self.tag_map ]

  @property
  def display_tags(self):
    tags = [ (True, t) for t in self.tags ]
    for i in range(0, len(tags)):
      for j in range(0, len(tags)):
        if i == j: continue
        if self.tags[i].is_descendant_of(self.tags[j]):
          tags[j] = (False, tags[j][1])
    return [ t[1] for t in tags if t[0] ]

  @property
  def image(self):
    return get_post_image(self.id)

  def serialize(self):
    return {
      'id':            self.id,
      'title':         self.title,
      'date':          self.date or None,
      'description':   self.description,
      'visible':       self.visible,
      'category':      self.category.serialize(),
      'image':         self.image.serialize(),
      'tags':          [ t.serialize() for t in self.tags ],
    }


class PostGroup(db.Model):
  id = sa.Column(sa.Integer, primary_key=True)
  slug  = sa.Column(sa.String(50), unique=True)
  title = sa.Column(sa.String(50), nullable=False)

  @property
  def name(self):
    with current_app.app_context():
      return { l['code']: self.title for l in current_app.config['LANGUAGES'] }

  def serialize(self):
    return {
      'id':    self.id,
      'slug':  self.slug,
      'title': self.title,
    }


class PostTag(db.Model):
  id = sa.Column(sa.String(24), primary_key=True)
  name_en = sa.Column(sa.String(32), unique=True)
  name_ja = sa.Column(sa.String(32), unique=True)
  name_tj = sa.Column(sa.String(32), unique=True)
  parent  = sa.Column(sa.String(24), sa.ForeignKey('post_tag.id'))

  # Convert individual name fields into a single dict
  @property
  def name(self):
    with current_app.app_context():
      return {
        l['code']: getattr(self, 'name_' + l['code'])
          for l in current_app.config['LANGUAGES']
      }

  # Connect to PostTag table through PostTagMap backref
  @property
  def posts(self):
    return [ p.post for p in self.post_map ]

  def is_descendant_of(self, other):
    p = self
    while p.parent is not None:
      p = PostTag.query.get(p.parent)
      if p == other:
        return True
    return False

  def is_ancestor_of(self, other):
    return other.is_descendant_of(self)

  def serialize(self):
    return {
      'id':      self.id,
      'name_en': self.name_en,
      'name_ja': self.name_ja,
      'name_tj': self.name_tj,
    }


class PostTagMap(db.Model):
  id = sa.Column(sa.Integer, primary_key=True)
  post_id = sa.Column(sa.Integer,    sa.ForeignKey('post.id'))
  tag_id  = sa.Column(sa.String(24), sa.ForeignKey('post_tag.id'))

  # Connect Post and PostTag tables to this mapping table
  post = db.relationship('Post',    backref='tag_map')
  tag  = db.relationship('PostTag', backref='post_map')



#
# Timeline
#


class TimelineSection(db.Model):
  id       = sa.Column(sa.Integer(), primary_key=True, autoincrement=True)
  label_en = sa.Column(sa.String(32))
  label_ja = sa.Column(sa.String(32))
  label_tj = sa.Column(sa.String(32))
  order    = sa.Column(sa.Integer())

  # Connect timeline section to all its entries, in order
  entries  = db.relationship('TimelineEntry', order_by='TimelineEntry.order')


class TimelineEntry(db.Model):
  id            = sa.Column(sa.String(16), primary_key=True)
  section_id    = sa.Column(sa.Integer, sa.ForeignKey('timeline_section.id'), nullable=False)
  order         = sa.Column(sa.Integer(), nullable=False)
  title         = sa.Column(sa.String(64), nullable=False)
  role          = sa.Column(sa.String(256), nullable=False)
  description   = sa.Column(sa.String(2048))
  link_internal = sa.Column(sa.String(256))
  link_external = sa.Column(sa.String(256))
  has_logo      = sa.Column(sa.Boolean(), nullable=False)
  bg_color_hex  = sa.Column(sa.String(8))

  # The order values should be unique within each section
  __table_args__ = (sa.UniqueConstraint('section_id', 'order', name='_section_order_uc'),)
