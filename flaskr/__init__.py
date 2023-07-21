import os
import datetime

from flask import Flask, url_for, request

from .constants import *
from .database import db

from .views.home     import home_bp
from .views.projects import projects_bp
from .views.blog     import blog_bp
from .views.about    import about_bp


def create_app(test_config=None):

  app = Flask(__name__, instance_relative_config=True)
  app.config.from_mapping(
    SECRET_KEY = 'dev',
    DATABASE = os.path.join(app.instance_path, 'flaskr.sqlite'),
    SQLALCHEMY_DATABASE_URI = 'sqlite:///project.db'
  )
  db.init_app(app)

  # Load the instance config, if it exists, when not testing
  if test_config is None:
    app.config.from_pyfile('config.py', silent=True)

  # Otherwise, load the test config if passed in
  else:
    app.config.from_mapping(test_config)

  # Ensure the instance folder exists
  try:
    os.makedirs(app.instance_path)
  except OSError:
    pass

  # Register blueprints
  app.register_blueprint(home_bp)
  app.register_blueprint(projects_bp)
  app.register_blueprint(blog_bp)
  app.register_blueprint(about_bp)

  add_template_filters(app)

  @app.context_processor
  def inject_language():
    l = request.args.get('l', 'en')
    if l not in { l['code'] for l in LANGUAGES }:
      l = 'en'

    return {
      'lang':  l,
      'langs': LANGUAGES,
    }

  @app.context_processor
  def inject_navbar():
    return {
      'nav_links': [
        {
          'title': 'LinkedIn',
          'url': 'https://www.linkedin.com/in/vlagrassa',
          'path': 'linkedin',
          'color': '#0077B5',
        },
        {
          'title': 'GitHub',
          'url': 'https://github.com/vlagrassa',
          'path': 'github',
          'color': '#171515',
        },
        {
          'title': 'Facebook',
          'url': 'https://www.facebook.com/vincent.lagrassa.77',
          'path': 'facebook',
          'color': '#1877F2',
        },
        {
          'title': 'University of Chicago',
          'url': 'https://people.cs.uchicago.edu/~vlagrassa',
          'path': 'uchicago',
          'color': '#800000',
        },
      ],
      'nav_sections': [
        {
          'title': section['title'],
          'link': url_for(f'{section["name"]}.{section["name"]}'),
        }
          for section in PAGE_TITLES
      ],
    }

  return app



def add_template_filters(app):

  @app.template_filter('nb')
  def nb(txt):
    '''
      Intersperse a string with word joiner characters, to prevent line breaks within the string.
    '''
    return '\u2060'.join(txt)

  @app.template_filter('postdateformat')
  def postdateformat(value, lang='en'):
      today = datetime.datetime.today().date()

      if value is None or value == '':
        return '???'

      if value == today:
        if lang == 'en': return 'Today'
        if lang == 'ja': return '今日'
      if value == today - datetime.timedelta(days=1):
        if lang == 'en': return 'Yesterday'
        if lang == 'ja': return '昨日'
      if value == today - datetime.timedelta(days=2):
        if lang == 'ja': return '一昨日'

      if lang == 'ja':
        return nb(str(value.year) + '年') + nb(f'{value.month}月{value.day}日')
      return value.strftime('%b\u00A0%d, %Y')
