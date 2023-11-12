from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify,
)

from ..constants   import *
from ..database    import Project, Post
from ..utils.image import HeaderImage
from ..utils.parse import TextDocument
from ..utils.utils import nb

from .projects     import parse_project_object



home_bp = Blueprint('home', __name__, url_prefix='')


highlight_projects = [
  'personal-site', 'project-rainbow', 'monte-carlo-pi'
]


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

    'content': TextDocument.parse_file('home'),

    'preview_projects': [
      parse_project_object(Project.query.get(p)) for p in highlight_projects
    ],
    'preview_posts': [
      Post.query.filter_by(category_id=c).order_by(Post.date.desc()).first()
        for c in range(2, 4)
    ]
  })
