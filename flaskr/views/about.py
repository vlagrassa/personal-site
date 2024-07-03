import json
from   jsoncomment import JsonComment

from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, current_app,
)

from ..utils.files import open_app_file
from ..utils.map   import MapDictReader
from ..utils.parse  import TextDocument
from ..utils.render import custom_render_urls


about_bp = Blueprint('about', __name__, url_prefix='/about')


@about_bp.route('')
def about():
  try:
    with open_app_file('static/about-data-languages.csv') as file:
      data_languages = list(MapDictReader( file, fieldnames=[ 'label', 'value' ], field_maps={ 'value': int } ))
  except Exception as e:
    data_languages = None

  try:
    with open_app_file('static/data-standin/high-scores.json') as file:
      scores = JsonComment(json).load(file)
  except Exception as e:
    scores = {}

  return render_template('about-me.html', **{
    'title': current_app.config['PAGES']['about']['title'],
    'data_languages': data_languages,
    'initial_graph':  request.args.get('g'),
    'initial_tab':    request.args.get('t'),

    'graphs_doc':    TextDocument.parse_file('data-standin/graphs-help'),
    'proficiencies': TextDocument.parse_file('data-standin/proficiencies'),
    'custom_render': custom_render_urls,
    'scores': scores,
  })
