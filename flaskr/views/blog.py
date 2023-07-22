from flask import (
  Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify,
)

from ..constants import *
from ..database import Post, PostGroup, PostTag, PostTagMap

blog_bp = Blueprint('blog', __name__, url_prefix='/blog')



def parse_post_object(post):

  tags = post.tags
  tag_names = [ t.id for t in tags ]
  for t in tags:
    t.display = True
  for t in tags:
    if t.parent in tag_names:
      tags[tag_names.index(t.parent)].display = False

  return {
    'id':    post.id,
    'title': post.title,
    'desc':  post.description or '',
    'group': post.category.name,
    'slug':  post.category.slug,
    'date':  post.date,
    'tags':  tags,
  }


@blog_bp.route('')
def blog():
  posts = Post.query.order_by(Post.date.desc()).all()

  initial_tags = request.args.get('tags', '')
  if initial_tags:
    initial_tags = [ PostTag.query.filter(PostTag.id == t).one_or_none() for t in initial_tags.split(',') ]
    initial_tags = [ t for t in initial_tags if t is not None]


  return render_template('blog.html', **{
    'title': PAGE_TITLES[2]['title'],
    'posts': [ parse_post_object(post) for post in posts ],
    'tags': PostTag.query.all(),
    'initial_tags': initial_tags,
  })

@blog_bp.route('/<string:slug>')
def group(slug):
  category = PostGroup.query.filter_by(slug=slug).first_or_404()
  return render_template('placeholder.html', **{
    'title': {
      'en': category.name,
      'ja': category.name,
      'tj': category.name,
    },
  })

@blog_bp.route('/post/<string:name>')
def post(name):
  post = Post.query.get_or_404(name)
  return render_template('blog-post.html', **{
    'title': {
      'en': post.title,
      'ja': post.title,
      'tj': post.title,
    },
    'subtitle': post.description,
    'post': parse_post_object(post),

    'bigimage': url_for('static', filename='images/home-bg.jpg'),
    'bigimage_height': '45%',
    'hide_title': True,
  })
