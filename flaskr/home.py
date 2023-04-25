from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for
)

home_bp = Blueprint('home', __name__, url_prefix='')


@home_bp.route('/')
def hello():
  return render_template('home.html', **{
    'title': 'Vincent LaGrassa',
    'links': [
      {
        'title': 'LinkedIn',
        'url': 'https://www.linkedin.com/in/vlagrassa',
        'path': 'linkedin',
      },
      {
        'title': 'GitHub',
        'url': 'https://github.com/vlagrassa',
        'path': 'github',
      },
    ],
  })
