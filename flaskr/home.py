from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for
)

from .constants import *

home_bp = Blueprint('home', __name__, url_prefix='')


@home_bp.route('/')
def home():
  return render_template('home.html', **{
    'title': None,
    'lang': 'en',
  })

@home_bp.route('/projects')
def projects():
  return render_template('home.html', **{
    'title': PAGE_TITLES[1]['title'],
    'lang': 'en',
  })

@home_bp.route('/blog')
def blog():
  return render_template('home.html', **{
    'title': PAGE_TITLES[2]['title'],
    'lang': 'en',
  })

@home_bp.route('/about')
def about():
  return render_template('home.html', **{
    'title': PAGE_TITLES[3]['title'],
    'lang': 'en',
  })
