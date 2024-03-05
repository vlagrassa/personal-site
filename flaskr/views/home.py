from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, current_app,
)

from ..database     import Project, Post, TimelineSection
from ..utils.image  import HeaderImage
from ..utils.parse  import TextDocument
from ..utils.render import custom_render_urls
from ..utils.utils  import nb

from .projects      import parse_project_object



home_bp = Blueprint('home', __name__, url_prefix='')


highlight_projects = [
  'personal-site', 'project-rainbow', 'monte-carlo-pi'
]


@home_bp.route('/')
def home():
  return render_template('home.html', **{
    'title': {
      'en': 'Vincent LɒGrɒssɒ',
      'ja': 'ヴィンセント ' + nb('ラグラッサ'),
      'tj': 'Vincent LɒGrɒssɒ',
    },
    'tab_title': current_app.config['PAGES']['home']['title'],
    'header_image': HeaderImage('/static/images/home-bg.jpg', x_align='right'),

    # Main content
    'content': TextDocument.parse_file('home'),
    'custom_render': custom_render_urls,

    # Recent activity highlights
    'preview_projects': [
      parse_project_object(Project.query.get(p)) for p in highlight_projects
    ],
    'preview_posts': [
      Post.query.filter_by(category_id=c).order_by(Post.date.desc()).first()
        for c in range(2, 4)
    ],

    # Timeline entries
    'timeline': TimelineSection.query.order_by(TimelineSection.order.desc()).all(),
  })
