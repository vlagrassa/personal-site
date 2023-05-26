from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for
)

from ..constants import *

projects_bp = Blueprint('projects', __name__, url_prefix='/projects')


@projects_bp.route('')
def projects():
  return render_template('placeholder.html', **{
    'title': PAGE_TITLES[1]['title'],
    'lang': 'en',
  })
