from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, current_app,
)

from ..database import Project, ProjectTag, ProjectTagMap, ProjectLocation

projects_bp = Blueprint('projects', __name__, url_prefix='/projects')



def parse_project_object(project):
  return {
    'id':   project.id,
    'name': project.title,
    'created_date':  project.created_date  or None,
    'modified_date': project.modified_date or None,
    'role':     project.role,
    'location': project.location,
    'image': project.image,
  }


@projects_bp.route('')
def projects():
  return render_template('projects.html', **{
    'title': current_app.config['PAGES']['projects']['title'],
    'projects': [
      parse_project_object(p) for p in Project.query.all()
    ],
  })

@projects_bp.route('/<string:name>')
def summary(name):
  proj = Project.query.get_or_404(name)
  return render_template('placeholder.html', **{
    'title': {
      'en': proj.title,
      'ja': proj.title,
      'tj': proj.title,
    },
  })
