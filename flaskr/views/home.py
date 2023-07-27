from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify,
)

from ..constants import *

home_bp = Blueprint('home', __name__, url_prefix='')


@home_bp.route('/descriptors', methods=['GET'])
def get_descriptors():
  return jsonify([
    'as dynamic content...',
    'as three-dimensional...',
    'as tongue-in-cheek...',
    'as indecisive?',
    'as liking Haskell a bit too much...',
    'self-referentially...',
    'as {{witty_description[i]}}...',
    'as pseudo-randomly generated...',
    'out of context...',
    'as 訳しにくい... \n(TL Note: \"untranslateable\")',
    'as out of ideas :(',
  ])


@home_bp.route('/')
def home():
  return render_template('home.html', **{
    'title': {
      'en': 'Vincent LɒGrɒssɒ',
      'ja': 'ヴィンセント ' + '\u2060'.join('ラグラッサ'),
      'tj': 'Vincent LɒGrɒssɒ',
    },
    'header_image': url_for('static', filename='images/home-bg.jpg'),
  })
