from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify,
)

from ..constants import *

about_bp = Blueprint('about', __name__, url_prefix='/about')


@about_bp.route('')
def about():
  return render_template('placeholder.html', **{
    'title': PAGE_TITLES[3]['title'],
  })
