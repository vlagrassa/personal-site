from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, current_app,
)

from ..utils.files import open_app_file
from ..utils.map   import MapDictReader


about_bp = Blueprint('about', __name__, url_prefix='/about')


@about_bp.route('')
def about():
  try:
    with open_app_file('static/about-data-languages.csv') as file:
      data_languages = list(MapDictReader( file, fieldnames=[ 'label', 'value' ], field_maps={ 'value': int } ))
  except Exception as e:
    data_languages = None

  return render_template('about-me.html', **{
    'title': current_app.config['PAGES']['about']['title'],
    'data_languages': data_languages,
  })
