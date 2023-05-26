import sqlalchemy as sa
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Post(db.Model):
  id = sa.Column(sa.String(50), primary_key=True)
  title = sa.Column(sa.String(120), nullable=False)
  date = sa.Column(sa.Date)
  visible = sa.Column(sa.Boolean, default=False, nullable=False)
  category_id = sa.Column(sa.Integer, sa.ForeignKey('post_group.id'), nullable=False)
  category = db.relationship('PostGroup')

class PostGroup(db.Model):
  id = sa.Column(sa.Integer, primary_key=True)
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
