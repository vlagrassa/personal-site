import os
import datetime

from flask import Flask, url_for, request
from flaskext.markdown import Markdown

from .constants import *
from .database import db, TABLES, DB_ENUMS, ExternalProfile

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
  Markdown(app, extensions=['sane_lists', 'fenced_code', 'smarty', 'md_in_html', 'markdown_katex'])

  # Initialization tasks that require app context
  with app.app_context():

    # Ensure all database tables exist
    db.create_all()

    # Query for external nav links once, when initializing app
    NAV_LINKS = ExternalProfile.query.order_by(ExternalProfile.order.asc()).all()

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
      'MONTHS': MONTHS,
      'DAYS': DAYS,
    }

  @app.context_processor
  def inject_navbar():
    return {
      'nav_links': NAV_LINKS,
      'nav_sections': [
        {
          'title': section['title'],
          'link': url_for(f'{section["name"]}.{section["name"]}'),
        }
          for section in PAGE_TITLES
      ],
    }

  @app.context_processor
  def inject_db_schemas():
    return {
      'TABLES':   TABLES,
      'DB_ENUMS': DB_ENUMS,
    }

  # Return the newly created app object
  return app



def add_template_filters(app):
  from .utils.utils import nb, capsfirst, dateformat

  app.template_filter('nb')(nb)
  app.template_filter('capsfirst')(capsfirst)
  app.template_filter('dateformat')(dateformat)
