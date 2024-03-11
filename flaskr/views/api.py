import enum

from flask import (
  Blueprint, current_app, g, redirect, request, session, url_for,
)

from ..database        import Project, Post, TimelineSection
from ..utils.endpoints import jsonify_response
from ..utils.utils     import capsfirst, dateformat



query_bp = Blueprint('query', __name__, url_prefix='/query')



#
# Models
#


class ActivityChangeType(enum.Enum):
  CREATED = 'created'
  UPDATED = 'updated'


class ActivityFeedItem():
  '''
    Unified class to represent an item in the Activity Feed.
    Includes constructor methods for classes that can be made into feed items.
  '''

  def __init__(self, name, name_link, kind, kind_link, date, change_type: ActivityChangeType):
    self.name = name
    self.name_link = name_link
    self.kind = kind
    self.kind_link = kind_link
    self.date = date
    self.change_type = change_type

  @classmethod
  def from_project(cls, project: Project):
    return cls(
      project.title, url_for('projects.summary', name=project.id),
      'Projects', url_for('projects.projects'),
      project.modified_date,
      ActivityChangeType.UPDATED if project.modified_date != project.created_date else ActivityChangeType.CREATED,
    )
  
  @classmethod
  def from_blog_post(cls, post: Post):
    return cls(
      post.title, url_for('blog.post', name=post.id),
      post.category.title, url_for('blog.group', slug=post.category_id),
      post.date, ActivityChangeType.CREATED
    )

  @property
  def date_string(self) -> str:
    return {
      l['code']: dateformat(self.date, lang=l['code']) for l in current_app.config['LANGUAGES']
    }

  @property
  def edit_type(self) -> str:
    return {
      l['code']: self.change_type.value for l in current_app.config['LANGUAGES']
    }

  @property
  def edit_string(self) -> int:
    '''
      Get number of days between item date and current date
    '''
    lookup = current_app.config['TEXT'].get('activity.' + self.change_type.value, {})
    return {
      l['code']: capsfirst( lookup.get(l['code'], '_').replace('_', dateformat(self.date, lang=l['code'], limit = 30)) )
        for l in current_app.config['LANGUAGES']
    }
  
  def serialize(self):
    return {
      field: getattr(self, field) for field in [
        'name', 'name_link', 'kind', 'kind_link', 'date', 'date_string', 'edit_type', 'edit_string',
      ]
    }



#
# Endpoints
#


@query_bp.route('/descriptors', methods=['GET'])
@jsonify_response
def get_descriptors():
  with current_app.open_resource(f'static/homepage-descriptors.txt') as file:
    return [
      line.decode('utf-8').replace('\\n', '\n').rstrip() for line in file
    ]


# @query_bp.route('/timeline', methods=['GET'])
# @jsonify_response
# def get_timeline():
#   return TimelineSection.query.order_by(TimelineSection.order.desc()).all(),


@query_bp.route('/recent-activity', methods=['GET'])
@jsonify_response
def get_recent_activity():

  # Compute the number of elements to get, capping at 5
  # TODO: Does the cap make sense?
  n = min(int(request.args.get('n', 3)), 50)

  # Get the most recent n items from projects & blog posts
  last_projects = [ ActivityFeedItem.from_project(x)   for x in Project.query.filter(Project.modified_date != None).order_by(Project.modified_date.desc()).limit(n).all() ]
  last_posts    = [ ActivityFeedItem.from_blog_post(x) for x in Post.query.filter(Post.date != None).order_by(Post.date.desc()).limit(n).all() ]

  # Merge lists and limit to n elements total
  return [
    x.serialize()
    for x in sorted([*last_projects[:n], *last_posts[:n]], key = lambda x: x.date, reverse=True)[:n]
  ]


