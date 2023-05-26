from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify,
)

from ..constants import *

blog_bp = Blueprint('blog', __name__, url_prefix='/blog')


@blog_bp.route('')
def blog():
  return render_template('placeholder.html', **{
    'title': PAGE_TITLES[2]['title'],
    'lang': 'en',
  })
