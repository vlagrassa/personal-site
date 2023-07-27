from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify,
)

from ..constants import *
from ..utils.image import HeaderImage
from ..utils.utils import nb

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
      'ja': 'ヴィンセント ' + nb('ラグラッサ'),
      'tj': 'Vincent LɒGrɒssɒ',
    },
    'header_image': HeaderImage('images/home-bg.jpg', location='static', x_align='right'),
  })
