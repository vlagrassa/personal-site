from collections import OrderedDict
import json
import os

from flask import Flask, url_for, request
from flaskext.markdown import Markdown

from .database import db, TABLES, DB_ENUMS, ExternalProfile
from .utils.map import ConfigMap

from .views.home     import home_bp
from .views.projects import projects_bp
from .views.blog     import blog_bp
from .views.about    import about_bp
from .views.api      import query_bp


PAGE_IDS = [
  'home', 'projects', 'blog', 'about',
]



def create_app(test_config=None):

  # Create the app instance itself
  app = Flask(__name__, instance_relative_config=True)
  app.config.from_mapping(
    SECRET_KEY = 'dev',
    DATABASE = os.path.join(app.instance_path, 'flaskr.sqlite'),
    SQLALCHEMY_DATABASE_URI = 'sqlite:///project.db'
  )

  # Initialize database
  db.init_app(app)

  # Initialize extension(s)
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
  app.register_blueprint(query_bp)

  add_template_filters(app)
  load_lang_configs(app)


  #
  # Context processors -- inject variables common to all pages
  #

  @app.context_processor
  def inject_language():

    # Read language objects from app config
    with app.app_context():
      LANGUAGES = app.config['LANGUAGES']

    # Read current site settings from session cookie
    settings = json.loads(request.cookies.get('site_settings', '{}'))

    # Get target language from URL args or site settings
    l = request.args.get('l', settings.get('language', 'en'))
    if l not in { l['code'] for l in LANGUAGES }:
      l = 'en'

    # Add the initial language to the context
    return {
      'lang': l,
    }

  @app.context_processor
  def inject_navbar():
    return {
      'nav_links': NAV_LINKS,
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



def load_lang_configs(app):

  def _read_lang_file(*fname):
    with open(os.path.join(*fname), 'r', encoding='utf-8') as f:
      return json.load(f)

  with app.app_context():

    # Read in all the language pack files
    dir = os.path.join(app.static_folder, f'language_packs')
    language_packs = {
      f[:2]: _read_lang_file(dir, f) for f in os.listdir(dir) if f.endswith('.json')
    }

    # Store the individual language config objects
    app.config['LANGUAGES'] = [ config['config'] for config in language_packs.values() ]

    # Store language pack objects in a ConfigMap object
    app.config['TEXT'] = ConfigMap(
      initial_keyset = set(language_packs.keys()),
      fallback_key   = 'en',
    )
    for lang, config in language_packs.items():
      app.config['TEXT'].read(lang, config)

    app.config['PAGES'] = OrderedDict()
    for page_id in PAGE_IDS:
      app.config['PAGES'][page_id] = {
        'title': app.config['TEXT']['page_titles', page_id],
        'endpoint': f'{page_id}.{page_id}',
      }
