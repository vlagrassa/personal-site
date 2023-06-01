import enum

import sqlalchemy as sa
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


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
  visible = sa.Column(sa.Boolean, default=False, nullable=False)
  category_id = sa.Column(sa.Integer, sa.ForeignKey('post_group.id'), nullable=False)
  category = db.relationship('PostGroup')

class PostGroup(db.Model):
  id = sa.Column(sa.Integer, primary_key=True)
  slug = sa.Column(sa.String(50), unique=True)
  name = sa.Column(sa.String(50), nullable=False)

class PostTagMap(db.Model):
  id = sa.Column(sa.Integer, primary_key=True)
  post_id = sa.Column(sa.Integer, sa.ForeignKey('post.id'))
  tag = sa.Column(sa.String(30))

  @classmethod
  def query_by_post(cls, post, name_only=False):
    query = cls.query.filter_by(post_id=post.id).order_by(PostTagMap.tag.asc())
    if name_only:
      return [ t.tag for t in query.all() ]
    else:
      return query
