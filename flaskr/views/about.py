import csv

from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, current_app,
)

from ..utils.utils import nb


about_bp = Blueprint('about', __name__, url_prefix='/about')


@about_bp.route('')
def about():
  try:
    with current_app.open_resource(f'static/about-data-languages.csv', mode='rt') as csvfile:
      data_languages = [
        {'label': line[0], 'value': int(line[1])} for line in csv.reader(csvfile)
      ]
  except Exception as e:
    data_languages = None

  return render_template('about-me.html', **{
    'title': current_app.config['PAGES']['about']['title'],
    'my_name': {
      'en': 'Vince LɒGrɒssɒ',
      'ja': 'ヴィンス ' + nb('ラグラッサ'),
      'tj': 'Vince LɒGrɒssɒ',
    },
    'data_languages':  data_languages
  })
