import enum
import json
from   jsoncomment import JsonComment
import re
import requests

from flask import (
  Blueprint, current_app, g, redirect, request, session, url_for,
)

from ..database        import CACHE, Project, Post, TimelineSection
from ..utils.endpoints import jsonify_response, raise_on_error
from ..utils.files     import open_app_file
from ..utils.map       import MapDictReader
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


@query_bp.route('/github/stats', methods=['GET'])
@CACHE.cached(60 * 60 * 24 * 7)
@jsonify_response
@raise_on_error(500)
def get_github_stats():

  with open_app_file('static/data-standin/github-info.json') as file:
    github_info = JsonComment(json).load(file)

  if github_info.get('cached_values'):
    return github_info['cached_values']

  username = github_info['username']

  # Loop through each repo under my account
  repos = json.loads( requests.get(f'https://api.github.com/users/{username}/repos').content )
  repos = [
    *[ (username,    repo['name']) for repo in repos ],
    *[ (repo['org'], repo['name']) for repo in github_info['other_repos'] ],
  ]

  num_commits = 0
  num_repos   = len(repos)

  # Adapted from https://gist.github.com/codsane/25f0fd100b565b3fce03d4bbd7e7bf33
  # adding an author filter
  for repo in repos:
    links = requests.get(f'https://api.github.com/repos/{repo[0]}/{repo[1]}/commits?per_page=1&author={username}').links
    if links.get('last'):
      num_commits += int( re.search('\d+$', links['last']['url']).group() )

  return {
    'num_commits': num_commits,
    'num_repos':   num_repos,
    'num_years':   10,
  }



#
# About Me Graph Data
#


@query_bp.route('/about-data/skills', methods=['GET'])
@CACHE.cached()
@jsonify_response
@raise_on_error(500)
def get_data_skills():
  return {}


@query_bp.route('/about-data/interests', methods=['GET'])
@CACHE.cached()
@jsonify_response
@raise_on_error(500)
def get_data_interests():
  with open_app_file('static/data-standin/graph-data/data-interests.csv') as data_file:
    with open_app_file('static/data-standin/graph-data/data-interests.json') as schema_file:
      return {
        'schema': JsonComment(json).load(schema_file),
        'data': list(MapDictReader(
          data_file,
          fieldnames=[ 'id', 'date', 'value' ],
          field_maps={ 'value': int },
          skipinitialspace=True,
        ))
      }


@query_bp.route('/about-data/genres', methods=['GET'])
@CACHE.cached()
@jsonify_response
@raise_on_error(500)
def get_data_genres():
  with open_app_file('static/data-standin/graph-data/data-genres.json') as file:
    return json.load(file)


@query_bp.route('/about-data/vowels', methods=['GET'])
@CACHE.cached()
@jsonify_response
@raise_on_error(500)
def get_data_vowels():
  with open_app_file('static/data-standin/graph-data/data-vowels.csv') as file:
    return list(MapDictReader(
      file,
      fieldnames=[ 'symbol', 'x', 'y', 'word' ],
      field_maps={ 'x': float, 'y': float, 'word': lambda x: x.strip() },
    ))
