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
  })
