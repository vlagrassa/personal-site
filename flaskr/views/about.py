from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, current_app,
)


about_bp = Blueprint('about', __name__, url_prefix='/about')


@about_bp.route('')
def about():
  return render_template('about-me.html', **{
    'title': current_app.config['PAGES']['about']['title'],
  })
