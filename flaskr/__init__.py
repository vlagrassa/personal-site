import os

from flask import Flask, url_for

from .constants import *
from .database import db

from .home           import home_bp
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
      'langs': [
        {
          'name': 'English',
          'code': 'en',
        },
        {
          'name': '日本語',
          'code': 'ja',
        },
        {
          'name': 'Tʒeramot',
          'code': 'tj',
        },
      ],
    }

  return app

