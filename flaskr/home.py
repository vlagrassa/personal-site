from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for
)

home_bp = Blueprint('home', __name__, url_prefix='')


@home_bp.route('/')
def home():
  return render_template('home.html', **{
    'title': 'Home',
  })

@home_bp.route('/projects')
def projects():
  return render_template('home.html', **{
    'title': 'Projects',
  })

@home_bp.route('/blog')
def blog():
  return render_template('home.html', **{
    'title': 'Blog',
  })

@home_bp.route('/about')
def about():
  return render_template('home.html', **{
    'title': 'About Me',
  })
